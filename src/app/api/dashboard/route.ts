import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get counts for dashboard
    const [
      productCount,
      orderCount,
      repairCount,
      ticketCount,
      customerCount,
      pendingOrders,
      openRepairs,
      openTickets,
      recentOrders,
      recentRepairs,
      revenue
    ] = await Promise.all([
      db.product.count({ where: { isActive: true } }),
      db.order.count(),
      db.repair.count(),
      db.ticket.count(),
      db.user.count({ where: { role: 'customer' } }),
      db.order.count({ where: { status: 'pending' } }),
      db.repair.count({ where: { status: { in: ['pending', 'diagnosed', 'in_progress'] } } }),
      db.ticket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      }),
      db.repair.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      db.order.aggregate({
        where: { paymentStatus: 'paid' },
        _sum: { total: true }
      })
    ])
    
    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const orders = await db.order.findMany({
      where: {
        paymentStatus: 'paid',
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        total: true,
        createdAt: true
      }
    })
    
    const monthlyRevenue: Record<string, number> = {}
    orders.forEach(order => {
      const month = order.createdAt.toISOString().substring(0, 7)
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total
    })
    
    return NextResponse.json({
      counts: {
        products: productCount,
        orders: orderCount,
        repairs: repairCount,
        tickets: ticketCount,
        customers: customerCount,
        pendingOrders,
        openRepairs,
        openTickets
      },
      recentOrders,
      recentRepairs,
      revenue: revenue._sum.total || 0,
      monthlyRevenue
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
