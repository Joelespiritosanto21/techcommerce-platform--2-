import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    
    const where: Record<string, unknown> = { isActive: true }
    
    if (category) {
      const cat = await db.category.findFirst({ where: { slug: category } })
      if (cat) where.categoryId = cat.id
    }
    
    if (brand) {
      const b = await db.brand.findFirst({ where: { slug: brand } })
      if (b) where.brandId = b.id
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } }
      ]
    }
    
    if (featured === 'true') {
      where.isFeatured = true
    }
    
    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        variants: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const product = await db.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        slug: slugify(data.name) + '-' + Date.now(),
        description: data.description || '',
        shortDescription: data.shortDescription,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        price: parseFloat(data.price) || 0,
        costPrice: parseFloat(data.costPrice) || null,
        comparePrice: parseFloat(data.comparePrice) || null,
        stock: parseInt(data.stock) || 0,
        stockAlert: parseInt(data.stockAlert) || 5,
        weight: parseFloat(data.weight) || null,
        images: data.images ? JSON.stringify(data.images) : null,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        hasVariants: data.hasVariants ?? false,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription
      },
      include: {
        category: true,
        brand: true
      }
    })
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
