import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export const maxDuration = 30

const guidanceSources = `Trusted reference notes for answering:
- WHO air quality guidelines emphasize reducing exposure to fine particulate matter (PM2.5), especially for children and other sensitive groups.
- EPA AirNow guidance: when air quality is unhealthy, reduce prolonged or heavy outdoor exertion; sensitive groups should take additional care.
- EPA indoor air guidance: source control is effective; avoid indoor smoking and combustion; filtration can reduce airborne particles when properly sized and maintained.
- Open-Meteo European AQI is a local air-quality indicator. Explain the supplied value as an indicator, not a medical diagnosis.
Sources: https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health and https://www.airnow.gov/aqi/aqi-basics/`

export async function POST(request: Request) {
  let city = 'your area'
  let aqi = 0
  let pm25 = 0
  try {
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 700) : ''
    if (!message) return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
    const air = body.air && typeof body.air === 'object' ? body.air : {}
    aqi = Number.isFinite(Number(air.aqi)) ? Math.max(0, Math.min(500, Number(air.aqi))) : 0
    pm25 = Number.isFinite(Number(air.pm25)) ? Math.max(0, Number(air.pm25)) : 0
    city = typeof air.city === 'string' ? air.city.slice(0, 80) : 'your area'
    const household = typeof body.household === 'string' ? body.household.slice(0, 160) : 'a household'
    const { text } = await generateText({
      model: 'google/gemini-2.5-flash',
      system: `You are BreatheWise AI, a calm and practical urban air-quality guide. Answer in plain language in 2–5 short sentences. Use only the supplied context and grounded general environmental guidance. Give one or two actionable steps that fit the air conditions and household. Never diagnose, predict individual health outcomes, or recommend medication. If the user mentions concerning symptoms, recommend prompt advice from a qualified healthcare professional or local emergency services if severe. Clearly say when information is uncertain. Do not claim real-time data beyond the supplied values. Do not give unsafe outdoor walking/cycling advice when EU AQI is above 60. Avoid alarmist language.\n\n${guidanceSources}`,
      prompt: `Location: ${city}. Current European AQI: ${aqi}. PM2.5: ${pm25.toFixed(1)} µg/m³. Household context: ${household}. User question: ${message}`,
      temperature: 0.35,
    })
    return NextResponse.json({ answer: text })
  } catch {
    const practicalAdvice = aqi > 60
      ? 'Limit outdoor time and strenuous activity, keep windows closed while outdoor readings are high, and consider public transport over walking or cycling. If anyone has concerning symptoms, contact a healthcare professional.'
      : 'Most people can continue their usual activities. Sensitive household members can take breaks and choose quieter routes. If anyone has concerning symptoms, contact a healthcare professional.'
    return NextResponse.json({ answer: `AI responses are temporarily unavailable. Based on the current reading for ${city} (EU AQI ${aqi}, PM2.5 ${pm25.toFixed(1)} µg/m³): ${practicalAdvice}`, aiUnavailable: true })
  }
}
