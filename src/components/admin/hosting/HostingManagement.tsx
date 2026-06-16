'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Server, Globe, Database, Shield, HardDrive, 
  Plus, RefreshCw, Activity, Cpu, MemoryStick
} from 'lucide-react'
import { ServerManagement } from './ServerManagement'
import { WebsitesManagement } from './WebsitesManagement'
import { DatabasesManagement } from './DatabasesManagement'
import { SSLCertificates } from './SSLCertificates'
import { BackupsManagement } from './BackupsManagement'

interface ServerStats {
  cpu: number
  memory: number
  disk: number
  uptime: number
  websites: number
  databases: number
}

export function HostingManagement() {
  const [stats] = useState<ServerStats>({
    cpu: 45,
    memory: 62,
    disk: 38,
    uptime: 864000, // 10 days in seconds
    websites: 12,
    databases: 8
  })

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Hosting</h2>
          <p className="text-muted-foreground">
            Sistema próprio de gestão de websites, bases de dados e certificados SSL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Website
          </Button>
        </div>
      </div>

      {/* Server Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cpu}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${stats.cpu}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memória</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.memory}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${stats.memory > 80 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${stats.memory}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disco</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.disk}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${stats.disk}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(stats.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Servidor online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">Nginx</p>
                <p className="text-sm text-green-600">Web Server ativo</p>
              </div>
              <Badge className="bg-green-500">Running</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">PHP 8.2 FPM</p>
                <p className="text-sm text-green-600">PHP-FPM ativo</p>
              </div>
              <Badge className="bg-green-500">Running</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">MySQL 8.0</p>
                <p className="text-sm text-green-600">Base de dados ativa</p>
              </div>
              <Badge className="bg-green-500">Running</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="websites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="websites">
            <Globe className="h-4 w-4 mr-2" />
            Websites
          </TabsTrigger>
          <TabsTrigger value="databases">
            <Database className="h-4 w-4 mr-2" />
            Bases de Dados
          </TabsTrigger>
          <TabsTrigger value="ssl">
            <Shield className="h-4 w-4 mr-2" />
            SSL
          </TabsTrigger>
          <TabsTrigger value="backups">
            <HardDrive className="h-4 w-4 mr-2" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="servers">
            <Server className="h-4 w-4 mr-2" />
            Servidores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="websites">
          <WebsitesManagement />
        </TabsContent>

        <TabsContent value="databases">
          <DatabasesManagement />
        </TabsContent>

        <TabsContent value="ssl">
          <SSLCertificates />
        </TabsContent>

        <TabsContent value="backups">
          <BackupsManagement />
        </TabsContent>

        <TabsContent value="servers">
          <ServerManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
