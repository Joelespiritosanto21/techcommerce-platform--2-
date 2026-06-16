/**
 * TechCommerce Email Service Module
 * Sistema completo de gestão de email (Postfix + Dovecot)
 */

// Email Manager
export { EmailManager, emailManager } from './manager'
export type {
  MailDomain,
  MailAccount,
  MailAlias,
  MailMailingList,
  EmailConfig,
  DNSRecord,
  DKIMConfig
} from './manager'

// Email Server Service
export { EmailServerService, emailServerService } from './service'

// DNS Manager
export { DNSManager, dnsManager } from './dns'
