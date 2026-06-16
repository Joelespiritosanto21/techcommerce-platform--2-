import { NextRequest } from 'next/server'
import { db } from './db'
import { Session } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  username: string
  name: string | null
  role: string
  avatar: string | null
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export async function generateToken(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSession(userId: string): Promise<Session> {
  const token = await generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  return db.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  })
}

export async function getSession(token: string | null): Promise<Session | null> {
  if (!token) return null
  
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true }
  })
  
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } })
    return null
  }
  
  return session
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null
  
  const session = await getSession(token)
  if (!session) return null
  
  const user = await db.user.findUnique({
    where: { id: session.userId }
  })
  
  if (!user) return null
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    avatar: user.avatar
  }
}

export async function logout(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } })
}

export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  const roleHierarchy: Record<string, number> = {
    super_admin: 100,
    admin: 90,
    manager: 70,
    sales: 50,
    technician: 50,
    warehouse: 50,
    support: 50,
    customer: 10
  }
  
  const userLevel = roleHierarchy[userRole] || 0
  const minRequired = Math.min(...requiredRoles.map(r => roleHierarchy[r] || 0))
  
  return userLevel >= minRequired
}
