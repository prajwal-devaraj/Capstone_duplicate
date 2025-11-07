import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { transactions as SEED_TX, bills as SEED_BILLS, runway as RUNWAY, achievements as SEED_ACH, insights as SEED_ALERTS } from '@/lib/mock'
import type { Transaction, Mood, NWG } from '@/lib/types'
import {
  AlertTriangle, BarChart2, Brain, CalendarDays, ChevronDown, Filter, LineChart, Link as LinkIcon,
  Moon, PieChart, PlusCircle, Search, Sparkles, X
} from 'lucide-react'
import {
  LineChart as RLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart as RPieChart, Pie, Cell, BarChart as RBarChart, Bar, CartesianGrid
} from 'recharts'

// -------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const isLate = (d: Date) => {
  const h = d.getHours()
  return h >= 22 || h < 5
}
const toLocalDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const NWG_COLORS: Record<NWG, string> = {
  Need: '#EA9B84',
  Want: '#E25D37',
  Guilt: '#F1B9A6',
}

type Range = '7d' | '30d' | 'custom'
type InsightType = 'All' | 'Spending' | 'Mood' | 'Bills' | 'Achievements'
type SortBy = 'newest' | 'impact' | 'category'

// -------------------------------------------------------------------
// Compact subcomponents (kept in this file for a drop-in)
// -------------------------------------------------------------------
function SectionCard({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-soft bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-soft px-4 py-3 md:px-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  )
}

function AlertCard({
  icon, tone = 'info', title, description, cta, onClick,
  sparkline
}: {
  icon: React.ReactNode
  tone?: 'info' | 'warn' | 'success'
  title: string
  description?: string
  cta?: string
  onClick?: () => void
  sparkline?: { data: Array<{ x: string; y: number }> }
}) {
  const toneCls = tone === 'warn'
    ? 'bg-amber-50 text-amber-800'
    : tone === 'success'
      ? 'bg-emerald-50 text-emerald-800'
      : 'bg-cream text-gray-800'

  return (
    <div className="flex gap-3 rounded-2xl border border-soft bg-white p-4 shadow-card md:items-center">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneCls}`}>{icon}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        {description && <div className="mt-1 text-sm text-gray-600">{description}</div>}
        {sparkline && (
          <div className="mt-2 h-14">
            <ResponsiveContainer>
              <RLineChart data={sparkline.data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                <Line type="monotone" dataKey="y" stroke="#E25D37" strokeWidth={2} dot={false} />
                <XAxis dataKey="x" hide />
                <YAxis hide />
                <Tooltip cursor={{ stroke: '#EDE7E2' }} />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {cta && (
        <button onClick={onClick} className="btn-ghost shrink-0">
          {cta}
        </button>
      )}
    </div>
  )
}

function Drawer({
  open, title, children, onClose,
}: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" aria-modal>
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[min(520px,100%)] overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-soft px-4 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-lg p-2 hover:bg-cream" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------
export default function Insights() {
  const nav = useNavigate()

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [range, setRange] = useState<Range>('7d')
  const [nwg, setNWG] = useState<'All' | NWG>('All')
  const [typ, setTyp] = useState<InsightType>('All')
  const [sort, setSort] = useState<SortBy>('newest')
  const [q, setQ] = useState('')

  // Drawer
  const [drawer, setDrawer] = useState<{ open: boolean; title: string; content?: React.ReactNode }>({ open: false, title: '' })

  // -- Data windows
  const windowed = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 30
    const after = Date.now() - days * 86400000
    const tx = SEED_TX.filter(t => new Date(t.occurred_at).getTime() >= after)
    const late = tx.filter(t => t.type === 'expense' && isLate(new Date(t.occurred_at))).length
    const wantsShare = (() => {
      const exp = tx.filter(t => t.type === 'expense')
      const total = exp.reduce((s, t) => s + (t.amount || 0), 0)
      const wants = exp.filter(t => t.nwg === 'Want').reduce((s, t) => s + (t.amount || 0), 0)
      return total > 0 ? (wants / total) : 0
    })()
    const perMood = (() => {
      const m: Record<Mood, { sum: number; cnt: number }> = {
         happy: { sum: 0, cnt: 0 }, 
  neutral: { sum: 0, cnt: 0 }, 
  sad: { sum: 0, cnt: 0 }
      }
      tx.forEach(t => {
        if (t.type === 'expense' && t.mood && m[t.mood]) {
          m[t.mood].sum += t.amount
          m[t.mood].cnt += 1
        }
      })
      return (Object.entries(m) as Array<[Mood, { sum: number; cnt: number }]>)
        .map(([mood, v]) => ({ mood, avg: v.cnt ? v.sum / v.cnt : 0 }))
    })()
    const recentBills7 = SEED_BILLS.filter(b => {
      const d = new Date(b.next_due).getTime()
      const diff = Math.round((d - Date.now()) / 86400000)
      return diff >= 0 && diff <= 7
    })
    return { tx, late, wantsShare, perMood, recentBills7 }
  }, [range])

  // -- Charts data
  const nwgPie = useMemo(() => {
    const exp = windowed.tx.filter(t => t.type === 'expense')
    const groups: Record<NWG, number> = { Need: 0, Want: 0, Guilt: 0 }
    exp.forEach(t => {
      if (t.nwg) groups[t.nwg] += t.amount
    })
    return (Object.entries(groups) as Array<[NWG, number]>)
      .map(([k, v]) => ({ name: k, value: v }))
  }, [windowed.tx])

  const sparkLate = useMemo(() => {
    // a tiny sparkline: last 7 days late-night counts
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000)
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      const count = SEED_TX.filter(t =>
        t.type === 'expense' &&
        isLate(new Date(t.occurred_at)) &&
        new Date(t.occurred_at).toDateString() === d.toDateString()).length
      return { x: label, y: count }
    })
    return days
  }, [])

  // -- Alerts (seed + computed)
  const alerts = useMemo(() => {
    const arr: Array<{
      id: string
      type: InsightType
      title: string
      desc?: string
      tone?: 'info' | 'warn' | 'success'
      icon: React.ReactNode
      sparkline?: { data: Array<{ x: string; y: number }> }
      cta?: string
      onClick?: () => void
      impact?: number
    }> = []

    // Seed in any provided “insights” messages
    for (const a of SEED_ALERTS) {
      if (a.type === 'late_night') {
        arr.push({
          id: a.id, type: 'Spending',
          title: 'Late-night spending up 20% this week',
          desc: 'You’ve had more after-10pm purchases than usual.',
          tone: 'warn',
          icon: <Moon size={18} />,
          sparkline: { data: sparkLate },
          cta: 'View transactions',
          onClick: () => nav('/transactions?latenight=true'),
          impact: 8,
        })
      }
      if (a.type === 'power_save') {
        arr.push({
          id: a.id, type: 'Spending',
          title: 'Power-Save could add +14 days',
          desc: 'Cut Wants & Guilt for a short streak to extend runway.',
          icon: <Sparkles size={18} />,
          cta: 'Open Dashboard',
          onClick: () => nav('/dashboard'),
          impact: 7,
        })
      }
      if (a.type === 'bill_due') {
        arr.push({
          id: a.id, type: 'Bills',
          title: 'Rent due in 2 days',
          desc: 'Plan to avoid surprises.',
          icon: <CalendarDays size={18} />,
          cta: 'View bills',
          onClick: () => nav('/bills?due=next7'),
          impact: 9,
        })
      }
    }

    // Computed: wants share
    const wantsPct = Math.round(windowed.wantsShare * 100)
    arr.push({
      id: 'wants-share',
      type: 'Spending',
      title: `“Wants” are ${wantsPct}% of spend`,
      desc: wantsPct >= 50 ? 'Consider a Power-Save sprint.' : 'Nice balance—keep it steady.',
      icon: <PieChart size={18} />,
      cta: 'Open Transactions',
      onClick: () => nav('/transactions?nwg=Want'),
      impact: wantsPct,
    })

    // Computed: late night count
    if (windowed.late >= 2) {
      arr.push({
        id: 'late-night-flag',
        type: 'Spending',
        title: `Late-night purchases: ${windowed.late} in ${range === '7d' ? '7' : '30'} days`,
        desc: 'Night-time buys often correlate with impulse mood.',
        tone: 'warn',
        icon: <Moon size={18} />,
        sparkline: { data: sparkLate },
        cta: 'See night spends',
        onClick: () => nav('/transactions?latenight=true'),
        impact: 6 + Math.min(windowed.late, 4),
      })
    }

    // Computed: upcoming bills
    if (windowed.recentBills7.length > 0) {
      const total = windowed.recentBills7.reduce((s, b) => s + b.amount, 0)
      arr.push({
        id: 'bills-next-7',
        type: 'Bills',
        title: `Bills due soon: ${fmtCurrency(total)} next 7 days`,
        icon: <CalendarDays size={18} />,
        cta: 'Go to Bills',
        onClick: () => nav('/bills?due=next7'),
        impact: 8,
      })
    }

    // Achievement sample
    if (SEED_ACH.length) {
      arr.push({
        id: 'ach-1',
        type: 'Achievements',
        title: `Latest achievement: ${SEED_ACH[0].name}`,
        icon: <Sparkles size={18} />,
        cta: 'View goals',
        onClick: () => nav('/goals'),
        impact: 5,
      })
    }

    // Filters
    const typed = typ === 'All' ? arr : arr.filter(a => a.type === typ)
    const byNWG = nwg === 'All'
      ? typed
      : typed.filter(a => a.title.toLowerCase().includes(nwg.toLowerCase()))
    const searched = q ? byNWG.filter(a => (a.title + ' ' + (a.desc ?? '')).toLowerCase().includes(q.toLowerCase())) : byNWG
    if (sort === 'impact') searched.sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
    // 'newest' is the default (stable seed order), 'category' could group alphabetically
    if (sort === 'category') searched.sort((a, b) => a.type.localeCompare(b.type))
    return searched
  }, [nav, nwg, q, sort, typ, windowed.late, windowed.recentBills7.length, windowed.wantsShare, range, sparkLate])

  // -- Recommendations
  const recs = useMemo(() => {
    const out: Array<{ title: string; desc: string; tags: string[]; onClick?: () => void }> = []
    if (windowed.wantsShare >= 0.45) {
      out.push({
        title: 'Try a 3-day Power-Save streak',
        desc: 'Mute Wants & Guilt for 3 days to stretch runway.',
        tags: ['#Savings', '#Discipline'],
        onClick: () => nav('/dashboard'),
      })
    }
    if (windowed.late >= 2) {
      out.push({
        title: 'Plan ahead to avoid late-night buys',
        desc: 'Batch order essentials in the afternoon. Average saves: $40/week.',
        tags: ['#MoodBased'],
        onClick: () => nav('/transactions?latenight=true'),
      })
    }
    if (windowed.recentBills7.length >= 2) {
      out.push({
        title: 'Stagger one bill to mid-month',
        desc: 'Moving a subscription by ~10 days smooths the burn curve.',
        tags: ['#BillOptimization'],
        onClick: () => nav('/bills'),
      })
    }
    return out
  }, [windowed.late, windowed.recentBills7.length, windowed.wantsShare, nav])

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <AppLayout>
      {/* Header */}
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 py-4 sm:px-4">
        <h1 className="text-xl font-semibold">Alerts & Insights</h1>

        {/* Quick time range */}
        
      </div>

      <div className="mx-auto max-w-[1440px] px-3 sm:px-4">

        {/* Filters row */}
       

        {/* A. Alerts feed */}
        <SectionCard
          title="Smart Alerts"
          right={<span className="text-xs text-gray-600">{alerts.length} items</span>}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alerts.map(a => (
              <AlertCard
                key={a.id}
                icon={a.icon}
                tone={a.tone}
                title={a.title}
                description={a.desc}
                cta={a.cta}
                sparkline={a.sparkline}
                onClick={a.onClick}
              />
            ))}
            {alerts.length === 0 && (
              <div className="rounded-xl border border-soft bg-cream p-6 text-center text-gray-600">
                No insights yet. Start logging expenses and moods for personalized advice.
              </div>
            )}
          </div>
        </SectionCard>

        {/* B. Comparisons / Analytics */}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Regular vs Power-Save */}
          <SectionCard title="Runway Comparison">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-soft p-4 text-center">
                <div className="text-sm text-gray-600">Regular</div>
                <div className="mt-1 text-3xl font-semibold">{RUNWAY.days_left_regular}d</div>
              </div>
              <div className="rounded-xl border border-soft p-4 text-center">
                <div className="text-sm text-gray-600">Power-Save</div>
                <div className="mt-1 text-3xl font-semibold text-emerald-600">{RUNWAY.days_left_power_save}d</div>
              </div>
            </div>
            <button className="btn-ghost mt-3 inline-flex items-center gap-2" onClick={() => nav('/dashboard')}>
              <Sparkles size={16} /> Try Power-Save on Dashboard
            </button>
          </SectionCard>

          {/* Needs / Wants / Guilt */}
          <SectionCard title="Needs / Wants / Guilt">
            <div className="h-56">
              <ResponsiveContainer>
                <RPieChart>
                  <Pie dataKey="value" data={nwgPie} outerRadius={100} innerRadius={60}>
                    {nwgPie.map((p, i) =>
                      <Cell key={i} fill={NWG_COLORS[p.name as NWG]} />
                    )}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [fmtCurrency(v), n]} />
                </RPieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Mood vs Spend */}
       <SectionCard title="Mood vs Average Spend">
  <div className="h-56">
    <ResponsiveContainer>
      <RBarChart data={windowed.perMood.filter(d =>
        d.mood === 'happy' || d.mood === 'neutral' || d.mood === 'sad'
      )}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mood" />
        <YAxis />
        <Tooltip formatter={(v: number) => fmtCurrency(v)} />
        <Bar dataKey="avg" fill="#E25D37" />
      </RBarChart>
    </ResponsiveContainer>
  </div>
  <div className="mt-2 text-sm text-gray-600">
    Tip: click a bar to open filtered Transactions.
  </div>
</SectionCard>

        </div>

        {/* C. Recommendations */}
        <SectionCard title="Behavior Recommendations">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recs.map((r, i) => (
              <div key={i} className="rounded-2xl border border-soft p-4">
                <div className="font-medium">{r.title}</div>
                <div className="mt-1 text-sm text-gray-600">{r.desc}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.tags.map(t => <span key={t} className="rounded-full bg-cream px-2 py-0.5 text-xs">{t}</span>)}
                </div>
                <div className="mt-3">
                  <button className="btn-primary" onClick={r.onClick}>Do this</button>
                </div>
              </div>
            ))}
            {recs.length === 0 && (
              <div className="rounded-xl border border-soft bg-cream p-6 text-center text-gray-600">
                No suggestions right now—great job keeping things steady!
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Drawer (used by any “View Details”) */}
      <Drawer
        open={drawer.open}
        title={drawer.title}
        onClose={() => setDrawer({ open: false, title: '' })}
      >
        {drawer.content ?? <div className="text-gray-600">Details coming soon.</div>}
      </Drawer>
    </AppLayout>
  )
}
