import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRequest } from '../useRequest'
import { loadDataset, type FlexDataset } from './data'
import { DATASET_FACTS } from './model'
import { buildProfile } from './profile'
import { defaultPriceCurve } from './tariff'
import type { SkillContext } from './skills'

export interface FlexSession {
  readonly dataset: FlexDataset | null
  readonly context: SkillContext | null
  readonly busy: boolean
  readonly error: string
  readonly reload: () => void
}

export function useFlexSession(): FlexSession {
  const { busy, error, run } = useRequest()
  const [dataset, setDataset] = useState<FlexDataset | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Anti-herding: a per-session offset so this app does not tell every customer to start at the same hour.
  const [jitterSeed] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0])

  const reload = useCallback(() => setAttempt((current) => current + 1), [])

  useEffect(() => {
    void run((signal) => loadDataset(signal), setDataset)
  }, [run, attempt])

  const profiled = useMemo(() => {
    if (!dataset) return null
    const curve = defaultPriceCurve()
    try {
      const context: SkillContext = {
        intervals: dataset.intervals,
        curve,
        profile: buildProfile(dataset.intervals, curve),
        staticPriceChfPerKwh: DATASET_FACTS.staticPriceChfPerKwh,
        source: dataset.source,
        jitterSeed,
      }
      return { context, message: '' }
    } catch (cause) {
      return { context: null, message: cause instanceof Error ? cause.message : 'This period cannot be profiled.' }
    }
  }, [dataset, jitterSeed])

  return { dataset, context: profiled?.context ?? null, busy, error: error || (profiled?.message ?? ''), reload }
}
