/**
 * TechCommerce Hosting Service
 * Background service for managing websites
 */

import { HostingManager, hostingManager } from './manager'

// Service configuration
interface ServiceConfig {
  checkInterval: number // milliseconds
  sslRenewalDays: number // days before expiry to renew
  backupSchedule: string // cron expression
  metricsInterval: number // milliseconds
}

const defaultConfig: ServiceConfig = {
  checkInterval: 60000, // 1 minute
  sslRenewalDays: 30, // Renew 30 days before expiry
  backupSchedule: '0 2 * * *', // 2 AM daily
  metricsInterval: 300000 // 5 minutes
}

// Active processes tracking
interface ProcessInfo {
  id: string
  websiteId: string
  status: 'running' | 'stopped' | 'error'
  cpu: number
  memory: number
  uptime: number
  lastCheck: Date
}

export class HostingService {
  private manager: HostingManager
  private config: ServiceConfig
  private processes: Map<string, ProcessInfo>
  private intervals: NodeJS.Timeout[]
  private isRunning: boolean

  constructor(config: Partial<ServiceConfig> = {}) {
    this.manager = hostingManager
    this.config = { ...defaultConfig, ...config }
    this.processes = new Map()
    this.intervals = []
    this.isRunning = false
  }

  /**
   * Start the hosting service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Hosting service is already running')
      return
    }

    console.log('Starting TechCommerce Hosting Service...')

    // Initialize the manager
    await this.manager.initialize()

    // Start all active websites
    await this.startAllWebsites()

    // Start monitoring intervals
    this.startMonitoring()

    this.isRunning = true
    console.log('Hosting service started successfully')
  }

  /**
   * Stop the hosting service
   */
  async stop(): Promise<void> {
    console.log('Stopping TechCommerce Hosting Service...')

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []

    // Stop all processes gracefully
    const websites = await this.manager.listWebsites()
    for (const website of websites) {
      if (website.status === 'active') {
        try {
          await this.manager.stopProcess(website)
        } catch (error) {
          console.error(`Failed to stop ${website.domain}:`, error)
        }
      }
    }

    this.isRunning = false
    console.log('Hosting service stopped')
  }

  /**
   * Start all active websites
   */
  private async startAllWebsites(): Promise<void> {
    const websites = await this.manager.listWebsites()
    
    for (const website of websites) {
      if (website.status === 'active') {
        try {
          await this.manager.startProcess(website)
          console.log(`Started: ${website.domain}`)
        } catch (error) {
          console.error(`Failed to start ${website.domain}:`, error)
        }
      }
    }
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Process health check
    const healthCheckInterval = setInterval(
      () => this.checkProcessHealth(),
      this.config.checkInterval
    )
    this.intervals.push(healthCheckInterval)

    // SSL renewal check
    const sslCheckInterval = setInterval(
      () => this.checkSSLRenewals(),
      24 * 60 * 60 * 1000 // Daily
    )
    this.intervals.push(sslCheckInterval)

    // Metrics collection
    const metricsInterval = setInterval(
      () => this.collectMetrics(),
      this.config.metricsInterval
    )
    this.intervals.push(metricsInterval)

    // Auto backup (scheduled)
    this.scheduleBackups()
  }

  /**
   * Check health of all processes
   */
  private async checkProcessHealth(): Promise<void> {
    const websites = await this.manager.listWebsites()
    
    for (const website of websites) {
      if (website.status !== 'active') continue

      try {
        const metrics = await this.manager.getMetrics(website.id)
        
        // Check if process is alive
        if (website.type === 'nodejs' || website.type === 'python') {
          if (metrics.cpuUsage === 0 && metrics.memoryUsage === 0) {
            // Process might be dead, try to restart
            console.log(`Process for ${website.domain} appears dead, restarting...`)
            await this.manager.restartProcess(website)
          }
        }

        // Update process info
        this.processes.set(website.id, {
          id: website.id,
          websiteId: website.id,
          status: 'running',
          cpu: metrics.cpuUsage,
          memory: metrics.memoryUsage,
          uptime: metrics.uptime,
          lastCheck: new Date()
        })

      } catch (error) {
        console.error(`Health check failed for ${website.domain}:`, error)
        this.processes.set(website.id, {
          id: website.id,
          websiteId: website.id,
          status: 'error',
          cpu: 0,
          memory: 0,
          uptime: 0,
          lastCheck: new Date()
        })
      }
    }
  }

  /**
   * Check and renew SSL certificates
   */
  private async checkSSLRenewals(): Promise<void> {
    const websites = await this.manager.listWebsites()
    const now = new Date()
    
    for (const website of websites) {
      if (!website.sslEnabled || !website.sslExpiry) continue

      const daysUntilExpiry = Math.floor(
        (website.sslExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiry <= this.config.sslRenewalDays) {
        console.log(`Renewing SSL for ${website.domain} (${daysUntilExpiry} days until expiry)`)
        try {
          await this.manager.renewSSL(website.domain)
          console.log(`SSL renewed for ${website.domain}`)
        } catch (error) {
          console.error(`Failed to renew SSL for ${website.domain}:`, error)
        }
      }
    }
  }

  /**
   * Collect and store metrics
   */
  private async collectMetrics(): Promise<void> {
    const websites = await this.manager.listWebsites()
    
    for (const website of websites) {
      if (website.status !== 'active') continue

      try {
        const metrics = await this.manager.getMetrics(website.id)
        
        // Store metrics (would write to database or time-series DB)
        // For now, just log them
        console.log(`Metrics for ${website.domain}:`, {
          cpu: `${metrics.cpuUsage.toFixed(1)}%`,
          memory: `${metrics.memoryUsage.toFixed(1)}%`,
          disk: `${(metrics.diskUsage / 1024 / 1024).toFixed(2)} MB`,
          requests: metrics.requests
        })

      } catch (error) {
        console.error(`Failed to collect metrics for ${website.domain}:`, error)
      }
    }
  }

  /**
   * Schedule automatic backups
   */
  private scheduleBackups(): void {
    // Parse cron expression (simplified - daily at specified time)
    const [hour, minute] = this.config.backupSchedule.split(' ')
    
    const scheduleBackup = () => {
      const now = new Date()
      const scheduledTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parseInt(hour),
        parseInt(minute)
      )
      
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1)
      }
      
      const delay = scheduledTime.getTime() - now.getTime()
      
      setTimeout(async () => {
        await this.performScheduledBackups()
        scheduleBackup() // Schedule next backup
      }, delay)
    }

    scheduleBackup()
  }

  /**
   * Perform scheduled backups for all active websites
   */
  private async performScheduledBackups(): Promise<void> {
    console.log('Starting scheduled backups...')
    
    const websites = await this.manager.listWebsites()
    
    for (const website of websites) {
      if (website.status !== 'active') continue

      try {
        console.log(`Creating backup for ${website.domain}...`)
        const backup = await this.manager.createBackup(website.id, 'full')
        console.log(`Backup created: ${backup.id}`)
      } catch (error) {
        console.error(`Backup failed for ${website.domain}:`, error)
      }
    }

    console.log('Scheduled backups completed')
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean
    processesCount: number
    uptime: number
  } {
    return {
      isRunning: this.isRunning,
      processesCount: this.processes.size,
      uptime: this.isRunning ? Date.now() : 0
    }
  }

  /**
   * Get process information
   */
  getProcessInfo(websiteId: string): ProcessInfo | undefined {
    return this.processes.get(websiteId)
  }

  /**
   * Get all processes
   */
  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values())
  }
}

// Export singleton service
export const hostingService = new HostingService()

// Start service if run directly
if (require.main === module) {
  hostingService.start()
    .then(() => {
      console.log('Hosting service started')
    })
    .catch(error => {
      console.error('Failed to start hosting service:', error)
      process.exit(1)
    })

  // Handle shutdown
  process.on('SIGINT', async () => {
    await hostingService.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await hostingService.stop()
    process.exit(0)
  })
}
