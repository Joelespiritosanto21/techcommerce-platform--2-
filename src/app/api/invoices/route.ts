import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInvoiceNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    
    const where: Record<string, unknown> = {}
    
    if (type) where.type = type
    if (status) where.status = status
    
    const invoices = await db.invoice.findMany({
      where,
      include: {
        items: true,
        payments: true,
        user: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const invoiceNumber = generateInvoiceNumber()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30) // 30 days from now
    
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        type: data.type || 'invoice',
        orderId: data.orderId || null,
        userId: data.userId || null,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerVat: data.customerVat || null,
        customerAddress: data.customerAddress || null,
        customerCity: data.customerCity || null,
        customerPostal: data.customerPostal || null,
        customerCountry: data.customerCountry || null,
        subtotal: parseFloat(data.subtotal) || 0,
        tax: parseFloat(data.tax) || 0,
        total: parseFloat(data.total) || 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : dueDate,
        notes: data.notes || null,
        terms: data.terms || null,
        items: {
          create: (data.items || []).map((item: Record<string, unknown>) => ({
            description: item.description as string,
            quantity: item.quantity as number || 1,
            unitPrice: item.unitPrice as number,
            taxRate: item.taxRate as number || 0,
            total: item.total as number
          }))
        }
      },
      include: {
        items: true
      }
    })
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
