/**
 * TechCommerce DNS Manager
 * Gestão de DNS para serviços de email
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

const execAsync = promisify(exec)

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'SRV' | 'NS'
  name: string
  value: string
  priority?: number
  ttl?: number
  port?: number
  weight?: number
}

export interface DNSVerificationResult {
  type: string
  name: string
  expected: string
  actual: string | null
  valid: boolean
  message: string
}

export interface SPFConfig {
  ipAddresses: string[]
  domains: string[]
  includeDomains: string[]
  policy: 'allow' | 'neutral' | 'quarantine' | 'reject'
}

export interface DKIMKey {
  selector: string
  privateKey: string
  publicKey: string
  dnsRecord: string
}

export interface DMARCConfig {
  policy: 'none' | 'quarantine' | 'reject'
  subdomainPolicy?: 'none' | 'quarantine' | 'reject'
  percentage?: number
  reportEmail?: string
  forensicEmail?: string
}

class DNSManager {
  /**
   * Gerar registos MX
   */
  generateMXRecords(domain: string, mailServer: string, priority: number = 10): DNSRecord[] {
    return [
      {
        type: 'MX',
        name: '@',
        value: mailServer,
        priority,
        ttl: 3600
      },
      {
        type: 'A',
        name: 'mail',
        value: 'SERVER_IP', // Substituir pelo IP real
        ttl: 3600
      }
    ]
  }

  /**
   * Gerar registo SPF
   */
  generateSPFRecord(domain: string, config: SPFConfig): string {
    const parts = ['v=spf1']

    // Adicionar IPs
    for (const ip of config.ipAddresses) {
      parts.push(`ip4:${ip}`)
    }

    // Adicionar domínios
    for (const d of config.domains) {
      parts.push(`a:${d}`)
    }

    // Adicionar includes
    for (const inc of config.includeDomains) {
      parts.push(`include:${inc}`)
    }

    // Política final
    switch (config.policy) {
      case 'allow':
        parts.push('+all')
        break
      case 'neutral':
        parts.push('?all')
        break
      case 'quarantine':
        parts.push('~all')
        break
      case 'reject':
        parts.push('-all')
        break
    }

    return parts.join(' ')
  }

  /**
   * Gerar chaves DKIM
   */
  async generateDKIMKeys(domain: string, selector: string = 'mail'): Promise<DKIMKey> {
    // Gerar par de chaves RSA
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    // Extrair chave pública em formato adequado para DNS
    const publicKeyDer = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\n/g, '')

    const dnsRecord = `${selector}._domainkey IN TXT "v=DKIM1; k=rsa; p=${publicKeyDer}"`

    return {
      selector,
      privateKey,
      publicKey: publicKeyDer,
      dnsRecord
    }
  }

  /**
   * Gerar registo DMARC
   */
  generateDMARCRecord(domain: string, config: DMARCConfig): string {
    const parts = ['v=DMARC1']
    
    parts.push(`p=${config.policy}`)
    
    if (config.subdomainPolicy) {
      parts.push(`sp=${config.subdomainPolicy}`)
    }
    
    if (config.percentage && config.percentage < 100) {
      parts.push(`pct=${config.percentage}`)
    }
    
    if (config.reportEmail) {
      parts.push(`rua=mailto:${config.reportEmail}`)
    }
    
    if (config.forensicEmail) {
      parts.push(`ruf=mailto:${config.forensicEmail}`)
    }
    
    parts.push('adkim=s')
    parts.push('aspf=s')

    return parts.join('; ')
  }

  /**
   * Verificar registo MX
   */
  async verifyMX(domain: string, expectedServer: string): Promise<DNSVerificationResult> {
    try {
      const { stdout } = await execAsync(`dig +short MX ${domain}`)
      const records = stdout.trim().split('\n').filter(Boolean)
      
      const actualServer = records.length > 0 
        ? records[0].split(/\s+/).pop() 
        : null
      
      const valid = actualServer === expectedServer || 
        records.some(r => r.includes(expectedServer))

      return {
        type: 'MX',
        name: domain,
        expected: expectedServer,
        actual: actualServer,
        valid,
        message: valid 
          ? `MX record correto: ${actualServer}`
          : `MX record incorreto ou não encontrado. Esperado: ${expectedServer}, Encontrado: ${actualServer || 'nenhum'}`
      }
    } catch (error) {
      return {
        type: 'MX',
        name: domain,
        expected: expectedServer,
        actual: null,
        valid: false,
        message: 'Erro ao verificar MX record'
      }
    }
  }

  /**
   * Verificar registo SPF
   */
  async verifySPF(domain: string): Promise<DNSVerificationResult> {
    try {
      const { stdout } = await execAsync(`dig +short TXT ${domain}`)
      const records = stdout.trim().split('\n').filter(Boolean)
      
      const spfRecord = records.find(r => r.includes('v=spf1'))
      
      if (!spfRecord) {
        return {
          type: 'SPF',
          name: domain,
          expected: 'v=spf1 ...',
          actual: null,
          valid: false,
          message: 'SPF record não encontrado'
        }
      }

      const actual = spfRecord.replace(/"/g, '').trim()
      
      return {
        type: 'SPF',
        name: domain,
        expected: 'v=spf1 ...',
        actual,
        valid: true,
        message: `SPF record encontrado: ${actual}`
      }
    } catch (error) {
      return {
        type: 'SPF',
        name: domain,
        expected: 'v=spf1 ...',
        actual: null,
        valid: false,
        message: 'Erro ao verificar SPF record'
      }
    }
  }

  /**
   * Verificar registo DKIM
   */
  async verifyDKIM(domain: string, selector: string = 'mail'): Promise<DNSVerificationResult> {
    try {
      const { stdout } = await execAsync(`dig +short TXT ${selector}._domainkey.${domain}`)
      const records = stdout.trim().split('\n').filter(Boolean)
      
      const dkimRecord = records.find(r => r.includes('v=DKIM1'))
      
      if (!dkimRecord) {
        return {
          type: 'DKIM',
          name: `${selector}._domainkey.${domain}`,
          expected: 'v=DKIM1; k=rsa; p=...',
          actual: null,
          valid: false,
          message: 'DKIM record não encontrado'
        }
      }

      const actual = dkimRecord.replace(/"/g, '').trim()
      
      // Verificar se tem chave pública
      const hasPublicKey = actual.includes('p=')
      
      return {
        type: 'DKIM',
        name: `${selector}._domainkey.${domain}`,
        expected: 'v=DKIM1; k=rsa; p=...',
        actual,
        valid: hasPublicKey,
        message: hasPublicKey 
          ? 'DKIM record válido encontrado'
          : 'DKIM record encontrado mas sem chave pública'
      }
    } catch (error) {
      return {
        type: 'DKIM',
        name: `${selector}._domainkey.${domain}`,
        expected: 'v=DKIM1; k=rsa; p=...',
        actual: null,
        valid: false,
        message: 'Erro ao verificar DKIM record'
      }
    }
  }

  /**
   * Verificar registo DMARC
   */
  async verifyDMARC(domain: string): Promise<DNSVerificationResult> {
    try {
      const { stdout } = await execAsync(`dig +short TXT _dmarc.${domain}`)
      const records = stdout.trim().split('\n').filter(Boolean)
      
      const dmarcRecord = records.find(r => r.includes('v=DMARC1'))
      
      if (!dmarcRecord) {
        return {
          type: 'DMARC',
          name: `_dmarc.${domain}`,
          expected: 'v=DMARC1; p=...',
          actual: null,
          valid: false,
          message: 'DMARC record não encontrado'
        }
      }

      const actual = dmarcRecord.replace(/"/g, '').trim()
      
      // Verificar se tem política
      const hasPolicy = actual.includes('p=')
      
      return {
        type: 'DMARC',
        name: `_dmarc.${domain}`,
        expected: 'v=DMARC1; p=...',
        actual,
        valid: hasPolicy,
        message: hasPolicy 
          ? 'DMARC record válido encontrado'
          : 'DMARC record encontrado mas sem política definida'
      }
    } catch (error) {
      return {
        type: 'DMARC',
        name: `_dmarc.${domain}`,
        expected: 'v=DMARC1; p=...',
        actual: null,
        valid: false,
        message: 'Erro ao verificar DMARC record'
      }
    }
  }

  /**
   * Verificar todos os registos DNS de email
   */
  async verifyAll(domain: string, mailServer: string, dkimSelector: string = 'mail'): Promise<{
    mx: DNSVerificationResult
    spf: DNSVerificationResult
    dkim: DNSVerificationResult
    dmarc: DNSVerificationResult
    overall: boolean
  }> {
    const [mx, spf, dkim, dmarc] = await Promise.all([
      this.verifyMX(domain, mailServer),
      this.verifySPF(domain),
      this.verifyDKIM(domain, dkimSelector),
      this.verifyDMARC(domain)
    ])

    return {
      mx,
      spf,
      dkim,
      dmarc,
      overall: mx.valid && spf.valid && dkim.valid && dmarc.valid
    }
  }

  /**
   * Obter IP do servidor
   */
  async getServerIP(): Promise<string | null> {
    try {
      const { stdout } = await execAsync("curl -s ifconfig.me || curl -s icanhazip.com || hostname -I | awk '{print $1}'")
      return stdout.trim()
    } catch {
      return null
    }
  }

  /**
   * Gerar todos os registos DNS para configuração de email
   */
  async generateAllDNSRecords(domain: string, options?: {
    mailServer?: string
    dkimSelector?: string
    spfPolicy?: 'allow' | 'neutral' | 'quarantine' | 'reject'
    dmarcPolicy?: 'none' | 'quarantine' | 'reject'
    reportEmail?: string
  }): Promise<{
    records: DNSRecord[]
    dkim: DKIMKey
    instructions: string[]
  }> {
    const mailServer = options?.mailServer || `mail.${domain}`
    const dkimSelector = options?.dkimSelector || 'mail'
    const spfPolicy = options?.spfPolicy || 'quarantine'
    const dmarcPolicy = options?.dmarcPolicy || 'quarantine'
    
    const serverIP = await this.getServerIP()
    const dkim = await this.generateDKIMKeys(domain, dkimSelector)
    
    const records: DNSRecord[] = []
    const instructions: string[] = []

    // MX Record
    records.push({
      type: 'MX',
      name: '@',
      value: mailServer,
      priority: 10,
      ttl: 3600
    })
    instructions.push(`1. Adicione o registo MX: ${domain} -> ${mailServer} (prioridade 10)`)

    // A Record para mail
    records.push({
      type: 'A',
      name: 'mail',
      value: serverIP || 'SEU_IP',
      ttl: 3600
    })
    instructions.push(`2. Adicione o registo A: mail.${domain} -> ${serverIP || 'SEU_IP'}`)

    // SPF Record
    const spfValue = this.generateSPFRecord(domain, {
      ipAddresses: serverIP ? [serverIP] : [],
      domains: [domain],
      includeDomains: [],
      policy: spfPolicy
    })
    records.push({
      type: 'TXT',
      name: '@',
      value: spfValue,
      ttl: 3600
    })
    instructions.push(`3. Adicione o registo SPF (TXT): ${spfValue}`)

    // DKIM Record
    records.push({
      type: 'TXT',
      name: `${dkimSelector}._domainkey`,
      value: `v=DKIM1; k=rsa; p=${dkim.publicKey}`,
      ttl: 3600
    })
    instructions.push(`4. Adicione o registo DKIM (TXT): ${dkimSelector}._domainkey.${domain}`)
    instructions.push(`   Valor: v=DKIM1; k=rsa; p=${dkim.publicKey.substring(0, 50)}...`)

    // DMARC Record
    const dmarcValue = this.generateDMARCRecord(domain, {
      policy: dmarcPolicy,
      reportEmail: options?.reportEmail
    })
    records.push({
      type: 'TXT',
      name: '_dmarc',
      value: dmarcValue,
      ttl: 3600
    })
    instructions.push(`5. Adicione o registo DMARC (TXT): _dmarc.${domain}`)
    instructions.push(`   Valor: ${dmarcValue}`)

    return { records, dkim, instructions }
  }

  /**
   * Testar DNS reverso (PTR)
   */
  async testReverseDNS(ip: string, expectedDomain: string): Promise<{
    valid: boolean
    actual: string | null
    message: string
  }> {
    try {
      const { stdout } = await execAsync(`dig +short -x ${ip}`)
      const actual = stdout.trim() || null
      
      if (!actual) {
        return {
          valid: false,
          actual: null,
          message: 'PTR record não encontrado. Contacte o seu fornecedor de hosting para configurar.'
        }
      }

      const actualDomain = actual.replace(/\.$/, '')
      const valid = actualDomain === expectedDomain

      return {
        valid,
        actual: actualDomain,
        message: valid 
          ? 'PTR record correto'
          : `PTR record incorreto. Esperado: ${expectedDomain}, Encontrado: ${actualDomain}`
      }
    } catch (error) {
      return {
        valid: false,
        actual: null,
        message: 'Erro ao verificar PTR record'
      }
    }
  }
}

export const dnsManager = new DNSManager()
export { DNSManager }
