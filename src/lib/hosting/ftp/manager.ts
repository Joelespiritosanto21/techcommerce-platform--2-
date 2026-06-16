/**
 * TechCommerce FTP/SFTP Manager
 * Secure file management for hosting clients
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const execAsync = promisify(exec)

export interface FTPAccount {
  id: string
  username: string
  password: string
  homeDir: string
  websiteId: string
  quota: number // MB
  usedSpace: number // MB
  permissions: 'read' | 'write' | 'full'
  isActive: boolean
  createdAt: Date
  lastLogin?: Date
}

export interface FTPConfig {
  ftpPort: number
  sftpPort: number
  passivePorts: { start: number; end: number }
  maxConnections: number
  connectionTimeout: number // seconds
  logPath: string
}

const defaultConfig: FTPConfig = {
  ftpPort: 21,
  sftpPort: 22,
  passivePorts: { start: 50000, end: 51000 },
  maxConnections: 100,
  connectionTimeout: 300,
  logPath: '/var/log/techcommerce/ftp'
}

export class FTPManager {
  private config: FTPConfig
  private accounts: Map<string, FTPAccount>

  constructor(config: Partial<FTPConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.accounts = new Map()
  }

  /**
   * Initialize FTP server
   */
  async initialize(): Promise<void> {
    // Create necessary directories
    await fs.mkdir(this.config.logPath, { recursive: true })

    // Check if vsftpd is installed
    try {
      await execAsync('which vsftpd')
    } catch {
      console.log('vsftpd not installed, installing...')
      await this.installVsftpd()
    }

    // Configure vsftpd
    await this.configureVsftpd()

    // Start FTP server
    await this.startServer()
  }

  /**
   * Create FTP account for a website
   */
  async createAccount(params: {
    username?: string
    password?: string
    websiteId: string
    homeDir: string
    quota?: number
    permissions?: 'read' | 'write' | 'full'
  }): Promise<FTPAccount> {
    const id = crypto.randomBytes(16).toString('hex')
    const username = params.username || `user_${id.substring(0, 8)}`
    const password = params.password || this.generatePassword()

    // Create system user
    try {
      await execAsync(`useradd -d ${params.homeDir} -s /bin/false ${username}`)
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        throw e
      }
    }

    // Set password
    await execAsync(`echo "${username}:${password}" | chpasswd`)

    // Create home directory
    await fs.mkdir(params.homeDir, { recursive: true })
    await execAsync(`chown -R ${username}:${username} ${params.homeDir}`)

    // Set quota if specified
    if (params.quota) {
      await this.setQuota(username, params.quota)
    }

    // Create account record
    const account: FTPAccount = {
      id,
      username,
      password,
      homeDir: params.homeDir,
      websiteId: params.websiteId,
      quota: params.quota || 1000, // 1GB default
      usedSpace: 0,
      permissions: params.permissions || 'full',
      isActive: true,
      createdAt: new Date()
    }

    this.accounts.set(id, account)
    await this.saveAccount(account)

    return account
  }

  /**
   * Delete FTP account
   */
  async deleteAccount(id: string): Promise<void> {
    const account = this.accounts.get(id)
    if (!account) throw new Error('Account not found')

    // Delete system user
    try {
      await execAsync(`userdel -r ${account.username}`)
    } catch (e) {
      // User might have already been deleted
    }

    this.accounts.delete(id)
    await this.removeAccountFile(id)
  }

  /**
   * Update FTP account password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const account = this.accounts.get(id)
    if (!account) throw new Error('Account not found')

    await execAsync(`echo "${account.username}:${newPassword}" | chpasswd`)
    account.password = newPassword
    await this.saveAccount(account)
  }

  /**
   * Suspend/unsuspend FTP account
   */
  async setAccountStatus(id: string, isActive: boolean): Promise<void> {
    const account = this.accounts.get(id)
    if (!account) throw new Error('Account not found')

    if (isActive) {
      await execAsync(`usermod -U ${account.username}`)
    } else {
      await execAsync(`usermod -L ${account.username}`)
    }

    account.isActive = isActive
    await this.saveAccount(account)
  }

  /**
   * Get account usage
   */
  async getUsage(id: string): Promise<{ usedSpace: number; fileCount: number }> {
    const account = this.accounts.get(id)
    if (!account) throw new Error('Account not found')

    try {
      const { stdout } = await execAsync(`du -sb ${account.homeDir} 2>/dev/null || echo 0`)
      const usedSpace = parseInt(stdout.split('\t')[0]) || 0

      const { stdout: fileCountOut } = await execAsync(
        `find ${account.homeDir} -type f | wc -l 2>/dev/null || echo 0`
      )
      const fileCount = parseInt(fileCountOut.trim()) || 0

      return { usedSpace: usedSpace / (1024 * 1024), fileCount }
    } catch {
      return { usedSpace: 0, fileCount: 0 }
    }
  }

  /**
   * List all FTP accounts
   */
  listAccounts(): FTPAccount[] {
    return Array.from(this.accounts.values())
  }

  /**
   * Get accounts by website
   */
  getAccountsByWebsite(websiteId: string): FTPAccount[] {
    return Array.from(this.accounts.values()).filter(a => a.websiteId === websiteId)
  }

  /**
   * Configure vsftpd
   */
  private async configureVsftpd(): Promise<void> {
    const config = `
# TechCommerce FTP Server Configuration
# Generated automatically

# Server settings
listen=NO
listen_ipv6=YES
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES
chroot_local_user=YES
secure_chroot_dir=/var/run/vsftpd/empty
pam_service_name=vsftpd

# Passive mode
pasv_enable=YES
pasv_min_port=${this.config.passivePorts.start}
pasv_max_port=${this.config.passivePorts.end}

# Security
ssl_enable=YES
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
allow_anon_ssl=NO
force_local_data_ssl=NO
force_local_logins_ssl=NO
ssl_tlsv1=YES
ssl_sslv2=NO
ssl_sslv3=NO

# Performance
max_clients=${this.config.maxConnections}
max_per_ip=10
idle_session_timeout=${this.config.connectionTimeout}
data_connection_timeout=120

# Logging
xferlog_file=${this.config.logPath}/transfer.log
xferlog_std_format=YES

# User isolation
user_sub_token=\$USER
local_root=/var/www/\$USER
allow_writeable_chroot=YES
`

    await fs.writeFile('/etc/vsftpd.conf', config)
    await execAsync('systemctl restart vsftpd')
  }

  /**
   * Install vsftpd
   */
  private async installVsftpd(): Promise<void> {
    // Detect OS
    let installCmd: string

    try {
      await fs.access('/etc/debian_version')
      installCmd = 'apt-get update && apt-get install -y vsftpd'
    } catch {
      try {
        await fs.access('/etc/redhat-release')
        installCmd = 'yum install -y vsftpd'
      } catch {
        throw new Error('Unsupported operating system')
      }
    }

    await execAsync(installCmd)
    await execAsync('systemctl enable vsftpd')
  }

  /**
   * Start FTP server
   */
  private async startServer(): Promise<void> {
    await execAsync('systemctl start vsftpd')
  }

  /**
   * Set disk quota for user
   */
  private async setQuota(username: string, quotaMB: number): Promise<void> {
    // Requires quota package to be installed
    try {
      const quotaKB = quotaMB * 1024
      await execAsync(`setquota -u ${username} 0 ${quotaKB} 0 0 /`)
    } catch {
      console.log('Quota not available, skipping...')
    }
  }

  /**
   * Generate random password
   */
  private generatePassword(length: number = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  /**
   * Save account to file
   */
  private async saveAccount(account: FTPAccount): Promise<void> {
    const accountsDir = '/etc/techcommerce/ftp/accounts'
    await fs.mkdir(accountsDir, { recursive: true })
    await fs.writeFile(
      path.join(accountsDir, `${account.id}.json`),
      JSON.stringify(account, null, 2)
    )
  }

  /**
   * Remove account file
   */
  private async removeAccountFile(id: string): Promise<void> {
    const accountPath = `/etc/techcommerce/ftp/accounts/${id}.json`
    try {
      await fs.unlink(accountPath)
    } catch {
      // File might not exist
    }
  }

  /**
   * Load accounts from files
   */
  async loadAccounts(): Promise<void> {
    const accountsDir = '/etc/techcommerce/ftp/accounts'
    try {
      const files = await fs.readdir(accountsDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(accountsDir, file), 'utf-8')
          const account: FTPAccount = JSON.parse(data)
          this.accounts.set(account.id, account)
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }
}

/**
 * SFTP Manager using SSH
 * Alternative to FTP with better security
 */
export class SFTPManager {
  private sshdConfigPath: string = '/etc/ssh/sshd_config'

  /**
   * Create SFTP-only user (chrooted)
   */
  async createSFTPUser(params: {
    username?: string
    password?: string
    homeDir: string
    websiteId: string
  }): Promise<{ username: string; password: string }> {
    const id = crypto.randomBytes(8).toString('hex')
    const username = params.username || `sftp_${id}`
    const password = params.password || this.generatePassword()

    // Create group for SFTP users if not exists
    try {
      await execAsync('groupadd sftpusers')
    } catch {
      // Group already exists
    }

    // Create user
    try {
      await execAsync(`useradd -g sftpusers -d ${params.homeDir} -s /sbin/nologin ${username}`)
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        throw e
      }
    }

    // Set password
    await execAsync(`echo "${username}:${password}" | chpasswd`)

    // Setup chroot directory
    await fs.mkdir(params.homeDir, { recursive: true })
    await execAsync(`chown root:root ${params.homeDir}`)
    await execAsync(`chmod 755 ${params.homeDir}`)

    // Create writable directory inside
    const wwwDir = path.join(params.homeDir, 'www')
    await fs.mkdir(wwwDir, { recursive: true })
    await execAsync(`chown ${username}:sftpusers ${wwwDir}`)
    await execAsync(`chmod 755 ${wwwDir}`)

    // Update SSH config for this user
    await this.addSFTPConfig(username, params.homeDir)

    // Restart SSH
    await execAsync('systemctl reload sshd')

    return { username, password }
  }

  /**
   * Add SFTP configuration for user
   */
  private async addSFTPConfig(username: string, homeDir: string): Promise<void> {
    const configEntry = `
# SFTP for ${username}
Match User ${username}
    ChrootDirectory ${homeDir}
    ForceCommand internal-sftp
    PasswordAuthentication yes
    PermitTunnel no
    AllowTcpForwarding no
    X11Forwarding no
`

    await fs.appendFile(this.sshdConfigPath, configEntry)
  }

  /**
   * Delete SFTP user
   */
  async deleteSFTPUser(username: string): Promise<void> {
    try {
      await execAsync(`userdel ${username}`)
    } catch {
      // User might not exist
    }

    // Remove from SSH config (simplified - would need proper parsing)
    // In production, use a proper config file parser
  }

  /**
   * Generate random password
   */
  private generatePassword(length: number = 20): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length)
  }
}

// Export singletons
export const ftpManager = new FTPManager()
export const sftpManager = new SFTPManager()
