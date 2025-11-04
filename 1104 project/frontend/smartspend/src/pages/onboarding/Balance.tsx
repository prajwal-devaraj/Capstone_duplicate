import { useState } from 'react'
import OBShell from '@/components/onboarding/OBShell'
import OBProgress from '@/components/onboarding/OBProgress'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { PrimaryCTA } from '@/components/ui/CTA'
import { useNavigate } from 'react-router-dom'
import { setOnboarding } from '@/lib/auth'

export default function Balance() {
  const [amt, setAmt] = useState('0')
  const nav = useNavigate()

  // Handle numeric-only input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Allow only digits
    if (/^\d*$/.test(value)) {
      // Remove leading zeros except when value is "0"
      setAmt(value.replace(/^0+(?=\d)/, '') || '0')
    }
  }

  // Save balance and proceed
  const handleContinue = () => {
    localStorage.setItem('currentBalance', amt)
    setOnboarding('pay')
    nav('/onboarding/pay-cadence')
  }

  return (
    <OBShell>
      <OBProgress step={1} />

      <h1 className="mx-auto mb-5 max-w-2xl text-center text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
        What will be your income?
      </h1>

      <div className="mx-auto mb-7 w-full max-w-lg">
        <CurrencyInput
          value={amt}
          onChange={handleAmountChange}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <p className="mt-3 text-center text-sm text-gray-600">
          We’ll start tracking from here. You can update anytime.
        </p>
      </div>

      <div className="mx-auto w-full max-w-lg">
        <PrimaryCTA onClick={handleContinue}>
          Continue
        </PrimaryCTA>
      </div>
    </OBShell>
  )
}