'use client'

import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, Mail, Send, Inbox, AlertTriangle, Shield,
  Activity, HardDrive, Clock, RefreshCw, TrendingUp, TrendingDown
} from 'lucide-react'

interface EmailStats {
  totalDomains: number
  totalAccounts: number
  totalAliases: number
  queueSize: number
  diskUsage: number
}

interface MailLog {
  action: string
  result: string
  count: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function EmailStats() {
  const [stats, setStats] = useState<EmailStats>({
    totalDomains: 0,
    totalAccounts: 0,
    totalAliases: 0,
    queueSize: 0,
    diskUsage: 0
  })
  const [loading, setLoading] = useState(true)
  const [activityData] = useState([
    { name: 'Seg', enviados: 120, recebidos: 80, spam: 15 },
    { name: 'Ter', enviados: 150, recebidos: 95, spam: 22 },
    { name: 'Qua', enviados: 180, recebidos: 110, spam: 18 },
    { name: 'Qui', enviados: 140, recebidos: 85, spam: 25 },
    { name: 'Sex', enviados: 200, recebidos: 130, spam: 30 },
    { name: 'Sáb', enviados: 80, recebidos: 50, spam: 10 },
    { name: 'Dom', enviados: 60, recebidos: 35, spam: 8 }
  ])
  
  const [statusData] = useState([
    { name: 'Entregues', value: 850, color: '#22c55e' },
    { name: 'Pendentes', value: 45, color: '#eab308' },
    { name: 'Rejeitados', value: 35, color: '#ef4444' },
    { name: 'Spam Bloqueado', value: 120, color: '#8b5cf6' }
  ])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,250</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12% esta semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Recebidos</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">890</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +8% esta semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam Bloqueado</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">120</div>
            <p className="text-xs text-muted-foreground">
              13.5% do total recebido
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso de Disco</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.diskUsage || 0} MB</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: '35%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Semanal</CardTitle>
            <CardDescription>
              Emails enviados, recebidos e spam nos últimos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="enviados" name="Enviados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebidos" name="Recebidos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spam" name="Spam" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>
              Status dos emails processados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado dos Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium">Postfix (SMTP)</p>
                <p className="text-sm text-muted-foreground">Portas 25, 587, 465</p>
              </div>
              <Badge className="bg-green-500">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium">Dovecot (IMAP/POP3)</p>
                <p className="text-sm text-muted-foreground">Portas 143, 993, 110, 995</p>
              </div>
              <Badge className="bg-green-500">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium">SpamAssassin</p>
                <p className="text-sm text-muted-foreground">Filtro de spam</p>
              </div>
              <Badge className="bg-green-500">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium">ClamAV</p>
                <p className="text-sm text-muted-foreground">Antivírus</p>
              </div>
              <Badge className="bg-green-500">Ativo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Fila de Email
              </CardTitle>
              <CardDescription>
                Emails pendentes de envio
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={stats.queueSize > 0 ? "destructive" : "secondary"}>
                {stats.queueSize} mensagens
              </Badge>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Processar Fila
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.queueSize === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Fila de email vazia</p>
              <p className="text-sm">Todos os emails foram processados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Placeholder for queue items */}
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">Pending message</p>
                  <p className="text-sm text-muted-foreground">to: user@example.com</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Há 5 min</Badge>
                  <Button variant="ghost" size="sm">Ver</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: '14:35', action: 'Email enviado', from: 'admin@empresa.pt', to: 'cliente@exemplo.com', status: 'success' },
              { time: '14:32', action: 'Spam bloqueado', from: 'spam@malicioso.com', to: 'info@empresa.pt', status: 'warning' },
              { time: '14:28', action: 'Email recebido', from: 'fornecedor@abc.pt', to: 'compras@empresa.pt', status: 'success' },
              { time: '14:25', action: 'Conta criada', from: 'sistema', to: 'novo.utilizador@empresa.pt', status: 'info' },
              { time: '14:20', action: 'Vírus detectado', from: 'infetado@malware.com', to: 'admin@empresa.pt', status: 'error' }
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={
                    log.status === 'success' ? 'default' :
                    log.status === 'warning' ? 'secondary' :
                    log.status === 'error' ? 'destructive' : 'outline'
                  }>
                    {log.time}
                  </Badge>
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-muted-foreground">
                      De: {log.from} → Para: {log.to}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
