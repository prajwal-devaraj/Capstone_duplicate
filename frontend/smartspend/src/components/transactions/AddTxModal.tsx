import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { Transaction as Tx, Mood, NWG } from '@/lib/types'


type Kind = Tx['type']


const days = Array.from({ length: 31 }, (_, i) => String(i + 1))
const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const moodOptions: Mood[] = ['happy', 'neutral','sad']



export default function AddTxModal({
  kind,
  initialData, // <-- new prop
  onClose,
  onSaveTransaction,
  onSaveBill,
}: {
  kind: Kind
  initialData?: Tx
  onClose: () => void
  onSaveTransaction: (tx: Tx) => void
  onSaveBill: (bill: any) => void
}){
  const now = useMemo(() => new Date(), [])
  const [step, setStep] = useState<1|2|3|4|5|6|7>(1)
 const [amountInput, setAmountInput] = useState(
  initialData ? String(initialData.amount) : '0'
);
  const [nwg, setNWG] = useState<NWG | null>(initialData?.nwg || null);
  const [recurrence, setRecurrence] = useState<'yes'|'no'|null>(null)
  const [payDate, setPayDate] = useState<string>('')
 const [time, setTime] = useState('');
 const [payDay, setPayDay] = useState(initialData?.payDay || '');
const [merchant, setMerchant] = useState(initialData?.merchant || '');

  const [mood, setMood] = useState<Mood>('neutral')
  const [showDateModal, setShowDateModal] = useState(false)
  const [showDayModal, setShowDayModal] = useState(false)
  const [err, setErr] = useState('')
  const [addMore, setAddMore] = useState(false)
const singlePage =
  kind === 'expense' &&
  ((nwg === 'Need' && recurrence === 'no') || nwg === 'Guilt' || nwg === 'Want');
  const amount = Number(amountInput)


  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 1) val = val.replace(/^0+/, '') 
    setAmountInput(val === '' ? '0' : val)
  }


  // NWG selection handler
  const handleNWG = (value: string) => {
    setNWG(value as NWG)
    if (value === 'Need') setStep(3)
    else setShowDateModal(true)
  }


  const handleRecurrence = (value: 'yes'|'no') => {
    setRecurrence(value)
    setShowDateModal(true)
    setStep(value === 'yes' ? 4 : 5)
  }


// For recurring bills (recurrence: yes, "Need")
const handleRecurringDayPicked = (d: string) => {
  setPayDate(d)
  setShowDateModal(false)
setShowDayModal(true)
  const bill = {
    id: crypto.randomUUID(),
    name: merchant || 'Bill',
    amount,
   
    nwg,
    payDate: d,
    payDay,
    recurrence: true,
    status: 'active',
    mood,
  }
  onSaveBill(bill)
  if (addMore) resetForm()
  else onClose()
}


// For normal expense/income 
const handleSaveExpense = () => {
  if (!amount || amount <= 0) return setErr('Amount must be greater than 0.')
  if (kind === 'expense' && !nwg) return setErr('Select Need, Want, or Guilt.')
  if (kind === 'expense' && !payDate) return setErr('Select a date.')
  if (kind === 'expense' && !payDay) return setErr('Select a weekday.')
  if (!merchant.trim()) return setErr('Enter merchant.')

  
  setErr('')
  onSaveTransaction({
    id: crypto.randomUUID(),
    type: kind,
    amount,
    occurred_at: now.toISOString(),
    merchant,
    time,
    nwg: kind === 'income' ? null : nwg,
    late_night: false,
 payDay,
    mood,
    note: '',
  })
    if (addMore) resetForm()
  else onClose()
}



  const handleDayPicked = (d: string) => {
    setPayDate(d)
    setShowDateModal(false)
setShowDayModal(true)
    setStep(6)
  }


  const handleWeekDayPicked = (d: string) => {
    setPayDay(d)
    setShowDayModal(false)
    setStep(6)
  }


  const resetForm = () => {
    setAmountInput('0')
    setNWG(null)
    setRecurrence(null)
    setPayDate('')
    setPayDay('')
    setMerchant('')
    
    setMood('neutral')
    setStep(1)
  }


  return (
    <div
      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-soft bg-white p-5 shadow-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Add {kind === 'expense' ? 'Expense' : 'Income'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm hover:bg-gray-100"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>


        {err && (
          <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        )}


        {/* === EXPENSE FLOW === */}
        {kind === 'expense' ? (
  singlePage ? (
    <form
    onSubmit={e => {
      e.preventDefault();
      handleSaveExpense();
    }}
    className="grid gap-3"
  >
    <Select
      label="Pay Date"
      value={payDate}
      onChange={e => setPayDate(e.target.value)}
    >
      <option value="" disabled>Select pay date</option>
      {days.map(d => <option key={d} value={d}>{d}</option>)}
    </Select>
    <Select
      label="Day of Week"
      value={payDay}
      onChange={e => setPayDay(e.target.value)}
    >
      <option value="" disabled>Select day</option>
      {weekDays.map(d => <option key={d} value={d}>{d}</option>)}
    </Select>
    <Input
  label="Time"
  type="time"
  value={time}
  onChange={e => setTime(e.target.value)}
/>

    <Input
      label="Merchant"
      value={merchant}
      onChange={e => setMerchant(e.target.value)}
    />
    <Input
      label="Amount"
      type="text"
      inputMode="numeric"
      value={amountInput}
      onChange={handleAmountChange}
    />
    <Select
      label="Mood"
      value={mood}
      onChange={e => setMood(e.target.value as Mood)}
    >
      {moodOptions.map(m => (
        <option key={m} value={m}>{m}</option>
      ))}
    </Select>

    <div className="mt-4 flex items-center justify-between">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={addMore}
          onChange={e => setAddMore(e.target.checked)}
        />
        Save & add another
      </label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Save
        </button>
      </div>
    </div>
  </form>
  ) : (
          <div className="grid gap-3">
            {step === 1 && (
              <>
                <Input
                  label="Amount"
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={handleAmountChange}
                  autoFocus
                />
                <button
                  className="btn-primary mt-2"
                  disabled={amount <= 0}
                  onClick={() =>
                    amount > 0 ? setStep(2) : setErr("Amount must be greater than 0.")
                  }
                >
                  Next
                </button>
              </>
            )}


            {step === 2 && (
              <Select
                label="N/W/G"
                value={nwg || ''}
                onChange={e => handleNWG(e.target.value)}
                autoFocus
              >
                <option value="" disabled>
                  Select Need / Want / Guilt
                </option>
                <option value="Need">Need</option>
                <option value="Want">Want</option>
                <option value="Guilt">Guilt</option>
              </Select>
            )}


            {step === 3 && nwg === 'Need' && (
              <div className="my-2">
                <div className="mb-3 text-sm">Does this expense recur?</div>
                <div className="flex gap-2">
                  <button
                    className={`btn ${
                      recurrence === 'yes' ? 'bg-brand-500 text-white' : 'border border-soft bg-white'
                    }`}
                    onClick={() => handleRecurrence('yes')}
                  >
                    Yes
                  </button>
                  <button
                    className={`btn ${
                      recurrence === 'no' ? 'bg-brand-500 text-white' : 'border border-soft bg-white'
                    }`}
                    onClick={() => handleRecurrence('no')}
                  >
                    No
                  </button>
                </div>
              </div>
            )}


            {step === 6 && (
              <>
                <Input
                  label="Merchant"
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  autoFocus
                />
              
                <Select label="Mood" value={mood} onChange={e => setMood(e.target.value as Mood)}>
                  {moodOptions.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>


                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={addMore}
                      onChange={e => setAddMore(e.target.checked)}
                    />
                    Save & add another
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={onClose} className="btn-ghost">
                      Cancel
                    </button>
                    <button onClick={handleSaveExpense} className="btn-primary">
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )) : (
          // === INCOME FLOW ===
          <div className="grid gap-3">
            <Input
              label="Amount"
              type="number"
              inputMode="decimal"
              value={amountInput}
              onChange={handleAmountChange}
              autoFocus
            />
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={addMore}
                  onChange={e => setAddMore(e.target.checked)}
                />
                Save & add another
              </label>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (amount > 0) {
                      onSaveTransaction({
                        id: crypto.randomUUID(),
                        type: 'income',
                        amount,
                        occurred_at: now.toISOString(),
                        merchant: merchant || 'Income',
                        
                        nwg: null,
                        time,
                        late_night: false,
                        mood,
                        note: '',
                      })
                      addMore ? resetForm() : onClose()
                    } else {
                      setErr('Amount must be greater than 0.')
                    }
                  }}
                  className="btn-primary"
                  disabled={!amount || amount <= 0}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}


        {/* === DATE MODALS === */}
        {showDateModal && recurrence === 'yes' && step === 4 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-xs w-full">
              <h2 className="mb-3 font-semibold text-center">
                Select recurring date (1–31):
              </h2>
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                {days.map(d => (
                  <button
                    key={d}
                    className={`p-2 rounded ${
                      payDate === d ? 'bg-orange-300 text-white' : 'hover:bg-orange-100'
                    }`}
                    onClick={() => handleRecurringDayPicked(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 text-xs text-gray-500 hover:underline w-full"
                onClick={() => {
                  setShowDateModal(false)
                  setStep(1)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}


        {showDateModal && (!recurrence || recurrence === 'no') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-xs w-full">
              <h2 className="mb-3 font-semibold text-center">Select pay date (1–31):</h2>
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                {days.map(d => (
                  <button
                    key={d}
                    className={`p-2 rounded ${
                      payDate === d ? 'bg-orange-300 text-white' : 'hover:bg-orange-100'
                    }`}
                    onClick={() => handleDayPicked(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 text-xs text-gray-500 hover:underline w-full"
                onClick={() => {
                  setShowDateModal(false)
                  setStep(1)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}


        {showDayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-xs w-full">
              <h2 className="mb-3 font-semibold text-center">Select day of week:</h2>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {weekDays.map(w => (
                  <button
                    key={w}
                    className={`p-2 rounded ${
                      payDay === w ? 'bg-brand-500 text-white' : 'hover:bg-orange-100'
                    }`}
                    onClick={() => handleWeekDayPicked(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 text-xs text-gray-500 hover:underline w-full"
                onClick={() => {
                  setShowDayModal(false)
                  setStep(1)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}