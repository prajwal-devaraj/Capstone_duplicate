import { useNavigate } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/Card'
import { insights } from '@/lib/mock'

export default function InsightsPreview() {
  const top = insights[0]
  const navigate = useNavigate()

  return (
    <Card className="transition-all hover:shadow-lg hover:border-brand-500">
      <CardTitle>
        <span className="hover:text-brand-500 transition-colors">Insights</span>
      </CardTitle>
      <div className="text-sm">
        <div className="font-medium">{top.message}</div>
        <div className="mt-3">
          <button
            className="btn-ghost w-full hover:bg-cream hover:text-brand-700 transition-colors"
            onClick={() => navigate('/insights')}
          >
            See all Insights
          </button>
        </div>
      </div>
    </Card>
  )
}
