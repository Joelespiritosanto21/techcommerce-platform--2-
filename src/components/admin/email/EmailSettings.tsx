'use client'

import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Server, Shield, Mail, AlertTriangle, Settings, RefreshCw, Save
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MailServerConfig {
  id: string
  hostname?: string
  domain?: string
  smtpPort: number
  smtpsPort: number
  submissionPort: number
  imapPort: number
  imapsPort: number
  pop3Port: number
  pop3sPort: number
  maxMessageSizeMB: number
  smtpdSaslAuth: boolean
  smtpdTls: boolean
  spamEnabled: boolean
  spamScore: number
  spamSubjectTag: string
  spamQuarantine: boolean
  antivirusEnabled: boolean
  greylistingEnabled: boolean
  maxMessagesPerHour: number
  maxRecipientsPerMessage: number
  status: string
}

export function EmailSettings() {
  const [config, setConfig] = useState<MailServerConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const defaultConfig: Partial<MailServerConfig> = {
    smtpPort: 25,
    smtpsPort: 465,
    submissionPort: 587,
    imapPort: 143,
    imapsPort: 993,
    pop3Port: 110,
    pop3sPort: 995,
    maxMessageSizeMB: 50,
    smtpdSaslAuth: true,
    smtpdTls: true,
    spamEnabled: true,
    spamScore: 5,
    spamSubjectTag: '[SPAM]',
    spamQuarantine: true,
    antivirusEnabled: true,
    greylistingEnabled: true,
    maxMessagesPerHour: 100,
    maxRecipientsPerMessage: 50
  }

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/email?action=config')
      const data = await response.json()
      if (data.success && data.config) {
        setConfig(data.config)
      } else {
        setConfig(defaultConfig as MailServerConfig)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      setConfig(defaultConfig as MailServerConfig)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-config',
          ...config
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Configuração guardada',
          description: 'As configurações do servidor de email foram atualizadas.'
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível guardar as configurações.'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: keyof MailServerConfig, value: any) => {
    setConfig(prev => prev ? { ...prev, [key]: value } : null)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Server Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuração do Servidor
          </CardTitle>
          <CardDescription>
            Configurações gerais do servidor de email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                value={config?.hostname || ''}
                onChange={(e) => updateConfig('hostname', e.target.value)}
                placeholder="mail.exemplo.pt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio Principal</Label>
              <Input
                id="domain"
                value={config?.domain || ''}
                onChange={(e) => updateConfig('domain', e.target.value)}
                placeholder="exemplo.pt"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP</Label>
              <Input
                id="smtpPort"
                type="number"
                value={config?.smtpPort || 25}
                onChange={(e) => updateConfig('smtpPort', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpsPort">SMTPS</Label>
              <Input
                id="smtpsPort"
                type="number"
                value={config?.smtpsPort || 465}
                onChange={(e) => updateConfig('smtpsPort', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submissionPort">Submission</Label>
              <Input
                id="submissionPort"
                type="number"
                value={config?.submissionPort || 587}
                onChange={(e) => updateConfig('submissionPort', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMessageSize">Tamanho Máx. (MB)</Label>
              <Input
                id="maxMessageSize"
                type="number"
                value={config?.maxMessageSizeMB || 50}
                onChange={(e) => updateConfig('maxMessageSizeMB', parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imapPort">IMAP</Label>
              <Input
                id="imapPort"
                type="number"
                value={config?.imapPort || 143}
                onChange={(e) => updateConfig('imapPort', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imapsPort">IMAPS</Label>
              <Input
                id="imapsPort"
                type="number"
                value={config?.imapsPort || 993}
                onChange={(e) => updateConfig('imapsPort', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pop3Port">POP3</Label>
              <Input
                id="pop3Port"
                type="number"
                value={config?.pop3Port || 110}
                onChange={(e) => updateConfig('pop3Port', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pop3sPort">POP3S</Label>
              <Input
                id="pop3sPort"
                type="number"
                value={config?.pop3sPort || 995}
                onChange={(e) => updateConfig('pop3sPort', parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={config?.smtpdSaslAuth ?? true}
                onCheckedChange={(checked) => updateConfig('smtpdSaslAuth', checked)}
              />
              <Label>Autenticação SASL</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config?.smtpdTls ?? true}
                onCheckedChange={(checked) => updateConfig('smtpdTls', checked)}
              />
              <Label>TLS Obrigatório</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spam Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Filtro de Spam (SpamAssassin)
          </CardTitle>
          <CardDescription>
            Configure as definições de proteção contra spam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Filtro de Spam</Label>
              <p className="text-sm text-muted-foreground">
                Analisa emails recebidos e marca spam automaticamente
              </p>
            </div>
            <Switch
              checked={config?.spamEnabled ?? true}
              onCheckedChange={(checked) => updateConfig('spamEnabled', checked)}
            />
          </div>
          
          {config?.spamEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spamScore">Score Mínimo (0-10)</Label>
                  <Input
                    id="spamScore"
                    type="number"
                    min={0}
                    max={10}
                    value={config?.spamScore || 5}
                    onChange={(e) => updateConfig('spamScore', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Emails com score igual ou superior serão marcados como spam
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spamSubjectTag">Tag no Assunto</Label>
                  <Input
                    id="spamSubjectTag"
                    value={config?.spamSubjectTag || '[SPAM]'}
                    onChange={(e) => updateConfig('spamSubjectTag', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Quarentena</Label>
                  <p className="text-sm text-muted-foreground">
                    Mover spam detectado para pasta de quarentena
                  </p>
                </div>
                <Switch
                  checked={config?.spamQuarantine ?? true}
                  onCheckedChange={(checked) => updateConfig('spamQuarantine', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Antivirus & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Antivírus e Segurança
          </CardTitle>
          <CardDescription>
            Proteção contra malware e configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Antivírus (ClamAV)</Label>
              <p className="text-sm text-muted-foreground">
                Verifica anexos de email em busca de malware
              </p>
            </div>
            <Switch
              checked={config?.antivirusEnabled ?? true}
              onCheckedChange={(checked) => updateConfig('antivirusEnabled', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Greylisting</Label>
              <p className="text-sm text-muted-foreground">
                Rejeita temporariamente emails de remetentes desconhecidos
              </p>
            </div>
            <Switch
              checked={config?.greylistingEnabled ?? true}
              onCheckedChange={(checked) => updateConfig('greylistingEnabled', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxMessagesPerHour">Mensagens/Hora</Label>
              <Input
                id="maxMessagesPerHour"
                type="number"
                value={config?.maxMessagesPerHour || 100}
                onChange={(e) => updateConfig('maxMessagesPerHour', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Limite de envio por utilizador
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxRecipients">Destinatários/Mensagem</Label>
              <Input
                id="maxRecipients"
                type="number"
                value={config?.maxRecipientsPerMessage || 50}
                onChange={(e) => updateConfig('maxRecipientsPerMessage', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configurações
        </Button>
      </div>
    </div>
  )
}
