#!/usr/bin/env node

/**
 * TechCommerce Hosting Service Daemon
 * Run this as a background service to manage all websites
 * 
 * Usage:
 *   node scripts/hosting-daemon.js
 *   pm2 start scripts/hosting-daemon.js --name hosting-service
 */

import { hostingService } from '../src/lib/hosting/service'
import { ftpManager } from '../src/lib/hosting/ftp/manager'

// Graceful shutdown handler
async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down...`)
  
  try {
    await hostingService.stop()
    console.log('Hosting service stopped')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

// Main function
async function main() {
  console.log('========================================')
  console.log('  TechCommerce Hosting Service')
  console.log('========================================')
  console.log('')

  try {
    // Initialize FTP manager
    console.log('Initializing FTP manager...')
    await ftpManager.loadAccounts()

    // Start hosting service
    console.log('Starting hosting service...')
    await hostingService.start()

    console.log('')
    console.log('Hosting service is running!')
    console.log('Press Ctrl+C to stop.')
    console.log('')

    // Log status periodically
    setInterval(() => {
      const status = hostingService.getStatus()
      console.log(`[Status] Running: ${status.isRunning}, Processes: ${status.processesCount}`)
    }, 60000) // Every minute

  } catch (error) {
    console.error('Failed to start hosting service:', error)
    process.exit(1)
  }
}

// Handle signals
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  shutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason)
})

// Start the service
main()
