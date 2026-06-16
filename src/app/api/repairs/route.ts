import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRepairNumber, generateBarcode } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    const where: Record<string, unknown> = {}
    
    if (status) where.status = status
    if (search) {
      where.OR = [
        { repairNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { deviceBrand: { contains: search } },
        { deviceModel: { contains: search } }
      ]
    }
    
    const repairs = await db.repair.findMany({
      where,
      include: {
        assignments: {
          include: { user: true }
        },
        items: true,
        user: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json(repairs)
  } catch (error) {
    console.error('Error fetching repairs:', error)
    return NextResponse.json({ error: 'Failed to fetch repairs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const repairNumber = generateRepairNumber()
    const barcode = generateBarcode()
    
    const repair = await db.repair.create({
      data: {
        repairNumber,
        barcode,
        userId: data.userId || null,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone,
        deviceBrand: data.deviceBrand,
        deviceModel: data.deviceModel,
        deviceSerial: data.deviceSerial || null,
        deviceImei: data.deviceImei || null,
        devicePassword: data.devicePassword || null,
        faultDescription: data.faultDescription,
        accessories: data.accessories ? JSON.stringify(data.accessories) : null,
        customerNotes: data.customerNotes || null,
        priority: data.priority || 'normal',
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
        photos: data.photos ? JSON.stringify(data.photos) : null
      }
    })
    
    // Create status history
    await db.repairStatusHistory.create({
      data: {
        repairId: repair.id,
        status: 'pending',
        notes: 'Repair created'
      }
    })
    
    return NextResponse.json(repair)
  } catch (error) {
    console.error('Error creating repair:', error)
    return NextResponse.json({ error: 'Failed to create repair' }, { status: 500 })
  }
}
