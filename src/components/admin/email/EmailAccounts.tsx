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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MoreHorizontal, Plus, Edit, Trash2, Key, Mail, Forward,
  Reply, RefreshCw, Search, HardDrive, Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MailDomain {
  id: string
  domain: string
  _count?: { accounts: number }
  maxAccounts: number
}

interface MailAccount {
  id: string
  email: string
  username: string
  quotaMB: number
  usedMB: number
  spamFilterEnabled: boolean
  autoReplyEnabled: boolean
  autoReplySubject?: string
  autoReplyMessage?: string
  forwardEnabled: boolean
  forwardTo?: string
  forwardKeepCopy: boolean
  status: string
  lastLoginAt?: string
  mailDomain: {
    domain: string
  }
}

export function EmailAccounts() {
  const [accounts, setAccounts] = useState<MailAccount[]>([])
  const [domains, setDomains] = useState<MailDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<MailAccount | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    quotaMB: 1000
  })

  const [editFormData, setEditFormData] = useState({
    quotaMB: 1000,
    spamFilterEnabled: true,
    autoReplyEnabled: false,
    autoReplySubject: '',
    autoReplyMessage: '',
    forwardEnabled: false,
    forwardTo: '',
    forwardKeepCopy: true
  })

  const fetchData = async () => {
    try {
      const [accountsRes, domainsRes] = await Promise.all([
        fetch('/api/email?action=accounts'),
        fetch('/api/email?action=domains')
      ])
      
      const accountsData = await accountsRes.json()
      const domainsData = await domainsRes.json()
      
      if (accountsData.success) setAccounts(accountsData.accounts)
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

  const handleCreateAccount = async () => {
    if (!selectedDomainId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um domínio.'
      })
      return
    }

    const domain = domains.find(d => d.id === selectedDomainId)
    const email = formData.email.includes('@') 
      ? formData.email 
      : `${formData.email}@${domain?.domain}`

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-account',
          email,
          password: formData.password,
          quotaMB: formData.quotaMB,
          mailDomainId: selectedDomainId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Conta criada',
          description: `A conta ${email} foi criada com sucesso.`
        })
        setDialogOpen(false)
        setFormData({ email: '', password: '', quotaMB: 1000 })
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
        description: 'Erro ao criar conta.'
      })
    }
  }

  const handleEditAccount = async () => {
    if (!selectedAccount) return

    try {
      // Update quota
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-quota',
          accountId: selectedAccount.id,
          quotaMB: editFormData.quotaMB
        })
      })

      // Update auto-reply
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-autoreply',
          accountId: selectedAccount.id,
          enabled: editFormData.autoReplyEnabled,
          subject: editFormData.autoReplySubject,
          message: editFormData.autoReplyMessage
        })
      })

      // Update forwarding
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-forwarding',
          accountId: selectedAccount.id,
          enabled: editFormData.forwardEnabled,
          forwardTo: editFormData.forwardTo ? editFormData.forwardTo.split(',').map(s => s.trim()) : [],
          keepCopy: editFormData.forwardKeepCopy
        })
      })

      toast({
        title: 'Conta atualizada',
        description: 'As configurações foram salvas com sucesso.'
      })
      setEditDialogOpen(false)
      fetchData()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar conta.'
      })
    }
  }

  const handleDeleteAccount = async (account: MailAccount) => {
    if (!confirm(`Tem certeza que deseja eliminar a conta ${account.email}?`)) return
    
    try {
      const response = await fetch(`/api/email?action=account&id=${account.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Conta eliminada',
          description: `A conta ${account.email} foi eliminada.`
        })
        fetchData()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao eliminar conta.'
      })
    }
  }

  const openEditDialog = (account: MailAccount) => {
    setSelectedAccount(account)
    setEditFormData({
      quotaMB: account.quotaMB,
      spamFilterEnabled: account.spamFilterEnabled,
      autoReplyEnabled: account.autoReplyEnabled,
      autoReplySubject: account.autoReplySubject || '',
      autoReplyMessage: account.autoReplyMessage || '',
      forwardEnabled: account.forwardEnabled,
      forwardTo: account.forwardTo || '',
      forwardKeepCopy: account.forwardKeepCopy
    })
    setEditDialogOpen(true)
  }

  const filteredAccounts = accounts.filter(account => 
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStoragePercentage = (used: number, quota: number) => {
    return Math.min((used / quota) * 100, 100)
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contas de Email</CardTitle>
              <CardDescription>
                Gestão de contas de email
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
                    Nova Conta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Conta de Email</DialogTitle>
                    <DialogDescription>
                      Crie uma nova conta de email para um domínio configurado.
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
                            <SelectItem 
                              key={domain.id} 
                              value={domain.id}
                              disabled={(domain._count?.accounts || 0) >= domain.maxAccounts}
                            >
                              {domain.domain} ({domain._count?.accounts || 0}/{domain.maxAccounts})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="email"
                          placeholder="utilizador"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        {selectedDomainId && (
                          <span className="text-muted-foreground">
                            @{domains.find(d => d.id === selectedDomainId)?.domain}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="quota">Quota (MB)</Label>
                      <Input
                        id="quota"
                        type="number"
                        value={formData.quotaMB}
                        onChange={(e) => setFormData({ ...formData, quotaMB: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateAccount}>
                      Criar Conta
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Armazenamento</TableHead>
                  <TableHead className="text-center">Spam</TableHead>
                  <TableHead className="text-center">Auto-Resposta</TableHead>
                  <TableHead className="text-center">Reencaminhamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <div className="w-24">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStoragePercentage(account.usedMB, account.quotaMB) > 90 ? 'bg-red-500' : 'bg-primary'}`}
                              style={{ width: `${getStoragePercentage(account.usedMB, account.quotaMB)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {account.usedMB}/{account.quotaMB}MB
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {account.spamFilterEnabled ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Desativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {account.autoReplyEnabled ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Reply className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {account.forwardEnabled ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          <Forward className="h-3 w-3 mr-1" />
                          {account.forwardTo}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={account.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.lastLoginAt ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(account.lastLoginAt).toLocaleDateString('pt-PT')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(account)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Key className="h-4 w-4 mr-2" />
                            Alterar Password
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteAccount(account)}
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

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Conta - {selectedAccount?.email}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="autoreply">Auto-Resposta</TabsTrigger>
              <TabsTrigger value="forwarding">Reencaminhamento</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Quota (MB)</Label>
                  <Input
                    type="number"
                    value={editFormData.quotaMB}
                    onChange={(e) => setEditFormData({ ...editFormData, quotaMB: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Filtro de Spam</Label>
                  <Switch
                    checked={editFormData.spamFilterEnabled}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, spamFilterEnabled: checked })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="autoreply" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <Label>Ativar Auto-Resposta</Label>
                  <Switch
                    checked={editFormData.autoReplyEnabled}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, autoReplyEnabled: checked })}
                  />
                </div>
                {editFormData.autoReplyEnabled && (
                  <>
                    <div className="grid gap-2">
                      <Label>Assunto</Label>
                      <Input
                        value={editFormData.autoReplySubject}
                        onChange={(e) => setEditFormData({ ...editFormData, autoReplySubject: e.target.value })}
                        placeholder="Ex: Ausência do escritório"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        value={editFormData.autoReplyMessage}
                        onChange={(e) => setEditFormData({ ...editFormData, autoReplyMessage: e.target.value })}
                        placeholder="A sua mensagem de auto-resposta..."
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            <TabsContent value="forwarding" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <Label>Ativar Reencaminhamento</Label>
                  <Switch
                    checked={editFormData.forwardEnabled}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, forwardEnabled: checked })}
                  />
                </div>
                {editFormData.forwardEnabled && (
                  <>
                    <div className="grid gap-2">
                      <Label>Reencaminhar Para (separar por vírgulas)</Label>
                      <Input
                        value={editFormData.forwardTo}
                        onChange={(e) => setEditFormData({ ...editFormData, forwardTo: e.target.value })}
                        placeholder="email1@exemplo.com, email2@exemplo.com"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Manter Cópia</Label>
                      <Switch
                        checked={editFormData.forwardKeepCopy}
                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, forwardKeepCopy: checked })}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditAccount}>
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
