import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const customers = await db.user.findMany({
      where: { role: 'customer' },
      include: {
        customer: {
          include: {
            contacts: true
          }
        },
        orders: {
          select: { id: true, total: true, createdAt: true }
        },
        _count: {
          select: { orders: true, repairs: true, tickets: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
