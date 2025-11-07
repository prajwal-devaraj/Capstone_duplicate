import OBShell from '@/components/onboarding/OBShell'
import OBProgress from '@/components/onboarding/OBProgress'
import Pill from '@/components/ui/Pill'
import { PrimaryCTA, LinkCTA } from '@/components/ui/CTA'
import { setOnboarding } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const defaults = ['Rent', 'Phone', 'Internet', 'Subscriptions', 'Others']
const otherOptions = ['Groceries', 'Insurance', 'Tuition', 'Medical', 'Childcare']

type BillData = {
  label: string
  amount: string
  day: string
}

export default function BillsOB() {
  const [chosen, setChosen] = useState<string[]>([])
  const [otherChosen, setOtherChosen] = useState<string[]>([])
  const [billValues, setBillValues] = useState<Record<string, BillData>>({})
  const [customBills, setCustomBills] = useState<BillData[]>([])
  const [customLabel, setCustomLabel] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [customDay, setCustomDay] = useState('1')
  const [activeBill, setActiveBill] = useState<null | { label: string }>(null)

  const nav = useNavigate()
  const numDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString())

  // ✅ Handle clicking any pill (main or other)
  function handleBillPill(x: string) {
    if (x === 'Others') {
      // Just expand more options, don't open popup
      if (!chosen.includes('Others')) {
        setChosen(c => [...c, 'Others'])
      }
      return
    }

    // Otherwise, open popup for details
    setActiveBill({ label: x })
    const d = billValues[x]
    setCustomLabel(x)
    setCustomAmount(d?.amount ?? '')
    setCustomDay(d?.day ?? '1')

    // Add to selection if not already present
    if (defaults.includes(x) && !chosen.includes(x)) {
      setChosen(c => [...c, x])
    }
    if (otherOptions.includes(x) && !otherChosen.includes(x)) {
      setOtherChosen(o => [...o, x])
    }
  }

  // ✅ Save popup data
  function savePopup() {
    if (!customLabel.trim() || !customAmount.trim() || !customDay.trim()) return
    setBillValues(v => ({
      ...v,
      [customLabel]: { label: customLabel, amount: customAmount, day: customDay }
    }))
    if (defaults.includes(customLabel) && !chosen.includes(customLabel)) {
      setChosen(c => [...c, customLabel])
    }
    if (otherOptions.includes(customLabel) && !otherChosen.includes(customLabel)) {
      setOtherChosen(o => [...o, customLabel])
    }
    setActiveBill(null)
    setCustomLabel('')
    setCustomAmount('')
    setCustomDay('1')
  }

  // ✅ Add custom (typed) bill
  function handleAddCustom() {
    if (!customLabel.trim() || !customAmount.trim() || !customDay.trim()) return
    setCustomBills(bills => [
      ...bills,
      { label: customLabel.trim(), amount: customAmount, day: customDay }
    ])
    setBillValues(vals => ({
      ...vals,
      [customLabel]: { label: customLabel.trim(), amount: customAmount, day: customDay }
    }))
    setCustomLabel('')
    setCustomAmount('')
    setCustomDay('1')
  }

  // ✅ Remove custom bill
  function handleRemoveCustom(label: string) {
    setCustomBills(bills => bills.filter(b => b.label !== label))
    setBillValues(vals => {
      const copy = { ...vals }
      delete copy[label]
      return copy
    })
  }

  // ✅ Finish onboarding
  function handleFinish() {
    setOnboarding('done')
    nav('/login')
  }

  return (
    <OBShell>
      <OBProgress step={3} />
      <h1 className="mb-5 text-center text-3xl font-bold leading-tight md:text-4xl">
        Any regular bills we should plan for?
      </h1>

      {/* Default bill options */}
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        {defaults.map(x => (
          <Pill
            key={x}
            active={chosen.includes(x)}
            onClick={() => handleBillPill(x)}
          >
            {x}
            {billValues[x]?.amount && (
              <span className="ml-1 text-xs text-gray-600">
                (${billValues[x].amount}), Day {billValues[x].day}
              </span>
            )}
          </Pill>
        ))}
      </div>

      {/* "Others" additional options */}
      {chosen.includes('Others') && (
        <div className="mx-auto mt-4 max-w-sm flex flex-col items-center">
          <div className="mb-2 text-sm text-gray-700">
            Select additional bill types:
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mb-3">
            {otherOptions.map(opt => (
              <Pill
                key={opt}
                active={otherChosen.includes(opt)}
                onClick={() => handleBillPill(opt)}
              >
                {opt}
                {billValues[opt]?.amount && (
                  <span className="ml-1 text-xs text-gray-600">
                    (${billValues[opt].amount}), Day {billValues[opt].day}
                  </span>
                )}
              </Pill>
            ))}
          </div>

          {/* Add completely custom bill */}
          <div className="w-full flex flex-col gap-1 mb-2">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1 text-sm"
                type="text"
                placeholder="Other bill type"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
              />
              <input
                className="w-20 rounded border px-2 py-1 text-sm"
                type="number"
                min={0}
                placeholder="Amount"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
              />
              <select
                className="w-20 rounded border px-2 py-1 text-sm"
                value={customDay}
                onChange={e => setCustomDay(e.target.value)}
              >
                {numDays.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                className="px-3 py-1 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium text-sm"
                type="button"
                onClick={handleAddCustom}
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {customBills.map(bill => (
                <span
                  key={bill.label}
                  className="inline-flex items-center rounded bg-orange-50 border border-orange-200 px-2 py-1 text-sm text-orange-900"
                >
                  {bill.label} (${bill.amount}) Day {bill.day}
                  <button
                    className="ml-1 text-orange-700 focus:outline-none"
                    onClick={() => handleRemoveCustom(bill.label)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup for entering amount and day */}
      {activeBill && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl p-5 shadow-md min-w-[320px]">
            <h2 className="mb-3 text-lg font-semibold">
              Enter details for {activeBill.label}
            </h2>
            <div className="flex flex-col gap-3">
              <input
                className="rounded border px-3 py-2 text-sm"
                type="number"
                min={0}
                placeholder="Amount"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                autoFocus
              />
              <select
                className="rounded border px-3 py-2 text-sm"
                value={customDay}
                onChange={e => setCustomDay(e.target.value)}
              >
                {numDays.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="flex gap-3 justify-end mt-2">
                <button
                  className="px-4 py-1 rounded bg-brand-500 text-white hover:bg-brand-600"
                  type="button"
                  onClick={savePopup}
                >
                  Save
                </button>
                <button
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  type="button"
                  onClick={() => setActiveBill(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer navigation */}
     
      <div className="mx-auto mt-6 max-w-sm">
        <PrimaryCTA onClick={handleFinish}>Finish</PrimaryCTA>
      </div>
      <div className="mt-2">
        <LinkCTA onClick={() => nav('/onboarding/pay-cadence')}>
          Back
        </LinkCTA>
      </div>
    </OBShell>
  )
}
