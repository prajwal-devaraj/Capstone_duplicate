import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, DotProps
} from 'recharts'

export type BurnPoint = {
  day: string                
  spend: number
  flag?: 'late_night' | 'high_spend' | 'unusual'
  dateISO?: string           
  amount?: number
  localTime?: string       
}

type P = {
  data: BurnPoint[]
  onFlagClick?: (p: BurnPoint) => void
}

function FlagDot(props: DotProps & { payload?: any; onClick?: (p:any)=>void }) {
  const { cx, cy, payload, onClick } = props as any
  if (!payload?.flag) return null
  const color =
    payload.flag === 'late_night' ? '#ef4444' :
    payload.flag === 'high_spend' ? '#f59e0b' : '#fb7185'
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.75}
      fill={color}
      stroke="white"
      strokeWidth={1.5}
      className="cursor-pointer"
      onClick={() => onClick?.(payload)}
    />
  )
}

export default function BurnRateChart({ data, onFlagClick }: P) {
  return (
    <div className="h-44 w-full md:h-52 lg:h-56">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="fillBrand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E25D37" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#E25D37" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eee" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v)=>`$${v}`} width={40} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v:number)=>[`$${v}`, 'Spend']} />
          <Area
            type="monotone"
            dataKey="spend"
            stroke="#E25D37"
            strokeWidth={2}
            fill="url(#fillBrand)"
            dot={<FlagDot onClick={p => onFlagClick?.(p)} />}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
