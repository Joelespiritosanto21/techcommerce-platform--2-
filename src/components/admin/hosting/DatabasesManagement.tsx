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
import { Plus, Trash2, Database, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Database {
  id: string
  name: string
  type: 'mysql' | 'postgresql' | 'mongodb' | 'redis'
  username: string
  sizeMB: number
  status: 'active' | 'error'
  charset: string
  createdAt: string
}

const dbTypes = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' }
]

export function DatabasesManagement() {
  const [databases, setDatabases] = useState<Database[]>([
    { id: '1', name: 'empresa_prod', type: 'mysql', username: 'empresa_user', sizeMB: 256, status: 'active', charset: 'utf8mb4', createdAt: new Date().toISOString() },
    { id: '2', name: 'empresa_dev', type: 'mysql', username: 'empresa_dev', sizeMB: 128, status: 'active', charset: 'utf8mb4', createdAt: new Date().toISOString() },
    { id: '3', name: 'sessions', type: 'redis', username: 'default', sizeMB: 32, status: 'active', charset: 'N/A', createdAt: new Date().toISOString() }
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql' as Database['type'],
    username: '',
    password: '',
    charset: 'utf8mb4'
  })

  const handleCreateDatabase = async () => {
    toast({
      title: 'Base de dados criada',
      description: `A base de dados ${formData.name} foi criada com sucesso.`
    })
    setDialogOpen(false)
    setFormData({ name: '', type: 'mysql', username: '', password: '', charset: 'utf8mb4' })
  }

  const handleDeleteDatabase = (db: Database) => {
    if (!confirm(`Tem certeza que deseja eliminar a base de dados ${db.name}?`)) return
    setDatabases(databases.filter(d => d.id !== db.id))
    toast({
      title: 'Base de dados eliminada',
      description: `A base de dados ${db.name} foi eliminada.`
    })
  }

  const copyCredentials = (db: Database) => {
    const credentials = `Host: localhost\nDatabase: ${db.name}\nUser: ${db.username}\nPassword: ******`
    navigator.clipboard.writeText(credentials)
    toast({
      title: 'Credenciais copiadas',
      description: 'As credenciais foram copiadas para a área de transferência.'
    })
  }

  const getTypeBadge = (type: Database['type']) => {
    const colors = {
      mysql: 'bg-blue-500',
      postgresql: 'bg-purple-500',
      mongodb: 'bg-green-500',
      redis: 'bg-red-500'
    }
    return <Badge className={colors[type]}>{type.toUpperCase()}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bases de Dados</CardTitle>
            <CardDescription>
              Gestão de bases de dados MySQL, PostgreSQL, MongoDB e Redis
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Base de Dados
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Base de Dados</DialogTitle>
                <DialogDescription>
                  Crie uma nova base de dados e utilizador.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da Base de Dados</Label>
                  <Input
                    id="name"
                    placeholder="minha_base_dados"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dbTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Utilizador</Label>
                  <Input
                    id="username"
                    placeholder="utilizador_db"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {formData.type === 'mysql' && (
                  <div className="grid gap-2">
                    <Label htmlFor="charset">Charset</Label>
                    <Select value={formData.charset} onValueChange={(v) => setFormData({ ...formData, charset: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf8mb4">utf8mb4</SelectItem>
                        <SelectItem value="utf8">utf8</SelectItem>
                        <SelectItem value="latin1">latin1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateDatabase}>
                  Criar Base de Dados
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
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Utilizador</TableHead>
              <TableHead>Charset</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {databases.map((db) => (
              <TableRow key={db.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{db.name}</span>
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(db.type)}</TableCell>
                <TableCell>{db.username}</TableCell>
                <TableCell><Badge variant="outline">{db.charset}</Badge></TableCell>
                <TableCell>{db.sizeMB} MB</TableCell>
                <TableCell>
                  <Badge className={db.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>
                    {db.status === 'active' ? 'Ativa' : 'Erro'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copyCredentials(db)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDatabase(db)} className="text-red-600">
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
