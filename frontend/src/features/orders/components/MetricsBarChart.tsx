import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { formatQuantity } from '@/lib/utils'
import { chartColors } from '../lib/chartColors'

interface MetricsBarChartProps {
  data: { label: string; value: number }[]
}

// Flat counts across distinct, directly-labeled categories — a magnitude
// comparison, not series identity — so this is a single sequential hue with
// no legend, per the dataviz skill's job->color mapping.
export function MetricsBarChart({ data }: MetricsBarChartProps) {
  const { t } = useTranslation('orders')

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="font-display text-lg text-text-primary">{t('admin.platformTotals')}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.gridline} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: chartColors.primary, fillOpacity: 0.08 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null
                }
                return (
                  <div className="rounded-xl border border-brand-forest/10 bg-bg-surface px-3 py-2 text-sm shadow-lg">
                    <span className="font-mono text-text-primary">
                      {formatQuantity(Number(payload[0].value))}
                    </span>
                  </div>
                )
              }}
            />
            <Bar dataKey="value" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={24}>
              <LabelList dataKey="value" position="top" fill={chartColors.textSecondary} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
