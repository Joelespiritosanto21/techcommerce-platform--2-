/**
 * aaPanel API Integration
 * Documentation: https://www.aapanel.com/new/developer.html
 */

interface aaPanelConfig {
  panelUrl: string
  apiKey: string
}

interface Website {
  id: number
  name: string
  domain: string
  path: string
  status: string
  php_version: string
  ssl: boolean
  backup: boolean
  created_at: string
}

interface Database {
  id: number
  name: string
  username: string
  size_mb: number
}

interface FTPAccount {
  id: number
  username: string
  path: string
  status: string
}

export class aaPanelAPI {
  private config: aaPanelConfig
  private requestToken: string

  constructor(config: aaPanelConfig) {
    this.config = config
    // aaPanel uses a request_token generated from API key + timestamp
    this.requestToken = this.generateToken()
  }

  private generateToken(): string {
    const timestamp = Math.floor(Date.now() / 1000)
    // Simple token generation - aaPanel specific algorithm
    return `${this.config.api_key}${timestamp}`
  }

  private async request(action: string, params: Record<string, any> = {}): Promise<any> {
    const url = `${this.config.panelUrl}/api`
    
    const formData = new URLSearchParams()
    formData.append('request_token', this.generateToken())
    formData.append('request_time', Math.floor(Date.now() / 1000).toString())
    formData.append('request_action', action)
    
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      const result = await response.json()

      if (result.status !== true) {
        throw new Error(result.msg || 'aaPanel API Error')
      }

      return result
    } catch (error) {
      console.error('aaPanel API Error:', error)
      throw error
    }
  }

  // ============================================
  // WEBSITES
  // ============================================

  async listWebsites(): Promise<Website[]> {
    const result = await this.request('GetSiteList')
    return result.data || []
  }

  async getWebsite(domain: string): Promise<Website | null> {
    const result = await this.request('GetSiteInfo', { siteName: domain })
    return result.data || null
  }

  async createWebsite(params: {
    domain: string
    path?: string
    php_version?: string
    create_database?: boolean
    create_ftp?: boolean
  }): Promise<{ siteId: number; message: string }> {
    return this.request('AddSite', {
      webname: params.domain,
      path: params.path || `/www/wwwroot/${params.domain}`,
      version: params.php_version || 'php-80',
      ps: params.domain,
      type_id: 1,
      type: 'PHP'
    })
  }

  async deleteWebsite(domain: string): Promise<void> {
    await this.request('DeleteSite', {
      webname: domain,
      path: `/www/wwwroot/${domain}`
    })
  }

  // ============================================
  // PHP VERSION
  // ============================================

  async listPHPVersions(): Promise<string[]> {
    const result = await this.request('GetPHPVersion')
    return result.data || []
  }

  async setPHPVersion(domain: string, version: string): Promise<void> {
    await this.request('SetPHPVersion', {
      siteName: domain,
      version: version
    })
  }

  // ============================================
  // SSL / HTTPS
  // ============================================

  async getSSLStatus(domain: string): Promise<{
    enabled: boolean
    issuer: string
    expires: string
  }> {
    const result = await this.request('GetSSLInfo', { siteName: domain })
    return result.data || { enabled: false, issuer: '', expires: '' }
  }

  async enableSSL(domain: string): Promise<void> {
    await this.request('SetSSL', {
      siteName: domain,
      type: '1' // Let's Encrypt
    })
  }

  async disableSSL(domain: string): Promise<void> {
    await this.request('CloseSSL', { siteName: domain })
  }

  async renewSSL(domain: string): Promise<void> {
    await this.request('RenewSSL', { siteName: domain })
  }

  // ============================================
  // DOMAIN MANAGEMENT
  // ============================================

  async addDomain(siteName: string, domain: string): Promise<void> {
    await this.request('AddDomain', {
      siteName: siteName,
      domain: domain
    })
  }

  async removeDomain(siteName: string, domain: string): Promise<void> {
    await this.request('DelDomain', {
      siteName: siteName,
      domain: domain
    })
  }

  async listDomains(siteName: string): Promise<string[]> {
    const result = await this.request('GetDomainList', { siteName })
    return result.data || []
  }

  // ============================================
  // DATABASES
  // ============================================

  async listDatabases(): Promise<Database[]> {
    const result = await this.request('GetDatabaseList')
    return result.data || []
  }

  async createDatabase(params: {
    name: string
    username: string
    password: string
  }): Promise<void> {
    await this.request('AddDatabase', {
      name: params.name,
      db_user: params.username,
      password: params.password
    })
  }

  async deleteDatabase(name: string): Promise<void> {
    await this.request('DeleteDatabase', { name })
  }

  // ============================================
  // FTP ACCOUNTS
  // ============================================

  async listFTPAccounts(): Promise<FTPAccount[]> {
    const result = await this.request('GetFTPList')
    return result.data || []
  }

  async createFTPAccount(params: {
    username: string
    password: string
    path: string
  }): Promise<void> {
    await this.request('AddFTP', {
      ftp_user: params.username,
      ftp_pwd: params.password,
      path: params.path
    })
  }

  async deleteFTPAccount(username: string): Promise<void> {
    await this.request('DeleteFTP', { ftp_user: username })
  }

  async changeFTPPassword(username: string, newPassword: string): Promise<void> {
    await this.request('SetFTPPassword', {
      ftp_user: username,
      new_password: newPassword
    })
  }

  // ============================================
  // BACKUPS
  // ============================================

  async listBackups(siteName: string): Promise<Array<{
    id: number
    filename: string
    size: number
    created_at: string
  }>> {
    const result = await this.request('GetBackupList', { siteName })
    return result.data || []
  }

  async createBackup(siteName: string): Promise<void> {
    await this.request('SiteBackup', { siteName })
  }

  async restoreBackup(siteName: string, backupId: number): Promise<void> {
    await this.request('SiteRestore', {
      siteName,
      backup_id: backupId
    })
  }

  async deleteBackup(backupId: number): Promise<void> {
    await this.request('DeleteBackup', { backup_id: backupId })
  }

  // ============================================
  // SERVICE CONTROL
  // ============================================

  async startSite(siteName: string): Promise<void> {
    await this.request('SiteStart', { siteName })
  }

  async stopSite(siteName: string): Promise<void> {
    await this.request('SiteStop', { siteName })
  }

  async restartSite(siteName: string): Promise<void> {
    await this.request('SiteRestart', { siteName })
  }

  // ============================================
  // STATS
  // ============================================

  async getSiteStats(siteName: string): Promise<{
    disk_used_mb: number
    bandwidth_mb: number
    visits_today: number
    visits_month: number
  }> {
    const result = await this.request('GetSiteStats', { siteName })
    return result.data || { disk_used_mb: 0, bandwidth_mb: 0, visits_today: 0, visits_month: 0 }
  }

  // ============================================
  // SYSTEM INFO
  // ============================================

  async getSystemInfo(): Promise<{
    os: string
    cpu_usage: number
    ram_usage: number
    disk_usage: number
    uptime: number
  }> {
    const result = await this.request('GetSystemInfo')
    return result.data || { os: '', cpu_usage: 0, ram_usage: 0, disk_usage: 0, uptime: 0 }
  }
}

// Helper to create aaPanel client from settings
export async function getaaPanelClient(): Promise<aaPanelAPI | null> {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const settings = await prisma.systemConfig.findMany({
      where: { category: 'aapanel' }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => config[s.key] = s.value)

    if (!config.aapanel_api_key || config.aapanel_api_url || config.aapanel_enabled !== 'true') {
      return null
    }

    return new aaPanelAPI({
      panelUrl: config.aapanel_api_url,
      apiKey: config.aapanel_api_key
    })
  } finally {
    await prisma.$disconnect()
  }
}
