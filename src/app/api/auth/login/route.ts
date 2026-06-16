import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    const user = await db.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
    }
    
    const session = await createSession(user.id)
    
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })
    
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    })
    
    response.cookies.set('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  
  const response = NextResponse.json({ success: true })
  response.cookies.delete('auth_token')
  
  return response
}
