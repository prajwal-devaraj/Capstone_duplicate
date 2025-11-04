import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import AddTxModal from '@/components/transactions/AddTxModal'
import type { Transaction as Tx, Mood, NWG } from '@/lib/types'
import { transactions as SEED, categories as CATEGORY_OBJECTS } from '@/lib/mock'
import {
  Search, CalendarDays, ChevronDown, Moon, SlidersHorizontal, Trash2, X,
  Filter as FilterIcon
} from 'lucide-react'


const LS_KEY = 'smartspend.txns'


function loadTxns(): Tx[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as Tx[]
  } catch {}
  return SEED.slice()
}


function saveTxns(list: Tx[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch {}
}


const CATEGORY_NAMES: string[] = Array.from(
  new Set([
    ...CATEGORY_OBJECTS.map(c => c.name),
 
    'Income',
  ])
).sort((a, b) => a.localeCompare(b))


type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
type DatePreset = '7d' | '30d' | '90d' | 'all'
const MOODS: Mood[] = ['happy', 'neutral', 'stressed', 'impulse']
const NWGS: NWG[] = ['Need', 'Want', 'Guilt']


const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)


function parseNumber(v: string | null): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}


function dateFromPreset(preset: DatePreset): Date | undefined {
  const now = new Date()
  if (preset === 'all') return undefined
  const d = new Date(now)
  if (preset === '7d') d.setDate(d.getDate() - 7)
  if (preset === '30d') d.setDate(d.getDate() - 30)
  if (preset === '90d') d.setDate(d.getDate() - 90)
  return d
}


export default function Transactions() {
  const [params, setParams] = useSearchParams()
  const [all, setAll] = useState<Tx[]>(() => loadTxns())
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState<string>(params.get('category') ?? '')
  const [nwg, setNWG] = useState<NWG | ''>((params.get('nwg') as NWG) ?? '')
  const [mood, setMood] = useState<Mood | ''>((params.get('mood') as Mood) ?? '')
  const [type, setType] = useState<'' | 'expense' | 'income'>((params.get('type') as 'expense' | 'income') ?? '')
  const [lateNight, setLateNight] = useState<boolean>(params.get('late') === 'true')
  const [min, setMin] = useState<number | undefined>(parseNumber(params.get('min')))
  const [max, setMax] = useState<number | undefined>(parseNumber(params.get('max')))
  const [datePreset, setDatePreset] = useState<DatePreset>((params.get('date') as DatePreset) ?? '30d')
  const [sort, setSort] = useState<SortKey>((params.get('sort') as SortKey) ?? 'date_desc')
  const [filtersOpen, setFiltersOpen] = useState<boolean>(params.get('f') !== '0')
  const [openKind, setOpenKind] = useState<null | 'expense' | 'income'>(null)


  useEffect(() => {
    const next = new URLSearchParams()
    if (filtersOpen === false) next.set('f', '0')
    if (query) next.set('q', query)
    if (category) next.set('category', category)
    if (nwg) next.set('nwg', nwg)
    if (mood) next.set('mood', mood)
    if (type) next.set('type', type)
    if (lateNight) next.set('late', 'true')
    if (min != null && !Number.isNaN(min)) next.set('min', String(min))
    if (max != null && !Number.isNaN(max)) next.set('max', String(max))
    if (datePreset) next.set('date', datePreset)
    if (sort) next.set('sort', sort)
    setParams(next, { replace: true })
  }, [
    filtersOpen, query, category, nwg, mood, type,
    lateNight, min, max, datePreset, sort, setParams
  ])


  const filtered = useMemo(() => {
    const after = dateFromPreset(datePreset)?.getTime()
    const q = query.trim().toLowerCase()
    let list = all.slice()
    if (after) list = list.filter(t => new Date(t.occurred_at).getTime() >= after)
    if (type) list = list.filter(t => t.type === type)
 
    if (nwg) list = list.filter(t => t.nwg === nwg)
    if (mood) list = list.filter(t => t.mood === mood)
    if (lateNight) list = list.filter(t => t.late_night)
    if (min != null) list = list.filter(t => t.amount >= min)
    if (max != null) list = list.filter(t => t.amount <= max)
    if (q) list = list.filter(t => (`${t.merchant} ${t.note ?? ''}`).toLowerCase().includes(q))
    switch (sort) {
      case 'date_desc': list.sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)); break
      case 'date_asc': list.sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at)); break
      case 'amount_desc': list.sort((a, b) => b.amount - a.amount); break
      case 'amount_asc': list.sort((a, b) => a.amount - b.amount); break
    }
    return list
  }, [all, query, category, nwg, mood, type, lateNight, min, max, datePreset, sort])


  const totals = useMemo(() => {
    let exp = 0, inc = 0
    filtered.forEach(t => (t.type === 'expense' ? (exp += t.amount) : (inc += t.amount)))
    return { expenses: exp, income: inc, net: inc - exp }
  }, [filtered])


  function handleSave(tx: Tx) {
    const next = [tx, ...all]
    saveTxns(next)
    setAll(next)
    setOpenKind(null)
    const prevBalance = Number(localStorage.getItem('currentBalance')) || 0
    let newBalance = prevBalance
    if (tx.type === 'expense') {
      newBalance -= tx.amount
    } else if (tx.type === 'income') {
      newBalance += tx.amount
    }
    localStorage.setItem('currentBalance', String(newBalance))
  }


  // Just closes modal + logs
  function handleSaveBill(bill: any) {
    console.log('Bill saved from modal:', bill)
    setOpenKind(null)
    // If you want to also save bills, implement that logic here
  }
function deleteTx(id: string) {
    const txToRemove = all.find(t => t.id === id)
    if (!txToRemove) return
    const updated = all.filter(t => t.id !== id)
    saveTxns(updated)
    setAll(updated)
    let newBalance = Number(localStorage.getItem('currentBalance')) || 0
    if (txToRemove.type === 'expense') {
      newBalance += txToRemove.amount
    } else if (txToRemove.type === 'income') {
      newBalance -= txToRemove.amount
    }
    localStorage.setItem('currentBalance', String(newBalance))
  }
  const clearAll = () => {
    setQuery(''); setCategory(''); setNWG(''); setMood(''); setType('');
    setLateNight(false); setMin(undefined); setMax(undefined);
    setDatePreset('30d'); setSort('date_desc')
  }
  const activeChips: Array<{ k: string; v: string; clear: () => void }> = []
  if (query) activeChips.push({ k: 'q', v: `"${query}"`, clear: () => setQuery('') })
  if (category) activeChips.push({ k: 'category', v: category, clear: () => setCategory('') })
  if (nwg) activeChips.push({ k: 'nwg', v: nwg, clear: () => setNWG('') })
  if (mood) activeChips.push({ k: 'mood', v: mood, clear: () => setMood('') })
  if (type) activeChips.push({ k: 'type', v: type, clear: () => setType('') })
  if (lateNight) activeChips.push({ k: 'late-night', v: 'yes', clear: () => setLateNight(false) })
  if (min != null) activeChips.push({ k: 'min', v: `$${min}`, clear: () => setMin(undefined) })
  if (max != null) activeChips.push({ k: 'max', v: `$${max}`, clear: () => setMax(undefined) })
  if (datePreset && datePreset !== '30d')
    activeChips.push({ k: 'date', v: datePreset, clear: () => setDatePreset('30d') })


  return (
    <AppLayout>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 py-4 sm:px-4">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenKind('income')}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-500 bg-white px-4 py-2 text-sm font-medium text-brand-600 shadow-sm hover:bg-brand-50 transition"
          >+ Income</button>
          <button onClick={() => setOpenKind('expense')} className="btn-primary">+ Expense</button>
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-4">
        {/* FILTER PANEL (collapsible) */}
        <div className="rounded-2xl border border-soft bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-4 py-3 md:px-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FilterIcon size={16} />
              Filters
              {activeChips.length > 0 && (
                <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs text-gray-700">
                  {activeChips.length} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeChips.length > 0 && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 rounded-xl border border-soft bg-cream px-3 py-1.5 text-sm hover:bg-white"
                >
                  <Trash2 size={14} /> Clear all
                </button>
              )}
              <button
                onClick={() => setFiltersOpen(o => !o)}
                className="inline-flex items-center gap-2 rounded-xl border border-soft bg-white px-3 py-1.5 text-sm hover:bg-cream"
              >
                <SlidersHorizontal size={16} />
                {filtersOpen ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>


          <div
            className={`grid grid-cols-12 gap-3 px-4 pb-4 pt-3 transition-[grid-template-rows,padding] duration-200 ease-out md:gap-4 md:px-5 ${
              filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] pb-0'
            }`}
          >
            <div className="col-span-12 overflow-hidden">
              <div className="grid grid-cols-12 gap-3 md:gap-4">
                {/* Search */}
                <div className="col-span-12 lg:col-span-4">
                  <label className="mb-1 block text-xs text-gray-600">Search</label>
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Merchant or note"
                      className="w-full rounded-xl border border-soft bg-cream pl-9 pr-3 py-2"
                    />
                  </div>
                </div>


                {/* Category */}
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <label className="mb-1 block text-xs text-gray-600">Category</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-soft bg-white px-3 py-2 pr-8"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">All</option>
                      {CATEGORY_NAMES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>


                {/* N/W/G */}
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <label className="mb-1 block text-xs text-gray-600">N/W/G</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-soft bg-white px-3 py-2 pr-8"
                      value={nwg}
                      onChange={(e) => setNWG(e.target.value as NWG | '')}
                    >
                      <option value="">All</option>
                      {NWGS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>


                {/* Mood */}
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <label className="mb-1 block text-xs text-gray-600">Mood</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-soft bg-white px-3 py-2 pr-8"
                      value={mood}
                      onChange={(e) => setMood(e.target.value as Mood | '')}
                    >
                      <option value="">All</option>
                      {MOODS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>


                {/* Type */}
                <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                  <label className="mb-1 block text-xs text-gray-600">Type</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-soft bg-white px-3 py-2 pr-8"
                      value={type}
                      onChange={(e) => setType(e.target.value as 'expense'|'income'|'')}
                    >
                      <option value="">All</option>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>


                {/* Late-night */}
                <div className="col-span-6 sm:col-span-4 lg:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => setLateNight(!lateNight)}
                    className={`inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 ${
                      lateNight ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-soft bg-white'
                    }`}
                    title="Occurred after 10pm"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Moon size={16} /> Late-night
                    </span>
                    <span className={`h-5 w-9 rounded-full p-0.5 transition ${lateNight ? 'bg-brand-500' : 'bg-gray-300'}`}>
                      <span className={`block h-4 w-4 rounded-full bg-white transition ${lateNight ? 'translate-x-4' : ''}`} />
                    </span>
                  </button>
                </div>


                {/* Min / Max */}
                <div className="col-span-6 sm:col-span-3 lg:col-span-3">
                  <label className="mb-1 block text-xs text-gray-600">Min $</label>
                  <input
                    type="number"
                    value={min ?? ''}
                    onChange={(e) => setMin(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full rounded-xl border border-soft bg-white px-3 py-2"
                    min={0}
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 lg:col-span-3">
                  <label className="mb-1 block text-xs text-gray-600">Max $</label>
                  <input
                    type="number"
                    value={max ?? ''}
                    onChange={(e) => setMax(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full rounded-xl border border-soft bg-white px-3 py-2"
                    min={0}
                  />
                </div>


                {/* Date segmented */}
                <div className="col-span-12 lg:col-span-4">
                  <label className="mb-1 block text-xs text-gray-600">Date</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['7d','30d','90d','all'] as const).map(preset => (
                      <button
                        key={preset}
                        onClick={() => setDatePreset(preset)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${
                          datePreset === preset ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-soft bg-white'
                        }`}
                      >
                        <CalendarDays size={14} />
                        {preset === '7d' && '7d'}
                        {preset === '30d' && '30d'}
                        {preset === '90d' && '90d'}
                        {preset === 'all' && 'All'}
                      </button>
                    ))}
                  </div>
                </div>


                {/* Sort */}
                <div className="col-span-12 lg:col-span-4">
                  <label className="mb-1 block text-xs text-gray-600">Sort</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-soft bg-white px-3 py-2 pr-8"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                    >
                      <option value="date_desc">Date ↓</option>
                      <option value="date_asc">Date ↑</option>
                      <option value="amount_desc">Amount ↓</option>
                      <option value="amount_asc">Amount ↑</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>


              {/* Active chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeChips.map((c) => (
                  <span
                    key={c.k}
                    className="inline-flex items-center gap-2 rounded-full border border-soft bg-cream px-3 py-1 text-xs"
                  >
                    {c.k}: {c.v}
                    <button aria-label="clear filter" onClick={c.clear}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>




        {/* SUMMARY */}
        <div className="mt-3 rounded-2xl border border-soft bg-white px-4 py-3 text-sm shadow-card md:px-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>Expenses: <span className="font-semibold text-red-600">{fmtCurrency(totals.expenses)}</span></div>
            <div>Income: <span className="font-semibold text-emerald-700">+{fmtCurrency(totals.income)}</span></div>
            <div>Net: <span className={`font-semibold ${totals.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {totals.net >= 0 ? '+' : ''}{fmtCurrency(totals.net)}
            </span></div>
          </div>
        </div>


       <div className="mt-3 overflow-hidden rounded-2xl border border-soft bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-cream/60">
           
  <tr className="text-left text-gray-600">
    <th className="px-4 py-3">Date</th>
    <th className="px-4 py-3">Day</th>
    <th className="px-4 py-3">Merchant</th>
    
    <th className="px-4 py-3">N-W-G</th>
    <th className="px-4 py-3">Amount</th>
    <th className="px-4 py-3">Mood</th>
    <th className="px-4 py-3">Status</th>
    <th className="px-2 py-3 text-right">Actions</th>
  </tr>
</thead>


            
            <tbody>
  {filtered.map(t => {
    // Use t.payDay, t.occurred_at, t.merchant, t.category, etc.
    const occurredDate = t.occurred_at ? new Date(t.occurred_at) : null
    const dateStr = occurredDate ? occurredDate.toLocaleDateString() : '—'
    const weekDay = occurredDate ? occurredDate.toLocaleDateString(undefined, { weekday: 'long' }) : (t.payDay ?? '—')
    return (
      <tr key={t.id} className="border-t border-soft">
        <td className="px-4 py-3">{dateStr}</td>
        <td className="px-4 py-3">{weekDay}</td>
        <td className="px-4 py-3">{t.merchant}</td>
        
        <td className="px-4 py-3">{t.nwg ?? '—'}</td>
        <td className="px-4 py-3">{fmtCurrency(t.amount)}</td>
        <td className="px-4 py-3">{t.mood ?? '—'}</td>
        <td className="px-4 py-3">
          <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700">
            Active
          </span>
        </td>
        <td className="px-2 py-3 text-right">
          <button
            className="rounded-lg px-2 py-1 hover:bg-cream text-blue-600"
            title="Edit transaction"
            onClick={() => {
              // setEditTx(t) or your editing logic
              console.log('Edit transaction:', t)
            }}
          >
            Edit
          </button>
        </td>
      </tr>
    )
  })}
  {filtered.length === 0 && (
    <tr>
      <td colSpan={9} className="px-4 py-8 text-center text-gray-600">
        No matches. Try clearing filters.
      </td>
    </tr>
  )}
</tbody>


          </table>
        </div>
      </div>
      {openKind && (
        <AddTxModal
          kind={openKind}
          onClose={() => setOpenKind(null)}
          onSaveTransaction={handleSave}
          onSaveBill={handleSaveBill}
        />
      )}
    </AppLayout>
  )
} 