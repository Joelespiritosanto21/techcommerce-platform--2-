import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateTicketNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    
    const where: Record<string, unknown> = {}
    
    if (status) where.status = status
    if (department) where.department = department
    
    const tickets = await db.ticket.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const ticketNumber = generateTicketNumber()
    
    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        userId: data.userId || null,
        department: data.department,
        subject: data.subject,
        priority: data.priority || 'normal',
        messages: {
          create: {
            userId: data.userId || null,
            content: data.message,
            attachments: data.attachments ? JSON.stringify(data.attachments) : null
          }
        }
      },
      include: {
        messages: true
      }
    })
    
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
