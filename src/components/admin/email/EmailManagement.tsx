'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mail, Domain, Users, Forward, Settings, BarChart3, 
  Shield, AlertCircle, CheckCircle, Clock, Server,
  Plus, RefreshCw, Download
} from 'lucide-react'
import { EmailDomains } from './EmailDomains'
import { EmailAccounts } from './EmailAccounts'
import { EmailAliases } from './EmailAliases'
import { EmailSettings } from './EmailSettings'
import { EmailStats } from './EmailStats'

interface EmailStats {
  totalDomains: number
  totalAccounts: number
  totalAliases: number
  queueSize?: number
  diskUsage?: number
}

export function EmailManagement() {
  const [stats, setStats] = useState<EmailStats>({
    totalDomains: 0,
    totalAccounts: 0,
    totalAliases: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching email stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Email</h2>
          <p className="text-muted-foreground">
            Sistema completo de email com Postfix, Dovecot, SpamAssassin e ClamAV
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Domínio
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domínios</CardTitle>
            <Domain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDomains}</div>
            <p className="text-xs text-muted-foreground">
              Domínios de email ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Contas de email
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aliases</CardTitle>
            <Forward className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAliases}</div>
            <p className="text-xs text-muted-foreground">
              Redirecionamentos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fila de Email</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queueSize || 0}</div>
            <p className="text-xs text-muted-foreground">
              Emails pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">SpamAssassin</span>
            </div>
            <p className="text-sm text-green-600 mt-1">Filtro de spam ativo</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">ClamAV</span>
            </div>
            <p className="text-sm text-green-600 mt-1">Antivírus ativo</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Postfix/Dovecot</span>
            </div>
            <p className="text-sm text-green-600 mt-1">Serviços operacionais</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">
            <Domain className="h-4 w-4 mr-2" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <Mail className="h-4 w-4 mr-2" />
            Contas
          </TabsTrigger>
          <TabsTrigger value="aliases">
            <Forward className="h-4 w-4 mr-2" />
            Aliases
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domains">
          <EmailDomains />
        </TabsContent>

        <TabsContent value="accounts">
          <EmailAccounts />
        </TabsContent>

        <TabsContent value="aliases">
          <EmailAliases />
        </TabsContent>

        <TabsContent value="stats">
          <EmailStats />
        </TabsContent>

        <TabsContent value="settings">
          <EmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
