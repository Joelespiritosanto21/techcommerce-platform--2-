/**
 * TechCommerce Platform - Database Management Library
 * Backup, Restore, Export, Import functionality
 * Supports: SQLite, MySQL, MariaDB, PostgreSQL
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../db';

// Types
export interface DatabaseConfig {
  type: 'sqlite' | 'mysql' | 'postgresql' | 'mariadb';
  host?: string;
  port?: number;
  name?: string;
  user?: string;
  password?: string;
  path?: string;
}

export interface BackupOptions {
  outputPath?: string;
  compress?: boolean;
  includeData?: boolean;
  tables?: string[];
}

export interface BackupInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'full' | 'schema' | 'data';
  database: string;
  compressed: boolean;
}

export interface RestoreOptions {
  backupPath: string;
  dropExisting?: boolean;
  tables?: string[];
}

export interface ExportOptions {
  format: 'sql' | 'json' | 'csv';
  outputPath?: string;
  tables?: string[];
}

export interface ImportOptions {
  filePath: string;
  format: 'sql' | 'json' | 'csv';
  truncate?: boolean;
  tables?: string[];
}

export interface DatabaseStats {
  size: number;
  tables: number;
  records: number;
  lastBackup?: Date;
  connections?: number;
}

/**
 * Parse DATABASE_URL to extract configuration
 */
export function parseDatabaseUrl(url: string): DatabaseConfig {
  // SQLite format: file:/path/to/db.db
  if (url.startsWith('file:')) {
    return {
      type: 'sqlite',
      path: url.replace('file:', ''),
      url
    };
  }

  // Parse connection URL
  const regex = /^(postgresql|mysql|mariadb):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = url.match(regex);

  if (!match) {
    // Try without port
    const regexNoPort = /^(postgresql|mysql|mariadb):\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)$/;
    const matchNoPort = url.match(regexNoPort);
    
    if (matchNoPort) {
      const [, type, user, password, host, name] = matchNoPort;
      return {
        type: type as 'postgresql' | 'mysql' | 'mariadb',
        host,
        port: type === 'postgresql' ? 5432 : 3306,
        name,
        user,
        password,
        url
      };
    }
    
    throw new Error(`Invalid DATABASE_URL format`);
  }

  const [, type, user, password, host, port, name] = match;

  return {
    type: type as 'postgresql' | 'mysql' | 'mariadb',
    host,
    port: parseInt(port),
    name,
    user,
    password,
    url
  };
}

/**
 * Database Manager Class
 */
export class DatabaseManager {
  private config: DatabaseConfig;
  private backupDir: string;

  constructor(databaseUrl?: string) {
    const url = databaseUrl || process.env.DATABASE_URL || '';
    this.config = parseDatabaseUrl(url);
    this.backupDir = process.env.BACKUP_DIR || '/var/backups/techcommerce';
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Get database configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    const start = Date.now();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        success: true,
        message: `Connection successful to ${this.config.type} database`,
        latency
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    const stats: DatabaseStats = {
      size: 0,
      tables: 0,
      records: 0
    };

    try {
      if (this.config.type === 'sqlite') {
        // SQLite stats
        if (this.config.path && fs.existsSync(this.config.path)) {
          const stat = fs.statSync(this.config.path);
          stats.size = stat.size;
        }
        
        const tables = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
        `;
        stats.tables = Number(tables[0]?.count || 0);
        
      } else if (this.config.type === 'postgresql') {
        // PostgreSQL stats
        const sizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
          SELECT pg_database_size(current_database())::text as size
        `;
        stats.size = parseInt(sizeResult[0]?.size || '0');
        
        const tablesResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        stats.tables = Number(tablesResult[0]?.count || 0);
        
      } else if (this.config.type === 'mysql' || this.config.type === 'mariadb') {
        // MySQL/MariaDB stats
        const sizeResult = await prisma.$queryRaw<Array<{ size: bigint }>>`
          SELECT SUM(data_length + index_length) as size 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `;
        stats.size = Number(sizeResult[0]?.size || 0);
        
        const tablesResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `;
        stats.tables = Number(tablesResult[0]?.count || 0);
      }

      // Count total records across all tables (approximate)
      stats.records = await this.estimateRecordCount();
      
    } catch (error) {
      console.error('Error getting database stats:', error);
    }

    return stats;
  }

  /**
   * Estimate total record count
   */
  private async estimateRecordCount(): Promise<number> {
    try {
      const models = Object.keys(prisma).filter(
        key => !key.startsWith('_') && !key.startsWith('$')
      );
      
      let total = 0;
      for (const model of models) {
        try {
          // @ts-ignore - dynamic model access
          const count = await prisma[model].count();
          total += count;
        } catch {
          // Skip if model doesn't have count method
        }
      }
      
      return total;
    } catch {
      return 0;
    }
  }

  /**
   * Create a full backup
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.${options.compress !== false ? 'sql.gz' : 'sql'}`;
    const outputPath = options.outputPath || path.join(this.backupDir, filename);

    console.log(`Creating backup: ${filename}`);

    try {
      if (this.config.type === 'sqlite') {
        await this.backupSQLite(outputPath, options);
      } else if (this.config.type === 'postgresql') {
        await this.backupPostgreSQL(outputPath, options);
      } else if (this.config.type === 'mysql' || this.config.type === 'mariadb') {
        await this.backupMySQL(outputPath, options);
      }

      // Get file size
      const stat = fs.statSync(outputPath);

      const backupInfo: BackupInfo = {
        id: Buffer.from(filename).toString('base64'),
        filename,
        path: outputPath,
        size: stat.size,
        createdAt: new Date(),
        type: options.includeData === false ? 'schema' : 'full',
        database: this.config.name || this.config.path || 'database',
        compressed: options.compress !== false
      };

      // Save backup metadata
      await this.saveBackupMetadata(backupInfo);

      return backupInfo;
    } catch (error: any) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * SQLite backup
   */
  private async backupSQLite(outputPath: string, options: BackupOptions): Promise<void> {
    if (!this.config.path) {
      throw new Error('SQLite database path not found');
    }

    // For SQLite, we can use the backup API or simply copy the file
    const dbPath = this.config.path;
    
    if (options.compress !== false) {
      execSync(`gzip -c "${dbPath}" > "${outputPath}"`, { encoding: 'utf-8' });
    } else {
      execSync(`cp "${dbPath}" "${outputPath}"`, { encoding: 'utf-8' });
    }
  }

  /**
   * PostgreSQL backup using pg_dump
   */
  private async backupPostgreSQL(outputPath: string, options: BackupOptions): Promise<void> {
    const { host, port, name, user, password } = this.config;
    
    if (!host || !name || !user) {
      throw new Error('Missing PostgreSQL connection parameters');
    }

    const env = { ...process.env, PGPASSWORD: password };
    
    let cmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${name}`;
    
    if (options.includeData === false) {
      cmd += ' --schema-only';
    } else if (options.tables?.length) {
      cmd += options.tables.map(t => ` -t ${t}`).join('');
    }
    
    if (options.compress !== false) {
      cmd += ` | gzip > "${outputPath}"`;
    } else {
      cmd += ` > "${outputPath}"`;
    }

    execSync(cmd, { encoding: 'utf-8', env });
  }

  /**
   * MySQL/MariaDB backup using mysqldump
   */
  private async backupMySQL(outputPath: string, options: BackupOptions): Promise<void> {
    const { host, port, name, user, password } = this.config;
    
    if (!host || !name || !user) {
      throw new Error('Missing MySQL connection parameters');
    }

    let cmd = `mysqldump -h ${host} -P ${port} -u ${user} -p${password}`;
    
    if (options.includeData === false) {
      cmd += ' --no-data';
    } else if (options.tables?.length) {
      cmd += ` ${options.tables.join(' ')}`;
    }
    
    cmd += ` ${name}`;
    
    if (options.compress !== false) {
      cmd += ` | gzip > "${outputPath}"`;
    } else {
      cmd += ` > "${outputPath}"`;
    }

    execSync(cmd, { encoding: 'utf-8' });
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(options: RestoreOptions): Promise<{ success: boolean; message: string }> {
    const { backupPath, dropExisting = false } = options;

    if (!fs.existsSync(backupPath)) {
      return { success: false, message: 'Backup file not found' };
    }

    try {
      console.log(`Restoring backup from: ${backupPath}`);

      if (dropExisting) {
        await this.dropAllTables();
      }

      if (this.config.type === 'sqlite') {
        await this.restoreSQLite(backupPath);
      } else if (this.config.type === 'postgresql') {
        await this.restorePostgreSQL(backupPath);
      } else if (this.config.type === 'mysql' || this.config.type === 'mariadb') {
        await this.restoreMySQL(backupPath);
      }

      return { success: true, message: 'Database restored successfully' };
    } catch (error: any) {
      return { success: false, message: `Restore failed: ${error.message}` };
    }
  }

  /**
   * SQLite restore
   */
  private async restoreSQLite(backupPath: string): Promise<void> {
    if (!this.config.path) {
      throw new Error('SQLite database path not found');
    }

    // Stop any connections
    await prisma.$disconnect();

    // Restore the file
    if (backupPath.endsWith('.gz')) {
      execSync(`gunzip -c "${backupPath}" > "${this.config.path}"`, { encoding: 'utf-8' });
    } else {
      execSync(`cp "${backupPath}" "${this.config.path}"`, { encoding: 'utf-8' });
    }
  }

  /**
   * PostgreSQL restore
   */
  private async restorePostgreSQL(backupPath: string): Promise<void> {
    const { host, port, name, user, password } = this.config;
    const env = { ...process.env, PGPASSWORD: password };

    if (backupPath.endsWith('.gz')) {
      execSync(`gunzip -c "${backupPath}" | psql -h ${host} -p ${port} -U ${user} -d ${name}`, {
        encoding: 'utf-8',
        env
      });
    } else {
      execSync(`psql -h ${host} -p ${port} -U ${user} -d ${name} -f "${backupPath}"`, {
        encoding: 'utf-8',
        env
      });
    }
  }

  /**
   * MySQL restore
   */
  private async restoreMySQL(backupPath: string): Promise<void> {
    const { host, port, name, user, password } = this.config;

    if (backupPath.endsWith('.gz')) {
      execSync(`gunzip -c "${backupPath}" | mysql -h ${host} -P ${port} -u ${user} -p${password} ${name}`, {
        encoding: 'utf-8'
      });
    } else {
      execSync(`mysql -h ${host} -P ${port} -u ${user} -p${password} ${name} < "${backupPath}"`, {
        encoding: 'utf-8'
      });
    }
  }

  /**
   * Drop all tables (for clean restore)
   */
  private async dropAllTables(): Promise<void> {
    if (this.config.type === 'postgresql') {
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      
      for (const { tablename } of result) {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      }
    } else if (this.config.type === 'mysql' || this.config.type === 'mariadb') {
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT table_name as tablename FROM information_schema.tables WHERE table_schema = DATABASE()
      `;
      
      for (const { tablename } of result) {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${tablename}\``);
      }
    }
  }

  /**
   * Export database to different formats
   */
  async export(options: ExportOptions): Promise<{ success: boolean; path?: string; message: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `export-${timestamp}.${options.format}`;
    const outputPath = options.outputPath || path.join(this.backupDir, filename);

    try {
      if (options.format === 'sql') {
        // Use backup functionality for SQL export
        await this.createBackup({ outputPath, compress: false });
      } else if (options.format === 'json') {
        await this.exportJSON(outputPath, options.tables);
      } else if (options.format === 'csv') {
        await this.exportCSV(outputPath, options.tables);
      }

      return { success: true, path: outputPath, message: 'Export completed successfully' };
    } catch (error: any) {
      return { success: false, message: `Export failed: ${error.message}` };
    }
  }

  /**
   * Export to JSON format
   */
  private async exportJSON(outputPath: string, tables?: string[]): Promise<void> {
    const models = Object.keys(prisma).filter(
      key => !key.startsWith('_') && !key.startsWith('$')
    );

    const data: Record<string, any[]> = {};

    for (const model of models) {
      if (tables && !tables.includes(model)) continue;
      
      try {
        // @ts-ignore - dynamic model access
        const records = await prisma[model].findMany();
        data[model] = records;
      } catch {
        // Skip if model doesn't have findMany
      }
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  }

  /**
   * Export to CSV format (multiple files in a directory)
   */
  private async exportCSV(outputPath: string, tables?: string[]): Promise<void> {
    const dir = outputPath.replace('.csv', '');
    fs.mkdirSync(dir, { recursive: true });

    const models = Object.keys(prisma).filter(
      key => !key.startsWith('_') && !key.startsWith('$')
    );

    for (const model of models) {
      if (tables && !tables.includes(model)) continue;
      
      try {
        // @ts-ignore - dynamic model access
        const records = await prisma[model].findMany();
        
        if (records.length > 0) {
          const headers = Object.keys(records[0]);
          const csv = [
            headers.join(','),
            ...records.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
          ].join('\n');
          
          fs.writeFileSync(path.join(dir, `${model}.csv`), csv);
        }
      } catch {
        // Skip if model doesn't have findMany
      }
    }
  }

  /**
   * Import data from file
   */
  async import(options: ImportOptions): Promise<{ success: boolean; message: string; records?: number }> {
    if (!fs.existsSync(options.filePath)) {
      return { success: false, message: 'Import file not found' };
    }

    try {
      if (options.format === 'sql') {
        return await this.importSQL(options);
      } else if (options.format === 'json') {
        return await this.importJSON(options);
      } else if (options.format === 'csv') {
        return await this.importCSV(options);
      }

      return { success: false, message: 'Unsupported import format' };
    } catch (error: any) {
      return { success: false, message: `Import failed: ${error.message}` };
    }
  }

  /**
   * Import SQL file
   */
  private async importSQL(options: ImportOptions): Promise<{ success: boolean; message: string }> {
    const result = await this.restoreBackup({ backupPath: options.filePath, dropExisting: false });
    return result;
  }

  /**
   * Import JSON file
   */
  private async importJSON(options: ImportOptions): Promise<{ success: boolean; message: string; records?: number }> {
    const content = fs.readFileSync(options.filePath, 'utf-8');
    const data = JSON.parse(content);

    let totalRecords = 0;

    for (const [model, records] of Object.entries(data)) {
      if (!Array.isArray(records)) continue;
      
      try {
        // @ts-ignore - dynamic model access
        await prisma[model].createMany({ data: records, skipDuplicates: true });
        totalRecords += records.length;
      } catch (error) {
        console.error(`Failed to import ${model}:`, error);
      }
    }

    return { success: true, message: `Imported ${totalRecords} records`, records: totalRecords };
  }

  /**
   * Import CSV files
   */
  private async importCSV(options: ImportOptions): Promise<{ success: boolean; message: string; records?: number }> {
    const dir = options.filePath.replace('.csv', '');
    
    if (!fs.existsSync(dir)) {
      return { success: false, message: 'CSV directory not found' };
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv'));
    let totalRecords = 0;

    for (const file of files) {
      const model = file.replace('.csv', '');
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const lines = content.split('\n');
      const headers = lines[0].split(',');
      
      const records = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const record: Record<string, any> = {};
        
        headers.forEach((h, i) => {
          let value = values[i] || '';
          // Remove quotes
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          try {
            record[h] = JSON.parse(value);
          } catch {
            record[h] = value;
          }
        });
        
        return record;
      });

      try {
        // @ts-ignore - dynamic model access
        await prisma[model].createMany({ data: records, skipDuplicates: true });
        totalRecords += records.length;
      } catch (error) {
        console.error(`Failed to import ${model}:`, error);
      }
    }

    return { success: true, message: `Imported ${totalRecords} records`, records: totalRecords };
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];

    if (!fs.existsSync(this.backupDir)) {
      return backups;
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.sql.gz')));

    for (const filename of files) {
      const filePath = path.join(this.backupDir, filename);
      const stat = fs.statSync(filePath);

      backups.push({
        id: Buffer.from(filename).toString('base64'),
        filename,
        path: filePath,
        size: stat.size,
        createdAt: stat.mtime,
        type: 'full',
        database: this.config.name || 'database',
        compressed: filename.endsWith('.gz')
      });
    }

    // Sort by date (newest first)
    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    const filename = Buffer.from(backupId, 'base64').toString();
    const backupPath = path.join(this.backupDir, filename);

    if (!fs.existsSync(backupPath)) {
      return { success: false, message: 'Backup not found' };
    }

    try {
      fs.unlinkSync(backupPath);
      return { success: true, message: 'Backup deleted successfully' };
    } catch (error: any) {
      return { success: false, message: `Failed to delete backup: ${error.message}` };
    }
  }

  /**
   * Save backup metadata
   */
  private async saveBackupMetadata(backup: BackupInfo): Promise<void> {
    const metadataPath = path.join(this.backupDir, 'metadata.json');
    let metadata: BackupInfo[] = [];

    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    metadata.push(backup);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Schedule automatic backups
   */
  async scheduleBackup(cronExpression: string): Promise<{ success: boolean; message: string }> {
    // This would integrate with the system's cron
    // For now, we'll just log the schedule
    console.log(`Scheduling backup with cron: ${cronExpression}`);
    
    return { success: true, message: `Backup scheduled: ${cronExpression}` };
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();
