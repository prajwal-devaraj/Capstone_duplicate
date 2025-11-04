import OBShell from '@/components/onboarding/OBShell'
import OBProgress from '@/components/onboarding/OBProgress'
import Pill from '@/components/ui/Pill'
import { PrimaryCTA, LinkCTA } from '@/components/ui/CTA'
import { setOnboarding } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const opts = ['Weekly','Bi-weekly','Monthly']
const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const days = Array.from({ length: 31 }, (_, i) => String(i + 1))

export default function PayCadence() {
  const [sel, setSel] = useState<string | undefined>()
  const [scrollSel, setScrollSel] = useState<string | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const nav = useNavigate()

  // Open modal with the right options when a pill is clicked
  function handlePillClick(option: string) {
    setSel(option)
    setModalOpen(true)
  }

  let modalOpts: {label: string, options: string[]} = { label: '', options: [] }
  if (sel === 'Weekly') modalOpts = { label: 'Select your usual weekday:', options: weekDays }
  if (sel === 'Monthly' || sel === 'Bi-weekly') modalOpts = { label: 'Select your last pay date:', options: days }

  return (
    <OBShell>
      <OBProgress step={2} />
      <h1 className="mb-5 text-center text-3xl font-bold leading-tight md:text-4xl">
        How often do you usually get paid?
      </h1>
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        {opts.map(o => (
          <Pill 
            key={o}
            active={sel === o}
            onClick={() => handlePillClick(o)}
          >
            {o}
          </Pill>
        ))}
      </div>

      {/* Modal Popup for ALL selections */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 max-w-xs mx-auto">
            <h2 className="mb-4 text-center text-lg font-semibold">{modalOpts.label}</h2>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {modalOpts.options.map(opt => (
                <button
                  key={opt}
                  className={`px-3 py-2 rounded ${scrollSel === opt ? "bg-orange-100 font-semibold" : "hover:bg-orange-50"}`}
                  onClick={() => {
                    setScrollSel(opt)
                    setModalOpen(false)
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button className="mt-4 text-xs text-gray-500 hover:underline w-full" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary of user's selection */}
      {sel && scrollSel && (
        <div className="mx-auto mt-4 max-w-xs text-center text-sm text-green-700">
          {sel === "Weekly" ? <>Pay day: {scrollSel}</> : <>Pay date: {scrollSel}</>}
        </div>
      )}

      <p className="mx-auto mt-4 max-w-sm text-center text-sm text-gray-600">Used to forecast income rhythm.</p>
      <div className="mx-auto mt-6 max-w-sm">
        <PrimaryCTA
          disabled={!sel || !scrollSel}
          onClick={() => {
            setOnboarding('bills')
            nav('/onboarding/bills')
          }}
        >
          Continue
        </PrimaryCTA>
        <div className="mt-1 text-center text-sm text-gray-500">
          You can change this later.
        </div>
      </div>
      <div className="mt-2">
        <LinkCTA onClick={() => nav('/onboarding/balance')}>
          Back
        </LinkCTA>
      </div>
    </OBShell>
  )
}
