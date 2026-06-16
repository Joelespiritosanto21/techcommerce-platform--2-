'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Plus, Trash2, Shield, RefreshCw, Download, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SSLCertificate {
  id: string
  domain: string
  provider: 'letsencrypt' | 'custom' | 'purchased'
  status: 'active' | 'pending' | 'expired' | 'error'
  issuedAt: string
  expiresAt: string
  autoRenew: boolean
}

export function SSLCertificates() {
  const [certificates, setCertificates] = useState<SSLCertificate[]>([
    { id: '1', domain: 'empresa.pt', provider: 'letsencrypt', status: 'active', issuedAt: '2024-01-15', expiresAt: '2024-04-15', autoRenew: true },
    { id: '2', domain: 'loja.empresa.pt', provider: 'letsencrypt', status: 'active', issuedAt: '2024-01-10', expiresAt: '2024-04-10', autoRenew: true },
    { id: '3', domain: 'api.empresa.pt', provider: 'letsencrypt', status: 'pending', issuedAt: '', expiresAt: '', autoRenew: true }
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    domain: '',
    provider: 'letsencrypt' as SSLCertificate['provider']
  })

  const handleRequestSSL = async () => {
    toast({
      title: 'Certificado solicitado',
      description: `O certificado SSL para ${formData.domain} está a ser emitido.`
    })
    setDialogOpen(false)
    setFormData({ domain: '', provider: 'letsencrypt' })
  }

  const handleRenew = (cert: SSLCertificate) => {
    toast({
      title: 'Renovação iniciada',
      description: `O certificado para ${cert.domain} está a ser renovado.`
    })
  }

  const handleDelete = (cert: SSLCertificate) => {
    if (!confirm(`Tem certeza que deseja eliminar o certificado de ${cert.domain}?`)) return
    setCertificates(certificates.filter(c => c.id !== cert.id))
    toast({
      title: 'Certificado eliminado',
      description: `O certificado de ${cert.domain} foi eliminado.`
    })
  }

  const getDaysUntilExpiry = (expiresAt: string) => {
    if (!expiresAt) return null
    const expiry = new Date(expiresAt)
    const now = new Date()
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const getStatusBadge = (status: SSLCertificate['status'], expiresAt?: string) => {
    const days = expiresAt ? getDaysUntilExpiry(expiresAt) : null
    
    switch (status) {
      case 'active':
        if (days !== null && days < 7) {
          return <Badge className="bg-yellow-500">Expira em {days} dias</Badge>
        }
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Válido</Badge>
      case 'pending':
        return <Badge className="bg-blue-500">A emitir...</Badge>
      case 'expired':
        return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" />Expirado</Badge>
      case 'error':
        return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" />Erro</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProviderBadge = (provider: SSLCertificate['provider']) => {
    switch (provider) {
      case 'letsencrypt':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Let's Encrypt</Badge>
      case 'custom':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Personalizado</Badge>
      case 'purchased':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Comprado</Badge>
      default:
        return <Badge variant="outline">{provider}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Certificados SSL</CardTitle>
            <CardDescription>
              Gestão de certificados SSL com Let's Encrypt (gratuito) ou personalizados
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Solicitar SSL
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Certificado SSL</DialogTitle>
                <DialogDescription>
                  Obtenha um certificado SSL gratuito através do Let's Encrypt.
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
                  <p className="text-xs text-muted-foreground">
                    O domínio deve estar configurado e a apontar para este servidor.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRequestSSL}>
                  Solicitar Certificado
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domínio</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Emitido</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead className="text-center">Auto-Renovar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificates.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cert.domain}</span>
                  </div>
                </TableCell>
                <TableCell>{getProviderBadge(cert.provider)}</TableCell>
                <TableCell>{cert.issuedAt || '—'}</TableCell>
                <TableCell>{cert.expiresAt || '—'}</TableCell>
                <TableCell className="text-center">
                  {cert.autoRenew ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">Sim</Badge>
                  ) : (
                    <Badge variant="outline">Não</Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(cert.status, cert.expiresAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {cert.status === 'active' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRenew(cert)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cert)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
