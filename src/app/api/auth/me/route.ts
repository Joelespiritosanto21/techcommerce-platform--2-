import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}
