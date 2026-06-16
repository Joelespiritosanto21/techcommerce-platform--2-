'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal, Plus, Edit, Trash2, Globe, Shield, RefreshCw,
  Power, FileCode, ExternalLink, Search
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Website {
  id: string
  domain: string
  type: 'php' | 'nodejs' | 'python' | 'static'
  status: 'active' | 'suspended' | 'error'
  phpVersion?: string
  sslEnabled: boolean
  documentRoot: string
  diskUsageMB: number
  bandwidthMB: number
  createdAt: string
}

const phpVersions = ['8.3', '8.2', '8.1', '8.0', '7.4']
const websiteTypes = [
  { value: 'php', label: 'PHP (Laravel, WordPress, etc.)' },
  { value: 'nodejs', label: 'Node.js (Next.js, Express, etc.)' },
  { value: 'python', label: 'Python (Django, Flask, etc.)' },
  { value: 'static', label: 'HTML Estático' }
]

export function WebsitesManagement() {
  const [websites, setWebsites] = useState<Website[]>([
    {
      id: '1',
      domain: 'empresa.pt',
      type: 'php',
      status: 'active',
      phpVersion: '8.2',
      sslEnabled: true,
      documentRoot: '/var/www/empresa.pt',
      diskUsageMB: 450,
      bandwidthMB: 2500,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      domain: 'loja.empresa.pt',
      type: 'nodejs',
      status: 'active',
      sslEnabled: true,
      documentRoot: '/var/www/loja.empresa.pt',
      diskUsageMB: 280,
      bandwidthMB: 1800,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      domain: 'blog.empresa.pt',
      type: 'php',
      status: 'active',
      phpVersion: '8.1',
      sslEnabled: true,
      documentRoot: '/var/www/blog.empresa.pt',
      diskUsageMB: 120,
      bandwidthMB: 500,
      createdAt: new Date().toISOString()
    }
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    domain: '',
    type: 'php' as Website['type'],
    phpVersion: '8.2',
    documentRoot: '/var/www/'
  })

  const handleCreateWebsite = async () => {
    toast({
      title: 'Website criado',
      description: `O website ${formData.domain} foi criado com sucesso.`
    })
    setDialogOpen(false)
    setFormData({ domain: '', type: 'php', phpVersion: '8.2', documentRoot: '/var/www/' })
  }

  const handleToggleSSL = (website: Website) => {
    toast({
      title: website.sslEnabled ? 'SSL desativado' : 'SSL ativado',
      description: `SSL ${website.sslEnabled ? 'desativado' : 'ativado'} para ${website.domain}`
    })
  }

  const handleSuspend = (website: Website) => {
    toast({
      title: 'Website suspenso',
      description: `O website ${website.domain} foi suspenso.`
    })
  }

  const handleRestart = (website: Website) => {
    toast({
      title: 'Website reiniciado',
      description: `O website ${website.domain} foi reiniciado.`
    })
  }

  const filteredWebsites = websites.filter(site =>
    site.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTypeBadge = (type: Website['type']) => {
    const colors = {
      php: 'bg-blue-500',
      nodejs: 'bg-green-500',
      python: 'bg-yellow-500',
      static: 'bg-gray-500'
    }
    return <Badge className={colors[type]}>{type.toUpperCase()}</Badge>
  }

  const getStatusBadge = (status: Website['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>
      case 'suspended':
        return <Badge className="bg-yellow-500">Suspenso</Badge>
      case 'error':
        return <Badge className="bg-red-500">Erro</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Websites</CardTitle>
            <CardDescription>
              Gestão de websites e aplicações
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Website
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Website</DialogTitle>
                  <DialogDescription>
                    Crie um novo website ou aplicação.
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
                  <div className="grid gap-2">
                    <Label htmlFor="type">Tipo de Website</Label>
                    <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {websiteTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.type === 'php' && (
                    <div className="grid gap-2">
                      <Label htmlFor="phpVersion">Versão PHP</Label>
                      <Select value={formData.phpVersion} onValueChange={(v) => setFormData({ ...formData, phpVersion: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {phpVersions.map((v) => (
                            <SelectItem key={v} value={v}>PHP {v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="documentRoot">Document Root</Label>
                    <Input
                      id="documentRoot"
                      value={formData.documentRoot + (formData.domain || 'site')}
                      onChange={(e) => setFormData({ ...formData, documentRoot: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWebsite}>
                    Criar Website
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domínio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>PHP</TableHead>
              <TableHead className="text-center">SSL</TableHead>
              <TableHead>Disco</TableHead>
              <TableHead>Tráfego</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWebsites.map((website) => (
              <TableRow key={website.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{website.domain}</span>
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(website.type)}</TableCell>
                <TableCell>
                  {website.phpVersion ? (
                    <Badge variant="outline">PHP {website.phpVersion}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {website.sslEnabled ? (
                    <Shield className="h-4 w-4 text-green-500 mx-auto" />
                  ) : (
                    <Shield className="h-4 w-4 text-muted-foreground mx-auto" />
                  )}
                </TableCell>
                <TableCell>{website.diskUsageMB} MB</TableCell>
                <TableCell>{website.bandwidthMB} MB</TableCell>
                <TableCell>{getStatusBadge(website.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visitar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileCode className="h-4 w-4 mr-2" />
                        File Manager
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleSSL(website)}>
                        <Shield className="h-4 w-4 mr-2" />
                        {website.sslEnabled ? 'Desativar SSL' : 'Ativar SSL'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRestart(website)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reiniciar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSuspend(website)}>
                        <Power className="h-4 w-4 mr-2" />
                        Suspender
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
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
      </CardContent>
    </Card>
  )
}
