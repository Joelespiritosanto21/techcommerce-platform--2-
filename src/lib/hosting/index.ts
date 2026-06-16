/**
 * TechCommerce Hosting Module
 * Sistema próprio de gestão de hosting
 */

// Main hosting manager
export { HostingManager, hostingManager } from './manager'
export type { Website, WebsiteConfig, Database, Backup, WebsiteMetrics } from './manager'

// Hosting service (background)
export { HostingService, hostingService } from './service'

// FTP/SFTP management
export { FTPManager, SFTPManager, ftpManager, sftpManager } from './ftp/manager'
export type { FTPAccount, FTPConfig } from './ftp/manager'
