'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Wrench, 
  Mail, Server, Globe, Settings, LogOut, Menu, X,
  DollarSign, TrendingUp, AlertCircle, Clock, CreditCard,
  HardDrive, Shield, Database, Activity
} from 'lucide-react'
import { EmailManagement } from '@/components/admin/email'
import { HostingManagement } from '@/components/admin/hosting'
import { DatabaseManagement } from '@/components/admin/database'

interface User {
  id: string
  email: string
  username: string
  name: string | null
  role: string
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    // Check auth
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
        }
      } catch {
        // Not logged in
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-16 w-16 mx-auto animate-pulse text-primary mb-4" />
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    )
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'orders', label: 'Encomendas', icon: ShoppingCart },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'repairs', label: 'Reparações', icon: Wrench },
    { id: 'vps', label: 'VPS', icon: Server },
    { id: 'hosting', label: 'Hosting', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'database', label: 'Base de Dados', icon: Database },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-card border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="font-bold text-lg">TechCommerce</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'secondary' : 'ghost'}
                className={`w-full justify-${sidebarOpen ? 'start' : 'center'}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <item.icon className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
                {sidebarOpen && item.label}
              </Button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-red-600">
            <LogOut className="h-4 w-4 mr-2" />
            {sidebarOpen && 'Terminar Sessão'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Dashboard */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                  Bem-vindo ao painel de administração
                </p>
              </div>

              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">€1,250.00</div>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +12% vs ontem
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Encomendas</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">45</div>
                    <p className="text-xs text-muted-foreground">12 pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,234</div>
                    <p className="text-xs text-green-600">+23 novos este mês</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Reparações</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8</div>
                    <p className="text-xs text-yellow-600">3 em progresso</p>
                  </CardContent>
                </Card>
              </div>

              {/* Server Status */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Estado dos Serviços
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: 'Web Server (Nginx)', status: 'active' },
                        { name: 'Email Server (Postfix)', status: 'active' },
                        { name: 'Database (MySQL)', status: 'active' },
                        { name: 'PHP-FPM 8.2', status: 'active' },
                        { name: 'Redis Cache', status: 'active' }
                      ].map((service) => (
                        <div key={service.name} className="flex items-center justify-between">
                          <span className="text-sm">{service.name}</span>
                          <Badge className="bg-green-500">Ativo</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recursos do Servidor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CPU</span>
                          <span>45%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '45%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Memória</span>
                          <span>62%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '62%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Disco</span>
                          <span>38%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '38%' }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { type: 'order', message: 'Nova encomenda #1234 recebida', time: 'Há 5 min' },
                      { type: 'user', message: 'Novo cliente registado: joao@exemplo.pt', time: 'Há 15 min' },
                      { type: 'repair', message: 'Reparação #567 concluída', time: 'Há 30 min' },
                      { type: 'email', message: 'Backup de email completo', time: 'Há 1 hora' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Products */}
          {currentPage === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Produtos</h1>
                  <p className="text-muted-foreground">Gestão de produtos e inventário</p>
                </div>
                <Button>
                  <Package className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Gestão de produtos será implementada aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Orders */}
          {currentPage === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Encomendas</h1>
                  <p className="text-muted-foreground">Gestão de encomendas e envios</p>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Gestão de encomendas será implementada aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Customers */}
          {currentPage === 'customers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Clientes</h1>
                  <p className="text-muted-foreground">Gestão de clientes e CRM</p>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Gestão de clientes será implementada aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Repairs */}
          {currentPage === 'repairs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Reparações</h1>
                  <p className="text-muted-foreground">Gestão de reparações e assistência técnica</p>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Gestão de reparações será implementada aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* VPS */}
          {currentPage === 'vps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Serviços VPS</h1>
                  <p className="text-muted-foreground">Gestão de servidores virtuais (Integração Datalix)</p>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Gestão de VPS será implementada aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Hosting */}
          {currentPage === 'hosting' && <HostingManagement />}

          {/* Email */}
          {currentPage === 'email' && <EmailManagement />}

          {/* Database */}
          {currentPage === 'database' && <DatabaseManagement />}

          {/* Settings */}
          {currentPage === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground">Configurações do sistema</p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Configurações do sistema serão implementadas aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
