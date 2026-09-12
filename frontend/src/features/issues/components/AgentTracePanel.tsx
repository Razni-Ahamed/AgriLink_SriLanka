import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  CheckCircle,
  CloudSun,
  MagnifyingGlass,
  ShieldCheck,
  Robot,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { IconBadge } from '@/components/ui/IconBadge'
import { formatDate } from '@/lib/utils'
import type { AgentExecutionStatus, AgentStep, AgentTrace } from '@/types/dto/advisories'

const AGENT_ICON: Record<string, ReactNode> = {
  PlannerAgent: <Brain size={16} weight="duotone" />,
  CropAnalysisAgent: <MagnifyingGlass size={16} weight="duotone" />,
  WeatherAgent: <CloudSun size={16} weight="duotone" />,
  ValidationAgent: <ShieldCheck size={16} weight="duotone" />,
}

const STATUS_VARIANT: Record<AgentExecutionStatus, 'success' | 'danger' | 'info'> = {
  Completed: 'success',
  Failed: 'danger',
  Running: 'info',
}

/** "CropAnalysisAgent" -> "Crop Analysis" — drops the implied "Agent" and splits the rest. */
function agentDisplayName(agentName: string): string {
  const withoutSuffix = agentName.endsWith('Agent') ? agentName.slice(0, -5) : agentName
  return withoutSuffix.replace(/([a-z])([A-Z])/g, '$1 $2')
}

/** "avgTemperatureC" / "UseCropAgent" -> "Avg Temperature C" / "Use Crop Agent". Generic on
 *  purpose: agent output shapes vary and can change independently of this component, so
 *  labels are derived from whatever keys are actually present rather than hardcoded per agent. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  return spaced
}

function FormattedValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-text-secondary">—</span>
  }
  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-text-secondary">—</span>
    }
    return (
      <ul className="list-disc space-y-0.5 pl-4">
        {value.map((item, index) => (
          <li key={index}>
            <FormattedValue value={item} />
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return <KeyValueGrid data={value as Record<string, unknown>} />
  }
  if (typeof value === 'number') {
    return <span className="font-mono">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
  }
  return <span>{String(value)}</span>
}

function KeyValueGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return <span className="text-text-secondary">—</span>
  }

  return (
    <dl className="flex flex-col gap-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="text-sm">
          <dt className="text-xs font-medium text-text-secondary">{humanizeKey(key)}</dt>
          <dd className="text-text-primary">
            <FormattedValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function durationLabel(startedAt: string, completedAt?: string): string | null {
  if (!completedAt) {
    return null
  }
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) {
    return null
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function AgentStepCard({ step }: { step: AgentStep }) {
  const { t } = useTranslation('issues')
  const duration = durationLabel(step.startedAt, step.completedAt)
  const outputData =
    step.output && typeof step.output === 'object' ? (step.output as Record<string, unknown>) : null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-forest/10 bg-bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconBadge tone="forest">
            {AGENT_ICON[step.agentName] ?? <Robot size={16} weight="duotone" />}
          </IconBadge>
          <span className="text-sm font-medium text-text-primary">
            {agentDisplayName(step.agentName)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {duration && <span className="font-mono text-xs text-text-secondary">{duration}</span>}
          <Badge variant={STATUS_VARIANT[step.status]}>
            {step.status === 'Completed' && <CheckCircle size={12} weight="fill" />}
            {step.status === 'Failed' && <WarningCircle size={12} weight="fill" />}
            {t(`agentTrace.status.${step.status}`)}
          </Badge>
        </div>
      </div>

      {outputData ? (
        <KeyValueGrid data={outputData} />
      ) : step.output ? (
        <p className="text-sm text-text-primary">{String(step.output)}</p>
      ) : (
        <p className="text-sm text-text-secondary">{t('agentTrace.noOutput')}</p>
      )}

      {step.input !== undefined && step.input !== null && (
        <details className="text-xs text-text-secondary">
          <summary className="cursor-pointer select-none hover:text-brand-forest">
            {t('agentTrace.showInput')}
          </summary>
          <div className="mt-2 border-t border-brand-forest/10 pt-2">
            {typeof step.input === 'object' ? (
              <KeyValueGrid data={step.input as Record<string, unknown>} />
            ) : (
              <p>{String(step.input)}</p>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

/**
 * The AI pipeline's own reasoning chain behind an advisory — Planner decides which agents run,
 * CropAnalysis and Weather feed findings in conditionally, Validation produces the final
 * recommendation. AgentWorkflow/AgentExecution have recorded every step of this since the
 * pipeline was built, but no endpoint ever returned it and no screen ever rendered it — an
 * officer signing off on a recommendation had no way to see what actually produced it.
 */
export function AgentTracePanel({ trace }: { trace: AgentTrace }) {
  const { t } = useTranslation('issues')

  if (trace.steps.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-text-secondary">{t('agentTrace.title')}</h3>
        <Badge variant={STATUS_VARIANT[trace.status]}>
          {t(`agentTrace.status.${trace.status}`)}
        </Badge>
      </div>
      <p className="text-xs text-text-secondary">
        {t('agentTrace.ranOn', { date: formatDate(trace.startedAt) })}
      </p>
      <div className="flex flex-col gap-2">
        {trace.steps.map((step, index) => (
          <AgentStepCard key={`${step.agentName}-${index}`} step={step} />
        ))}
      </div>
    </div>
  )
}
