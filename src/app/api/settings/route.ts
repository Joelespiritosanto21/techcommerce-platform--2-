import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get all settings or by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    // Get installation data
    const installation = await prisma.installation.findFirst()
    
    // Get system configs
    const configs = await prisma.systemConfig.findMany({
      where: category ? { category } : {}
    })
    
    // Convert configs to object
    const settings: Record<string, any> = {}
    configs.forEach(config => {
      settings[config.key] = {
        value: config.value,
        category: config.category,
        description: config.description
      }
    })
    
    return NextResponse.json({
      installation: installation || null,
      settings
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body
    
    if (type === 'installation') {
      // Update installation data
      const installation = await prisma.installation.findFirst()
      
      if (installation) {
        const updated = await prisma.installation.update({
          where: { id: installation.id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
        return NextResponse.json(updated)
      } else {
        const created = await prisma.installation.create({
          data: {
            ...data,
            installed: true
          }
        })
        return NextResponse.json(created)
      }
    } else if (type === 'config') {
      // Update or create system config
      const { key, value, category, description } = data
      
      const config = await prisma.systemConfig.upsert({
        where: { key },
        update: { value, category, description },
        create: { key, value, category, description }
      })
      
      return NextResponse.json(config)
    } else if (type === 'configs') {
      // Batch update configs
      const results = []
      for (const item of data) {
        const config = await prisma.systemConfig.upsert({
          where: { key: item.key },
          update: { value: item.value, category: item.category },
          create: { key: item.key, value: item.value, category: item.category, description: item.description }
        })
        results.push(config)
      }
      return NextResponse.json(results)
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

// Initialize default settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { defaults } = body
    
    const defaultSettings = [
      // Company Info
      { key: 'company_name', value: 'TechCommerce', category: 'company', description: 'Nome da empresa' },
      { key: 'company_vat', value: '', category: 'company', description: 'NIF da empresa' },
      { key: 'company_address', value: '', category: 'company', description: 'Morada' },
      { key: 'company_postal', value: '', category: 'company', description: 'Código Postal' },
      { key: 'company_city', value: '', category: 'company', description: 'Cidade' },
      { key: 'company_country', value: 'Portugal', category: 'company', description: 'País' },
      { key: 'company_phone', value: '', category: 'company', description: 'Telefone' },
      { key: 'company_mobile', value: '', category: 'company', description: 'Telemóvel' },
      { key: 'company_email', value: '', category: 'company', description: 'Email principal' },
      { key: 'company_website', value: '', category: 'company', description: 'Website' },
      { key: 'company_logo', value: '', category: 'company', description: 'URL do logótipo' },
      { key: 'company_social_facebook', value: '', category: 'company', description: 'Facebook URL' },
      { key: 'company_social_instagram', value: '', category: 'company', description: 'Instagram URL' },
      { key: 'company_social_linkedin', value: '', category: 'company', description: 'LinkedIn URL' },
      { key: 'company_social_twitter', value: '', category: 'company', description: 'Twitter/X URL' },
      
      // SEO
      { key: 'seo_title', value: 'TechCommerce - Soluções Tecnológicas', category: 'seo', description: 'Título do website' },
      { key: 'seo_description', value: '', category: 'seo', description: 'Meta descrição' },
      { key: 'seo_keywords', value: '', category: 'seo', description: 'Palavras-chave' },
      
      // Store Settings
      { key: 'store_currency', value: 'EUR', category: 'store', description: 'Moeda' },
      { key: 'store_currency_symbol', value: '€', category: 'store', description: 'Símbolo da moeda' },
      { key: 'store_tax_rate', value: '23', category: 'store', description: 'Taxa de IVA (%)' },
      { key: 'store_free_shipping_min', value: '50', category: 'store', description: 'Valor mínimo para envio gratuito' },
      { key: 'store_shipping_cost', value: '4.99', category: 'store', description: 'Custo de envio padrão' },
      { key: 'store_shipping_express_cost', value: '9.99', category: 'store', description: 'Custo de envio expresso' },
      
      // Email Templates
      { key: 'email_order_subject', value: 'A sua encomenda #{orderNumber}', category: 'email', description: 'Assunto do email de encomenda' },
      { key: 'email_support_signature', value: 'Com os melhores cumprimentos,\nEquipa TechCommerce', category: 'email', description: 'Assinatura dos emails' },
      
      // Datalix API (VPS)
      { key: 'datalix_api_url', value: 'https://api.datalix.eu', category: 'datalix', description: 'URL da API Datalix' },
      { key: 'datalix_api_key', value: '', category: 'datalix', description: 'API Key Datalix' },
      { key: 'datalix_api_secret', value: '', category: 'datalix', description: 'API Secret Datalix' },
      { key: 'datalix_enabled', value: 'false', category: 'datalix', description: 'Serviço VPS ativo' },
      
      // aaPanel API (Hosting)
      { key: 'aapanel_api_url', value: '', category: 'aapanel', description: 'URL da API aaPanel' },
      { key: 'aapanel_api_key', value: '', category: 'aapanel', description: 'API Key aaPanel' },
      { key: 'aapanel_enabled', value: 'false', category: 'aapanel', description: 'Serviço Hosting ativo' },
      
      // Legal
      { key: 'legal_terms', value: '', category: 'legal', description: 'Termos e Condições' },
      { key: 'legal_privacy', value: '', category: 'legal', description: 'Política de Privacidade' },
      { key: 'legal_cookies', value: '', category: 'legal', description: 'Política de Cookies' },
      
      // Hours
      { key: 'hours_weekday', value: '9:00 - 18:00', category: 'hours', description: 'Horário dias úteis' },
      { key: 'hours_saturday', value: '9:00 - 13:00', category: 'hours', description: 'Horário Sábado' },
      { key: 'hours_sunday', value: 'Fechado', category: 'hours', description: 'Horário Domingo' },
    ]
    
    const results = []
    for (const setting of defaultSettings) {
      try {
        const config = await prisma.systemConfig.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: setting
        })
        results.push(config)
      } catch (e) {
        // Skip duplicates
      }
    }
    
    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error('Init settings error:', error)
    return NextResponse.json({ error: 'Failed to initialize settings' }, { status: 500 })
  }
}
