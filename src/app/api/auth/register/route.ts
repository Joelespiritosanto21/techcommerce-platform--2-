import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, name } = await request.json()
    
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    })
    
    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email or username already exists' 
      }, { status: 400 })
    }
    
    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name || username,
        role: 'customer'
      }
    })
    
    const session = await createSession(user.id)
    
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role
    })
    
    response.cookies.set('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })
    
    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
