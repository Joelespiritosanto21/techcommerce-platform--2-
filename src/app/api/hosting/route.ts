import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { hostingManager, WebsiteConfig } from '@/lib/hosting/manager'

const prisma = new PrismaClient()

// Get all hosting services and plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const planId = searchParams.get('planId')
    const action = searchParams.get('action')
    const siteId = searchParams.get('siteId')

    // Specific actions
    if (action === 'metrics' && siteId) {
      const metrics = await hostingManager.getMetrics(siteId)
      return NextResponse.json(metrics)
    }

    if (action === 'list-sites') {
      const sites = await hostingManager.listWebsites()
      return NextResponse.json(sites)
    }

    // Database listing
    if (action === 'databases') {
      // Would need to implement database listing in the manager
      return NextResponse.json([])
    }

    // Backups listing
    if (action === 'backups' && siteId) {
      // Would need to implement backup listing
      return NextResponse.json([])
    }

    if (userId) {
      // Get user's hosting services
      const services = await prisma.hostingService.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(services)
    }

    if (planId) {
      const plan = await prisma.hostingPlan.findUnique({
        where: { id: planId },
        include: { hostingServices: true }
      })
      return NextResponse.json(plan)
    }

    // Get all plans
    const plans = await prisma.hostingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }]
    })

    const services = await prisma.hostingService.findMany({
      include: { user: true, plan: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ plans, services })
  } catch (error) {
    console.error('Hosting GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch hosting data' }, { status: 500 })
  }
}

// Create hosting service/plan/website
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, action, data } = body

    // Website management actions
    if (action === 'create-site') {
      const config: WebsiteConfig = {
        domain: data.domain,
        type: data.siteType || 'static',
        documentRoot: data.documentRoot,
        port: data.port,
        phpVersion: data.phpVersion,
        nodeVersion: data.nodeVersion,
        sslEnabled: data.sslEnabled !== false
      }

      const website = await hostingManager.createWebsite(config)
      return NextResponse.json(website)
    }

    if (action === 'delete-site') {
      await hostingManager.deleteWebsite(data.siteId)
      return NextResponse.json({ success: true })
    }

    if (action === 'restart-site') {
      const website = await hostingManager.getWebsite(data.siteId)
      if (website) {
        await hostingManager.restartProcess(website)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (action === 'stop-site') {
      const website = await hostingManager.getWebsite(data.siteId)
      if (website) {
        await hostingManager.stopProcess(website)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (action === 'start-site') {
      const website = await hostingManager.getWebsite(data.siteId)
      if (website) {
        await hostingManager.startProcess(website)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // SSL management
    if (action === 'enable-ssl') {
      const result = await hostingManager.enableSSL(data.domain)
      return NextResponse.json(result)
    }

    if (action === 'disable-ssl') {
      await hostingManager.disableSSL(data.domain)
      return NextResponse.json({ success: true })
    }

    if (action === 'renew-ssl') {
      await hostingManager.renewSSL(data.domain)
      return NextResponse.json({ success: true })
    }

    // Database management
    if (action === 'create-database') {
      const db = await hostingManager.createDatabase({
        name: data.name,
        type: data.dbType || 'mysql',
        websiteId: data.websiteId
      })
      return NextResponse.json(db)
    }

    if (action === 'delete-database') {
      await hostingManager.deleteDatabase(data.dbId)
      return NextResponse.json({ success: true })
    }

    // Backup management
    if (action === 'create-backup') {
      const backup = await hostingManager.createBackup(data.siteId, data.backupType || 'full')
      return NextResponse.json(backup)
    }

    if (action === 'restore-backup') {
      await hostingManager.restoreBackup(data.backupId)
      return NextResponse.json({ success: true })
    }

    // Hosting plan creation
    if (type === 'plan') {
      const plan = await prisma.hostingPlan.create({
        data: {
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          description: data.description,
          storageGB: parseInt(data.storageGB) || 10,
          bandwidthGB: data.bandwidthGB ? parseInt(data.bandwidthGB) : null,
          databases: parseInt(data.databases) || 1,
          emailAccounts: data.emailAccounts ? parseInt(data.emailAccounts) : null,
          subdomains: data.subdomains ? parseInt(data.subdomains) : null,
          ftpAccounts: data.ftpAccounts ? parseInt(data.ftpAccounts) : null,
          sslCertificate: data.sslCertificate !== false,
          dailyBackup: data.dailyBackup || false,
          staging: data.staging || false,
          phpVersion: data.phpVersion,
          nodejsVersion: data.nodejsVersion,
          priceMonthly: parseFloat(data.priceMonthly) || 0,
          priceYearly: data.priceYearly ? parseFloat(data.priceYearly) : null,
          setupFee: data.setupFee ? parseFloat(data.setupFee) : null,
          isActive: data.isActive !== false,
          isFeatured: data.isFeatured || false,
          sortOrder: parseInt(data.sortOrder) || 0
        }
      })
      return NextResponse.json(plan)
    }

    // Hosting service creation (for customers)
    if (type === 'service') {
      // Create the website
      const website = await hostingManager.createWebsite({
        domain: data.domain,
        type: data.siteType || 'static',
        sslEnabled: true
      })

      // Create the service record
      const service = await prisma.hostingService.create({
        data: {
          userId: data.userId,
          planId: data.planId,
          aapanelId: website.id, // Reusing field for our internal ID
          domain: data.domain,
          documentRoot: website.documentRoot,
          status: 'active',
          sslStatus: 'pending',
          billingCycle: data.billingCycle || 'monthly',
          price: parseFloat(data.price) || 0,
          paidUntil: data.paidUntil ? new Date(data.paidUntil) : null,
          nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
          provisionedAt: new Date()
        },
        include: { plan: true }
      })

      return NextResponse.json({ service, website })
    }

    return NextResponse.json({ error: 'Invalid type or action' }, { status: 400 })
  } catch (error) {
    console.error('Hosting POST error:', error)
    return NextResponse.json({ error: 'Failed to process hosting request', details: String(error) }, { status: 500 })
  }
}

// Update hosting service or plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'plan') {
      const plan = await prisma.hostingPlan.update({
        where: { id },
        data: {
          ...data,
          storageGB: data.storageGB ? parseInt(data.storageGB) : undefined,
          databases: data.databases ? parseInt(data.databases) : undefined,
          priceMonthly: data.priceMonthly ? parseFloat(data.priceMonthly) : undefined
        }
      })
      return NextResponse.json(plan)
    }

    if (type === 'service') {
      const service = await prisma.hostingService.update({
        where: { id },
        data: {
          ...data,
          provisionedAt: data.status === 'active' && !data.provisionedAt ? new Date() : data.provisionedAt,
          suspendedAt: data.status === 'suspended' && !data.suspendedAt ? new Date() : data.suspendedAt,
          cancelledAt: data.status === 'cancelled' && !data.cancelledAt ? new Date() : data.cancelledAt
        }
      })
      return NextResponse.json(service)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Hosting PUT error:', error)
    return NextResponse.json({ error: 'Failed to update hosting' }, { status: 500 })
  }
}

// Delete hosting service or plan
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    if (type === 'plan') {
      await prisma.hostingPlan.delete({ where: { id } })
    } else if (type === 'service') {
      // Also delete the website
      const service = await prisma.hostingService.findUnique({ where: { id } })
      if (service?.aapanelId) {
        try {
          await hostingManager.deleteWebsite(service.aapanelId)
        } catch (e) {
          // Website might not exist
        }
      }
      await prisma.hostingService.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hosting DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete hosting' }, { status: 500 })
  }
}
