'use client'

import { useState, useEffect } from 'react'
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
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Plus, Trash2, Edit, Forward, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MailDomain {
  id: string
  domain: string
}

interface MailAlias {
  id: string
  source: string
  destination: string
  isActive: boolean
  mailDomain: {
    domain: string
  }
}

export function EmailAliases() {
  const [aliases, setAliases] = useState<MailAlias[]>([])
  const [domains, setDomains] = useState<MailDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    source: '',
    destination: ''
  })

  const fetchData = async () => {
    try {
      const [aliasesRes, domainsRes] = await Promise.all([
        fetch('/api/email?action=aliases'),
        fetch('/api/email?action=domains')
      ])
      
      const aliasesData = await aliasesRes.json()
      const domainsData = await domainsRes.json()
      
      if (aliasesData.success) setAliases(aliasesData.aliases)
      if (domainsData.success) setDomains(domainsData.domains)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateAlias = async () => {
    if (!selectedDomainId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um domínio.'
      })
      return
    }

    const domain = domains.find(d => d.id === selectedDomainId)
    const source = formData.source.includes('@') 
      ? formData.source 
      : `${formData.source}@${domain?.domain}`

    const destinations = formData.destination.split(',').map(s => s.trim()).filter(Boolean)

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-alias',
          source,
          destination: destinations,
          mailDomainId: selectedDomainId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Alias criado',
          description: `O alias ${source} foi criado com sucesso.`
        })
        setDialogOpen(false)
        setFormData({ source: '', destination: '' })
        setSelectedDomainId('')
        fetchData()
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
        description: 'Erro ao criar alias.'
      })
    }
  }

  const handleDeleteAlias = async (alias: MailAlias) => {
    if (!confirm(`Tem certeza que deseja eliminar o alias ${alias.source}?`)) return
    
    try {
      const response = await fetch(`/api/email?action=alias&id=${alias.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Alias eliminado',
          description: `O alias ${alias.source} foi eliminado.`
        })
        fetchData()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao eliminar alias.'
      })
    }
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Aliases de Email</CardTitle>
            <CardDescription>
              Redirecionamentos de email para uma ou mais contas
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Alias
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Alias de Email</DialogTitle>
                <DialogDescription>
                  Crie um redirecionamento de email.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Domínio</Label>
                  <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um domínio" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id}>
                          {domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source">Email de Origem</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="source"
                      placeholder="info"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    />
                    {selectedDomainId && (
                      <span className="text-muted-foreground">
                        @{domains.find(d => d.id === selectedDomainId)?.domain}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination">Destino (separar por vírgulas)</Label>
                  <Input
                    id="destination"
                    placeholder="admin@exemplo.com, suporte@exemplo.com"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Os emails enviados para o alias serão reencaminhados para estes endereços.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAlias}>
                  Criar Alias
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {aliases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Forward className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alias configurado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell className="font-medium">{alias.source}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(alias.destination).map((dest: string, i: number) => (
                        <Badge key={i} variant="secondary">{dest}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {alias.isActive ? (
                      <Badge className="bg-green-500">Ativo</Badge>
                    ) : (
                      <Badge variant="destructive">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeleteAlias(alias)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
