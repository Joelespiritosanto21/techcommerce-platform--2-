import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const installation = await db.installation.findFirst()
    
    // Get system configs
    const configs = await db.systemConfig.findMany()
    const settings: Record<string, string> = {}
    configs.forEach(c => settings[c.key] = c.value)
    
    return NextResponse.json({ 
      installed: installation?.installed || false,
      step: installation?.step || 0,
      installation: installation || null,
      settings
    })
  } catch {
    return NextResponse.json({ installed: false, step: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { step, action, ...restData } = data
    
    let installation = await db.installation.findFirst()
    
    // Handle specific actions
    if (action === 'init_settings') {
      // Initialize default system settings
      const defaultSettings = [
        { key: 'company_name', value: restData.companyName || 'TechCommerce', category: 'company' },
        { key: 'company_vat', value: restData.companyVat || '', category: 'company' },
        { key: 'company_address', value: restData.companyAddress || '', category: 'company' },
        { key: 'company_postal', value: restData.companyPostal || '', category: 'company' },
        { key: 'company_city', value: restData.companyCity || '', category: 'company' },
        { key: 'company_country', value: restData.companyCountry || 'Portugal', category: 'company' },
        { key: 'company_phone', value: restData.companyPhone || '', category: 'company' },
        { key: 'company_email', value: restData.companyEmail || '', category: 'company' },
        { key: 'company_website', value: restData.companyWebsite || '', category: 'company' },
        { key: 'store_currency', value: 'EUR', category: 'store' },
        { key: 'store_currency_symbol', value: '€', category: 'store' },
        { key: 'seo_title', value: `${restData.companyName || 'TechCommerce'} - Solucoes Tecnologicas`, category: 'seo' },
      ]
      
      for (const setting of defaultSettings) {
        await db.systemConfig.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: setting
        })
      }
      
      return NextResponse.json({ success: true, message: 'Settings initialized' })
    }
    
    if (action === 'test_database') {
      // Test database connection
      try {
        await db.$queryRaw`SELECT 1`
        return NextResponse.json({ success: true, message: 'Database connection successful' })
      } catch (e) {
        return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 400 })
      }
    }
    
    if (action === 'create_admin') {
      // Create admin user
      const { username, email, password, name } = restData
      
      // Check if user exists
      const existingUser = await db.user.findFirst({
        where: { OR: [{ email }, { username }] }
      })
      
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 })
      }
      
      // Create admin user
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(password, 10)
      
      const user = await db.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name: name || 'Administrator',
          role: 'super_admin',
          status: 'active'
        }
      })
      
      return NextResponse.json({ success: true, userId: user.id })
    }
    
    // Update installation progress
    if (installation) {
      installation = await db.installation.update({
        where: { id: installation.id },
        data: {
          ...restData,
          step: step || installation.step + 1,
          installed: restData.installed ?? installation.installed
        }
      })
    } else {
      installation = await db.installation.create({
        data: {
          ...restData,
          step: step || 1,
          installed: restData.installed ?? false
        }
      })
    }
    
    return NextResponse.json(installation)
  } catch (error) {
    console.error('Installation error:', error)
    return NextResponse.json({ error: 'Failed to save installation data' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const installation = await db.installation.findFirst()
    
    if (installation) {
      const updated = await db.installation.update({
        where: { id: installation.id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
      return NextResponse.json(updated)
    } else {
      const created = await db.installation.create({
        data: {
          ...data,
          installed: true
        }
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error('Installation update error:', error)
    return NextResponse.json({ error: 'Failed to update installation' }, { status: 500 })
  }
}
