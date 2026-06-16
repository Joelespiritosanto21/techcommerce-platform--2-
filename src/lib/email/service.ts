/**
 * TechCommerce Email Server Service
 * Serviço de background para gestão de email
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import cron from 'node-cron'

const execAsync = promisify(exec)

interface EmailServerStatus {
  postfix: boolean
  dovecot: boolean
  spamassassin: boolean
  clamav: boolean
  opendkim: boolean
}

interface QueueItem {
  id: string
  from: string
  to: string
  subject: string
  size: number
  time: Date
}

interface ServerMetrics {
  emailsSent: number
  emailsReceived: number
  emailsBounced: number
  spamBlocked: number
  virusBlocked: number
  queueSize: number
  diskUsage: number
}

class EmailServerService {
  private isRunning = false
  private metrics: ServerMetrics = {
    emailsSent: 0,
    emailsReceived: 0,
    emailsBounced: 0,
    spamBlocked: 0,
    virusBlocked: 0,
    queueSize: 0,
    diskUsage: 0
  }

  /**
   * Iniciar serviço de email
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    // Agendar tarefas de manutenção
    this.scheduleMaintenance()
    
    // Iniciar monitorização
    this.startMonitoring()
    
    console.log('📧 Email Server Service started')
  }

  /**
   * Parar serviço de email
   */
  stop(): void {
    this.isRunning = false
    console.log('📧 Email Server Service stopped')
  }

  /**
   * Verificar estado dos serviços
   */
  async getStatus(): Promise<EmailServerStatus> {
    const status: EmailServerStatus = {
      postfix: false,
      dovecot: false,
      spamassassin: false,
      clamav: false,
      opendkim: false
    }

    try {
      status.postfix = await this.checkService('postfix')
      status.dovecot = await this.checkService('dovecot')
      status.spamassassin = await this.checkService('spamassassin')
      status.clamav = await this.checkService('clamav-daemon')
      status.opendkim = await this.checkService('opendkim')
    } catch (error) {
      // Serviços não instalados
    }

    return status
  }

  /**
   * Obter métricas do servidor
   */
  getMetrics(): ServerMetrics {
    return { ...this.metrics }
  }

  /**
   * Obter fila de email
   */
  async getQueue(): Promise<QueueItem[]> {
    const queue: QueueItem[] = []

    try {
      const { stdout } = await execAsync('mailq')
      const lines = stdout.split('\n')

      let currentItem: Partial<QueueItem> | null = null

      for (const line of lines) {
        if (/^[A-F0-9]+/.test(line)) {
          if (currentItem?.id) {
            queue.push(currentItem as QueueItem)
          }
          
          const [id, size, timeStr, ...rest] = line.split(/\s+/)
          currentItem = {
            id,
            size: parseInt(size) || 0,
            time: new Date()
          }
        } else if (line.startsWith('\t')) {
          if (currentItem) {
            if (line.includes('From:')) {
              currentItem.from = line.split('From:')[1]?.trim() || ''
            } else if (line.includes('To:')) {
              currentItem.to = line.split('To:')[1]?.trim() || ''
            }
          }
        }
      }

      if (currentItem?.id) {
        queue.push(currentItem as QueueItem)
      }
    } catch (error) {
      // Fila vazia ou comando não disponível
    }

    this.metrics.queueSize = queue.length
    return queue
  }

  /**
   * Processar fila de email
   */
  async flushQueue(): Promise<void> {
    try {
      await execAsync('postqueue -f')
    } catch (error) {
      throw new Error('Falha ao processar fila de email')
    }
  }

  /**
   * Remover email da fila
   */
  async removeFromQueue(queueId: string): Promise<void> {
    try {
      await execAsync(`postsuper -d ${queueId}`)
    } catch (error) {
      throw new Error('Falha ao remover email da fila')
    }
  }

  /**
   * Reiniciar serviço de email
   */
  async restartService(service: 'postfix' | 'dovecot' | 'spamassassin' | 'clamav' | 'opendkim' | 'all'): Promise<void> {
    const services = service === 'all' 
      ? ['postfix', 'dovecot', 'spamassassin', 'clamav-daemon', 'opendkim']
      : [service === 'clamav' ? 'clamav-daemon' : service]

    for (const svc of services) {
      try {
        await execAsync(`systemctl restart ${svc}`)
      } catch (error) {
        console.error(`Falha ao reiniciar ${svc}`)
      }
    }
  }

  /**
   * Testar ligação SMTP
   */
  async testSMTP(host: string, port: number = 25): Promise<{ success: boolean; message: string }> {
    try {
      const { stdout } = await execAsync(`nc -zv ${host} ${port} 2>&1`)
      return { success: true, message: stdout }
    } catch (error) {
      return { success: false, message: `Falha ao ligar a ${host}:${port}` }
    }
  }

  /**
   * Verificar certificados SSL
   */
  async checkSSLCertificates(): Promise<{ domain: string; expiresAt: Date; daysLeft: number }[]> {
    const certs: { domain: string; expiresAt: Date; daysLeft: number }[] = []

    try {
      const { stdout } = await execAsync('certbot certificates 2>/dev/null || echo ""')
      const lines = stdout.split('\n')

      for (const line of lines) {
        if (line.includes('Expiry Date:')) {
          const match = line.match(/Expiry Date:\s*([^(]+)/)
          if (match) {
            const expiresAt = new Date(match[1].trim())
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            
            // Encontrar domínio
            const domainMatch = line.match(/for\s+(\S+)/)
            if (domainMatch) {
              certs.push({
                domain: domainMatch[1],
                expiresAt,
                daysLeft
              })
            }
          }
        }
      }
    } catch (error) {
      // Certbot não disponível
    }

    return certs
  }

  /**
   * Renovar certificados SSL
   */
  async renewSSLCertificates(): Promise<{ success: boolean; message: string }> {
    try {
      const { stdout } = await execAsync('certbot renew --non-interactive')
      return { success: true, message: stdout }
    } catch (error) {
      return { success: false, message: 'Falha ao renovar certificados' }
    }
  }

  /**
   * Obter logs de email
   */
  async getLogs(lines: number = 100): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`tail -n ${lines} /var/log/mail.log 2>/dev/null || journalctl -u postfix -n ${lines} --no-pager`)
      return stdout.split('\n')
    } catch (error) {
      return []
    }
  }

  /**
   * Analisar logs para estatísticas
   */
  async analyzeLogs(): Promise<{
    sent: number
    received: number
    bounced: number
    rejected: number
    spam: number
    virus: number
  }> {
    const stats = {
      sent: 0,
      received: 0,
      bounced: 0,
      rejected: 0,
      spam: 0,
      virus: 0
    }

    try {
      const logs = await this.getLogs(1000)
      
      for (const line of logs) {
        if (line.includes('status=sent')) stats.sent++
        if (line.includes('status=bounced')) stats.bounced++
        if (line.includes('status=reject')) stats.rejected++
        if (line.includes('SPAM')) stats.spam++
        if (line.includes('virus')) stats.virus++
        if (line.includes('message-id=')) stats.received++
      }
    } catch (error) {
      // Logs não disponíveis
    }

    return stats
  }

  // ==================== Métodos privados ====================

  private async checkService(service: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${service}`)
      return stdout.trim() === 'active'
    } catch {
      return false
    }
  }

  private scheduleMaintenance(): void {
    // Limpeza de spam - diariamente às 3h
    cron.schedule('0 3 * * *', async () => {
      try {
        await execAsync('sa-learn --spam /var/vmail/spam 2>/dev/null || true')
        await execAsync('sa-learn --ham /var/vmail/ham 2>/dev/null || true')
      } catch {
        // Ignorar erros
      }
    })

    // Atualização de antivirus - de hora em hora
    cron.schedule('0 * * * *', async () => {
      try {
        await execAsync('freshclam 2>/dev/null || true')
      } catch {
        // Ignorar erros
      }
    })

    // Renovação de SSL - semanalmente
    cron.schedule('0 4 * * 0', async () => {
      try {
        await execAsync('certbot renew --quiet --post-hook "systemctl reload postfix dovecot"')
      } catch {
        // Ignorar erros
      }
    })

    // Limpeza de logs antigos - mensalmente
    cron.schedule('0 5 1 * *', async () => {
      try {
        await execAsync('find /var/log -name "mail.log.*" -mtime +30 -delete 2>/dev/null || true')
      } catch {
        // Ignorar erros
      }
    })
  }

  private startMonitoring(): void {
    // Atualizar métricas a cada 5 minutos
    setInterval(async () => {
      if (!this.isRunning) return

      try {
        const queue = await this.getQueue()
        this.metrics.queueSize = queue.length

        const { stdout } = await execAsync('du -sm /var/vmail 2>/dev/null | cut -f1')
        this.metrics.diskUsage = parseInt(stdout.trim()) || 0
      } catch {
        // Ignorar erros
      }
    }, 5 * 60 * 1000)
  }
}

export const emailServerService = new EmailServerService()
export { EmailServerService }
