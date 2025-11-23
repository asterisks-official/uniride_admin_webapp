import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminRequest(request)

    const apiKey = process.env.ONESIGNAL_REST_API_KEY
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID

    if (!apiKey || !appId) {
      return NextResponse.json({ ok: false, data: { authorized: false, appIdOk: !!appId, keyPresent: !!apiKey, keyFormat: apiKey ? (apiKey.startsWith('os_') ? 'app_key' : 'rest_key') : 'none', message: 'Missing OneSignal credentials' } }, { status: 200 })
    }

    const url = `https://onesignal.com/api/v1/players?app_id=${appId}&limit=1`
    let resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Basic ${apiKey}` },
    })

    if (!resp.ok) {
      const retry = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      resp = retry
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return NextResponse.json({ ok: false, data: { authorized: false, appIdOk: true, keyPresent: true, keyFormat: apiKey.startsWith('os_') ? 'app_key' : 'rest_key', message: JSON.stringify(err) } }, { status: 200 })
    }

    const data = await resp.json()
    return NextResponse.json({ ok: true, data: { authorized: true, appIdOk: true, keyPresent: true, keyFormat: 'rest_key' } })
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: error.message } }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: error.message } }, { status: 403 })
    }
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to check credentials' } }, { status: 500 })
  }
}