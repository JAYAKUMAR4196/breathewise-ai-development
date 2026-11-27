'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Wind, MapPin, Search,
  Sun, CloudSun, Leaf, ShieldCheck, Sparkles, CarFront, TrainFront, Bike,
  BusFront, Menu, X, Send, HeartPulse, House, Route, CircleHelp, Moon,
  Check, Plus, ChevronDown, RefreshCw, Gauge, Droplets, ThermometerSun,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart'

type AirData = {
  city: string
  country: string
  latitude: number
  longitude: number
  aqi: number
  pm25: number
  pm10: number
  no2: number
  o3: number
  co: number
  temperature: number
  humidity: number
  time: string
  trend: { time: string; value: number }[]
  simulated: boolean
}

type Section = 'Overview' | 'Daily plan' | 'Indoor air' | 'Getting around' | 'My impact'
type ActionType = 'transit' | 'carpool' | 'safe_walk' | 'home_action'
type Impact = { co2Kg: number; total: number; transit: number; carpool: number; safeWalk: number; homeAction: number; trend: number[] }

const fallbackAir: AirData = {
  city: 'New Delhi', country: 'India', latitude: 28.61, longitude: 77.21,
  aqi: 164, pm25: 72.4, pm10: 108, no2: 32.1, o3: 41, co: 712,
  temperature: 19, humidity: 43, time: '2026-11-19T00:00:00.000Z', simulated: true,
  trend: [
    { time: '6 AM', value: 142 }, { time: '8 AM', value: 156 }, { time: '10 AM', value: 171 },
    { time: '12 PM', value: 166 }, { time: '2 PM', value: 158 }, { time: '4 PM', value: 164 },
    { time: '6 PM', value: 178 }, { time: '8 PM', value: 164 },
  ],
}

const chartConfig = { aqi: { label: 'Air quality index', color: 'var(--chart-1)' } } satisfies ChartConfig

const navItems: { label: Section; icon: typeof Activity }[] = [
  { label: 'Overview', icon: Activity }, { label: 'Daily plan', icon: Sun },
  { label: 'Indoor air', icon: House }, { label: 'Getting around', icon: Route },
  { label: 'My impact', icon: Leaf },
]

function getRisk(aqi: number) {
  if (aqi <= 20) return { label: 'Good', note: 'Enjoy the outdoors. Air quality is ideal for most activities.', tint: 'good' }
  if (aqi <= 40) return { label: 'Fair', note: 'Most people can enjoy outdoor activities as usual.', tint: 'fair' }
  if (aqi <= 60) return { label: 'Moderate', note: 'Consider shorter, lighter activity if you are sensitive to air pollution.', tint: 'moderate' }
  if (aqi <= 80) return { label: 'Poor', note: 'Reduce prolonged or strenuous outdoor activity, especially for children.', tint: 'poor' }
  return { label: 'Very poor', note: 'Limit time outdoors. Choose indoor activities and keep windows closed.', tint: 'very-poor' }
}

function Sidebar({ section, onChange, onClose }: { section: Section; onChange: (section: Section) => void; onClose?: () => void }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Wind size={21} strokeWidth={2.2} /></span><span>Breathe<span className="brand-light">Wise</span><small>COMMUNITY AIR, MADE CLEAR</small></span></div>
      <div className="workspace-label">YOUR SPACE</div>
      <nav aria-label="Main navigation" className="side-nav">
        {navItems.map(({ label, icon: Icon }) => (
          <button key={label} className={`nav-item ${section === label ? 'active' : ''}`} onClick={() => { onChange(label); onClose?.() }}>
            <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'My impact' && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="side-rule" />
      <div className="household-card">
        <div className="household-icon"><HeartPulse size={16} /></div>
        <div><span className="eyebrow">YOUR HOUSEHOLD</span><strong>Family of 4</strong><p>2 adults · 2 children</p></div>
        <button className="icon-button edit-profile" type="button" onClick={() => onChange('Daily plan')} aria-label="Edit household profile"><ChevronDown size={15} /></button>
      </div>
      <div className="sidebar-bottom"><span className="live-indicator" /> <span>Air quality from Open-Meteo</span></div>
    </aside>
  )
}

function Header({ city, section, onSearch, onOpenMenu, onThemeToggle, darkMode }: { city: string; section: Section; onSearch: (city: string) => void; onOpenMenu: () => void; onThemeToggle: () => void; darkMode: boolean }) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (query.trim()) { onSearch(query.trim()); setQuery('') } }
  useEffect(() => {
    const focusSearch = () => searchRef.current?.focus()
    window.addEventListener('breathewise:focus-search', focusSearch)
    return () => window.removeEventListener('breathewise:focus-search', focusSearch)
  }, [])

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onOpenMenu}><Menu size={20} /></button>
      <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{section}</strong></div>
      <form className="location-search" onSubmit={submit} role="search">
        <MapPin size={15} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={city} aria-label="Search city" />
        <button type="submit" aria-label="Search location"><Search size={15} /></button>
      </form>
      <button className="icon-button theme-toggle" type="button" onClick={onThemeToggle} aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
      <div className="topbar-avatar" aria-label="Profile: Alex Morgan">AM</div>
    </header>
  )
}

function AirGauge({ value }: { value: number }) {
  const radius = 65
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / 100, 1)
  return (
    <div className="gauge-wrap" aria-label={`Air quality index ${value}`}>
      <svg className="gauge-svg" viewBox="0 0 160 160" role="img" aria-hidden="true">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="9" />
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#bbec9a" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${circumference * progress} ${circumference}`} transform="rotate(-90 80 80)" />
      </svg>
      <div className="gauge-value"><strong>{value}</strong><span>EU AQI</span></div>
    </div>
  )
}

function PollutionChart({ trend }: { trend: AirData['trend'] }) {
  return (
    <ChartContainer config={chartConfig} className="aqi-chart" aria-label="Today's hourly air quality trend">
      <AreaChart data={trend} margin={{ top: 12, right: 2, bottom: 0, left: -22 }}>
        <defs><linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-aqi)" stopOpacity={0.23} /><stop offset="92%" stopColor="var(--color-aqi)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--border)" />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tickMargin={11} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} domain={[0, 'dataMax + 30']} />
        <Tooltip contentStyle={{ borderRadius: 12, borderColor: 'var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: 12 }} formatter={(value) => [`${value} EU AQI`, 'Air quality']} />
        <ReferenceLine y={60} stroke="#d2a65b" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="value" name="aqi" stroke="var(--color-aqi)" strokeWidth={2.5} fill="url(#aqiFill)" activeDot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ChartContainer>
  )
}

function MetricCard({ label, value, unit, icon: Icon, note, tone }: { label: string; value: string; unit: string; icon: typeof Activity; note: string; tone?: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone ?? ''}`}><Icon size={17} strokeWidth={1.8} /></div><span className="metric-label">{label}</span><div className="metric-value">{value}<span>{unit}</span></div><span className="metric-note">{note}</span></div>
}

function Overview({ air, onAsk, onNavigate }: { air: AirData; onAsk: (question: string) => void; onNavigate: (section: Section) => void }) {
  const risk = getRisk(air.aqi)
  const updated = new Date(air.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const trendStart = air.trend[0]?.value ?? air.aqi
  const trendEnd = air.trend.at(-1)?.value ?? air.aqi
  const trendSummary = trendEnd < trendStart ? 'easing later' : trendEnd > trendStart ? 'rising later' : 'holding steady'
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">YOUR LOCAL AIR <span className="eyebrow-divider">/</span> YOUR DAILY BRIEFING</span><h1>A little clarity for <span>the air ahead.</span></h1><p>Understand your air. Make the next good choice.</p></div></div>
      <section className="overview-grid">
        <motion.article className="air-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="air-hero-top"><div><span className="eyebrow light-eyebrow">YOUR NEIGHBORHOOD</span><h2><MapPin size={16} /> {air.city}, {air.country}</h2><span className="hero-updated"><span className="live-indicator" /> {air.simulated ? 'Illustrative sample' : `Updated ${updated}`} <span className="update-dot">·</span> {air.simulated ? 'Sample data' : 'Open-Meteo'}</span></div><button className="hero-more" type="button" onClick={() => window.dispatchEvent(new Event('breathewise:focus-search'))} aria-label="More location options"><ChevronDown size={17} /></button></div>
          <div className="air-hero-main"><AirGauge value={air.aqi} /><div className="air-explainer"><div className="severity-pill"><span className={`severity-dot ${risk.tint}`} /> {risk.label} air quality</div><h3>{air.aqi > 60 ? 'Take it a little easier outside.' : 'A good day to get some fresh air.'}</h3><p>{risk.note}</p><div className="hero-weather"><span><ThermometerSun size={15} /> {Math.round(air.temperature)}°C</span><span><Droplets size={15} /> {Math.round(air.humidity)}% humidity</span></div></div></div>
          <div className="hero-footer"><ShieldCheck size={15} /><span>{air.aqi > 60 ? 'Children and sensitive groups should keep strenuous activity indoors.' : 'Air quality is suitable for most everyday activities.'}</span><button onClick={() => onAsk('What does today’s air quality mean for my family?')} aria-label="Ask BreatheWise about today's air"><ArrowRight size={16} /></button></div>
        </motion.article>
        <motion.article className="trend-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
          <div className="card-heading"><div><span className="eyebrow">THE DAY AT A GLANCE</span><h3>Air quality trend</h3></div><span className="trend-badge"><span className="live-indicator" /> LIVE</span></div>
          <div className="trend-stat"><strong>{air.aqi}</strong><span>current EU AQI</span><span className="trend-change">{trendEnd < trendStart ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {trendSummary}</span></div>
          <PollutionChart trend={air.trend} />
          <div className="chart-legend"><span><i /> Air quality index</span><span><i className="legend-threshold" /> Caution level</span></div>
        </motion.article>
      </section>
      <section className="section-block pollutant-section"><div className="section-heading"><div><span className="eyebrow">WHAT'S IN THE AIR</span><h2>Know what you&apos;re breathing.</h2></div><span className="small-muted">Concentrations in µg/m³</span></div><div className="metric-grid">
        <MetricCard label="Fine particles" value={air.pm25.toFixed(1)} unit="µg/m³" icon={Wind} note="PM₂.₅ · gets deep into lungs" tone="mint" />
        <MetricCard label="Coarse particles" value={air.pm10.toFixed(0)} unit="µg/m³" icon={Activity} note="PM₁₀ · dust & larger particles" tone="lavender" />
        <MetricCard label="Nitrogen dioxide" value={air.no2.toFixed(1)} unit="µg/m³" icon={Activity} note="NO₂ · mostly from traffic" tone="peach" />
        <MetricCard label="Ozone" value={air.o3.toFixed(0)} unit="µg/m³" icon={Sun} note="O₃ · forms in sunlight" tone="yellow" />
        <MetricCard label="Carbon monoxide" value={air.co.toFixed(0)} unit="µg/m³" icon={Gauge} note="CO · from fuel combustion" tone="blue" />
      </div></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">SMALL CHANGES, REAL RELIEF</span><h2>Start with what matters today.</h2></div><button className="text-link" onClick={() => onNavigate('Daily plan')}>See your daily plan <ArrowRight size={15} /></button></div><div className="recommendation-grid">
        <button className="recommendation-card" onClick={() => onAsk('Is it safe for my children to play outside today?')}><span className="rec-icon green"><HeartPulse size={19} /></span><span className="rec-copy"><strong>Make outdoor time count</strong><small>{air.aqi > 60 ? 'Keep playtime short and easy today.' : 'Your outdoor window is looking good.'}</small><em>For your family <ArrowRight size={13} /></em></span></button>
        <button className="recommendation-card" onClick={() => onNavigate('Indoor air')}><span className="rec-icon sky"><House size={19} /></span><span className="rec-copy"><strong>Give indoor air a boost</strong><small>Three simple ways to make home a cleaner-air zone.</small><em>2 min read <ArrowRight size={13} /></em></span></button>
        <button className="recommendation-card" onClick={() => onNavigate('Getting around')}><span className="rec-icon amber"><TrainFront size={19} /></span><span className="rec-copy"><strong>Take the lower-exposure route</strong><small>Compare your commute options for today.</small><em>Plan a trip <ArrowRight size={13} /></em></span></button>
      </div></section>
    </>
  )
}

const dailyPlan = [
  { time: '7:00 AM', title: 'Check before you head out', detail: 'Air quality can shift overnight. Take a quick look before the school run.', icon: Sun, tag: 'A good habit' },
  { time: '8:30 AM', title: 'Choose the quieter route', detail: 'A street one block away from busy traffic can mean less exposure on the walk.', icon: Route, tag: 'School run' },
  { time: '12:00 PM', title: 'Give the kids an indoor break', detail: 'With today’s particle levels, swap vigorous outdoor play for an indoor activity.', icon: HeartPulse, tag: 'Family tip' },
  { time: '6:00 PM', title: 'Let your home reset', detail: 'Wipe surfaces with a damp cloth to capture dust instead of stirring it up.', icon: House, tag: 'At home' },
]

function DailyPlan({ air }: { air: AirData }) {
  const [checked, setChecked] = useState<string[]>([])
  const [workStart, setWorkStart] = useState('8:30 AM')
  const [schoolStart, setSchoolStart] = useState('8:00 AM')
  const [exercise, setExercise] = useState('Indoor')
  const [transport, setTransport] = useState('Public transit')
  return <section className="subpage"><div className="page-heading"><div><span className="eyebrow">YOUR HOUSEHOLD · TODAY</span><h1>A calmer day, <span>step by step.</span></h1><p>A flexible routine shaped around today&apos;s air and your family&apos;s needs.</p></div><span className="outline-button"><Sparkles size={14} /> Personalized for you</span></div><details className="preferences-panel"><summary><span><Sparkles size={15} /> Tailor the routine to your day</span><ChevronDown size={15} /></summary><div className="preferences-grid"><label>Workday starts<select value={workStart} onChange={(event) => setWorkStart(event.target.value)}><option>7:30 AM</option><option>8:30 AM</option><option>9:30 AM</option><option>10:00 AM</option></select></label><label>School drop-off<select value={schoolStart} onChange={(event) => setSchoolStart(event.target.value)}><option>7:30 AM</option><option>8:00 AM</option><option>8:30 AM</option><option>9:00 AM</option></select></label><label>Exercise preference<select value={exercise} onChange={(event) => setExercise(event.target.value)}><option>Indoor</option><option>Outdoor</option><option>Light movement</option></select></label><label>Usual commute<select value={transport} onChange={(event) => setTransport(event.target.value)}><option>Public transit</option><option>Carpool</option><option>Private car</option><option>Walk or cycle</option></select></label></div></details><div className="plan-layout"><div className="plan-list">{dailyPlan.map((item, i) => { const Icon = item.icon; const done = checked.includes(item.title); const time = i === 0 ? workStart : i === 1 ? schoolStart : item.time; const title = i === 2 && exercise !== 'Indoor' && air.aqi <= 60 ? 'Use a cleaner-air window for movement' : item.title; const detail = i === 1 ? `${transport} is set as your usual commute. Leave a little extra time for a lower-traffic route.` : i === 2 && exercise !== 'Indoor' && air.aqi > 60 ? 'Outdoor air is elevated today. Choose an indoor or lower-intensity activity instead.' : i === 2 && exercise !== 'Indoor' ? 'Choose an easy pace and quieter route while pollution is lower.' : item.detail; return <motion.article key={item.title} className={`plan-item ${done ? 'completed' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}><div className="plan-time">{time}</div><span className="plan-icon"><Icon size={17} /></span><div className="plan-copy"><span className="plan-tag">{item.tag}</span><h3>{title}</h3><p>{detail}</p></div><button className={`check-button ${done ? 'checked' : ''}`} aria-label={done ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`} onClick={() => setChecked((old) => done ? old.filter((title) => title !== item.title) : [...old, item.title])}>{done ? <Check size={16} /> : null}</button></motion.article> })}</div><aside className="plan-side"><span className="side-sun"><Sparkles size={20} /></span><span className="eyebrow">YOUR PLAN, YOUR PACE</span><h3>It&apos;s about progress, not perfection.</h3><p>Small, repeatable habits can help your family spend less time in polluted air. Adjust the plan around your real day.</p><div className="plan-progress"><div><span>Today&apos;s check-ins</span><strong>{checked.length} of {dailyPlan.length}</strong></div><div className="progress-track"><i style={{ width: `${checked.length / dailyPlan.length * 100}%` }} /></div></div></aside></div><div className="disclaimer-note"><ShieldCheck size={16} /><span>Guidance is based on general environmental recommendations, not medical advice. If anyone has concerning symptoms, contact a healthcare professional.</span></div></section>
}

const tips = [
  { title: 'Ventilate when outdoor air is cleaner', text: 'Open windows briefly when outdoor pollution is lower, often after rain or when the AQI improves. Check local conditions first.', benefit: 'Can reduce indoor pollutant buildup', icon: Wind, tag: 'No-cost' },
  { title: 'Choose a correctly sized HEPA purifier', text: 'Match the clean-air delivery rate (CADR) to your room size. Keep doors closed while it runs for the best particle reduction.', benefit: 'Captures fine particles in the room', icon: Activity, tag: 'Most effective' },
  { title: 'Skip indoor smoke and fragrance', text: 'Avoid smoking, incense and candles indoors. These add particles and gases to the air your family shares.', benefit: 'Prevents adding new pollutants', icon: ShieldCheck, tag: 'Everyday win' },
  { title: 'Damp-dust and vacuum regularly', text: 'A damp cloth captures settled dust. If you vacuum, use a well-sealed HEPA-filter model where possible.', benefit: 'Helps keep settled dust from resuspending', icon: House, tag: 'Weekly routine' },
  { title: 'Keep purifier filters maintained', text: 'Follow the manufacturer’s filter schedule. A clogged filter can reduce airflow and cleaning performance.', benefit: 'Keeps your device working as designed', icon: RefreshCw, tag: 'Easy to miss' },
]

function IndoorAir() {
  const [expanded, setExpanded] = useState<number | null>(0)
  return <section className="subpage"><div className="page-heading"><div><span className="eyebrow">A BREATHING SPACE AT HOME</span><h1>Make home feel <span>a little fresher.</span></h1><p>Practical steps to reduce indoor particles, without overpromising.</p></div><div className="indoor-score"><span>OUTDOOR AQI</span><strong>164</strong><em>Very poor today</em></div></div><div className="indoor-banner"><div className="banner-art"><House size={23} /><span className="air-wave wave-one" /><span className="air-wave wave-two" /></div><div><span className="eyebrow">TODAY'S PRIORITY</span><h3>Keep outside air out while levels are high.</h3><p>Close windows for now. If your home feels stuffy, ventilate briefly only when outdoor readings improve.</p></div><span className="priority-chip"><ShieldCheck size={14} /> Low effort</span></div><div className="section-heading indoor-list-title"><div><span className="eyebrow">A FEW GOOD PLACES TO START</span><h2>Small steps, grounded in evidence.</h2></div></div><div className="tip-list">{tips.map((tip, i) => { const Icon = tip.icon; const isOpen = expanded === i; return <article className={`tip-item ${isOpen ? 'open' : ''}`} key={tip.title}><button className="tip-toggle" onClick={() => setExpanded(isOpen ? null : i)} aria-expanded={isOpen}><span className="tip-icon"><Icon size={18} /></span><span className="tip-title">{tip.title}<small>{tip.tag}</small></span><span className="tip-chevron">{isOpen ? <X size={14} /> : <Plus size={15} />}</span></button>{isOpen && <div className="tip-details"><p>{tip.text}</p><div><Check size={14} /> {tip.benefit}</div><small>Benefit varies by room size, equipment, maintenance and outdoor conditions.</small></div>}</article> })}</div><div className="disclaimer-note"><CircleHelp size={16} /><span>Indoor air monitors can help you understand trends, but consumer devices vary in accuracy. This guidance is informational.</span></div></section>
}

const travel = [
  { mode: 'Metro', time: '28 min', exposure: 'Lowest exposure', co2: '0.2 kg', score: 'Best fit today', icon: TrainFront, tag: 'RECOMMENDED', good: true },
  { mode: 'Public bus', time: '36 min', exposure: 'Low exposure', co2: '0.4 kg', score: 'Lower emissions', icon: BusFront, tag: 'LOWER CARBON', good: true },
  { mode: 'Carpool', time: '24 min', exposure: 'Moderate exposure', co2: '1.1 kg', score: 'Share the ride', icon: CarFront, tag: 'SHARE A RIDE', good: false },
  { mode: 'Private car', time: '22 min', exposure: 'Moderate exposure', co2: '2.4 kg', score: 'Most convenient', icon: CarFront, tag: 'YOUR USUAL', good: false },
  { mode: 'Walk / cycle', time: '42 min', exposure: 'Higher outdoor exposure', co2: '0 kg', score: 'Not ideal today', icon: Bike, tag: 'SAVE FOR A CLEARER DAY', good: false },
]

function GettingAround({ air, onLog }: { air: AirData; onLog: (type: ActionType, co2: number) => Promise<void> }) {
  const [logged, setLogged] = useState<string | null>(null)
  const [distance, setDistance] = useState(8)
  const safeForWalk = air.aqi <= 60
  const logJourney = async (mode: string) => {
    const type: ActionType = mode === 'Carpool' ? 'carpool' : mode === 'Walk / cycle' ? 'safe_walk' : 'transit'
    await onLog(type, distance)
    setLogged(mode)
  }
  return <section className="subpage"><div className="page-heading"><div><span className="eyebrow">A BETTER WAY THERE</span><h1>Choose a route <span>that works for you.</span></h1><p>Balance convenience, outdoor exposure and estimated trip emissions.</p></div><div className="route-input"><label htmlFor="distance">ONE-WAY DISTANCE</label><div><input id="distance" type="number" min="1" max="100" value={distance} onChange={(event) => setDistance(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /><span>km</span></div></div></div><div className="exposure-banner"><span className="exposure-icon"><Wind size={18} /></span><div><strong>{safeForWalk ? 'Outdoor activity is reasonable today.' : 'Keep active travel for a clearer-air day.'}</strong><p>{safeForWalk ? 'Take breaks and choose quieter streets where you can.' : 'Today’s elevated pollution can increase what you breathe during exertion. Public transport is a lower-exposure option.'}</p></div><span className="aqi-mini">AQI {air.aqi}</span></div><div className="travel-table"><div className="travel-head"><span>HOW YOU GO</span><span>TRAVEL TIME</span><span>EXPOSURE</span><span>EST. CO₂</span><span /></div>{travel.map((item) => { const Icon = item.icon; const canWalk = item.mode !== 'Walk / cycle' || safeForWalk; return <div className={`travel-row ${item.good ? 'recommended' : ''} ${item.mode === 'Walk / cycle' && !safeForWalk ? 'not-recommended' : ''}`} key={item.mode}><div className="travel-mode"><span className="travel-icon"><Icon size={19} /></span><span><strong>{item.mode}</strong><small>{item.tag}</small></span></div><span className="travel-data">{item.mode === 'Walk / cycle' && !safeForWalk ? '—' : item.time}</span><span className={`exposure-text ${item.good ? 'lower' : ''}`}>{item.mode === 'Walk / cycle' && !safeForWalk ? 'Not recommended' : item.exposure}</span><span className="travel-data">{item.mode === 'Walk / cycle' ? '0 kg' : item.co2}</span><button className={`log-trip ${logged === item.mode ? 'logged' : ''}`} disabled={!canWalk || logged === item.mode} onClick={() => logJourney(item.mode)}>{logged === item.mode ? <><Check size={13} /> Logged</> : 'Choose'}</button></div> })}</div><p className="table-footnote">Travel times are illustrative estimates. CO₂ is a rough per-trip estimate based on distance and typical vehicle factors; actual values vary by vehicle, occupancy and route. Walking and cycling are not suggested when outdoor exposure may be unsafe.</p><div className="disclaimer-note"><Leaf size={16} /><span>Transport emissions are estimates, not a personal carbon audit. Every shared ride and transit journey is a step in the right direction.</span></div></section>
}

function Impact({ impact, period, onPeriodChange, onLog }: { impact: Impact; period: 'week' | 'month'; onPeriodChange: (period: 'week' | 'month') => void; onLog: (type: ActionType, distanceKm: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const record = async (type: ActionType) => { setBusy(true); await onLog(type, 8); setBusy(false) }
  return     <section className="subpage"><div className="page-heading"><div><span className="eyebrow">YOUR FOOTPRINT, IN A BETTER DIRECTION</span><h1>Little choices <span>add up.</span></h1><p>A personal tally of cleaner-commute and home-air actions from this browser.</p></div><div className="period-toggle" role="group" aria-label="Impact date range"><button className={period === 'week' ? 'selected' : ''} onClick={() => onPeriodChange('week')}>This week</button><button className={period === 'month' ? 'selected' : ''} onClick={() => onPeriodChange('month')}>This month</button></div></div><div className="impact-hero"><div className="impact-leaf"><Leaf size={23} /></div><div><span className="eyebrow light-eyebrow">ESTIMATED CO₂ AVOIDED</span><div className="impact-total">{impact.co2Kg.toFixed(1)}<span>kg</span></div><p>From {impact.total} action{impact.total === 1 ? '' : 's'} logged this {period}</p></div><div className="impact-sparkline"><div className="sparkline-bars">{impact.trend.map((count, i) => <i key={i} style={{ height: `${count === 0 ? 7 : 18 + (count / Math.max(1, ...impact.trend)) * 72}%` }} />)}</div><span>YOUR {period.toUpperCase()}, SO FAR</span></div></div><div className="impact-stats"><div><span className="impact-stat-icon"><TrainFront size={17} /></span><strong>{impact.transit}</strong><span>Transit journeys</span></div><div><span className="impact-stat-icon"><CarFront size={17} /></span><strong>{impact.carpool}</strong><span>Carpool trips</span></div><div><span className="impact-stat-icon"><Bike size={17} /></span><strong>{impact.safeWalk}</strong><span>Safe active trips</span></div><div><span className="impact-stat-icon"><House size={17} /></span><strong>{impact.homeAction}</strong><span>Home-air actions</span></div></div><div className="log-actions"><div className="section-heading"><div><span className="eyebrow">ADD TO YOUR {period.toUpperCase()}</span><h2>What have you done today?</h2></div></div><div className="log-action-grid"><button onClick={() => record('transit')} disabled={busy}><span><TrainFront size={18} /></span><strong>Took transit</strong><small>~1.9 kg CO₂ avoided</small><Plus size={16} className="action-plus" /></button><button onClick={() => record('carpool')} disabled={busy}><span><CarFront size={18} /></span><strong>Shared a ride</strong><small>~1.1 kg CO₂ avoided</small><Plus size={16} className="action-plus" /></button><button onClick={() => record('safe_walk')} disabled={busy}><span><Bike size={18} /></span><strong>Walked or cycled</strong><small>Only when outdoor air is safe</small><Plus size={16} className="action-plus" /></button><button onClick={() => record('home_action')} disabled={busy}><span><House size={18} /></span><strong>Improved home air</strong><small>One small indoor-air action</small><Plus size={16} className="action-plus" /></button></div></div><div className="disclaimer-note"><CircleHelp size={16} /><span>Impact figures are illustrative estimates using average per-trip factors—not measured personal emissions. Your actual savings depend on distance and vehicle.</span></div></section>
}

function Assistant({ air, open, onClose }: { air: AirData; open: boolean; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [loading, setLoading] = useState(false)
  const send = useCallback(async (text: string) => {
    const question = text.trim()
    if (!question || loading) return
    setInput('')
    setMessages((current) => [...current, { role: 'user', content: question }])
    setLoading(true)
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, air: { aqi: air.aqi, city: air.city, pm25: air.pm25, temperature: air.temperature }, household: 'Family of 4, including two children' }) })
      const data = await response.json()
      setMessages((current) => [...current, { role: 'assistant', content: data.answer || 'I’m having trouble answering right now. Please check the current air-quality guidance and try again.' }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: `Air quality in ${air.city} is currently ${getRisk(air.aqi).label.toLowerCase()} (EU AQI ${air.aqi}). ${getRisk(air.aqi).note} If someone experiences concerning symptoms, seek advice from a healthcare professional.` }])
    } finally { setLoading(false) }
  }, [air, loading])
  useEffect(() => {
    const handleSuggestedQuestion = (event: Event) => {
      const question = (event as CustomEvent<string>).detail
      if (question) void send(question)
    }
    window.addEventListener('breathewise:ask', handleSuggestedQuestion)
    return () => window.removeEventListener('breathewise:ask', handleSuggestedQuestion)
  }, [send])

  if (!open) return null
  const suggestions = ['Is it safe for my kids to play outside?', 'How can I improve the air at home?', 'What should I do about today’s smog?']
  return <div className="assistant-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><motion.aside className="assistant-panel" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} aria-label="BreatheWise AI assistant"><div className="assistant-header"><div className="assistant-avatar"><Sparkles size={18} /></div><div><strong>BreatheWise AI</strong><span><i /> Here to help your family</span></div><button className="icon-button" onClick={onClose} aria-label="Close assistant"><X size={19} /></button></div><div className="assistant-context"><Wind size={15} /> Using today&apos;s {air.city} air quality · EU AQI {air.aqi}</div><div className="assistant-messages" aria-live="polite">{messages.length === 0 ? <div className="assistant-welcome"><div className="welcome-spark"><Sparkles size={20} /></div><h3>Hi there. Let&apos;s make sense of today.</h3><p>I can turn your local air quality into simple, family-friendly next steps.</p><div className="suggestion-list">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)}>{suggestion}<ArrowRight size={14} /></button>)}</div></div> : messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="chat-role">{message.role === 'assistant' ? 'BREATHEWISE' : 'YOU'}</span><p>{message.content}</p></div>)}{loading && <div className="chat-message assistant"><span className="chat-role">BREATHEWISE</span><p className="typing-dots"><i /><i /><i /></p></div>}</div><form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); void send(input) }}><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }} placeholder="Ask about your air today…" aria-label="Ask BreatheWise a question" /><button type="submit" disabled={!input.trim() || loading} aria-label="Send message"><Send size={16} /></button></form><p className="assistant-disclaimer">General environmental guidance only — not medical advice. <button onClick={() => send('What should I do if someone in my family has symptoms from air pollution?')}>Learn more</button></p></motion.aside></div>
}

export default function BreatheWiseDashboard() {
  const [section, setSection] = useState<Section>('Overview')
  const [air, setAir] = useState<AirData>(fallbackAir)
  const [loadingAir, setLoadingAir] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [impact, setImpact] = useState<Impact>({ co2Kg: 0, total: 0, transit: 0, carpool: 0, safeWalk: 0, homeAction: 0, trend: Array(7).fill(0) })
  const [impactPeriod, setImpactPeriod] = useState<'week' | 'month'>('week')
  const risk = useMemo(() => getRisk(air.aqi), [air.aqi])

  const loadAir = useCallback(async (city: string) => {
    setLoadingAir(true)
    try {
      const response = await fetch(`/api/air-quality?city=${encodeURIComponent(city)}`)
      if (!response.ok) throw new Error('Air data unavailable')
      setAir(await response.json())
    } catch { setAir({ ...fallbackAir, city }) }
    finally { setLoadingAir(false) }
  }, [])

  const loadImpact = useCallback(async (period: 'week' | 'month' = 'week') => {
    try { const response = await fetch(`/api/impact?period=${period}`); if (response.ok) setImpact(await response.json()) } catch { /* Keep the empty state if storage is unavailable. */ }
  }, [])

  useEffect(() => { void loadAir('New Delhi'); void loadImpact() }, [loadAir, loadImpact])

  const logAction = useCallback(async (type: ActionType, co2Kg: number) => {
    const response = await fetch('/api/impact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, distanceKm: co2Kg }) })
    if (response.ok) await loadImpact(impactPeriod)
  }, [loadImpact, impactPeriod])

  const askAssistant = (question: string) => { setAssistantOpen(true); window.setTimeout(() => { window.dispatchEvent(new CustomEvent('breathewise:ask', { detail: question })) }, 50) }

  return (
    <div className={`app-shell ${darkMode ? 'dark' : ''}`}>
      {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
      <div className={`sidebar-wrap ${mobileNav ? 'mobile-open' : ''}`}><Sidebar section={section} onChange={setSection} onClose={() => setMobileNav(false)} /><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <main className="main-panel"><Header city={air.city} section={section} onSearch={loadAir} onOpenMenu={() => setMobileNav(true)} onThemeToggle={() => setDarkMode((enabled) => !enabled)} darkMode={darkMode} /><div className="content-wrap">
        {loadingAir && <div className="loading-strip"><span /> Updating local air quality…</div>}
        {section === 'Overview' && <Overview air={air} onAsk={askAssistant} onNavigate={setSection} />}
        {section === 'Daily plan' && <DailyPlan air={air} />}
        {section === 'Indoor air' && <IndoorAir />}
        {section === 'Getting around' && <GettingAround air={air} onLog={logAction} />}
        {section === 'My impact' && <Impact impact={impact} period={impactPeriod} onPeriodChange={(period) => { setImpactPeriod(period); void loadImpact(period) }} onLog={logAction} />}
        <footer className="app-footer"><span>© 2026 BreatheWise AI</span><span>Air quality data by Open-Meteo · Educational guidance, not medical advice</span><button onClick={() => setAssistantOpen(true)}><Sparkles size={13} /> Ask BreatheWise</button></footer>
      </div></main>
      <button className="assistant-fab" onClick={() => setAssistantOpen(true)} aria-label="Open BreatheWise AI assistant"><span className="fab-spark"><Sparkles size={19} /></span><span>Ask BreatheWise</span></button>
      <Assistant air={air} open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}
