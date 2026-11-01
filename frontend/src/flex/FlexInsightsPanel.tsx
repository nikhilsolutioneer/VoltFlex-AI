import { useMemo } from 'react'
import { LoadPriceChart, SkillResultCard } from './FlexParts'
import { runSkills, type SkillContext, type SkillId } from './skills'
import { formatChf, formatKwh } from './units'
import type { Recommendation } from './recommend'

const OVERVIEW: SkillId[] = [
  'fabric-flex-data', 'flexibility-profiling', 'dynamic-tariff-simulation',
  'grid-signal-alignment', 'flexibility-recommendations',
]

export function FlexInsightsPanel({ context, note }: { context: SkillContext; note: string }) {
  const results = useMemo(() => runSkills(OVERVIEW, context), [context])
  const recommendations = results.flatMap((result) => result.recommendations ?? [])

  return (
    <section className="panel" aria-labelledby="insights-title">
      <h2 id="insights-title">Your energy, and what can move</h2>
      <p className="muted">{note}</p>
      {context.source === 'typical-household' && (
        <p className="warning">These are typical-household figures, not your own readings. Open this app from its Fabric
          portal item with a meter attached to see your real numbers.</p>
      )}
      <LoadPriceChart profile={context.profile} curve={context.curve} />
      {recommendations.length > 0 && <RecommendationList recommendations={recommendations} />}
      <div className="skill-results">
        {results.map((result) => <SkillResultCard key={result.skillId} result={result} />)}
      </div>
    </section>
  )
}

function RecommendationList({ recommendations }: { recommendations: readonly Recommendation[] }) {
  return (
    <ol className="recommendations">
      {recommendations.map((recommendation) => (
        <li key={recommendation.id} className="recommendation">
          <h3>{recommendation.action}</h3>
          <p className="value">
            About {formatChf(recommendation.valueChfPerMonth, 2)} a month
            {recommendation.valueChfPerYear > 0 && <> &middot; roughly {formatChf(recommendation.valueRangeChfPerYear[0])}&ndash;{formatChf(recommendation.valueRangeChfPerYear[1])} a year</>}
          </p>
          <ul className="bullets">
            <li><strong>Comfort:</strong> {recommendation.comfortCost}</li>
            <li><strong>Effort:</strong> {recommendation.effort}</li>
            <li><strong>Why it works:</strong> {recommendation.whyItWorks}</li>
            <li><strong>How to check:</strong> {recommendation.howToVerify}</li>
          </ul>
          <p className="muted">
            Moves about {formatKwh(recommendation.simulation.shiftedKwhPerDay)} a day. The yearly figure extrapolates
            one winter month, so treat it as a range, not a promise.
          </p>
        </li>
      ))}
    </ol>
  )
}
