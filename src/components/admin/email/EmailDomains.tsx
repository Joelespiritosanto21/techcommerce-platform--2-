'use client'

import { useState, useEffect } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  MoreHorizontal, Plus, Edit, Trash2, CheckCircle, XCircle,
  Shield, AlertTriangle, Copy, ExternalLink, RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MailDomain {
  id: string
  domain: string
  status: string
  mxValid: boolean
  spfValid: boolean
  dkimValid: boolean
  dmarcValid: boolean
  dkimSelector?: string
  dkimPublicKey?: string
  maxAccounts: number
  maxAliases: number
  maxStorageGB: number
  createdAt: string
  _count?: {
    accounts: number
    aliases: number
  }
}

export function EmailDomains() {
  const [domains, setDomains] = useState<MailDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<MailDomain | null>(null)
  const [dnsRecords, setDnsRecords] = useState<any>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    domain: '',
    maxAccounts: 10,
    maxAliases: 20,
    maxStorageGB: 10
  })

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/email?action=domains')
      const data = await response.json()
      if (data.success) {
        setDomains(data.domains)
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomains()
  }, [])

  const handleCreateDomain = async () => {
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-domain',
          ...formData
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Domínio criado',
          description: `O domínio ${formData.domain} foi criado com sucesso.`
        })
        setDialogOpen(false)
        setFormData({ domain: '', maxAccounts: 10, maxAliases: 20, maxStorageGB: 10 })
        fetchDomains()
        
        // Show DNS records
        setSelectedDomain(data.domain)
        setDnsRecords(data)
        setDnsDialogOpen(true)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.error || 'Não foi possível criar o domínio.'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao criar domínio.'
      })
    }
  }

  const handleShowDNS = async (domain: MailDomain) => {
    try {
      const response = await fetch(`/api/email?action=dns-records&domain=${domain.domain}`)
      const data = await response.json()
      if (data.success) {
        setSelectedDomain(domain)
        setDnsRecords(data)
        setDnsDialogOpen(true)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao obter registos DNS.'
      })
    }
  }

  const handleVerifyDNS = async (domain: MailDomain) => {
    try {
      const response = await fetch(`/api/email?action=verify-dns&domain=${domain.domain}`)
      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Verificação DNS',
          description: `MX: ${data.verification.mx.valid ? '✓' : '✗'} | SPF: ${data.verification.spf.valid ? '✓' : '✗'} | DKIM: ${data.verification.dkim.valid ? '✓' : '✗'} | DMARC: ${data.verification.dmarc.valid ? '✓' : '✗'}`
        })
        fetchDomains()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao verificar DNS.'
      })
    }
  }

  const handleDeleteDomain = async (domain: MailDomain) => {
    if (!confirm(`Tem certeza que deseja eliminar o domínio ${domain.domain}?`)) return
    
    try {
      const response = await fetch(`/api/email?action=domain&id=${domain.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Domínio eliminado',
          description: `O domínio ${domain.domain} foi eliminado.`
        })
        fetchDomains()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.error
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao eliminar domínio.'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>
      case 'suspended':
        return <Badge className="bg-red-500">Suspenso</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDNSStatus = (valid: boolean) => {
    return valid 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado',
      description: 'Texto copiado para a área de transferência.'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2">A carregar domínios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Domínios de Email</CardTitle>
              <CardDescription>
                Gestão de domínios para o servidor de email
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Domínio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Domínio de Email</DialogTitle>
                  <DialogDescription>
                    Adicione um novo domínio para criar contas de email personalizadas.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="domain">Domínio</Label>
                    <Input
                      id="domain"
                      placeholder="exemplo.pt"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="maxAccounts">Máx. Contas</Label>
                      <Input
                        id="maxAccounts"
                        type="number"
                        value={formData.maxAccounts}
                        onChange={(e) => setFormData({ ...formData, maxAccounts: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxAliases">Máx. Aliases</Label>
                      <Input
                        id="maxAliases"
                        type="number"
                        value={formData.maxAliases}
                        onChange={(e) => setFormData({ ...formData, maxAliases: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxStorage">Armazenamento (GB)</Label>
                      <Input
                        id="maxStorage"
                        type="number"
                        value={formData.maxStorageGB}
                        onChange={(e) => setFormData({ ...formData, maxStorageGB: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateDomain}>
                    Adicionar Domínio
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum domínio configurado</p>
              <p className="text-sm">Clique em "Adicionar Domínio" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">MX</TableHead>
                  <TableHead className="text-center">SPF</TableHead>
                  <TableHead className="text-center">DKIM</TableHead>
                  <TableHead className="text-center">DMARC</TableHead>
                  <TableHead className="text-center">Contas</TableHead>
                  <TableHead className="text-center">Aliases</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>{getStatusBadge(domain.status)}</TableCell>
                    <TableCell className="text-center">{getDNSStatus(domain.mxValid)}</TableCell>
                    <TableCell className="text-center">{getDNSStatus(domain.spfValid)}</TableCell>
                    <TableCell className="text-center">{getDNSStatus(domain.dkimValid)}</TableCell>
                    <TableCell className="text-center">{getDNSStatus(domain.dmarcValid)}</TableCell>
                    <TableCell className="text-center">
                      {domain._count?.accounts || 0} / {domain.maxAccounts}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain._count?.aliases || 0} / {domain.maxAliases}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShowDNS(domain)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Registos DNS
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVerifyDNS(domain)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verificar DNS
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteDomain(domain)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DNS Records Dialog */}
      <Dialog open={dnsDialogOpen} onOpenChange={setDnsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registos DNS - {selectedDomain?.domain}</DialogTitle>
            <DialogDescription>
              Configure os seguintes registos DNS para ativar o email para este domínio.
            </DialogDescription>
          </DialogHeader>
          
          {dnsRecords && (
            <div className="space-y-4">
              {dnsRecords.instructions?.map((instruction: string, index: number) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <span className="font-mono text-sm">{instruction}</span>
                </div>
              ))}
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Registos DNS:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsRecords.records?.map((record: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell><Badge variant="outline">{record.type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{record.name}</TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate">{record.value}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(record.value)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {dnsRecords.dkimPublicKey && (
                <div>
                  <h4 className="font-medium mb-2">Chave Pública DKIM:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-xs break-all">{dnsRecords.dkimPublicKey}</code>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
