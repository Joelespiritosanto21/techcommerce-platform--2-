/**
 * TechCommerce Hosting Manager
 * Sistema próprio de gestão de hosting
 */

import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

// Types
export interface Website {
  id: string
  domain: string
  type: 'nodejs' | 'php' | 'static' | 'python' | 'reverse-proxy'
  status: 'pending' | 'active' | 'suspended' | 'error'
  documentRoot: string
  port?: number
  processId?: string
  sslEnabled: boolean
  sslExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

export interface WebsiteConfig {
  domain: string
  type: 'nodejs' | 'php' | 'static' | 'python' | 'reverse-proxy'
  documentRoot?: string
  port?: number
  envVars?: Record<string, string>
  phpVersion?: string
  nodeVersion?: string
  pythonVersion?: string
  upstreamUrl?: string
  sslEnabled?: boolean
  autoSSL?: boolean
}

export interface Database {
  id: string
  name: string
  type: 'mysql' | 'postgresql' | 'mongodb' | 'redis'
  username: string
  password: string
  size: number
  websiteId?: string
  createdAt: Date
}

export interface Backup {
  id: string
  websiteId: string
  type: 'full' | 'database' | 'files'
  size: number
  status: 'pending' | 'completed' | 'failed'
  path: string
  createdAt: Date
}

export interface WebsiteMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  bandwidth: {
    in: number
    out: number
  }
  requests: number
  uptime: number
}

// Hosting Manager Class
export class HostingManager {
  private configPath: string
  private sitesPath: string
  private logsPath: string
  private backupsPath: string
  private caddyConfigPath: string
  private processes: Map<string, ChildProcess>

  constructor() {
    this.configPath = process.env.HOSTING_CONFIG_PATH || '/etc/techcommerce/hosting'
    this.sitesPath = process.env.HOSTING_SITES_PATH || '/var/www'
    this.logsPath = process.env.HOSTING_LOGS_PATH || '/var/log/techcommerce'
    this.backupsPath = process.env.HOSTING_BACKUPS_PATH || '/var/backups/techcommerce'
    this.caddyConfigPath = process.env.CADDY_CONFIG_PATH || '/etc/caddy'
    this.processes = new Map()
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    // Create necessary directories
    const dirs = [
      this.configPath,
      this.sitesPath,
      this.logsPath,
      this.backupsPath,
      path.join(this.configPath, 'sites'),
      path.join(this.configPath, 'ssl'),
      path.join(this.configPath, 'processes'),
    ]

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true })
      } catch (e) {
        // Directory already exists
      }
    }

    // Initialize Caddy configuration
    await this.initCaddyConfig()
  }

  // ============================================
  // WEBSITE MANAGEMENT
  // ============================================

  async createWebsite(config: WebsiteConfig): Promise<Website> {
    const id = this.generateId()
    const documentRoot = config.documentRoot || path.join(this.sitesPath, config.domain)
    const port = config.port || await this.getAvailablePort()

    // Create website directory
    await fs.mkdir(documentRoot, { recursive: true })

    // Create website configuration
    const website: Website = {
      id,
      domain: config.domain,
      type: config.type,
      status: 'pending',
      documentRoot,
      port,
      sslEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save website config
    await this.saveWebsiteConfig(website)

    // Setup based on type
    switch (config.type) {
      case 'nodejs':
        await this.setupNodejsSite(website, config)
        break
      case 'php':
        await this.setupPhpSite(website, config)
        break
      case 'static':
        await this.setupStaticSite(website, config)
        break
      case 'python':
        await this.setupPythonSite(website, config)
        break
      case 'reverse-proxy':
        await this.setupReverseProxy(website, config)
        break
    }

    // Add to Caddy
    await this.addCaddySite(website, config)

    // Start the process if needed
    if (config.type === 'nodejs' || config.type === 'python') {
      await this.startProcess(website)
    }

    // Update status
    website.status = 'active'
    await this.saveWebsiteConfig(website)

    return website
  }

  async deleteWebsite(id: string): Promise<void> {
    const website = await this.getWebsite(id)
    if (!website) throw new Error('Website not found')

    // Stop process if running
    if (website.processId) {
      await this.stopProcess(website)
    }

    // Remove from Caddy
    await this.removeCaddySite(website)

    // Remove SSL certificate
    if (website.sslEnabled) {
      await this.removeSSLCertificate(website.domain)
    }

    // Delete website files (optional)
    // await fs.rm(website.documentRoot, { recursive: true })

    // Remove config
    await fs.unlink(path.join(this.configPath, 'sites', `${id}.json`))
  }

  async getWebsite(id: string): Promise<Website | null> {
    try {
      const data = await fs.readFile(path.join(this.configPath, 'sites', `${id}.json`), 'utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async listWebsites(): Promise<Website[]> {
    const sitesDir = path.join(this.configPath, 'sites')
    const files = await fs.readdir(sitesDir)
    const websites: Website[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(sitesDir, file), 'utf-8')
        websites.push(JSON.parse(data))
      }
    }

    return websites
  }

  // ============================================
  // PROCESS MANAGEMENT
  // ============================================

  async startProcess(website: Website): Promise<void> {
    if (website.type === 'static') return

    let command: string
    let args: string[]
    let cwd = website.documentRoot

    switch (website.type) {
      case 'nodejs':
        command = 'node'
        args = ['server.js']
        break
      case 'python':
        command = 'python3'
        args = ['app.py']
        break
      case 'php':
        // PHP-FPM is managed differently
        await this.startPhpFpm(website)
        return
      default:
        return
    }

    const process = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        PORT: website.port?.toString(),
        NODE_ENV: 'production'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.processes.set(website.id, process)

    // Handle logs
    process.stdout?.on('data', (data) => {
      this.log(website.id, 'stdout', data.toString())
    })

    process.stderr?.on('data', (data) => {
      this.log(website.id, 'stderr', data.toString())
    })

    process.on('exit', (code) => {
      this.processes.delete(website.id)
      this.log(website.id, 'exit', `Process exited with code ${code}`)
    })
  }

  async stopProcess(website: Website): Promise<void> {
    const process = this.processes.get(website.id)
    if (process) {
      process.kill('SIGTERM')
      this.processes.delete(website.id)
    }
  }

  async restartProcess(website: Website): Promise<void> {
    await this.stopProcess(website)
    await this.startProcess(website)
  }

  // ============================================
  // SSL MANAGEMENT
  // ============================================

  async enableSSL(domain: string): Promise<{ certificate: string; expiry: Date }> {
    // Use Caddy's automatic HTTPS
    const caddyConfig = await this.getCaddyConfig()
    
    // Add domain to Caddy with automatic HTTPS
    const newConfig = this.updateCaddyDomain(caddyConfig, domain, true)
    await this.reloadCaddy(newConfig)

    // Wait for certificate to be obtained
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get certificate info
    const certPath = path.join(this.caddyConfigPath, 'certificates', 'acme-v02.api.letsencrypt.org-directory', domain, `${domain}.crt`)
    
    // Update website config
    const websites = await this.listWebsites()
    const website = websites.find(w => w.domain === domain)
    if (website) {
      website.sslEnabled = true
      website.sslExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      await this.saveWebsiteConfig(website)
    }

    return {
      certificate: certPath,
      expiry: website?.sslExpiry || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    }
  }

  async disableSSL(domain: string): Promise<void> {
    const caddyConfig = await this.getCaddyConfig()
    const newConfig = this.updateCaddyDomain(caddyConfig, domain, false)
    await this.reloadCaddy(newConfig)
  }

  async renewSSL(domain: string): Promise<void> {
    // Caddy auto-renews, but we can force it
    await execAsync(`caddy reload --config ${this.caddyConfigPath}/Caddyfile`)
  }

  // ============================================
  // DATABASE MANAGEMENT
  // ============================================

  async createDatabase(params: {
    name: string
    type: 'mysql' | 'postgresql' | 'mongodb' | 'redis'
    websiteId?: string
  }): Promise<Database> {
    const id = this.generateId()
    const username = `user_${id.substring(0, 8)}`
    const password = this.generatePassword()

    switch (params.type) {
      case 'mysql':
        await this.createMySQLDatabase(params.name, username, password)
        break
      case 'postgresql':
        await this.createPostgreSQLDatabase(params.name, username, password)
        break
      case 'mongodb':
        await this.createMongoDBDatabase(params.name, username, password)
        break
      case 'redis':
        // Redis doesn't have databases in the same way
        break
    }

    const db: Database = {
      id,
      name: params.name,
      type: params.type,
      username,
      password,
      size: 0,
      websiteId: params.websiteId,
      createdAt: new Date()
    }

    await this.saveDatabaseConfig(db)

    return db
  }

  async deleteDatabase(id: string): Promise<void> {
    const db = await this.getDatabase(id)
    if (!db) throw new Error('Database not found')

    switch (db.type) {
      case 'mysql':
        await this.deleteMySQLDatabase(db.name, db.username)
        break
      case 'postgresql':
        await this.deletePostgreSQLDatabase(db.name, db.username)
        break
      case 'mongodb':
        await this.deleteMongoDBDatabase(db.name)
        break
    }

    await fs.unlink(path.join(this.configPath, 'databases', `${id}.json`))
  }

  // ============================================
  // BACKUP MANAGEMENT
  // ============================================

  async createBackup(websiteId: string, type: 'full' | 'database' | 'files' = 'full'): Promise<Backup> {
    const website = await this.getWebsite(websiteId)
    if (!website) throw new Error('Website not found')

    const id = this.generateId()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(this.backupsPath, `${website.domain}-${timestamp}.tar.gz`)

    const backup: Backup = {
      id,
      websiteId,
      type,
      size: 0,
      status: 'pending',
      path: backupPath,
      createdAt: new Date()
    }

    // Start backup in background
    this.performBackup(backup, website)

    return backup
  }

  private async performBackup(backup: Backup, website: Website): Promise<void> {
    try {
      const backupDir = path.join(this.backupsPath, `temp_${backup.id}`)
      await fs.mkdir(backupDir, { recursive: true })

      // Backup files
      if (backup.type === 'full' || backup.type === 'files') {
        await execAsync(`cp -r ${website.documentRoot} ${backupDir}/www`)
      }

      // Backup database
      if (backup.type === 'full' || backup.type === 'database') {
        // Get associated databases and dump them
        const dbs = await this.getWebsiteDatabases(website.id)
        for (const db of dbs) {
          await this.dumpDatabase(db, path.join(backupDir, `db_${db.name}.sql`))
        }
      }

      // Create archive
      await execAsync(`tar -czf ${backup.path} -C ${backupDir} .`)
      await fs.rm(backupDir, { recursive: true })

      // Update backup status
      const stat = await fs.stat(backup.path)
      backup.size = stat.size
      backup.status = 'completed'
      await this.saveBackupConfig(backup)

    } catch (error) {
      backup.status = 'failed'
      await this.saveBackupConfig(backup)
      console.error('Backup failed:', error)
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    const backup = await this.getBackup(backupId)
    if (!backup || backup.status !== 'completed') {
      throw new Error('Backup not found or not completed')
    }

    const website = await this.getWebsite(backup.websiteId)
    if (!website) throw new Error('Website not found')

    const restoreDir = path.join(this.backupsPath, `restore_${backup.id}`)
    await fs.mkdir(restoreDir, { recursive: true })

    // Extract backup
    await execAsync(`tar -xzf ${backup.path} -C ${restoreDir}`)

    // Restore files
    const wwwDir = path.join(restoreDir, 'www')
    try {
      await fs.access(wwwDir)
      await fs.rm(website.documentRoot, { recursive: true })
      await execAsync(`mv ${wwwDir} ${website.documentRoot}`)
    } catch {
      // No files in backup
    }

    // Restore databases
    const dbFiles = (await fs.readdir(restoreDir)).filter(f => f.startsWith('db_'))
    for (const dbFile of dbFiles) {
      const dbName = dbFile.replace('db_', '').replace('.sql', '')
      await this.restoreDatabase(dbName, path.join(restoreDir, dbFile))
    }

    // Cleanup
    await fs.rm(restoreDir, { recursive: true })

    // Restart process
    await this.restartProcess(website)
  }

  // ============================================
  // METRICS
  // ============================================

  async getMetrics(websiteId: string): Promise<WebsiteMetrics> {
    const website = await this.getWebsite(websiteId)
    if (!website) throw new Error('Website not found')

    // Get disk usage
    const { stdout: diskUsage } = await execAsync(`du -sb ${website.documentRoot} 2>/dev/null || echo 0`)
    const diskBytes = parseInt(diskUsage.split('\t')[0]) || 0

    // Get CPU/Memory for process
    let cpuUsage = 0
    let memoryUsage = 0

    const process = this.processes.get(websiteId)
    if (process && process.pid) {
      try {
        const { stdout } = await execAsync(`ps -p ${process.pid} -o %cpu,%mem --no-headers`)
        const [cpu, mem] = stdout.trim().split(/\s+/)
        cpuUsage = parseFloat(cpu) || 0
        memoryUsage = parseFloat(mem) || 0
      } catch {
        // Process might have exited
      }
    }

    // Get bandwidth from logs (simplified)
    const logPath = path.join(this.logsPath, websiteId, 'access.log')
    let bandwidthIn = 0
    let bandwidthOut = 0
    let requests = 0

    try {
      const { stdout: lineCount } = await execAsync(`wc -l ${logPath} 2>/dev/null || echo 0`)
      requests = parseInt(lineCount.split(' ')[0]) || 0
    } catch {
      // No logs yet
    }

    // Calculate uptime
    const uptime = Date.now() - website.createdAt.getTime()

    return {
      cpuUsage,
      memoryUsage,
      diskUsage: diskBytes,
      bandwidth: {
        in: bandwidthIn,
        out: bandwidthOut
      },
      requests,
      uptime
    }
  }

  // ============================================
  // CADDY CONFIGURATION
  // ============================================

  private async initCaddyConfig(): Promise<void> {
    const caddyfilePath = path.join(this.caddyConfigPath, 'Caddyfile')
    
    try {
      await fs.access(caddyfilePath)
    } catch {
      // Create default Caddyfile
      const defaultConfig = `
# TechCommerce Hosting - Caddy Configuration
# This file is auto-generated

# Admin API
{
  admin off
  # Enable for remote management:
  # admin 0.0.0.0:2019
}

# Default site (catch-all)
:80 {
  respond "TechCommerce Hosting - Site Not Configured" 404
}
`
      await fs.writeFile(caddyfilePath, defaultConfig)
    }
  }

  private async addCaddySite(website: Website, config: WebsiteConfig): Promise<void> {
    const siteConfig = this.generateCaddySiteConfig(website, config)
    const caddyfilePath = path.join(this.caddyConfigPath, 'Caddyfile')

    // Append site configuration
    await fs.appendFile(caddyfilePath, `\n${siteConfig}\n`)

    // Reload Caddy
    await this.reloadCaddy()
  }

  private async removeCaddySite(website: Website): Promise<void> {
    const caddyfilePath = path.join(this.caddyConfigPath, 'Caddyfile')
    let content = await fs.readFile(caddyfilePath, 'utf-8')

    // Remove site configuration
    const regex = new RegExp(`\n# Site: ${website.domain}[\\s\\S]*?(?=\\n# Site:|$)`, 'g')
    content = content.replace(regex, '')

    await fs.writeFile(caddyfilePath, content)
    await this.reloadCaddy()
  }

  private generateCaddySiteConfig(website: Website, config: WebsiteConfig): string {
    const domain = website.domain
    const root = website.documentRoot
    const port = website.port

    let configStr = `
# Site: ${domain}
${domain} {
  root * ${root}
  log {
    output file ${path.join(this.logsPath, website.id, 'access.log')}
  }
`

    switch (website.type) {
      case 'static':
        configStr += `
  file_server
  encode gzip
`
        break

      case 'php':
        configStr += `
  php_fastcgi unix//run/php/php-fpm.sock
  file_server
  encode gzip
`
        break

      case 'nodejs':
      case 'python':
        configStr += `
  reverse_proxy localhost:${port}
  encode gzip
`
        break

      case 'reverse-proxy':
        if (config.upstreamUrl) {
          configStr += `
  reverse_proxy ${config.upstreamUrl}
  encode gzip
`
        }
        break
    }

    // SSL is handled automatically by Caddy for public domains

    configStr += `}`

    return configStr
  }

  private async reloadCaddy(config?: string): Promise<void> {
    if (config) {
      await fs.writeFile(path.join(this.caddyConfigPath, 'Caddyfile'), config)
    }
    
    try {
      await execAsync('caddy reload --config ' + path.join(this.caddyConfigPath, 'Caddyfile'))
    } catch (error) {
      console.error('Failed to reload Caddy:', error)
      // Try to validate config
      try {
        await execAsync('caddy validate --config ' + path.join(this.caddyConfigPath, 'Caddyfile'))
      } catch (validateError) {
        console.error('Caddy config validation failed:', validateError)
        throw new Error('Invalid Caddy configuration')
      }
    }
  }

  // ============================================
  // DATABASE HELPERS
  // ============================================

  private async createMySQLDatabase(name: string, username: string, password: string): Promise<void> {
    await execAsync(`mysql -u root -e "CREATE DATABASE ${name};"`)
    await execAsync(`mysql -u root -e "CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}';"`)
    await execAsync(`mysql -u root -e "GRANT ALL PRIVILEGES ON ${name}.* TO '${username}'@'localhost';"`)
    await execAsync(`mysql -u root -e "FLUSH PRIVILEGES;"`)
  }

  private async createPostgreSQLDatabase(name: string, username: string, password: string): Promise<void> {
    await execAsync(`sudo -u postgres psql -c "CREATE DATABASE ${name};"`)
    await execAsync(`sudo -u postgres psql -c "CREATE USER ${username} WITH PASSWORD '${password}';"`)
    await execAsync(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${name} TO ${username};"`)
  }

  private async createMongoDBDatabase(name: string, username: string, password: string): Promise<void> {
    await execAsync(`mongosh --eval "db.getSiblingDB('${name}').createUser({user: '${username}', pwd: '${password}', roles: [{role: 'readWrite', db: '${name}'}]})"`)
  }

  private async deleteMySQLDatabase(name: string, username: string): Promise<void> {
    await execAsync(`mysql -u root -e "DROP DATABASE IF EXISTS ${name};"`)
    await execAsync(`mysql -u root -e "DROP USER IF EXISTS '${username}'@'localhost';"`)
  }

  private async deletePostgreSQLDatabase(name: string, username: string): Promise<void> {
    await execAsync(`sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${name};"`)
    await execAsync(`sudo -u postgres psql -c "DROP USER IF EXISTS ${username};"`)
  }

  private async deleteMongoDBDatabase(name: string): Promise<void> {
    await execAsync(`mongosh --eval "db.getSiblingDB('${name}').dropDatabase()"`)
  }

  private async dumpDatabase(db: Database, outputPath: string): Promise<void> {
    switch (db.type) {
      case 'mysql':
        await execAsync(`mysqldump -u ${db.username} -p${db.password} ${db.name} > ${outputPath}`)
        break
      case 'postgresql':
        await execAsync(`pg_dump -U ${db.username} ${db.name} > ${outputPath}`, {
          env: { ...process.env, PGPASSWORD: db.password }
        })
        break
      case 'mongodb':
        await execAsync(`mongodump --db ${db.name} --out ${outputPath}`)
        break
    }
  }

  private async restoreDatabase(name: string, sqlPath: string): Promise<void> {
    // Get database info
    const db = await this.getDatabaseByName(name)
    if (!db) return

    switch (db.type) {
      case 'mysql':
        await execAsync(`mysql -u ${db.username} -p${db.password} ${db.name} < ${sqlPath}`)
        break
      case 'postgresql':
        await execAsync(`psql -U ${db.username} ${db.name} < ${sqlPath}`, {
          env: { ...process.env, PGPASSWORD: db.password }
        })
        break
      case 'mongodb':
        await execAsync(`mongorestore --db ${db.name} ${sqlPath}`)
        break
    }
  }

  // ============================================
  // SITE SETUP HELPERS
  // ============================================

  private async setupNodejsSite(website: Website, config: WebsiteConfig): Promise<void> {
    const appDir = website.documentRoot

    // Check for package.json
    try {
      await fs.access(path.join(appDir, 'package.json'))
    } catch {
      // Create default package.json
      const packageJson = {
        name: website.domain.replace(/\./g, '-'),
        version: '1.0.0',
        scripts: {
          start: 'node server.js'
        },
        dependencies: {}
      }
      await fs.writeFile(path.join(appDir, 'package.json'), JSON.stringify(packageJson, null, 2))

      // Create default server.js
      const serverJs = `
const http = require('http');
const port = process.env.PORT || ${website.port};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello from ${website.domain}</h1>');
});

server.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`
      await fs.writeFile(path.join(appDir, 'server.js'), serverJs)
    }

    // Install dependencies if node_modules doesn't exist
    try {
      await fs.access(path.join(appDir, 'node_modules'))
    } catch {
      await execAsync('npm install --production', { cwd: appDir })
    }
  }

  private async setupPhpSite(website: Website, config: WebsiteConfig): Promise<void> {
    const appDir = website.documentRoot
    const phpVersion = config.phpVersion || '8.1'

    // Create default index.php if doesn't exist
    try {
      await fs.access(path.join(appDir, 'index.php'))
    } catch {
      const indexPhp = `<?php
echo '<h1>Hello from ${website.domain}</h1>';
echo '<p>PHP version: ' . phpversion() . '</p>';
`
      await fs.writeFile(path.join(appDir, 'index.php'), indexPhp)
    }

    // Create PHP-FPM pool config
    await this.createPhpFpmPool(website, phpVersion)
  }

  private async setupStaticSite(website: Website, config: WebsiteConfig): Promise<void> {
    const appDir = website.documentRoot

    // Create default index.html if doesn't exist
    try {
      await fs.access(path.join(appDir, 'index.html'))
    } catch {
      const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${website.domain}</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>Welcome to ${website.domain}</h1>
  <p>Your static website is ready.</p>
</body>
</html>`
      await fs.writeFile(path.join(appDir, 'index.html'), indexHtml)
    }
  }

  private async setupPythonSite(website: Website, config: WebsiteConfig): Promise<void> {
    const appDir = website.documentRoot

    // Create default app.py if doesn't exist
    try {
      await fs.access(path.join(appDir, 'app.py'))
    } catch {
      const appPy = `from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return '<h1>Hello from ${website.domain}</h1>'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=${website.port || 3000})
`
      await fs.writeFile(path.join(appDir, 'app.py'), appPy)

      // Create requirements.txt
      await fs.writeFile(path.join(appDir, 'requirements.txt'), 'flask==2.3.0\n')
    }

    // Create virtual environment and install dependencies
    try {
      await fs.access(path.join(appDir, 'venv'))
    } catch {
      await execAsync(`python3 -m venv ${path.join(appDir, 'venv')}`)
      await execAsync(`${path.join(appDir, 'venv', 'bin', 'pip')} install -r ${path.join(appDir, 'requirements.txt')}`)
    }
  }

  private async setupReverseProxy(website: Website, config: WebsiteConfig): Promise<void> {
    // Just needs Caddy configuration which is handled elsewhere
  }

  private async createPhpFpmPool(website: Website, phpVersion: string): Promise<void> {
    const poolConfig = `[${website.domain}]
user = www-data
group = www-data
listen = /run/php/${website.domain}.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[open_basedir] = ${website.documentRoot}
`

    const poolPath = `/etc/php/${phpVersion}/fpm/pool.d/${website.domain}.conf`
    await fs.writeFile(poolPath, poolConfig)
    await execAsync(`systemctl restart php${phpVersion}-fpm`)
  }

  private async startPhpFpm(website: Website): Promise<void> {
    // PHP-FPM is managed by systemd
    // Already handled in createPhpFpmPool
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generatePassword(length: number = 24): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  private async getAvailablePort(): Promise<number> {
    const startPort = 3000
    const endPort = 65535
    
    for (let port = startPort; port < endPort; port++) {
      try {
        const { stdout } = await execAsync(`netstat -tuln | grep :${port} || true`)
        if (!stdout.trim()) {
          return port
        }
      } catch {
        return port
      }
    }
    
    throw new Error('No available ports')
  }

  private async saveWebsiteConfig(website: Website): Promise<void> {
    await fs.writeFile(
      path.join(this.configPath, 'sites', `${website.id}.json`),
      JSON.stringify(website, null, 2)
    )
  }

  private async saveDatabaseConfig(db: Database): Promise<void> {
    const dbDir = path.join(this.configPath, 'databases')
    await fs.mkdir(dbDir, { recursive: true })
    await fs.writeFile(
      path.join(dbDir, `${db.id}.json`),
      JSON.stringify(db, null, 2)
    )
  }

  private async saveBackupConfig(backup: Backup): Promise<void> {
    const backupDir = path.join(this.configPath, 'backups')
    await fs.mkdir(backupDir, { recursive: true })
    await fs.writeFile(
      path.join(backupDir, `${backup.id}.json`),
      JSON.stringify(backup, null, 2)
    )
  }

  private async getDatabase(id: string): Promise<Database | null> {
    try {
      const data = await fs.readFile(path.join(this.configPath, 'databases', `${id}.json`), 'utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  private async getDatabaseByName(name: string): Promise<Database | null> {
    const dbDir = path.join(this.configPath, 'databases')
    const files = await fs.readdir(dbDir).catch(() => [])
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(dbDir, file), 'utf-8')
        const db: Database = JSON.parse(data)
        if (db.name === name) return db
      }
    }
    
    return null
  }

  private async getWebsiteDatabases(websiteId: string): Promise<Database[]> {
    const dbDir = path.join(this.configPath, 'databases')
    const files = await fs.readdir(dbDir).catch(() => [])
    const databases: Database[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(dbDir, file), 'utf-8')
        const db: Database = JSON.parse(data)
        if (db.websiteId === websiteId) {
          databases.push(db)
        }
      }
    }
    
    return databases
  }

  private async getBackup(id: string): Promise<Backup | null> {
    try {
      const data = await fs.readFile(path.join(this.configPath, 'backups', `${id}.json`), 'utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  private async log(websiteId: string, type: string, message: string): Promise<void> {
    const logDir = path.join(this.logsPath, websiteId)
    await fs.mkdir(logDir, { recursive: true })
    
    const timestamp = new Date().toISOString()
    const logLine = `[${timestamp}] [${type}] ${message}\n`
    
    await fs.appendFile(path.join(logDir, 'process.log'), logLine)
  }

  private async getCaddyConfig(): Promise<string> {
    return fs.readFile(path.join(this.caddyConfigPath, 'Caddyfile'), 'utf-8')
  }

  private updateCaddyDomain(config: string, domain: string, sslEnabled: boolean): string {
    // This would update the Caddy config to enable/disable SSL
    // Caddy handles SSL automatically, so we mainly need to ensure the domain block exists
    return config
  }
}

// Export singleton
export const hostingManager = new HostingManager()
