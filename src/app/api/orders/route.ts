import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOrderNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    
    const where: Record<string, unknown> = {}
    
    if (status) where.status = status
    if (userId) where.userId = userId
    
    const orders = await db.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const orderNumber = generateOrderNumber()
    
    const order = await db.order.create({
      data: {
        orderNumber,
        userId: data.userId || null,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: data.paymentMethod || null,
        subtotal: parseFloat(data.subtotal) || 0,
        tax: parseFloat(data.tax) || 0,
        shipping: parseFloat(data.shipping) || 0,
        discount: parseFloat(data.discount) || 0,
        total: parseFloat(data.total) || 0,
        shippingName: data.shippingName,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingPostal: data.shippingPostal,
        shippingCountry: data.shippingCountry,
        shippingPhone: data.shippingPhone,
        customerNotes: data.customerNotes,
        items: {
          create: (data.items || []).map((item: Record<string, unknown>) => ({
            productId: item.productId as string || null,
            productName: item.productName as string,
            productSku: item.productSku as string || null,
            quantity: item.quantity as number,
            price: item.price as number,
            total: item.total as number,
            serialNumber: item.serialNumber as string || null
          }))
        }
      },
      include: {
        items: true
      }
    })
    
    // Create status history
    await db.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'pending',
        notes: 'Order created'
      }
    })
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
