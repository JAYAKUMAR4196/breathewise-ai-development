import { randomUUID } from 'node:crypto'
import { and, eq, gte, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { breathewiseActions } from '@/lib/db/schema'

export const runtime = 'nodejs'

const cookieName = 'breathewise_session'
const actionValues = {
  transit: 1.9,
  carpool: 1.1,
  safe_walk: 2.2,
  home_action: 0,
} as const

type ActionType = keyof typeof actionValues

async function getSessionId() {
  const jar = await cookies()
  const existing = jar.get(cookieName)?.value
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return { id: existing, isNew: false }
  return { id: randomUUID(), isNew: true }
}

function sessionCookie(response: NextResponse, id: string) {
  response.cookies.set(cookieName, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 60,
  })
  return response
}

export async function GET() {
  try {
    const { id, isNew } = await getSessionId()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const rows = await db.select({
      type: breathewiseActions.actionType,
      count: sql<number>`count(*)::int`,
      co2Kg: sql<string>`coalesce(sum(${breathewiseActions.co2Kg}), 0)::text`,
    }).from(breathewiseActions).where(and(eq(breathewiseActions.sessionId, id), gte(breathewiseActions.createdAt, weekAgo))).groupBy(breathewiseActions.actionType)
    const impact = { co2Kg: 0, total: 0, transit: 0, carpool: 0, safeWalk: 0, homeAction: 0 }
    for (const row of rows) {
      const count = Number(row.count)
      impact.total += count
      impact.co2Kg += Number(row.co2Kg)
      if (row.type === 'transit') impact.transit = count
      if (row.type === 'carpool') impact.carpool = count
      if (row.type === 'safe_walk') impact.safeWalk = count
      if (row.type === 'home_action') impact.homeAction = count
    }
    const response = NextResponse.json(impact)
    return isNew ? sessionCookie(response, id) : response
  } catch {
    return NextResponse.json({ error: 'Impact tracker is temporarily unavailable.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const type = body?.type as ActionType
    if (typeof type !== 'string' || !Object.hasOwn(actionValues, type)) return NextResponse.json({ error: 'Choose a valid action.' }, { status: 400 })
    const distanceKm = body?.distanceKm === undefined ? 8 : Number(body.distanceKm)
    if (!Number.isFinite(distanceKm) || distanceKm < 1 || distanceKm > 100) return NextResponse.json({ error: 'Distance must be between 1 and 100 km.' }, { status: 400 })
    const { id, isNew } = await getSessionId()
    const estimatedCo2 = actionValues[type] * (distanceKm / 8)
    await db.insert(breathewiseActions).values({ sessionId: id, actionType: type, co2Kg: estimatedCo2.toFixed(2) })
    const response = NextResponse.json({ ok: true }, { status: 201 })
    return isNew ? sessionCookie(response, id) : response
  } catch {
    return NextResponse.json({ error: 'Impact tracker is temporarily unavailable.' }, { status: 503 })
  }
}
