/**
 * TechCommerce Email Manager
 * Gestão completa de serviços de email
 * Suporte: Postfix, Dovecot, SpamAssassin, ClamAV
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

// Types
export interface MailDomain {
  id: string
  domain: string
  status: 'pending' | 'active' | 'suspended'
  mxValid: boolean
  spfValid: boolean
  dkimValid: boolean
  dmarcValid: boolean
  dkimSelector?: string
  dkimPublicKey?: string
  maxAccounts: number
  maxAliases: number
  maxStorageGB: number
}

export interface MailAccount {
  id: string
  email: string
  username: string
  domain: string
  quotaMB: number
  usedMB: number
  spamFilterEnabled: boolean
  autoReplyEnabled: boolean
  autoReplySubject?: string
  autoReplyMessage?: string
  forwardEnabled: boolean
  forwardTo?: string[]
  forwardKeepCopy: boolean
  status: 'active' | 'suspended' | 'disabled'
  lastLoginAt?: Date
}

export interface MailAlias {
  id: string
  source: string
  destination: string[]
  isActive: boolean
}

export interface MailMailingList {
  id: string
  address: string
  name: string
  description?: string
  isModerated: boolean
  allowSubscriptions: boolean
  members: string[]
  isActive: boolean
}

export interface EmailConfig {
  hostname: string
  domain: string
  smtpPort: number
  smtpsPort: number
  submissionPort: number
  imapPort: number
  imapsPort: number
  pop3Port: number
  pop3sPort: number
  maxMessageSizeMB: number
  spamEnabled: boolean
  spamScore: number
  antivirusEnabled: boolean
  greylistingEnabled: boolean
  maxMessagesPerHour: number
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'SRV'
  name: string
  value: string
  priority?: number
  ttl?: number
}

export interface DKIMConfig {
  selector: string
  privateKey: string
  publicKey: string
  dnsRecord: string
}

class EmailManager {
  private config: EmailConfig | null = null
  private mailDir = '/var/mail'
  private vmailDir = '/var/vmail'
  private postfixDir = '/etc/postfix'
  private dovecotDir = '/etc/dovecot'

  /**
   * Inicializar gestor de email
   */
  async initialize(config: EmailConfig): Promise<void> {
    this.config = config
    
    // Criar diretórios necessários
    await this.createDirectories()
    
    // Gerar configurações
    await this.generatePostfixConfig()
    await this.generateDovecotConfig()
    
    // Reiniciar serviços
    await this.restartServices()
  }

  /**
   * Criar diretórios de email
   */
  private async createDirectories(): Promise<void> {
    const dirs = [
      this.mailDir,
      this.vmailDir,
      `${this.vmailDir}/domains`,
      `${this.postfixDir}/virtual`,
      `${this.dovecotDir}/conf.d`
    ]

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true })
      } catch (error) {
        // Diretório já existe
      }
    }

    // Criar utilizador vmail se não existir
    try {
      await execAsync('id vmail')
    } catch {
      await execAsync('useradd -r -d /var/vmail -s /sbin/nologin vmail')
      await execAsync('chown -R vmail:vmail /var/vmail')
    }
  }

  /**
   * Adicionar domínio de email
   */
  async addDomain(domain: string, options?: {
    maxAccounts?: number
    maxAliases?: number
    maxStorageGB?: number
  }): Promise<MailDomain> {
    const maxAccounts = options?.maxAccounts || 10
    const maxAliases = options?.maxAliases || 20
    const maxStorageGB = options?.maxStorageGB || 10

    // Adicionar ao Postfix
    await this.addToPostfixVirtualDomains(domain)
    
    // Criar diretório do domínio
    await fs.mkdir(`${this.vmailDir}/domains/${domain}`, { recursive: true })
    await execAsync(`chown vmail:vmail ${this.vmailDir}/domains/${domain}`)

    // Gerar DKIM
    const dkim = await this.generateDKIM(domain)

    // Criar registos DNS
    const dnsRecords = await this.generateDNSRecords(domain, dkim)

    return {
      id: crypto.randomUUID(),
      domain,
      status: 'pending',
      mxValid: false,
      spfValid: false,
      dkimValid: false,
      dmarcValid: false,
      dkimSelector: dkim.selector,
      dkimPublicKey: dkim.publicKey,
      maxAccounts,
      maxAliases,
      maxStorageGB
    }
  }

  /**
   * Remover domínio de email
   */
  async removeDomain(domain: string): Promise<void> {
    // Remover contas
    await this.removeFromPostfixVirtualDomains(domain)
    
    // Remover diretório
    await execAsync(`rm -rf ${this.vmailDir}/domains/${domain}`)
    
    // Atualizar mapas
    await this.postmapReload()
  }

  /**
   * Adicionar conta de email
   */
  async addAccount(email: string, password: string, options?: {
    quotaMB?: number
    spamFilterEnabled?: boolean
  }): Promise<MailAccount> {
    const [username, domain] = email.split('@')
    if (!domain) throw new Error('Email inválido')

    const quotaMB = options?.quotaMB || 1000
    const spamFilterEnabled = options?.spamFilterEnabled ?? true

    // Gerar hash da password
    const hashedPassword = await this.hashPassword(password)

    // Adicionar ao Dovecot
    await this.addToDovecotUsers(email, hashedPassword, quotaMB)

    // Adicionar ao Postfix
    await this.addToPostfixVirtualMailboxes(email, domain)

    // Criar mailbox
    await this.createMailbox(email)

    // Atualizar mapas
    await this.postmapReload()

    return {
      id: crypto.randomUUID(),
      email,
      username,
      domain,
      quotaMB,
      usedMB: 0,
      spamFilterEnabled,
      autoReplyEnabled: false,
      forwardEnabled: false,
      forwardKeepCopy: true,
      status: 'active'
    }
  }

  /**
   * Remover conta de email
   */
  async removeAccount(email: string): Promise<void> {
    // Remover do Dovecot
    await this.removeFromDovecotUsers(email)

    // Remover do Postfix
    await this.removeFromPostfixVirtualMailboxes(email)

    // Remover mailbox
    const [username, domain] = email.split('@')
    await execAsync(`rm -rf ${this.vmailDir}/domains/${domain}/${username}`)

    // Atualizar mapas
    await this.postmapReload()
  }

  /**
   * Alterar password da conta
   */
  async changePassword(email: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword)
    await this.updateDovecotUserPassword(email, hashedPassword)
  }

  /**
   * Definir quota da conta
   */
  async setQuota(email: string, quotaMB: number): Promise<void> {
    await this.updateDovecotUserQuota(email, quotaMB)
  }

  /**
   * Configurar auto-resposta
   */
  async setAutoReply(email: string, config: {
    enabled: boolean
    subject?: string
    message?: string
  }): Promise<void> {
    if (!config.enabled) {
      await this.disableAutoReply(email)
      return
    }

    const [username, domain] = email.split('@')
    const sieveScript = `require ["vacation"];
vacation
  :subject "${config.subject || 'Ausência'}"
  "${config.message || 'Estou temporariamente indisponível.'}";`

    const sievePath = `${this.vmailDir}/domains/${domain}/${username}/sieve/vacation.sieve`
    await fs.mkdir(path.dirname(sievePath), { recursive: true })
    await fs.writeFile(sievePath, sieveScript)
    await execAsync(`chown vmail:vmail ${sievePath}`)
    
    // Compilar sieve
    try {
      await execAsync(`sievec ${sievePath}`)
    } catch {
      // sievec pode não estar disponível
    }
  }

  /**
   * Desativar auto-resposta
   */
  private async disableAutoReply(email: string): Promise<void> {
    const [username, domain] = email.split('@')
    const sievePath = `${this.vmailDir}/domains/${domain}/${username}/sieve/vacation.sieve`
    
    try {
      await fs.unlink(sievePath)
    } catch {
      // Ficheiro não existe
    }
  }

  /**
   * Configurar reencaminhamento
   */
  async setForwarding(email: string, config: {
    enabled: boolean
    forwardTo?: string[]
    keepCopy?: boolean
  }): Promise<void> {
    if (!config.enabled || !config.forwardTo?.length) {
      await this.removeFromPostfixForwardings(email)
      await this.postmapReload()
      return
    }

    await this.addToPostfixForwardings(email, config.forwardTo, config.keepCopy)
    await this.postmapReload()
  }

  /**
   * Adicionar alias de email
   */
  async addAlias(source: string, destination: string[]): Promise<MailAlias> {
    await this.addToPostfixAliases(source, destination)
    await this.postmapReload()

    return {
      id: crypto.randomUUID(),
      source,
      destination,
      isActive: true
    }
  }

  /**
   * Remover alias
   */
  async removeAlias(source: string): Promise<void> {
    await this.removeFromPostfixAliases(source)
    await this.postmapReload()
  }

  /**
   * Criar mailing list
   */
  async createMailingList(config: {
    address: string
    name: string
    description?: string
    members: string[]
    isModerated?: boolean
  }): Promise<MailMailingList> {
    const [name, domain] = config.address.split('@')
    
    // Criar ficheiro de lista
    const listPath = `${this.postfixDir}/lists/${config.address}`
    await fs.mkdir(path.dirname(listPath), { recursive: true })
    await fs.writeFile(listPath, config.members.join('\n'))

    // Adicionar alias no Postfix
    await this.addToPostfixAliases(config.address, [listPath])
    await this.postmapReload()

    return {
      id: crypto.randomUUID(),
      address: config.address,
      name: config.name,
      description: config.description,
      isModerated: config.isModerated || false,
      allowSubscriptions: false,
      members: config.members,
      isActive: true
    }
  }

  /**
   * Gerar DKIM keys
   */
  async generateDKIM(domain: string, selector: string = 'mail'): Promise<DKIMConfig> {
    const dkimDir = `/etc/opendkim/keys/${domain}`
    await fs.mkdir(dkimDir, { recursive: true })

    // Gerar chave privada
    await execAsync(`openssl genrsa -out ${dkimDir}/${selector}.private 2048`)

    // Extrair chave pública
    await execAsync(`openssl rsa -in ${dkimDir}/${selector}.private -pubout -out ${dkimDir}/${selector}.public`)

    // Ler chaves
    const privateKey = await fs.readFile(`${dkimDir}/${selector}.private`, 'utf-8')
    const publicKeyRaw = await fs.readFile(`${dkimDir}/${selector}.public`, 'utf-8')

    // Formatar para DNS
    const publicKey = publicKeyRaw
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\n/g, '')
      .trim()

    const dnsRecord = `${selector}._domainkey IN TXT "v=DKIM1; k=rsa; p=${publicKey}"`

    // Configurar permissões
    await execAsync(`chown -R opendkim:opendkim ${dkimDir}`)
    await execAsync(`chmod 600 ${dkimDir}/${selector}.private`)

    return {
      selector,
      privateKey,
      publicKey,
      dnsRecord
    }
  }

  /**
   * Gerar registos DNS para email
   */
  async generateDNSRecords(domain: string, dkim: DKIMConfig): Promise<DNSRecord[]> {
    const records: DNSRecord[] = []
    const hostname = this.config?.hostname || `mail.${domain}`

    // MX Record
    records.push({
      type: 'MX',
      name: '@',
      value: hostname,
      priority: 10,
      ttl: 3600
    })

    // A Record para mail
    records.push({
      type: 'A',
      name: 'mail',
      value: await this.getServerIP() || 'SERVER_IP',
      ttl: 3600
    })

    // SPF Record
    records.push({
      type: 'TXT',
      name: '@',
      value: `v=spf1 mx a ip4:${await this.getServerIP() || 'SERVER_IP'} ~all`,
      ttl: 3600
    })

    // DKIM Record
    records.push({
      type: 'TXT',
      name: `${dkim.selector}._domainkey`,
      value: `v=DKIM1; k=rsa; p=${dkim.publicKey}`,
      ttl: 3600
    })

    // DMARC Record
    records.push({
      type: 'TXT',
      name: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100; adkim=s; aspf=s`,
      ttl: 3600
    })

    return records
  }

  /**
   * Verificar DNS do domínio
   */
  async verifyDNS(domain: string): Promise<{
    mx: boolean
    spf: boolean
    dkim: boolean
    dmarc: boolean
    details: string[]
  }> {
    const result = {
      mx: false,
      spf: false,
      dkim: false,
      dmarc: false,
      details: [] as string[]
    }

    try {
      // Verificar MX
      const { stdout: mxResult } = await execAsync(`dig +short MX ${domain}`)
      result.mx = mxResult.includes('mail') || mxResult.length > 0
      result.details.push(`MX: ${mxResult.trim() || 'Não encontrado'}`)

      // Verificar SPF
      const { stdout: spfResult } = await execAsync(`dig +short TXT ${domain}`)
      result.spf = spfResult.includes('v=spf1')
      result.details.push(`SPF: ${result.spf ? 'Válido' : 'Não encontrado'}`)

      // Verificar DKIM
      const { stdout: dkimResult } = await execAsync(`dig +short TXT mail._domainkey.${domain}`)
      result.dkim = dkimResult.includes('v=DKIM1')
      result.details.push(`DKIM: ${result.dkim ? 'Válido' : 'Não encontrado'}`)

      // Verificar DMARC
      const { stdout: dmarcResult } = await execAsync(`dig +short TXT _dmarc.${domain}`)
      result.dmarc = dmarcResult.includes('v=DMARC1')
      result.details.push(`DMARC: ${result.dmarc ? 'Válido' : 'Não encontrado'}`)
    } catch (error) {
      result.details.push('Erro ao verificar DNS')
    }

    return result
  }

  /**
   * Obter estatísticas de email
   */
  async getStats(): Promise<{
    totalDomains: number
    totalAccounts: number
    totalAliases: number
    queueSize: number
    diskUsage: number
  }> {
    let totalDomains = 0
    let totalAccounts = 0
    let totalAliases = 0
    let queueSize = 0
    let diskUsage = 0

    try {
      // Contar domínios
      const { stdout: domains } = await execAsync(`ls -1 ${this.vmailDir}/domains 2>/dev/null | wc -l`)
      totalDomains = parseInt(domains.trim()) || 0

      // Contar contas
      const { stdout: accounts } = await execAsync(`find ${this.vmailDir}/domains -type d -name "Maildir" 2>/dev/null | wc -l`)
      totalAccounts = parseInt(accounts.trim()) || 0

      // Tamanho da fila
      const { stdout: queue } = await execAsync('mailq 2>/dev/null | grep -c "^[A-F0-9]" || echo 0')
      queueSize = parseInt(queue.trim()) || 0

      // Uso de disco
      const { stdout: disk } = await execAsync(`du -sm ${this.vmailDir} 2>/dev/null | cut -f1`)
      diskUsage = parseInt(disk.trim()) || 0
    } catch (error) {
      // Serviços não instalados
    }

    return {
      totalDomains,
      totalAccounts,
      totalAliases,
      queueSize,
      diskUsage
    }
  }

  // ==================== Métodos privados ====================

  private async generatePostfixConfig(): Promise<void> {
    if (!this.config) return

    const mainCf = `
# TechCommerce Postfix Configuration
smtpd_banner = $myhostname ESMTP
biff = no
append_dot_mydomain = no
readme_directory = no

# TLS
smtpd_tls_cert_file = /etc/letsencrypt/live/${this.config.hostname}/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/${this.config.hostname}/privkey.pem
smtpd_use_tls = yes
smtpd_tls_auth_only = yes
smtp_tls_security_level = may

# SASL
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth

# Virtual
virtual_mailbox_domains = /etc/postfix/virtual/domains
virtual_mailbox_maps = hash:/etc/postfix/virtual/mailboxes
virtual_alias_maps = hash:/etc/postfix/virtual/aliases
virtual_uid_maps = static:5000
virtual_gid_maps = static:5000
virtual_mailbox_base = /var/vmail/domains

# Limits
message_size_limit = ${this.config.maxMessageSizeMB * 1024 * 1024}
mailbox_size_limit = 0
smtpd_recipient_limit = 100

# Security
smtpd_helo_required = yes
smtpd_delay_reject = yes
disable_vrfy_command = yes

# Filtering
content_filter = smtp-amavis:[127.0.0.1]:10024
`

    await fs.writeFile(`${this.postfixDir}/main.cf`, mainCf)

    // Criar master.cf adicional
    const masterAdditions = `
smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes

submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
`

    // Criar ficheiros virtual
    await fs.mkdir(`${this.postfixDir}/virtual`, { recursive: true })
    await fs.writeFile(`${this.postfixDir}/virtual/domains`, '')
    await fs.writeFile(`${this.postfixDir}/virtual/mailboxes`, '')
    await fs.writeFile(`${this.postfixDir}/virtual/aliases`, '')
  }

  private async generateDovecotConfig(): Promise<void> {
    if (!this.config) return

    const dovecotConf = `
# TechCommerce Dovecot Configuration
protocols = imap pop3 lmtp
listen = *, ::

mail_location = maildir:/var/vmail/domains/%d/%n/Maildir
mail_uid = vmail
mail_gid = vmail

ssl = required
ssl_cert = </etc/letsencrypt/live/${this.config.hostname}/fullchain.pem
ssl_key = </etc/letsencrypt/live/${this.config.hostname}/privkey.pem

auth_mechanisms = plain login

passdb {
  driver = passwd-file
  args = /etc/dovecot/users
}

userdb {
  driver = static
  args = uid=vmail gid=vmail home=/var/vmail/domains/%d/%n
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }
}

protocol imap {
  imap_client_workarounds = delay-newmail tb-extra-mailbox-sep
}

protocol pop3 {
  pop3_client_workarounds = outlook-no-nuls oe-ns-eoh
}

protocol lmtp {
  mail_plugins = quota sieve
}

plugin {
  quota = maildir:User quota
  quota_rule = *:storage=1G
  sieve = ~/.dovecot.sieve
  sieve_dir = ~/sieve
}
`

    await fs.writeFile(`${this.dovecotDir}/dovecot.conf`, dovecotConf)
  }

  private async hashPassword(password: string): Promise<string> {
    const { stdout } = await execAsync(`doveadm pw -s SHA512-CRYPT -p "${password}"`)
    return stdout.trim()
  }

  private async createMailbox(email: string): Promise<void> {
    const [username, domain] = email.split('@')
    const maildir = `${this.vmailDir}/domains/${domain}/${username}/Maildir`
    
    await fs.mkdir(`${maildir}/cur`, { recursive: true })
    await fs.mkdir(`${maildir}/new`, { recursive: true })
    await fs.mkdir(`${maildir}/tmp`, { recursive: true })
    await fs.mkdir(`${maildir}/.Spam`, { recursive: true })
    
    await execAsync(`chown -R vmail:vmail ${this.vmailDir}/domains/${domain}/${username}`)
  }

  private async addToPostfixVirtualDomains(domain: string): Promise<void> {
    const file = `${this.postfixDir}/virtual/domains`
    try {
      await fs.appendFile(file, `${domain}\n`)
    } catch {
      await fs.writeFile(file, `${domain}\n`)
    }
  }

  private async removeFromPostfixVirtualDomains(domain: string): Promise<void> {
    const file = `${this.postfixDir}/virtual/domains`
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim() !== domain)
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async addToPostfixVirtualMailboxes(email: string, domain: string): Promise<void> {
    const file = `${this.postfixDir}/virtual/mailboxes`
    const entry = `${email} ${domain}/${email.split('@')[0]}/Maildir/\n`
    
    try {
      await fs.appendFile(file, entry)
    } catch {
      await fs.writeFile(file, entry)
    }
  }

  private async removeFromPostfixVirtualMailboxes(email: string): Promise<void> {
    const file = `${this.postfixDir}/virtual/mailboxes`
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').filter(l => !l.startsWith(email))
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async addToDovecotUsers(email: string, hashedPassword: string, quotaMB: number): Promise<void> {
    const file = '/etc/dovecot/users'
    const entry = `${email}:{SHA512-CRYPT}${hashedPassword}:5000:5000::/var/vmail/domains/%d/%n:::userdb_quota_rule=*:bytes=${quotaMB * 1024 * 1024}\n`
    
    try {
      await fs.appendFile(file, entry)
    } catch {
      await fs.writeFile(file, entry)
    }
  }

  private async removeFromDovecotUsers(email: string): Promise<void> {
    const file = '/etc/dovecot/users'
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').filter(l => !l.startsWith(email))
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async updateDovecotUserPassword(email: string, hashedPassword: string): Promise<void> {
    const file = '/etc/dovecot/users'
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').map(l => {
        if (l.startsWith(email)) {
          const parts = l.split(':')
          parts[1] = `{SHA512-CRYPT}${hashedPassword}`
          return parts.join(':')
        }
        return l
      })
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async updateDovecotUserQuota(email: string, quotaMB: number): Promise<void> {
    const file = '/etc/dovecot/users'
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').map(l => {
        if (l.startsWith(email)) {
          return l.replace(/userdb_quota_rule=\*:bytes=\d+/, `userdb_quota_rule=*:bytes=${quotaMB * 1024 * 1024}`)
        }
        return l
      })
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async addToPostfixForwardings(email: string, forwardTo: string[], keepCopy: boolean): Promise<void> {
    const file = `${this.postfixDir}/virtual/aliases`
    const destinations = keepCopy ? [email, ...forwardTo] : forwardTo
    const entry = `${email} ${destinations.join(',')}\n`
    
    try {
      await fs.appendFile(file, entry)
    } catch {
      await fs.writeFile(file, entry)
    }
  }

  private async removeFromPostfixForwardings(email: string): Promise<void> {
    const file = `${this.postfixDir}/virtual/aliases`
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').filter(l => !l.startsWith(email))
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async addToPostfixAliases(source: string, destination: string[]): Promise<void> {
    const file = `${this.postfixDir}/virtual/aliases`
    const entry = `${source} ${destination.join(',')}\n`
    
    try {
      await fs.appendFile(file, entry)
    } catch {
      await fs.writeFile(file, entry)
    }
  }

  private async removeFromPostfixAliases(source: string): Promise<void> {
    const file = `${this.postfixDir}/virtual/aliases`
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').filter(l => !l.startsWith(source))
      await fs.writeFile(file, lines.join('\n'))
    } catch {
      // Ficheiro não existe
    }
  }

  private async postmapReload(): Promise<void> {
    try {
      await execAsync('postmap /etc/postfix/virtual/domains')
      await execAsync('postmap /etc/postfix/virtual/mailboxes')
      await execAsync('postmap /etc/postfix/virtual/aliases')
      await execAsync('postfix reload')
    } catch {
      // Postfix pode não estar instalado
    }
  }

  private async restartServices(): Promise<void> {
    try {
      await execAsync('systemctl restart postfix')
      await execAsync('systemctl restart dovecot')
      await execAsync('systemctl restart opendkim')
      await execAsync('systemctl restart spamassassin')
      await execAsync('systemctl restart clamav-daemon')
    } catch {
      // Serviços podem não estar instalados
    }
  }

  private async getServerIP(): Promise<string | null> {
    try {
      const { stdout } = await execAsync("curl -s ifconfig.me || curl -s icanhazip.com")
      return stdout.trim()
    } catch {
      return null
    }
  }
}

export const emailManager = new EmailManager()
export { EmailManager }
