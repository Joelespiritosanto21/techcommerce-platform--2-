'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShoppingCart, Search, Menu, X, Heart, User, Package, Truck, Wrench, 
  Shield, CreditCard, MapPin, Phone, Mail, Clock, ChevronRight, Star,
  Plus, Minus, Trash2, Eye, ArrowRight, Check, AlertCircle, Home,
  Grid3X3, List, Filter, SortAsc, Image as ImageIcon, Barcode,
  QrCode, MessageSquare, Download, Printer, Bell, Settings, LogOut,
  Facebook, Instagram, Twitter, Linkedin, Youtube, Globe, AlertTriangle, Scale
} from 'lucide-react'

// Types
interface User {
  id: string
  email: string
  username: string
  name: string | null
  role: string
}

interface Product {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  comparePrice?: number | null
  description?: string | null
  shortDescription?: string | null
  images?: string | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
  variants?: Array<{ id: string; name: string; price?: number | null; stock: number }>
}

interface CartItem {
  product: Product
  quantity: number
  variantId?: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
  items: Array<{
    productName: string
    quantity: number
    price: number
    total: number
  }>
}

interface Repair {
  id: string
  repairNumber: string
  barcode: string
  status: string
  deviceBrand: string
  deviceModel: string
  faultDescription: string
  createdAt: string
  estimatedCost?: number | null
  finalCost?: number | null
}

// Cart Context
const CartContext = createContext<{
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variantId?: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  count: number
}>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
  count: 0
})

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])
  
  const addItem = (product: Product, quantity = 1, variantId?: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.variantId === variantId)
      if (existing) {
        return prev.map(i => 
          i.product.id === product.id && i.variantId === variantId 
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, { product, quantity, variantId }]
    })
  }
  
  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems(prev => prev.map(i => 
      i.product.id === productId ? { ...i, quantity } : i
    ))
  }
  
  const clearCart = () => setItems([])
  
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  
  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

function useCart() {
  return useContext(CartContext)
}

// Main Component
export default function StorefrontPage() {
  const [loading, setLoading] = useState(true)
  const [installed, setInstalled] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [currentView, setCurrentView] = useState<'store' | 'admin' | 'account'>('store')
  const [currentPage, setCurrentPage] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Forms
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [shippingForm, setShippingForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', postalCode: '', country: 'PT'
  })
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  
  // Auth
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', name: '' })
  
  const { items, addItem, removeItem, updateQuantity, clearCart, total, count } = useCart()
  
  // Load products function
  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (Array.isArray(data)) {
        setProducts(data)
        // Extract unique categories
        const cats = new Map()
        data.forEach((p: Product) => {
          if (p.category && !cats.has(p.category.id)) {
            cats.set(p.category.id, p.category)
          }
        })
        setCategories(Array.from(cats.values()))
      }
    } catch (error) {
      console.error('Load products error:', error)
    }
  }
  
  // Init
  useEffect(() => {
    const init = async () => {
      try {
        // Check installation
        const installRes = await fetch('/api/installation')
        const installData = await installRes.json()
        
        if (!installData.installed) {
          setInstalled(false)
          setLoading(false)
          return
        }
        
        setInstalled(true)
        
        // Check auth
        const authRes = await fetch('/api/auth/me')
        const authData = await authRes.json()
        
        if (authData.user) {
          setUser(authData.user)
        }
        
        // Load products
        await loadProducts()
        
        setLoading(false)
      } catch (error) {
        console.error('Init error:', error)
        setLoading(false)
      }
    }
    
    init()
  }, [])
  
  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      })
      const data = await res.json()
      if (data.id) {
        setUser(data)
        setAuthOpen(false)
      } else {
        alert(data.error || 'Login falhou')
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      })
      const data = await res.json()
      if (data.id) {
        setUser(data)
        setAuthOpen(false)
      } else {
        alert(data.error || 'Registo falhou')
      }
    } catch (error) {
      console.error('Register error:', error)
    }
  }
  
  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    setUser(null)
    setCurrentView('store')
  }
  
  // Checkout handler
  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          subtotal: total,
          total: total,
          paymentMethod,
          shippingName: shippingForm.name,
          shippingAddress: shippingForm.address,
          shippingCity: shippingForm.city,
          shippingPostal: shippingForm.postalCode,
          shippingCountry: shippingForm.country,
          shippingPhone: shippingForm.phone,
          items: items.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            productSku: i.product.sku,
            quantity: i.quantity,
            price: i.product.price,
            total: i.product.price * i.quantity
          }))
        })
      })
      
      if (res.ok) {
        clearCart()
        setCartOpen(false)
        setCurrentPage('order-success')
      }
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }
  
  // Filter products
  const filteredProducts = products.filter(p => {
    if (!p.isActive) return false
    if (selectedCategory && p.category?.slug !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || 
             p.sku.toLowerCase().includes(q) ||
             p.description?.toLowerCase().includes(q)
    }
    return true
  })
  
  const featuredProducts = products.filter(p => p.isFeatured && p.isActive).slice(0, 8)
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto animate-pulse text-primary mb-4" />
          <h1 className="text-2xl font-bold">A carregar...</h1>
        </div>
      </div>
    )
  }
  
  // Not installed - redirect to admin
  if (!installed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-bold mb-2">Plataforma Não Instalada</h1>
            <p className="text-muted-foreground mb-4">Por favor, aceda ao painel de administração para completar a instalação.</p>
            <Button onClick={() => window.location.href = '/api/installation'}>
              Ir para Instalação
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        {/* Top bar */}
        <div className="bg-slate-900 text-white text-sm py-2">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +351 21 123 4567</span>
              <span className="hidden sm:flex items-center gap-1"><Mail className="h-3 w-3" /> info@techcommerce.pt</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800">
                <Globe className="h-4 w-4 mr-1" /> PT
              </Button>
              {user ? (
                <div className="flex items-center gap-2">
                  <span>Olá, {user.name || user.username}</span>
                  <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800" onClick={() => setAuthOpen(true)}>
                  <User className="h-4 w-4 mr-1" /> Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main header */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setCurrentPage('home'); setCurrentView('store') }}>
              <Package className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold hidden sm:inline">TechCommerce</span>
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-10 pr-4" 
                placeholder="Pesquisar produtos..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {user?.role && ['admin', 'manager', 'super_admin'].includes(user.role) && (
                <Button variant="outline" size="sm" onClick={() => setCurrentView('admin')}>
                  <Settings className="h-4 w-4 mr-1" /> Admin
                </Button>
              )}
              
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {count > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                        {count}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>Carrinho de Compras</SheetTitle>
                    <SheetDescription>
                      {count === 0 ? 'O seu carrinho está vazio' : `${count} item(ns) no carrinho`}
                    </SheetDescription>
                  </SheetHeader>
                  
                  {count > 0 ? (
                    <div className="mt-6 flex flex-col h-[calc(100vh-200px)]">
                      <ScrollArea className="flex-1">
                        <div className="space-y-4 pr-4">
                          {items.map(item => (
                            <div key={item.product.id} className="flex gap-4 p-3 border rounded-lg">
                              <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center">
                                {item.product.images ? (
                                  <img src={JSON.parse(item.product.images)[0]} alt={item.product.name} className="w-full h-full object-cover rounded" />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{item.product.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <span className="font-medium">€{(item.product.price * item.quantity).toFixed(2)}</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <div className="border-t pt-4 mt-4 space-y-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>€{total.toFixed(2)}</span>
                        </div>
                        
                        {checkoutStep === 1 && (
                          <div className="space-y-4">
                            <h4 className="font-medium">Dados de Envio</h4>
                            <div className="grid gap-3">
                              <Input placeholder="Nome completo" value={shippingForm.name} onChange={e => setShippingForm(prev => ({ ...prev, name: e.target.value }))} />
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="email" placeholder="Email" value={shippingForm.email} onChange={e => setShippingForm(prev => ({ ...prev, email: e.target.value }))} />
                                <Input placeholder="Telefone" value={shippingForm.phone} onChange={e => setShippingForm(prev => ({ ...prev, phone: e.target.value }))} />
                              </div>
                              <Input placeholder="Morada" value={shippingForm.address} onChange={e => setShippingForm(prev => ({ ...prev, address: e.target.value }))} />
                              <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Cidade" value={shippingForm.city} onChange={e => setShippingForm(prev => ({ ...prev, city: e.target.value }))} />
                                <Input placeholder="Código Postal" value={shippingForm.postalCode} onChange={e => setShippingForm(prev => ({ ...prev, postalCode: e.target.value }))} />
                              </div>
                            </div>
                            <Button className="w-full" onClick={() => setCheckoutStep(2)}>Continuar para Pagamento</Button>
                          </div>
                        )}
                        
                        {checkoutStep === 2 && (
                          <div className="space-y-4">
                            <h4 className="font-medium">Método de Pagamento</h4>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="stripe">Cartão de Crédito/Débito (Stripe)</SelectItem>
                                <SelectItem value="paypal">PayPal</SelectItem>
                                <SelectItem value="mbway">MB Way</SelectItem>
                                <SelectItem value="multibanco">Multibanco</SelectItem>
                                <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setCheckoutStep(1)}>Voltar</Button>
                              <Button className="flex-1" onClick={handleCheckout}>Finalizar Encomenda</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 text-center">
                      <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">O seu carrinho está vazio</p>
                      <Button onClick={() => setCartOpen(false)}>Continuar a Comprar</Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
              
              {user && (
                <Button variant="ghost" size="icon" onClick={() => setCurrentView('account')}>
                  <User className="h-5 w-5" />
                </Button>
              )}
              
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block mt-4 md:mt-0`}>
            <div className="flex flex-wrap gap-1 md:gap-4">
              <Button variant="ghost" className={currentPage === 'home' ? 'text-primary' : ''} onClick={() => setCurrentPage('home')}>
                <Home className="h-4 w-4 mr-1" /> Início
              </Button>
              <Button variant="ghost" className={currentPage === 'products' ? 'text-primary' : ''} onClick={() => setCurrentPage('products')}>
                <Package className="h-4 w-4 mr-1" /> Produtos
              </Button>
              <Button variant="ghost" className={currentPage === 'repairs' ? 'text-primary' : ''} onClick={() => setCurrentPage('repairs')}>
                <Wrench className="h-4 w-4 mr-1" /> Reparações
              </Button>
              <Button variant="ghost" className={currentPage === 'services' ? 'text-primary' : ''} onClick={() => setCurrentPage('services')}>
                <Shield className="h-4 w-4 mr-1" /> Serviços
              </Button>
              <Button variant="ghost" className={currentPage === 'contact' ? 'text-primary' : ''} onClick={() => setCurrentPage('contact')}>
                <Phone className="h-4 w-4 mr-1" /> Contacto
              </Button>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {/* HOME PAGE */}
        {currentPage === 'home' && (
          <>
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16 md:py-24">
              <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                      Tecnologia de Ponta para a Sua Empresa
                    </h1>
                    <p className="text-lg text-slate-300 mb-6">
                      Equipamentos informáticos, reparações profissionais e serviços técnicos especializados. 
                      Qualidade garantida e suporte dedicado.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button size="lg" onClick={() => setCurrentPage('products')}>
                        Ver Produtos <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-slate-900" onClick={() => setCurrentPage('repairs')}>
                        Pedir Reparação
                      </Button>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-white/10 backdrop-blur border-0">
                        <CardContent className="p-6 text-center">
                          <Truck className="h-10 w-10 mx-auto mb-2" />
                          <h3 className="font-semibold">Envio Rápido</h3>
                          <p className="text-sm text-slate-300">24-48h em Portugal</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/10 backdrop-blur border-0">
                        <CardContent className="p-6 text-center">
                          <Shield className="h-10 w-10 mx-auto mb-2" />
                          <h3 className="font-semibold">Garantia</h3>
                          <p className="text-sm text-slate-300">Até 3 anos</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/10 backdrop-blur border-0">
                        <CardContent className="p-6 text-center">
                          <Wrench className="h-10 w-10 mx-auto mb-2" />
                          <h3 className="font-semibold">Reparações</h3>
                          <p className="text-sm text-slate-300">Técnicos certificados</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/10 backdrop-blur border-0">
                        <CardContent className="p-6 text-center">
                          <CreditCard className="h-10 w-10 mx-auto mb-2" />
                          <h3 className="font-semibold">Pagamento</h3>
                          <p className="text-sm text-slate-300">Vários métodos</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Categories */}
            <section className="py-12 bg-slate-50">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold mb-6">Categorias</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categories.length > 0 ? categories.map(cat => (
                    <Card 
                      key={cat.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => { setSelectedCategory(cat.slug); setCurrentPage('products') }}
                    >
                      <CardContent className="p-4 text-center">
                        <Package className="h-10 w-10 mx-auto mb-2 text-primary" />
                        <span className="font-medium">{cat.name}</span>
                      </CardContent>
                    </Card>
                  )) : (
                    <>
                      {['Computadores', 'Portáteis', 'Smartphones', 'Tablets', 'Acessórios', 'Redes'].map(name => (
                        <Card key={name} className="cursor-pointer hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 text-center">
                            <Package className="h-10 w-10 mx-auto mb-2 text-primary" />
                            <span className="font-medium">{name}</span>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </section>
            
            {/* Featured Products */}
            <section className="py-12">
              <div className="container mx-auto px-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Produtos em Destaque</h2>
                  <Button variant="link" onClick={() => setCurrentPage('products')}>
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {(featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8)).map(product => (
                    <Card key={product.id} className="group cursor-pointer hover:shadow-lg transition-all">
                      <CardContent className="p-0">
                        <div className="relative aspect-square bg-slate-100 rounded-t-lg overflow-hidden" onClick={() => { setSelectedProduct(product); setCurrentPage('product') }}>
                          {product.images ? (
                            <img src={JSON.parse(product.images)[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <ImageIcon className="h-16 w-16 text-slate-300" />
                            </div>
                          )}
                          {product.comparePrice && product.comparePrice > product.price && (
                            <Badge className="absolute top-2 right-2 bg-red-500">
                              -{Math.round((1 - product.price / product.comparePrice) * 100)}%
                            </Badge>
                          )}
                          {product.stock < 5 && product.stock > 0 && (
                            <Badge className="absolute top-2 left-2 bg-orange-500">
                              Últimas {product.stock} unidades
                            </Badge>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-primary" onClick={() => { setSelectedProduct(product); setCurrentPage('product') }}>
                            {product.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">{product.brand?.name}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl font-bold text-primary">€{product.price.toFixed(2)}</span>
                            {product.comparePrice && product.comparePrice > product.price && (
                              <span className="text-sm text-muted-foreground line-through">€{product.comparePrice.toFixed(2)}</span>
                            )}
                          </div>
                          <Button className="w-full" onClick={() => addItem(product)}>
                            <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
            
            {/* Services */}
            <section className="py-12 bg-slate-900 text-white">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Nossos Serviços</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="bg-white/10 backdrop-blur border-0">
                    <CardContent className="p-6 text-center">
                      <Wrench className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Reparações</h3>
                      <p className="text-slate-300 mb-4">
                        Reparação profissional de computadores, portáteis, smartphones e tablets. 
                        Diagnóstico gratuito e orçamento sem compromisso.
                      </p>
                      <Button variant="outline" className="text-white border-white" onClick={() => setCurrentPage('repairs')}>
                        Pedir Orçamento
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/10 backdrop-blur border-0">
                    <CardContent className="p-6 text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Garantias</h3>
                      <p className="text-slate-300 mb-4">
                        Gestão completa de garantias dos seus equipamentos. 
                        Acompanhamento e suporte durante todo o período de garantia.
                      </p>
                      <Button variant="outline" className="text-white border-white">
                        Ver Garantias
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/10 backdrop-blur border-0">
                    <CardContent className="p-6 text-center">
                      <Truck className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Entregas</h3>
                      <p className="text-slate-300 mb-4">
                        Envio rápido para todo o território nacional. 
                        Entrega em 24-48h com acompanhamento em tempo real.
                      </p>
                      <Button variant="outline" className="text-white border-white">
                        Saber Mais
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
            
            {/* Newsletter */}
            <section className="py-12">
              <div className="container mx-auto px-4">
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">Subscreva a Newsletter</h2>
                    <p className="mb-4 opacity-90">Receba as últimas novidades e promoções exclusivas</p>
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                      <Input type="email" placeholder="Seu email" className="bg-white/10 border-white/20 text-white placeholder:text-white/60" />
                      <Button variant="secondary">Subscrever</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
        
        {/* PRODUCTS PAGE */}
        {currentPage === 'products' && (
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Sidebar Filters */}
              <aside className="w-full md:w-64 shrink-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-4 w-4" /> Filtros
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={selectedCategory || ''} onValueChange={v => setSelectedCategory(v || null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Preço</Label>
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Min" type="number" className="w-20" />
                        <Input placeholder="Max" type="number" className="w-20" />
                      </div>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => setSelectedCategory(null)}>
                      Limpar Filtros
                    </Button>
                  </CardContent>
                </Card>
              </aside>
              
              {/* Products Grid */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-muted-foreground">{filteredProducts.length} produto(s) encontrado(s)</p>
                  <Select defaultValue="relevance">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevância</SelectItem>
                      <SelectItem value="price-asc">Preço: Menor para Maior</SelectItem>
                      <SelectItem value="price-desc">Preço: Maior para Menor</SelectItem>
                      <SelectItem value="name">Nome A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                      <Card key={product.id} className="group hover:shadow-lg transition-all">
                        <CardContent className="p-0">
                          <div className="relative aspect-square bg-slate-100 rounded-t-lg overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentPage('product') }}>
                            {product.images ? (
                              <img src={JSON.parse(product.images)[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageIcon className="h-16 w-16 text-slate-300" />
                              </div>
                            )}
                            {product.comparePrice && product.comparePrice > product.price && (
                              <Badge className="absolute top-2 right-2 bg-red-500">
                                -{Math.round((1 - product.price / product.comparePrice) * 100)}%
                              </Badge>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-primary" onClick={() => { setSelectedProduct(product); setCurrentPage('product') }}>
                              {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">{product.category?.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold text-primary">€{product.price.toFixed(2)}</span>
                              <Button size="sm" onClick={() => addItem(product)}>
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
                    <p className="text-muted-foreground mb-4">Tente ajustar os filtros ou a pesquisa</p>
                    <Button onClick={() => { setSearchQuery(''); setSelectedCategory(null) }}>Limpar Filtros</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* PRODUCT DETAIL PAGE */}
        {currentPage === 'product' && selectedProduct && (
          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Images */}
              <div className="space-y-4">
                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                  {selectedProduct.images ? (
                    <img src={JSON.parse(selectedProduct.images)[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-24 w-24 text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Details */}
              <div className="space-y-6">
                <div>
                  {selectedProduct.brand && (
                    <Badge variant="secondary">{selectedProduct.brand.name}</Badge>
                  )}
                  <h1 className="text-3xl font-bold mt-2">{selectedProduct.name}</h1>
                  <p className="text-muted-foreground mt-1">SKU: {selectedProduct.sku}</p>
                </div>
                
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary">€{selectedProduct.price.toFixed(2)}</span>
                  {selectedProduct.comparePrice && selectedProduct.comparePrice > selectedProduct.price && (
                    <>
                      <span className="text-xl text-muted-foreground line-through">€{selectedProduct.comparePrice.toFixed(2)}</span>
                      <Badge className="bg-red-500">
                        Poupa €{(selectedProduct.comparePrice - selectedProduct.price).toFixed(2)}
                      </Badge>
                    </>
                  )}
                </div>
                
                {selectedProduct.shortDescription && (
                  <p className="text-muted-foreground">{selectedProduct.shortDescription}</p>
                )}
                
                <div className="flex items-center gap-2">
                  {selectedProduct.stock > 0 ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="text-green-600">Em Stock ({selectedProduct.stock} disponíveis)</span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-red-500" />
                      <span className="text-red-600">Esgotado</span>
                    </>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <Button size="lg" className="flex-1" onClick={() => { addItem(selectedProduct); setCartOpen(true) }} disabled={selectedProduct.stock === 0}>
                    <ShoppingCart className="h-5 w-5 mr-2" /> Adicionar ao Carrinho
                  </Button>
                  <Button size="lg" variant="outline">
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>
                
                {selectedProduct.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Descrição</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{selectedProduct.description}</p>
                  </div>
                )}
                
                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <Truck className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <span className="text-xs">Envio 24-48h</span>
                  </div>
                  <div className="text-center">
                    <Shield className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <span className="text-xs">Garantia 2 Anos</span>
                  </div>
                  <div className="text-center">
                    <CreditCard className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <span className="text-xs">Pagamento Seguro</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* REPAIRS PAGE */}
        {currentPage === 'repairs' && (
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <Wrench className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h1 className="text-3xl font-bold mb-2">Serviço de Reparações</h1>
                <p className="text-muted-foreground">Reparações profissionais com garantia</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-primary">1</span>
                    </div>
                    <h3 className="font-semibold mb-1">Submeta o Pedido</h3>
                    <p className="text-sm text-muted-foreground">Preencha o formulário com os dados do equipamento</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-primary">2</span>
                    </div>
                    <h3 className="font-semibold mb-1">Diagnóstico</h3>
                    <p className="text-sm text-muted-foreground">Analisamos o equipamento e enviamos orçamento</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-primary">3</span>
                    </div>
                    <h3 className="font-semibold mb-1">Reparação</h3>
                    <p className="text-sm text-muted-foreground">Após aprovação, procedemos à reparação</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Pedir Reparação</CardTitle>
                  <CardDescription>Preencha os dados do equipamento e a descrição do problema</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const data = {
                      customerName: formData.get('name'),
                      customerPhone: formData.get('phone'),
                      customerEmail: formData.get('email'),
                      deviceBrand: formData.get('brand'),
                      deviceModel: formData.get('model'),
                      deviceSerial: formData.get('serial'),
                      faultDescription: formData.get('fault')
                    }
                    try {
                      const res = await fetch('/api/repairs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                      })
                      if (res.ok) {
                        alert('Pedido de reparação submetido com sucesso!')
                        e.currentTarget.reset()
                      }
                    } catch (error) {
                      console.error('Repair submit error:', error)
                    }
                  }}>
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" name="phone" type="tel" required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div>
                      <Label htmlFor="brand">Marca do Equipamento *</Label>
                      <Input id="brand" name="brand" placeholder="Ex: Apple, Samsung, HP" required />
                    </div>
                    <div>
                      <Label htmlFor="model">Modelo *</Label>
                      <Input id="model" name="model" placeholder="Ex: iPhone 14, Galaxy S23" required />
                    </div>
                    <div>
                      <Label htmlFor="serial">Número de Série</Label>
                      <Input id="serial" name="serial" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="fault">Descrição do Problema *</Label>
                      <Textarea id="fault" name="fault" rows={4} placeholder="Descreva detalhadamente o problema..." required />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" size="lg">Submeter Pedido de Reparação</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* CONTACT PAGE */}
        {currentPage === 'contact' && (
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-8 text-center">Contacte-nos</h1>
              
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Morada</p>
                        <p className="text-muted-foreground">Rua Exemplo, 123, 1000-001 Lisboa, Portugal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Telefone</p>
                        <p className="text-muted-foreground">+351 21 123 4567</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">info@techcommerce.pt</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Horário</p>
                        <p className="text-muted-foreground">Seg - Sex: 9h - 18h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Envie uma Mensagem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div>
                        <Label htmlFor="contact-name">Nome</Label>
                        <Input id="contact-name" />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input id="contact-email" type="email" />
                      </div>
                      <div>
                        <Label htmlFor="contact-subject">Assunto</Label>
                        <Input id="contact-subject" />
                      </div>
                      <div>
                        <Label htmlFor="contact-message">Mensagem</Label>
                        <Textarea id="contact-message" rows={4} />
                      </div>
                      <Button type="submit" className="w-full">Enviar Mensagem</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {/* ORDER SUCCESS PAGE */}
        {currentPage === 'order-success' && (
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Encomenda Recebida!</h1>
              <p className="text-muted-foreground mb-6">
                Obrigado pela sua encomenda. Receberá um email de confirmação em breve com os detalhes.
              </p>
              <Button size="lg" onClick={() => setCurrentPage('home')}>
                Continuar a Comprar
              </Button>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-6 w-6 text-primary" />
                <span className="font-bold">TechCommerce</span>
              </div>
              <p className="text-sm text-slate-400">
                Soluções tecnológicas completas para empresas e particulares.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produtos</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white">Computadores</a></li>
                <li><a href="#" className="hover:text-white">Portáteis</a></li>
                <li><a href="#" className="hover:text-white">Smartphones</a></li>
                <li><a href="#" className="hover:text-white">Acessórios</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Serviços</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white">Reparações</a></li>
                <li><a href="#" className="hover:text-white">Garantias</a></li>
                <li><a href="#" className="hover:text-white">Suporte Técnico</a></li>
                <li><a href="#" className="hover:text-white">Consultoria</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>+351 21 123 4567</li>
                <li>info@techcommerce.pt</li>
                <li>Lisboa, Portugal</li>
              </ul>
              <div className="flex gap-3 mt-4">
                <a href="#" className="text-slate-400 hover:text-white"><Facebook className="h-5 w-5" /></a>
                <a href="#" className="text-slate-400 hover:text-white"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="text-slate-400 hover:text-white"><Linkedin className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
          <Separator className="bg-slate-700 mb-8" />
          
          {/* Links Legais */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm">
            <a href="/legal?page=termos" className="text-slate-400 hover:text-white">Termos e Condições</a>
            <a href="/legal?page=privacidade" className="text-slate-400 hover:text-white">Política de Privacidade</a>
            <a href="/legal?page=cookies" className="text-slate-400 hover:text-white">Política de Cookies</a>
            <a href="/legal?page=garantia" className="text-slate-400 hover:text-white">Garantia</a>
            <a href="/legal?page=devolucoes" className="text-slate-400 hover:text-white">Devoluções</a>
            <a href="/legal?page=envio" className="text-slate-400 hover:text-white">Envio</a>
          </div>
          
          {/* Links Obrigatórios por Lei */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <a 
              href="https://www.livroreclamacoes.pt/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Livro de Reclamações
            </a>
            <a 
              href="/legal?page=litigios" 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Scale className="h-4 w-4" />
              Resolução de Litígios
            </a>
          </div>
          
          <Separator className="bg-slate-700 mb-6" />
          
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
            <p>© {new Date().getFullYear()} TechCommerce. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Portugal.svg/320px-Flag_of_Portugal.svg.png" 
                alt="Portugal" 
                className="h-4 w-6 object-cover rounded"
              />
              <span>Empresa registada em Portugal</span>
            </div>
          </div>
          
          {/* Informação Legal */}
          <div className="text-center text-xs text-slate-500 mt-4">
            <p>TechCommerce - Sociedade por Quotas, registada na Conservatória do Registo Comercial de Lisboa</p>
            <p>Capital Social: €50.000,00 | NIF: 509XXXXXX | Registo Consular: XXXXXXXXX</p>
            <p className="mt-2">
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 underline">
                Plataforma de Resolução de Litígios Online (ODR) da UE
              </a>
            </p>
          </div>
        </div>
      </footer>
      
      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{authMode === 'login' ? 'Entrar' : 'Criar Conta'}</DialogTitle>
            <DialogDescription>
              {authMode === 'login' ? 'Entre com as suas credenciais' : 'Crie uma nova conta'}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Registar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={authForm.email} onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div>
                  <Label>Palavra-passe</Label>
                  <Input type="password" value={authForm.password} onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))} required />
                </div>
                <Button type="submit" className="w-full">Entrar</Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={authForm.name} onChange={e => setAuthForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={authForm.username} onChange={e => setAuthForm(prev => ({ ...prev, username: e.target.value }))} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={authForm.email} onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div>
                  <Label>Palavra-passe</Label>
                  <Input type="password" value={authForm.password} onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))} required />
                </div>
                <Button type="submit" className="w-full">Criar Conta</Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
