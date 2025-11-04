import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import AdjustGoalModal from '@/components/goals/AdjustGoalModal'
import AchievementModal from '@/components/goals/AchievementModal'
import { achievements as SEED_ACH, runway as RUNWAY_SNAPSHOT } from '@/lib/mock'
import type { Achievement } from '@/lib/types'
import { Sparkles, Trophy, Target, Zap, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from 'recharts'

/* ---------- goal persistence ---------- */
const LS_GOAL_DAYS = 'smartspend.goal_days'
const loadGoal = () => {
  const raw = localStorage.getItem(LS_GOAL_DAYS)
  return raw ? Math.max(15, Math.min(90, Number(raw))) : (RUNWAY_SNAPSHOT.goal_days ?? 30)
}
const saveGoal = (n: number) => localStorage.setItem(LS_GOAL_DAYS, String(n))

/* ---------- synthetic runway history ---------- */
function buildRunwayHistory(days: number, psLift: number, length = 120) {
  // length=120 gives us enough for "All-time" view; we’ll slice per range
  const out: Array<{ d: string; regular: number; power: number }> = []
  const today = new Date()
  for (let i = length - 1; i >= 0; i--) {
    const t = new Date(today)
    t.setDate(t.getDate() - i)
    const noise = Math.sin(i / 3) * 1.2 + Math.cos(i / 5) * 0.8
    const reg = Math.max(1, Math.round(days + noise - (length - 1 - i) * 0.08))
    out.push({
      d: `${t.getMonth() + 1}/${t.getDate()}`,
      regular: reg,
      power: reg + psLift,
    })
  }
  return out
}

export default function GoalsPage() {
  const [params, setParams] = useSearchParams()

  // filters (URL aware)
  const urlRange = (params.get('range') as 'week' | 'month' | 'all' | null) ?? null
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>(urlRange ?? 'month')

  const snapshot = RUNWAY_SNAPSHOT
  const [goal, setGoal] = useState(loadGoal)
  const [openAdjust, setOpenAdjust] = useState(false)

  const [achievements] = useState<Achievement[]>(SEED_ACH as any)
  const [activeAch, setActiveAch] = useState<Achievement | null>(null)

  const currentRegular = snapshot.days_left_regular
  const powerSave = snapshot.days_left_power_save
  const psDelta = powerSave - currentRegular
  const pctToGoal = Math.max(0, Math.min(100, Math.round((currentRegular / goal) * 100)))

  // full history (120d), then slice based on timeRange
  const fullHistory = useMemo(
    () => buildRunwayHistory(currentRegular, psDelta, 120),
    [currentRegular, psDelta]
  )
  const displayedHistory = useMemo(() => {
    if (timeRange === 'week') return fullHistory.slice(-7)
    if (timeRange === 'month') return fullHistory.slice(-30)
    return fullHistory // 'all' (last 120d)
  }, [fullHistory, timeRange])

  // keep range in URL (nice for back/refresh)
  useEffect(() => {
    const next = new URLSearchParams(params)
    next.set('range', timeRange)
    setParams(next, { replace: true })
  }, [timeRange])

  useEffect(() => saveGoal(goal), [goal])

  const pill = (value: 'week' | 'month' | 'all', label: string) => (
    <button
      key={value}
      onClick={() => setTimeRange(value)}
      className={
        `rounded-xl border px-3 py-1.5 text-sm transition
         ${timeRange === value
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-soft bg-white hover:bg-cream'}`
      }
    >
      {label}
    </button>
  )

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-4">
        {/* Header + range pills */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Goals & Achievements</h1>
      
        </div>

        {/* Summary strip */}
        <div className="mb-4 rounded-2xl border border-soft bg-white p-4 shadow-card md:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-gray-600">Current runway goal</div>
              <div className="text-lg font-semibold">{goal} days</div>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-gray-600">You’re currently at</div>
              <div className="text-lg font-semibold">
                {currentRegular} days <span className="text-gray-600">(Regular)</span>
              </div>
              <div className="text-sm text-emerald-700">+{psDelta} with Power-Save</div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-cream p-3">
              <div>
                <div className="text-xs text-gray-600">Progress</div>
                <div className="text-lg font-semibold">{pctToGoal}% to goal</div>
              </div>
              <button
                onClick={() => setOpenAdjust(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-white hover:bg-brand-600"
              >
                <Target size={16} /> Adjust Goal
              </button>
            </div>
          </div>
        </div>

        {/* A. Goal tracker + chart */}
        <section className="mb-4 grid gap-4 lg:grid-cols-3">
          

          <div className="rounded-2xl border border-soft bg-white p-4 shadow-card lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-500" />
              <h3 className="font-semibold">
                Runway trend ({timeRange === 'week' ? 'last 7 days' : timeRange === 'month' ? 'last 30 days' : 'last 120 days'})
              </h3>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayedHistory} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E25D37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#E25D37" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="psFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" tickLine={false} />
                  <YAxis tickLine={false} width={30} />
                  <Tooltip />
                  <Area type="monotone" dataKey="regular" stroke="#E25D37" fill="url(#regFill)" />
                  <Area type="monotone" dataKey="power" stroke="#10B981" fill="url(#psFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* B. Achievements */}
        <section className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Trophy size={18} className="text-brand-500" />
            <h2 className="font-semibold">Achievements & Milestones</h2>
          </div>

          {achievements.length === 0 ? (
            <div className="rounded-2xl border border-soft bg-white p-6 text-center shadow-card">
              <Sparkles className="mx-auto mb-2 text-gray-400" />
              <p className="mb-2 text-lg font-medium">No achievements yet</p>
              <p className="text-gray-600">Log a few expenses and you’ll start earning badges quickly.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map(a => (
                <button
                  key={a.id}
                  onClick={() => setActiveAch(a)}
                  className="group rounded-2xl border border-soft bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full bg-cream px-2 py-1 text-xs text-gray-700">
                      🏆 Achievement
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-gray-700">
                      {new Date(a.earned_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-base font-semibold">{a.name}</div>
                  <div className="mt-1 text-sm text-gray-600">Unlocked on {new Date(a.earned_at).toDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* C. Bonus comparison chart */}
    
      </div>

      {/* Modals */}
      {openAdjust && (
        <AdjustGoalModal
          initial={goal}
          onClose={() => setOpenAdjust(false)}
          onSave={(n) => { setGoal(n); setOpenAdjust(false) }}
        />
      )}
      {activeAch && (
        <AchievementModal achievement={activeAch} onClose={() => setActiveAch(null)} />
      )}
    </AppLayout>
  )
}
