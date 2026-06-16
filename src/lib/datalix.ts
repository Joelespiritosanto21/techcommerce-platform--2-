/**
 * Datalix API Integration
 * Documentation: https://docs.datalix.eu/
 */

interface DatalixConfig {
  apiUrl: string
  apiKey: string
  apiSecret: string
}

interface VPSInstance {
  id: string
  name: string
  status: string
  power_status: string
  ip_address: string
  ipv6_address?: string
  cpu_cores: number
  ram_mb: number
  disk_gb: number
  bandwidth_tb: number
  location: string
  created_at: string
}

interface VPSPlan {
  id: string
  name: string
  cpu_cores: number
  ram_mb: number
  disk_gb: number
  bandwidth_tb: number
  price_monthly: number
  locations: string[]
}

export class DatalixAPI {
  private config: DatalixConfig

  constructor(config: DatalixConfig) {
    this.config = config
  }

  private async request(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.config.apiUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-API-Secret': this.config.apiSecret
    }

    const options: RequestInit = {
      method,
      headers,
      cache: 'no-store'
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || `Datalix API Error: ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Datalix API Error:', error)
      throw error
    }
  }

  // ============================================
  // VPS INSTANCES
  // ============================================

  async listInstances(): Promise<VPSInstance[]> {
    return this.request('/vps/instances')
  }

  async getInstance(id: string): Promise<VPSInstance> {
    return this.request(`/vps/instances/${id}`)
  }

  async createInstance(params: {
    plan_id: string
    hostname?: string
    location: string
    image?: string
    ssh_key?: string
    password?: string
  }): Promise<{ id: string; ip_address: string; password?: string }> {
    return this.request('/vps/instances', 'POST', params)
  }

  async deleteInstance(id: string): Promise<void> {
    return this.request(`/vps/instances/${id}`, 'DELETE')
  }

  // ============================================
  // POWER MANAGEMENT
  // ============================================

  async startInstance(id: string): Promise<void> {
    return this.request(`/vps/instances/${id}/start`, 'POST')
  }

  async stopInstance(id: string): Promise<void> {
    return this.request(`/vps/instances/${id}/stop`, 'POST')
  }

  async restartInstance(id: string): Promise<void> {
    return this.request(`/vps/instances/${id}/restart`, 'POST')
  }

  async forceStopInstance(id: string): Promise<void> {
    return this.request(`/vps/instances/${id}/power-off`, 'POST')
  }

  // ============================================
  // REBUILD / REINSTALL
  // ============================================

  async rebuildInstance(id: string, params: {
    image: string
    password?: string
    ssh_key?: string
  }): Promise<void> {
    return this.request(`/vps/instances/${id}/rebuild`, 'POST', params)
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  async resetPassword(id: string): Promise<{ password: string }> {
    return this.request(`/vps/instances/${id}/reset-password`, 'POST')
  }

  // ============================================
  // METRICS / STATS
  // ============================================

  async getInstanceMetrics(id: string): Promise<{
    cpu_usage: number
    ram_usage: number
    disk_usage: number
    bandwidth_in: number
    bandwidth_out: number
    uptime: number
  }> {
    return this.request(`/vps/instances/${id}/metrics`)
  }

  // ============================================
  // PLANS
  // ============================================

  async listPlans(): Promise<VPSPlan[]> {
    return this.request('/vps/plans')
  }

  // ============================================
  // LOCATIONS
  // ============================================

  async listLocations(): Promise<Array<{
    id: string
    name: string
    country: string
    city: string
    available: boolean
  }>> {
    return this.request('/locations')
  }

  // ============================================
  // IMAGES / TEMPLATES
  // ============================================

  async listImages(): Promise<Array<{
    id: string
    name: string
    os: string
    version: string
    size_mb: number
  }>> {
    return this.request('/images')
  }

  // ============================================
  // SSH KEYS
  // ============================================

  async listSSHKeys(): Promise<Array<{
    id: string
    name: string
    fingerprint: string
  }>> {
    return this.request('/ssh-keys')
  }

  async createSSHKey(params: { name: string; public_key: string }): Promise<{ id: string }> {
    return this.request('/ssh-keys', 'POST', params)
  }

  async deleteSSHKey(id: string): Promise<void> {
    return this.request(`/ssh-keys/${id}`, 'DELETE')
  }

  // ============================================
  // BILLING
  // ============================================

  async getBillingInfo(): Promise<{
    balance: number
    currency: string
    next_invoice_date?: string
  }> {
    return this.request('/billing/info')
  }

  async getInvoices(): Promise<Array<{
    id: string
    amount: number
    currency: string
    status: string
    due_date: string
    items: Array<{ description: string; amount: number }>
  }>> {
    return this.request('/billing/invoices')
  }
}

// Helper to create Datalix client from settings
export async function getDatalixClient(): Promise<DatalixAPI | null> {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const settings = await prisma.systemConfig.findMany({
      where: { category: 'datalix' }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => config[s.key] = s.value)

    if (!config.datalix_api_key || config.datalix_enabled !== 'true') {
      return null
    }

    return new DatalixAPI({
      apiUrl: config.datalix_api_url || 'https://api.datalix.eu',
      apiKey: config.datalix_api_key,
      apiSecret: config.datalix_api_secret || ''
    })
  } finally {
    await prisma.$disconnect()
  }
}
