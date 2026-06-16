#!/usr/bin/env bun
/**
 * TechCommerce Platform - Database Initialization Script
 * Automatically creates database if it doesn't exist
 * Supports: SQLite, MySQL, MariaDB, PostgreSQL
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DatabaseConfig {
  type: 'sqlite' | 'mysql' | 'postgresql' | 'mariadb';
  host?: string;
  port?: number;
  name?: string;
  user?: string;
  password?: string;
  url: string;
}

// Colors for console output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  reset: '\x1b[0m'
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`
  };
  console.log(`${prefix[type]} ${message}`);
}

/**
 * Parse DATABASE_URL to extract configuration
 */
function parseDatabaseUrl(url: string): DatabaseConfig {
  // SQLite format: file:/path/to/db.db
  if (url.startsWith('file:')) {
    return {
      type: 'sqlite',
      url: url
    };
  }

  // Parse connection URL
  // Format: postgresql://user:password@host:port/database
  // Format: mysql://user:password@host:port/database
  const regex = /^(postgresql|mysql|mariadb):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = url.match(regex);

  if (!match) {
    throw new Error(`Invalid DATABASE_URL format: ${url}`);
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
 * Check if PostgreSQL database exists
 */
async function checkPostgreSQLExists(config: DatabaseConfig): Promise<boolean> {
  try {
    // Connect to postgres database to check if our database exists
    const result = execSync(
      `PGPASSWORD="${config.password}" psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${config.name}'"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.trim() === '1';
  } catch (error) {
    return false;
  }
}

/**
 * Create PostgreSQL database
 */
async function createPostgreSQLDatabase(config: DatabaseConfig): Promise<boolean> {
  try {
    log(`Creating PostgreSQL database "${config.name}"...`, 'info');
    
    execSync(
      `PGPASSWORD="${config.password}" psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -c "CREATE DATABASE \\"${config.name}\\" ENCODING 'UTF8'"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    log(`PostgreSQL database "${config.name}" created successfully!`, 'success');
    return true;
  } catch (error: any) {
    log(`Failed to create PostgreSQL database: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Check if MySQL/MariaDB database exists
 */
async function checkMySQLEnists(config: DatabaseConfig): Promise<boolean> {
  try {
    const result = execSync(
      `mysql -h ${config.host} -P ${config.port} -u ${config.user} -p${config.password} -e "SHOW DATABASES LIKE '${config.name}'"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.includes(config.name!);
  } catch (error) {
    return false;
  }
}

/**
 * Create MySQL/MariaDB database
 */
async function createMySQLDatabase(config: DatabaseConfig): Promise<boolean> {
  try {
    log(`Creating MySQL/MariaDB database "${config.name}"...`, 'info');
    
    execSync(
      `mysql -h ${config.host} -P ${config.port} -u ${config.user} -p${config.password} -e "CREATE DATABASE \`${config.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    log(`MySQL/MariaDB database "${config.name}" created successfully!`, 'success');
    return true;
  } catch (error: any) {
    log(`Failed to create MySQL database: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Ensure SQLite database directory exists
 */
async function ensureSQLiteDirectory(config: DatabaseConfig): Promise<boolean> {
  try {
    const dbPath = config.url.replace('file:', '');
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      log(`Creating SQLite directory: ${dbDir}`, 'info');
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    log(`SQLite database path: ${dbPath}`, 'info');
    return true;
  } catch (error: any) {
    log(`Failed to create SQLite directory: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test database connection
 */
async function testConnection(config: DatabaseConfig): Promise<boolean> {
  try {
    log('Testing database connection...', 'info');
    
    // Use Prisma to test connection
    execSync('bunx prisma db execute --stdin <<< "SELECT 1"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    log('Database connection successful!', 'success');
    return true;
  } catch (error: any) {
    log(`Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Run Prisma migrations
 */
async function runPrismaSetup(): Promise<boolean> {
  try {
    log('Generating Prisma client...', 'info');
    execSync('bunx prisma generate', { encoding: 'utf-8', stdio: 'inherit' });
    
    log('Pushing database schema...', 'info');
    execSync('bunx prisma db push', { encoding: 'utf-8', stdio: 'inherit' });
    
    log('Database schema created successfully!', 'success');
    return true;
  } catch (error: any) {
    log(`Failed to setup database schema: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main initialization function
 */
async function initDatabase(): Promise<void> {
  console.log(`\n${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  TechCommerce Platform - Database Initialization${colors.reset}`);
  console.log(`${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log('DATABASE_URL environment variable not found!', 'error');
    log('Please create a .env file with DATABASE_URL', 'warning');
    process.exit(1);
  }

  log(`Database URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`, 'info');

  // Parse database configuration
  let config: DatabaseConfig;
  try {
    config = parseDatabaseUrl(databaseUrl);
    log(`Database type: ${config.type}`, 'info');
  } catch (error: any) {
    log(`Failed to parse DATABASE_URL: ${error.message}`, 'error');
    process.exit(1);
  }

  // Handle each database type
  switch (config.type) {
    case 'sqlite':
      await ensureSQLiteDirectory(config);
      break;
    
    case 'postgresql':
      const pgExists = await checkPostgreSQLExists(config);
      if (!pgExists) {
        const created = await createPostgreSQLDatabase(config);
        if (!created) {
          log('Failed to create PostgreSQL database. Please create it manually.', 'error');
          process.exit(1);
        }
      } else {
        log(`PostgreSQL database "${config.name}" already exists`, 'success');
      }
      break;
    
    case 'mysql':
    case 'mariadb':
      const mysqlExists = await checkMySQLEnists(config);
      if (!mysqlExists) {
        const created = await createMySQLDatabase(config);
        if (!created) {
          log('Failed to create MySQL/MariaDB database. Please create it manually.', 'error');
          process.exit(1);
        }
      } else {
        log(`MySQL/MariaDB database "${config.name}" already exists`, 'success');
      }
      break;
  }

  // Test connection
  const connectionOk = await testConnection(config);
  if (!connectionOk) {
    log('Database connection failed. Please check your configuration.', 'error');
    process.exit(1);
  }

  // Run Prisma setup
  const schemaOk = await runPrismaSetup();
  if (!schemaOk) {
    log('Failed to setup database schema.', 'error');
    process.exit(1);
  }

  console.log(`\n${colors.green}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}  Database initialization completed successfully!${colors.reset}`);
  console.log(`${colors.green}══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run initialization
initDatabase().catch((error) => {
  log(`Initialization failed: ${error.message}`, 'error');
  process.exit(1);
});
