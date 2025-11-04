import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatCurrency } from '@/lib/format'
import { bills, runway, transactions } from '@/lib/mock'

// Helper that ONLY reads the original balance set at onboarding/reset
function getOriginalBalance(): number {
  return Number(localStorage.getItem('smartspend.original_balance')) || 1
}

// Custom hook: useCurrentBalance stays in sync with localStorage
function useCurrentBalance(): number {
  const [balance, setBalance] = useState(() =>
    Number(localStorage.getItem('currentBalance')) || 0
  )
  useEffect(() => {
    function update() {
      setBalance(Number(localStorage.getItem('currentBalance')) || 0)
    }
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
    }
  }, [])
  return balance
}

function loadBills() {
  try {
    const raw = localStorage.getItem('smartspend.bills')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function BalanceCard() {
  const navigate = useNavigate()

  const balance = useCurrentBalance()
  const [bills, setBills] = useState(() => loadBills())

  // Update bills when localStorage changes (react to edits in /bills)
  useEffect(() => {
    function update() {
      setBills(loadBills())
    }
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
    }
  }, [])

  // Only count active bills
  const billsTotal = bills
    .filter((b: any) => (b.status ?? 'active') !== 'paused')
    .reduce((s: number, b: any) => s + b.amount, 0)
  const afterBills = balance - billsTotal

  const originalBalance = getOriginalBalance()
 

const pctLeft = (balance / originalBalance) * 100

let barColor = 'bg-emerald-500'         // Green
if (pctLeft <= 10) {
  barColor = 'bg-red-500'              // Red for <=10%
} else if (pctLeft <= 20) {
  barColor = 'bg-orange-400'           // Orange for <=20%
} else if (pctLeft <= 50) {
  barColor = 'bg-blue-500'             // Blue for <=50%
}

  return (
    <div
      className="cursor-pointer transition-all hover:shadow-lg hover:border-brand-500 rounded-2xl"
      onClick={() => navigate('/transactions')}
      tabIndex={0}
      role="button"
      aria-label="Go to transactions"
      style={{ outline: 'none' }}
    >
      <Card>
        <CardTitle>Current Balance</CardTitle>
        <div className="text-3xl font-bold">{formatCurrency(balance)}</div>
        <p className="mt-1 text-sm text-gray-600">
          After upcoming bills: {formatCurrency(afterBills)}
        </p>
        <div className="mt-3">
          <ProgressBar value={balance} max={originalBalance} barColor={barColor} />
        </div>
      </Card>
    </div>
  )
}
// DaysLeftCard, DailyBurnCard, Next7DaysBurnCard remain unchanged
export function DaysLeftCard() {
  const balanceStr = localStorage.getItem('currentBalance') ?? String(runway.balance_cents / 100)
  const balance = Number(balanceStr) || 0

  const goalDaysRaw = localStorage.getItem('smartspend.goal_days')
  const goalDays = goalDaysRaw ? Number(goalDaysRaw) : (runway.goal_days ?? 30)

  const spent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0)

  const spentPct = balance ? (spent / balance) * 100 : 0
  const hasPowerSave = spentPct >= 65

  return (
    <Card>
      <CardTitle>Days Left</CardTitle>
      <div className="text-3xl font-bold">
        {goalDays} <span className="text-base font-medium text-gray-600 align-middle">today</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={goalDays} max={goalDays} />
      </div>
      {hasPowerSave && (
        <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
          <span>Power-Save</span>
          <span className="font-medium">{runway.days_left_power_save}</span>
        </div>
      )}
    </Card>
  )
}

export function DailyBurnCard() {
  const expenses = transactions.filter(t => t.type === 'expense').map(t => t.amount)
  const avg = expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0
  return (
    <Card>
      <CardTitle>Burn Rate</CardTitle>
      <div className="text-3xl font-bold">{formatCurrency(avg)}</div>
      <p className="mt-1 text-sm text-gray-600">Avg per spend day</p>
    </Card>
  )
}

export function Next7DaysBurnCard() {
  // get 7 most recent expenses
  const last7 = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 7)
    .map(t => t.amount)
  const avg = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0

  return (
    <Card>
      <CardTitle>Next 7 Days Burn Rate</CardTitle>
      <div className="text-3xl font-bold">{formatCurrency(avg)}</div>
      <p className="mt-1 text-sm text-gray-600">Avg last 7 spends</p>
    </Card>
  )
}
