'use client'

import { useState } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Server, Cpu, MemoryStick, HardDrive, Activity, 
  RefreshCw, Power, Settings, Terminal
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ServerManagement() {
  const { toast } = useToast()
  
  const servers = [
    {
      id: '1',
      name: 'Servidor Principal',
      hostname: 'srv01.empresa.pt',
      ip: '192.168.1.100',
      type: 'hosting',
      status: 'active',
      cpu: 45,
      memory: 62,
      disk: 38,
      uptime: 864000,
      services: ['nginx', 'php8.2-fpm', 'mysql', 'redis']
    }
  ]

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  const handleRestart = (service: string) => {
    toast({
      title: 'Serviço reiniciado',
      description: `${service} foi reiniciado com sucesso.`
    })
  }

  const handleReboot = () => {
    toast({
      title: 'Reboot agendado',
      description: 'O servidor será reiniciado em 1 minuto.'
    })
  }

  return (
    <div className="space-y-6">
      {servers.map((server) => (
        <Card key={server.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {server.name}
                </CardTitle>
                <CardDescription>
                  {server.hostname} • {server.ip}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">Ativo</Badge>
                <Button variant="outline" size="sm">
                  <Terminal className="h-4 w-4 mr-2" />
                  Consola
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resource Usage */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    CPU
                  </span>
                  <span className="text-sm text-muted-foreground">{server.cpu}%</span>
                </div>
                <Progress value={server.cpu} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" />
                    Memória
                  </span>
                  <span className="text-sm text-muted-foreground">{server.memory}%</span>
                </div>
                <Progress value={server.memory} className={server.memory > 80 ? '[&>div]:bg-red-500' : ''} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Disco
                  </span>
                  <span className="text-sm text-muted-foreground">{server.disk}%</span>
                </div>
                <Progress value={server.disk} />
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-medium mb-3">Serviços</h4>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {server.services.map((service) => (
                  <div key={service} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{service}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="bg-green-50 text-green-700">Ativo</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestart(service)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Server Info */}
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <span className="text-muted-foreground">Uptime:</span>
                <p className="font-medium">{formatUptime(server.uptime)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium capitalize">{server.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">IP Público:</span>
                <p className="font-medium">{server.ip}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hostname:</span>
                <p className="font-medium">{server.hostname}</p>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="text-sm font-medium text-red-800 mb-2">Zona de Perigo</h4>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" onClick={handleReboot}>
                  <Power className="h-4 w-4 mr-2" />
                  Reiniciar Servidor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
