import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, UnauthorizedError, ForbiddenError } from '@/lib/security/authGuard'
import { notificationsRepo } from '@/lib/repos/notificationsRepo'

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyAdminRequest(request)

    const url = new URL(request.url)
  const segment = url.searchParams.get('segment') || undefined
  const uidsParam = url.searchParams.get('userUids') || ''
  const userUids = uidsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

    const summary = await notificationsRepo.getBroadcastEligibility(segment, userUids.length ? userUids : undefined)
    return NextResponse.json({ ok: true, data: summary })
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      )
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to compute eligibility' } }, { status: 500 })
  }
}