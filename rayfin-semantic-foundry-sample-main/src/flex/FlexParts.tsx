import type { ReactNode } from 'react'
import type { FlexProfile } from './profile'
import type { PriceCurve } from './tariff'
import type { SkillResult } from './skills'
import { formatHour, formatKwh, formatRappen, round } from './units'

const CONFIDENCE_TEXT: Record<string, string> = {
  measured: 'From your meter',
  high: 'From your meter',
  medium: 'From your meter \u00b7 short period',
  low: 'Estimate \u00b7 inferred, not measured',
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return <span className={`badge badge-${confidence}`}>{CONFIDENCE_TEXT[confidence] ?? 'Estimate'}</span>
}

export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="disclosure">
      <summary>{summary}</summary>
      <div className="disclosure-body">{children}</div>
    </details>
  )
}

export function AssumptionList({ items }: { items: readonly string[] }) {
  if (!items.length) return null
  return <ul className="assumptions">{items.map((item) => <li key={item}>{item}</li>)}</ul>
}

export function SkillResultCard({ result }: { result: SkillResult }) {
  return (
    <article className="skill-result">
      <div className="skill-result-head">
        <h4>{result.headline}</h4>
        <ConfidenceBadge confidence={result.confidence} />
      </div>
      {result.findings.length > 0 && (
        <dl className="findings">
          {result.findings.map((finding) => (
            <div key={finding.label}>
              <dt>{finding.label}</dt>
              <dd>{finding.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ul className="bullets">{result.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
      <Disclosure summary="How I calculated this">
        <AssumptionList items={result.assumptions} />
        <p className="muted">Not measured in this data: {result.notMeasured.join(', ')}.</p>
      </Disclosure>
    </article>
  )
}

const CHART = { width: 720, height: 180, pad: 24 }

/** Comparative, not decorative: it answers "is my load sitting on the expensive hours?". */
export function LoadPriceChart({ profile, curve }: { profile: FlexProfile; curve: PriceCurve }) {
  const hours = profile.hourlyKwh
  const maxKwh = Math.max(...hours, 0.001)
  const minPrice = Math.min(...curve)
  const maxPrice = Math.max(...curve)
  const span = Math.max(maxPrice - minPrice, 0.001)
  const plotWidth = CHART.width - CHART.pad * 2
  const plotHeight = CHART.height - CHART.pad * 2
  const barWidth = plotWidth / 24

  const pricePoints = curve
    .map((price, hour) => `${CHART.pad + barWidth * (hour + 0.5)},${CHART.pad + plotHeight * (1 - (price - minPrice) / span)}`)
    .join(' ')

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img"
        aria-label={`Your energy by hour against the price curve. Your biggest hour is ${formatHour(profile.peakHour)}. The priciest hour is ${formatHour(curve.indexOf(maxPrice))}.`}>
        {hours.map((kwh, hour) => (
          <rect key={hour}
            x={CHART.pad + barWidth * hour + 1}
            y={CHART.pad + plotHeight * (1 - kwh / maxKwh)}
            width={Math.max(1, barWidth - 2)}
            height={Math.max(0, plotHeight * (kwh / maxKwh))}
            className={hour === profile.peakHour ? 'bar bar-peak' : 'bar'} />
        ))}
        <polyline points={pricePoints} className="price-line" fill="none" />
      </svg>
      <figcaption className="muted">
        Bars: your energy per hour. Line: the price through the day. Cheapest {formatRappen(minPrice)}, priciest {formatRappen(maxPrice)}.
      </figcaption>
      <Disclosure summary="Show the numbers behind this chart">
        <div className="table-scroll" role="region" aria-label="Energy and price by hour" tabIndex={0}>
          <table>
            <thead><tr><th>Hour</th><th>Your energy</th><th>Price</th></tr></thead>
            <tbody>
              {hours.map((kwh, hour) => (
                <tr key={hour}>
                  <td>{formatHour(hour)}</td>
                  <td>{formatKwh(round(kwh, 2), 2)}</td>
                  <td>{formatRappen(curve[hour])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </figure>
  )
}
