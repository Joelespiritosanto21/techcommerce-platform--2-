/**
 * Email API Routes
 * Gestão de serviços de email
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dnsManager } from '@/lib/email/dns'

// GET - Listar domínios de email
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'domains':
        const domains = await db.mailDomain.findMany({
          include: {
            _count: {
              select: { accounts: true, aliases: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, domains })

      case 'accounts':
        const domainId = searchParams.get('domainId')
        const accounts = await db.mailAccount.findMany({
          where: domainId ? { mailDomainId: domainId } : undefined,
          include: {
            mailDomain: {
              select: { domain: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, accounts })

      case 'aliases':
        const aliases = await db.mailAlias.findMany({
          include: {
            mailDomain: {
              select: { domain: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, aliases })

      case 'verify-dns':
        const verifyDomain = searchParams.get('domain')
        if (!verifyDomain) {
          return NextResponse.json({ error: 'Domínio não especificado' }, { status: 400 })
        }
        const verification = await dnsManager.verifyAll(verifyDomain, `mail.${verifyDomain}`)
        return NextResponse.json({ success: true, verification })

      case 'dns-records':
        const dnsDomain = searchParams.get('domain')
        if (!dnsDomain) {
          return NextResponse.json({ error: 'Domínio não especificado' }, { status: 400 })
        }
        const dnsRecords = await dnsManager.generateAllDNSRecords(dnsDomain)
        return NextResponse.json({ success: true, ...dnsRecords })

      case 'config':
        const config = await db.mailServerConfig.findFirst()
        return NextResponse.json({ success: true, config })

      default:
        // Retornar estatísticas gerais
        const [domainCount, accountCount, aliasCount] = await Promise.all([
          db.mailDomain.count(),
          db.mailAccount.count(),
          db.mailAlias.count()
        ])

        return NextResponse.json({
          success: true,
          stats: {
            totalDomains: domainCount,
            totalAccounts: accountCount,
            totalAliases: aliasCount
          }
        })
    }
  } catch (error) {
    console.error('Email API Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 }
    )
  }
}

// POST - Criar domínio ou conta de email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'create-domain':
        return await createMailDomain(data)
      
      case 'create-account':
        return await createMailAccount(data)
      
      case 'create-alias':
        return await createMailAlias(data)
      
      case 'change-password':
        return await changePassword(data)
      
      case 'set-quota':
        return await setQuota(data)
      
      case 'set-autoreply':
        return await setAutoReply(data)
      
      case 'set-forwarding':
        return await setForwarding(data)
      
      case 'generate-dkim':
        return await generateDKIM(data)
      
      case 'update-config':
        return await updateMailServerConfig(data)
      
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email API Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configurações
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'update-domain':
        return await updateMailDomain(data)
      
      case 'update-account':
        return await updateMailAccount(data)
      
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email API Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 }
    )
  }
}

// DELETE - Remover domínio, conta ou alias
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID não especificado' }, { status: 400 })
    }

    switch (action) {
      case 'domain':
        return await deleteMailDomain(id)
      
      case 'account':
        return await deleteMailAccount(id)
      
      case 'alias':
        return await deleteMailAlias(id)
      
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email API Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 }
    )
  }
}

// ==================== Funções auxiliares ====================

async function createMailDomain(data: {
  domain: string
  maxAccounts?: number
  maxAliases?: number
  maxStorageGB?: number
  hostingServiceId?: string
}) {
  // Verificar se domínio já existe
  const existing = await db.mailDomain.findUnique({
    where: { domain: data.domain }
  })

  if (existing) {
    return NextResponse.json({ error: 'Domínio já existe' }, { status: 400 })
  }

  // Gerar DKIM
  const dkim = await dnsManager.generateDKIMKeys(data.domain)

  // Criar domínio
  const domain = await db.mailDomain.create({
    data: {
      domain: data.domain,
      maxAccounts: data.maxAccounts || 10,
      maxAliases: data.maxAliases || 20,
      maxStorageGB: data.maxStorageGB || 10,
      dkimSelector: dkim.selector,
      dkimPublicKey: dkim.publicKey,
      dkimPrivateKey: dkim.privateKey,
      status: 'pending',
      hostingServiceId: data.hostingServiceId
    }
  })

  // Gerar registos DNS
  const dnsRecords = await dnsManager.generateAllDNSRecords(data.domain, {
    dkimSelector: dkim.selector
  })

  return NextResponse.json({
    success: true,
    domain,
    dnsRecords: dnsRecords.records,
    dkimPublicKey: dkim.publicKey,
    instructions: dnsRecords.instructions
  })
}

async function createMailAccount(data: {
  email: string
  password: string
  quotaMB?: number
  mailDomainId: string
  userId?: string
}) {
  // Verificar formato do email
  const [username, domain] = data.email.split('@')
  if (!username || !domain) {
    return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 })
  }

  // Verificar se conta já existe
  const existing = await db.mailAccount.findUnique({
    where: { email: data.email }
  })

  if (existing) {
    return NextResponse.json({ error: 'Email já existe' }, { status: 400 })
  }

  // Verificar limites do domínio
  const mailDomain = await db.mailDomain.findUnique({
    where: { id: data.mailDomainId },
    include: { _count: { select: { accounts: true } } }
  })

  if (!mailDomain) {
    return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })
  }

  if (mailDomain._count.accounts >= mailDomain.maxAccounts) {
    return NextResponse.json({ error: 'Limite de contas do domínio atingido' }, { status: 400 })
  }

  // Criar conta
  const account = await db.mailAccount.create({
    data: {
      email: data.email,
      username,
      password: data.password,
      quotaMB: data.quotaMB || 1000,
      mailDomainId: data.mailDomainId,
      userId: data.userId,
      status: 'active'
    }
  })

  return NextResponse.json({
    success: true,
    account: {
      id: account.id,
      email: account.email,
      username: account.username,
      quotaMB: account.quotaMB,
      status: account.status
    }
  })
}

async function createMailAlias(data: {
  source: string
  destination: string[]
  mailDomainId: string
}) {
  // Verificar se alias já existe
  const existing = await db.mailAlias.findUnique({
    where: { source: data.source }
  })

  if (existing) {
    return NextResponse.json({ error: 'Alias já existe' }, { status: 400 })
  }

  const alias = await db.mailAlias.create({
    data: {
      source: data.source,
      destination: JSON.stringify(data.destination),
      mailDomainId: data.mailDomainId
    }
  })

  return NextResponse.json({
    success: true,
    alias: {
      id: alias.id,
      source: alias.source,
      destination: data.destination
    }
  })
}

async function changePassword(data: { accountId: string; newPassword: string }) {
  const account = await db.mailAccount.update({
    where: { id: data.accountId },
    data: { password: data.newPassword }
  })

  return NextResponse.json({ success: true, message: 'Password alterada' })
}

async function setQuota(data: { accountId: string; quotaMB: number }) {
  const account = await db.mailAccount.update({
    where: { id: data.accountId },
    data: { quotaMB: data.quotaMB }
  })

  return NextResponse.json({ success: true, message: 'Quota atualizada' })
}

async function setAutoReply(data: {
  accountId: string
  enabled: boolean
  subject?: string
  message?: string
}) {
  const account = await db.mailAccount.update({
    where: { id: data.accountId },
    data: {
      autoReplyEnabled: data.enabled,
      autoReplySubject: data.subject,
      autoReplyMessage: data.message
    }
  })

  return NextResponse.json({ success: true, message: 'Auto-resposta configurada' })
}

async function setForwarding(data: {
  accountId: string
  enabled: boolean
  forwardTo?: string[]
  keepCopy?: boolean
}) {
  const account = await db.mailAccount.update({
    where: { id: data.accountId },
    data: {
      forwardEnabled: data.enabled,
      forwardTo: data.forwardTo ? JSON.stringify(data.forwardTo) : null,
      forwardKeepCopy: data.keepCopy ?? true
    }
  })

  return NextResponse.json({ success: true, message: 'Reencaminhamento configurado' })
}

async function generateDKIM(data: { domainId: string; selector?: string }) {
  const domain = await db.mailDomain.findUnique({
    where: { id: data.domainId }
  })

  if (!domain) {
    return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })
  }

  const dkim = await dnsManager.generateDKIMKeys(domain.domain, data.selector || 'mail')

  await db.mailDomain.update({
    where: { id: data.domainId },
    data: {
      dkimSelector: dkim.selector,
      dkimPublicKey: dkim.publicKey,
      dkimPrivateKey: dkim.privateKey
    }
  })

  return NextResponse.json({
    success: true,
    dkim: {
      selector: dkim.selector,
      publicKey: dkim.publicKey,
      dnsRecord: dkim.dnsRecord
    }
  })
}

async function updateMailServerConfig(data: Record<string, unknown>) {
  const existingConfig = await db.mailServerConfig.findFirst()

  let config
  if (existingConfig) {
    config = await db.mailServerConfig.update({
      where: { id: existingConfig.id },
      data
    })
  } else {
    config = await db.mailServerConfig.create({ data })
  }

  return NextResponse.json({ success: true, config })
}

async function updateMailDomain(data: { id: string; [key: string]: unknown }) {
  const { id, ...updates } = data

  const domain = await db.mailDomain.update({
    where: { id },
    data: updates
  })

  return NextResponse.json({ success: true, domain })
}

async function updateMailAccount(data: { id: string; [key: string]: unknown }) {
  const { id, ...updates } = data

  const account = await db.mailAccount.update({
    where: { id },
    data: updates
  })

  return NextResponse.json({ success: true, account })
}

async function deleteMailDomain(id: string) {
  // Verificar se existem contas
  const domain = await db.mailDomain.findUnique({
    where: { id },
    include: { _count: { select: { accounts: true } } }
  })

  if (domain?._count.accounts && domain._count.accounts > 0) {
    return NextResponse.json(
      { error: 'Não é possível eliminar domínio com contas de email' },
      { status: 400 }
    )
  }

  await db.mailDomain.delete({ where: { id } })

  return NextResponse.json({ success: true, message: 'Domínio eliminado' })
}

async function deleteMailAccount(id: string) {
  await db.mailAccount.delete({ where: { id } })

  return NextResponse.json({ success: true, message: 'Conta eliminada' })
}

async function deleteMailAlias(id: string) {
  await db.mailAlias.delete({ where: { id } })

  return NextResponse.json({ success: true, message: 'Alias eliminado' })
}
