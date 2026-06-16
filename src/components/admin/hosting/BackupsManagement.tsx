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
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Plus, Trash2, Download, HardDrive, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Backup {
  id: string
  type: 'full' | 'files' | 'database'
  target: string
  sizeMB: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  retentionDays: number
}

export function BackupsManagement() {
  const [backups, setBackups] = useState<Backup[]>([
    { id: '1', type: 'full', target: 'Todos os websites', sizeMB: 1250, status: 'completed', createdAt: '2024-01-15 02:00', completedAt: '2024-01-15 02:30', retentionDays: 30 },
    { id: '2', type: 'database', target: 'empresa_prod', sizeMB: 256, status: 'completed', createdAt: '2024-01-15 03:00', completedAt: '2024-01-15 03:05', retentionDays: 30 },
    { id: '3', type: 'files', target: 'empresa.pt', sizeMB: 450, status: 'running', createdAt: '2024-01-15 04:00', retentionDays: 14 }
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    type: 'full' as Backup['type'],
    target: '',
    retentionDays: 30
  })

  const handleCreateBackup = async () => {
    toast({
      title: 'Backup iniciado',
      description: 'O backup está a ser criado em segundo plano.'
    })
    setDialogOpen(false)
    setFormData({ type: 'full', target: '', retentionDays: 30 })
  }

  const handleDelete = (backup: Backup) => {
    if (!confirm('Tem certeza que deseja eliminar este backup?')) return
    setBackups(backups.filter(b => b.id !== backup.id))
    toast({
      title: 'Backup eliminado',
      description: 'O backup foi eliminado com sucesso.'
    })
  }

  const handleRestore = (backup: Backup) => {
    toast({
      title: 'Restauro iniciado',
      description: `O restauro de ${backup.target} está a ser processado.`
    })
  }

  const getStatusBadge = (status: Backup['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
      case 'running':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Em progresso</Badge>
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: Backup['type']) => {
    switch (type) {
      case 'full':
        return <Badge className="bg-purple-500">Completo</Badge>
      case 'files':
        return <Badge className="bg-blue-500">Ficheiros</Badge>
      case 'database':
        return <Badge className="bg-green-500">Base de Dados</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const totalSize = backups.filter(b => b.status === 'completed').reduce((acc, b) => acc + b.sizeMB, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Backups</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-xs text-muted-foreground">
              {backups.filter(b => b.status === 'completed').length} concluídos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espaço Utilizado</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalSize / 1024).toFixed(2)} GB</div>
            <Progress value={35} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hoje</div>
            <p className="text-xs text-muted-foreground">02:00 AM</p>
          </CardContent>
        </Card>
      </div>

      {/* Backups Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backups</CardTitle>
              <CardDescription>
                Gestão de backups automáticos e manuais
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Agendar Backups
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Backup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Backup</DialogTitle>
                    <DialogDescription>
                      Crie um backup manual do servidor.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Tipo de Backup</Label>
                      <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Completo (Ficheiros + Bases de Dados)</SelectItem>
                          <SelectItem value="files">Apenas Ficheiros</SelectItem>
                          <SelectItem value="database">Apenas Base de Dados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="retention">Retenção (dias)</Label>
                      <Input
                        id="retention"
                        type="number"
                        value={formData.retentionDays}
                        onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateBackup}>
                      Criar Backup
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
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Concluído</TableHead>
                <TableHead>Retenção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>{getTypeBadge(backup.type)}</TableCell>
                  <TableCell className="font-medium">{backup.target}</TableCell>
                  <TableCell>{backup.sizeMB} MB</TableCell>
                  <TableCell>{backup.createdAt}</TableCell>
                  <TableCell>{backup.completedAt || '—'}</TableCell>
                  <TableCell>{backup.retentionDays} dias</TableCell>
                  <TableCell>{getStatusBadge(backup.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {backup.status === 'completed' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleRestore(backup)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(backup)} className="text-red-600">
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
    </div>
  )
}
