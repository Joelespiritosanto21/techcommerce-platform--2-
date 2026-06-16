import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get all VPS services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const planId = searchParams.get('planId')

    if (userId) {
      // Get user's VPS services
      const services = await prisma.vPSService.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(services)
    }

    if (planId) {
      // Get VPS plan
      const plan = await prisma.vPSPlan.findUnique({
        where: { id: planId },
        include: { vpsServices: true }
      })
      return NextResponse.json(plan)
    }

    // Get all plans
    const plans = await prisma.vPSPlan.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }]
    })

    const services = await prisma.vPSService.findMany({
      include: { user: true, plan: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ plans, services })
  } catch (error) {
    console.error('VPS GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch VPS data' }, { status: 500 })
  }
}

// Create VPS service or plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'plan') {
      // Create VPS plan
      const plan = await prisma.vPSPlan.create({
        data: {
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          description: data.description,
          cpuCores: parseInt(data.cpuCores) || 1,
          ramGB: parseInt(data.ramGB) || 1,
          storageGB: parseInt(data.storageGB) || 20,
          bandwidthTB: parseFloat(data.bandwidthTB) || 1,
          ipv4: parseInt(data.ipv4) || 1,
          ipv6: data.ipv6 !== false,
          locationId: data.locationId,
          locationName: data.locationName,
          priceMonthly: parseFloat(data.priceMonthly) || 0,
          priceQuarterly: data.priceQuarterly ? parseFloat(data.priceQuarterly) : null,
          priceYearly: data.priceYearly ? parseFloat(data.priceYearly) : null,
          setupFee: data.setupFee ? parseFloat(data.setupFee) : null,
          datalixPlanId: data.datalixPlanId,
          isActive: data.isActive !== false,
          isFeatured: data.isFeatured || false,
          sortOrder: parseInt(data.sortOrder) || 0
        }
      })
      return NextResponse.json(plan)
    }

    if (type === 'service') {
      // Create VPS service for user
      const service = await prisma.vPSService.create({
        data: {
          userId: data.userId,
          planId: data.planId,
          datalixId: data.datalixId,
          hostname: data.hostname,
          status: 'pending',
          powerStatus: 'stopped',
          billingCycle: data.billingCycle || 'monthly',
          price: parseFloat(data.price) || 0,
          paidUntil: data.paidUntil ? new Date(data.paidUntil) : null,
          nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null
        },
        include: { plan: true }
      })
      return NextResponse.json(service)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('VPS POST error:', error)
    return NextResponse.json({ error: 'Failed to create VPS' }, { status: 500 })
  }
}

// Update VPS service or plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'plan') {
      const plan = await prisma.vPSPlan.update({
        where: { id },
        data: {
          ...data,
          cpuCores: data.cpuCores ? parseInt(data.cpuCores) : undefined,
          ramGB: data.ramGB ? parseInt(data.ramGB) : undefined,
          storageGB: data.storageGB ? parseInt(data.storageGB) : undefined,
          bandwidthTB: data.bandwidthTB ? parseFloat(data.bandwidthTB) : undefined,
          priceMonthly: data.priceMonthly ? parseFloat(data.priceMonthly) : undefined
        }
      })
      return NextResponse.json(plan)
    }

    if (type === 'service') {
      const service = await prisma.vPSService.update({
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
    console.error('VPS PUT error:', error)
    return NextResponse.json({ error: 'Failed to update VPS' }, { status: 500 })
  }
}

// Delete VPS service or plan
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    if (type === 'plan') {
      await prisma.vPSPlan.delete({ where: { id } })
    } else if (type === 'service') {
      await prisma.vPSService.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('VPS DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete VPS' }, { status: 500 })
  }
}
