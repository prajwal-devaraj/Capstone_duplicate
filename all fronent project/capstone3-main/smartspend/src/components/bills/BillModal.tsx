import { useEffect, useMemo, useState } from 'react'
import type { Bill, NWG } from '@/lib/types'
import { categories as CATEGORY_OBJECTS } from '@/lib/mock'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'

type Cadence = 'monthly' | 'bi-weekly' | 'weekly' | 'custom'

type Draft = {
  id?: string
  name: string
  amount: number
  category: string
  nwg: NWG
  cadence: Cadence
  next_due: string // YYYY-MM-DD
  status: 'active' | 'paused'
  notes?: string
  // custom cadence controls
  custom_every?: number
  custom_unit?: 'days' | 'weeks' | 'months'
}

const CATEGORY_TO_NWG: Record<string, NWG> = CATEGORY_OBJECTS.reduce((acc, c) => {
  acc[c.name] = c.nwg
  return acc
}, {} as Record<string, NWG>)

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0) // noon to avoid DST edge cases
}

function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function addWeeks(d: Date, n: number) { return addDays(d, n * 7) }
function addMonths(d: Date, n: number) {
  const x = new Date(d); const day = x.getDate()
  x.setMonth(x.getMonth() + n)
  // if month overflowed (e.g., Jan 31 -> Mar 3), backtrack to last day
  while (x.getDate() < day) x.setDate(x.getDate() - 1)
  return x
}

function nextDatesFrom(anchor: Date, cadence: Cadence, opts?: { every?: number; unit?: 'days'|'weeks'|'months' }, count = 3) {
  const out: Date[] = []
  let cur = new Date(anchor)
  for (let i = 0; i < count; i++) {
    if (i === 0) out.push(new Date(cur))
    if (cadence === 'weekly') cur = addWeeks(cur, 1)
    else if (cadence === 'bi-weekly') cur = addWeeks(cur, 2)
    else if (cadence === 'monthly') cur = addMonths(cur, 1)
    else if (cadence === 'custom') {
      const every = opts?.every ?? 1
      const unit = opts?.unit ?? 'days'
      if (unit === 'days') cur = addDays(cur, every)
      if (unit === 'weeks') cur = addWeeks(cur, every)
      if (unit === 'months') cur = addMonths(cur, every)
    }
    if (i > 0) out.push(new Date(cur))
  }
  return out
}

export default function BillModal({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  initial?: Bill // if provided -> edit mode
  onClose: () => void
  onSave: (bill: Bill) => void
  onDelete?: (id: string) => void
}) {
  const editMode = !!initial
  const [draft, setDraft] = useState<Draft>(() => {
    const todayYMD = new Date().toISOString().slice(0, 10)
    if (initial) {
      return {
        id: initial.id,
        name: initial.name,
        amount: initial.amount,
        category: initial.category,
        nwg: initial.nwg,
        cadence: (initial.cadence as Cadence) ?? 'monthly',
        next_due: initial.next_due,
        status: (initial as any).status ?? 'active',
        notes: (initial as any).notes ?? '',
        custom_every: (initial as any).custom_every ?? undefined,
        custom_unit: (initial as any).custom_unit ?? undefined,
      }
    }
    return {
      name: '',
      amount: 0,
      category: 'Rent',
      nwg: CATEGORY_TO_NWG['Rent'] ?? 'Need',
      cadence: 'monthly',
      next_due: todayYMD,
      status: 'active',
      notes: '',
    }
  })
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  // auto NWG when category changes
  useEffect(() => {
    setDraft(d => ({ ...d, nwg: CATEGORY_TO_NWG[d.category] ?? d.nwg }))
  }, [draft.category]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewDates = useMemo(() => {
    const anchor = parseYMD(draft.next_due)
    return nextDatesFrom(anchor, draft.cadence, {
      every: draft.custom_every,
      unit: draft.custom_unit,
    }, 3)
  }, [draft.next_due, draft.cadence, draft.custom_every, draft.custom_unit])

  if (!open) return null

  const save = () => {
    if (!draft.name.trim()) return setError('Bill name is required.')
    if (!draft.amount || draft.amount <= 0) return setError('Amount must be greater than 0.')
    if (!draft.cadence) return setError('Cadence is required.')
    if (!draft.next_due) return setError('Next due date is required.')

    const out: Bill = {
      id: draft.id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      amount: Number(draft.amount),
      cadence: draft.cadence,
      next_due: draft.next_due,
      category: draft.category,
      nwg: draft.nwg,
      // non-core fields are kept as extensible props
      ...(draft.notes ? { notes: draft.notes } : {}),
      ...(draft.status ? { status: draft.status } : {}),
      ...(draft.cadence === 'custom'
        ? { custom_every: draft.custom_every ?? 1, custom_unit: draft.custom_unit ?? 'days' }
        : {}),
    } as any

    setError('')
    onSave(out)
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-soft bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{editMode ? 'Edit Bill' : 'Add Bill'}</h3>
          <button onClick={onClose} className="rounded-xl px-2 py-1 text-sm hover:bg-gray-100">Close</button>
        </div>

        {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-8">
            <Input label="Bill name" value={draft.name} onChange={(e)=>setDraft(d=>({...d, name:e.target.value}))}/>
          </div>
          <div className="col-span-12 sm:col-span-4">
            <Input label="Amount" type="number" inputMode="decimal" value={draft.amount} onChange={(e)=>setDraft(d=>({...d, amount:Number(e.target.value)}))}/>
          </div>

          <div className="col-span-12 sm:col-span-6">
            <Input label="Category" value={draft.category} onChange={(e)=>setDraft(d=>({...d, category:e.target.value}))}/>
          </div>
          <div className="col-span-12 sm:col-span-6">
            <Select label="N/W/G" value={draft.nwg} onChange={(e)=>setDraft(d=>({...d, nwg: e.target.value as NWG}))}>
              <option value="Need">Need</option>
              <option value="Want">Want</option>
              <option value="Guilt">Guilt</option>
            </Select>
          </div>

          <div className="col-span-12 sm:col-span-6">
            <Select label="Cadence" value={draft.cadence} onChange={(e)=>setDraft(d=>({...d, cadence: e.target.value as Cadence}))}>
              <option value="monthly">Monthly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          {draft.cadence === 'custom' && (
            <>
              <div className="col-span-6 sm:col-span-3">
                <Input label="Every" type="number" min={1} value={draft.custom_every ?? 1} onChange={(e)=>setDraft(d=>({...d, custom_every:Number(e.target.value||1)}))}/>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Select label="Unit" value={draft.custom_unit ?? 'days'} onChange={(e)=>setDraft(d=>({...d, custom_unit: (e.target.value as 'days'|'weeks'|'months')}))}>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </Select>
              </div>
            </>
          )}

          <div className="col-span-12 sm:col-span-6">
            <Input label="Next due" type="date" value={draft.next_due} onChange={(e)=>setDraft(d=>({...d, next_due:e.target.value}))}/>
          </div>
          <div className="col-span-12 sm:col-span-6">
            <Select label="Status" value={draft.status} onChange={(e)=>setDraft(d=>({...d, status: e.target.value as 'active'|'paused'}))}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </div>

          <div className="col-span-12">
            <Input label="Notes (optional)" value={draft.notes ?? ''} onChange={(e)=>setDraft(d=>({...d, notes:e.target.value}))}/>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-xl border border-soft bg-cream px-3 py-2 text-sm">
          <div className="font-medium">Next 3 dates:</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {previewDates.map((d, i)=>(
              <span key={i} className="rounded-full bg-white px-2 py-0.5">{fmtDate(d)}</span>
            ))}
            {draft.cadence === 'custom' && (
              <span className="text-gray-600">
                (repeats every {draft.custom_every ?? 1} {draft.custom_unit ?? 'days'})
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {editMode && onDelete ? (
            <button onClick={()=>onDelete(initial!.id)} className="text-red-600 hover:underline">Delete</button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
