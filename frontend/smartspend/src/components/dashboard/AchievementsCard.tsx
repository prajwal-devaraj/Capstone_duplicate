import { useNavigate } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/Card'
import { achievements } from '@/lib/mock'

export default function AchievementsCard() {
  const navigate = useNavigate()
  const latest = achievements[0]

  return (
    <Card>
      <CardTitle>Achievements</CardTitle>
      <div className="text-sm">
        <div>🏆 <span className="font-medium">{latest.name}</span></div>
        <button
          className="mt-3 w-full rounded-2xl border border-soft bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors"
          onClick={() => navigate('/goals')}
        >
          View all
        </button>
      </div>
    </Card>
  )
}
