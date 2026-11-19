import { NextResponse } from 'next/server'

export const revalidate = 900

const fallback = {
  aqi: 164,
  pm25: 72.4,
  pm10: 108,
  no2: 32.1,
  o3: 41,
  co: 712,
  temperature: 19,
  humidity: 43,
  trend: [142, 156, 171, 166, 158, 164, 178, 164].map((value, index) => ({ time: ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'][index], value })),
}

function safeNumber(value: unknown, fallbackValue: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallbackValue
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cityQuery = searchParams.get('city')?.trim().slice(0, 80) || 'New Delhi'
  try {
    const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
    geoUrl.searchParams.set('name', cityQuery)
    geoUrl.searchParams.set('count', '1')
    geoUrl.searchParams.set('language', 'en')
    geoUrl.searchParams.set('format', 'json')
    const geoResponse = await fetch(geoUrl, { next: { revalidate: 86400 } })
    if (!geoResponse.ok) throw new Error('Location lookup failed')
    const geoData = await geoResponse.json()
    const place = geoData.results?.[0]
    if (!place) return NextResponse.json({ error: 'City not found' }, { status: 404 })

    const common = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), timezone: 'auto' })
    const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
    const airParams = new URLSearchParams(common)
    airParams.set('current', 'european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,carbon_monoxide')
    airParams.set('hourly', 'european_aqi')
    airParams.set('forecast_days', '1')
    airUrl.search = airParams.toString()
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast')
    const weatherParams = new URLSearchParams(common)
    weatherParams.set('current', 'temperature_2m,relative_humidity_2m')
    weatherUrl.search = weatherParams.toString()
    const [airResponse, weatherResponse] = await Promise.all([fetch(airUrl, { next: { revalidate: 900 } }), fetch(weatherUrl, { next: { revalidate: 900 } })])
    if (!airResponse.ok || !weatherResponse.ok) throw new Error('Air data unavailable')
    const [air, weather] = await Promise.all([airResponse.json(), weatherResponse.json()])
    const hourly = (air.hourly?.time ?? []).map((time: string, index: number) => ({ time, value: air.hourly?.european_aqi?.[index] })).filter((item: { value?: number }) => typeof item.value === 'number')
    const currentTime = air.current?.time
    const currentIndex = hourly.findIndex((item: { time: string }) => item.time === currentTime)
    const startIndex = Math.max(0, currentIndex - 2)
    const visibleHours = hourly.slice(startIndex, startIndex + 12)
    const trend = visibleHours.length ? visibleHours.map((item: { time: string; value: number }) => ({ time: new Date(item.time).toLocaleTimeString('en', { hour: 'numeric' }), value: item.value })) : fallback.trend
    const current = air.current ?? {}
    const currentWeather = weather.current ?? {}
    return NextResponse.json({
      city: place.name,
      country: place.country || '',
      latitude: place.latitude,
      longitude: place.longitude,
      aqi: Math.round(safeNumber(current.european_aqi, fallback.aqi)),
      pm25: safeNumber(current.pm2_5, fallback.pm25),
      pm10: safeNumber(current.pm10, fallback.pm10),
      no2: safeNumber(current.nitrogen_dioxide, fallback.no2),
      o3: safeNumber(current.ozone, fallback.o3),
      co: safeNumber(current.carbon_monoxide, fallback.co),
      temperature: safeNumber(currentWeather.temperature_2m, fallback.temperature),
      humidity: safeNumber(currentWeather.relative_humidity_2m, fallback.humidity),
      time: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
      trend,
      simulated: false,
    })
  } catch {
    return NextResponse.json({ city: cityQuery, country: '', latitude: 28.61, longitude: 77.21, ...fallback, time: new Date().toISOString(), simulated: true })
  }
}
