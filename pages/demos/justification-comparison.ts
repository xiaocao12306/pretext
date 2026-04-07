import { clearNavigationReport, publishNavigationPhase, publishNavigationReport } from '../report-utils.ts'
import { JUSTIFICATION_PROBE_PRESETS, findJustificationProbePreset, type JustificationProbePreset } from '../probe-presets.ts'
import {
  createDemoResources,
  buildDemoFrame,
  type DemoControls,
  type DemoFrame,
  type QualityMetrics,
} from './justification-comparison.model.ts'
import {
  createDomCache,
  renderFrame,
  syncCssRiverOverlay,
  type CssOverlaySummary,
} from './justification-comparison.ui.ts'

type EnvironmentFingerprint = {
  userAgent: string
  devicePixelRatio: number
  viewport: {
    innerWidth: number
    innerHeight: number
    outerWidth: number
    outerHeight: number
    visualViewportScale: number | null
  }
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
  }
}

type ColumnMetricsReport = QualityMetrics & {
  totalHeight: number
}

type MetricsDelta = {
  avgDeviationDelta: number
  maxDeviationDelta: number
  riverCountDelta: number
  lineCountDelta: number
}

type JustificationReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment: EnvironmentFingerprint
  controls: DemoControls
  normalSpaceWidth: number
  cssOverlayRiverCount: number
  columns: {
    css: ColumnMetricsReport
    hyphen: ColumnMetricsReport
    optimal: ColumnMetricsReport
  }
  comparisons: {
    hyphenVsCss: MetricsDelta
    optimalVsHyphen: MetricsDelta
    optimalVsCss: MetricsDelta
  }
  bestColumns: {
    avgDeviation: 'css' | 'hyphen' | 'optimal'
    maxDeviation: 'css' | 'hyphen' | 'optimal'
    riverCount: 'css' | 'hyphen' | 'optimal'
  }
}

type State = {
  controls: DemoControls
  events: {
    widthInput: number | null
    showIndicatorsInput: boolean | null
  }
}

type JustificationProbeState = {
  colWidth: number
  showIndicators: boolean
}

const dom = createDomCache()
const probeRailNode = document.getElementById('probeRail')
if (!(probeRailNode instanceof HTMLElement)) throw new Error('#probeRail not found')
const presetCardGridNode = document.getElementById('presetCardGrid')
if (!(presetCardGridNode instanceof HTMLElement)) throw new Error('#presetCardGrid not found')
const summaryPanelNode = document.getElementById('summaryPanel')
if (!(summaryPanelNode instanceof HTMLElement)) throw new Error('#summaryPanel not found')
const comparisonGridNode = document.getElementById('comparisonGrid')
if (!(comparisonGridNode instanceof HTMLElement)) throw new Error('#comparisonGrid not found')
const params = new URLSearchParams(location.search)
const requestedPreset = findPresetParam(params.get('preset'))
const requestId = params.get('requestId') ?? undefined
const reportRequested = params.get('report') === '1'
const requestedWidth = parseWidthParam(
  params.get('width'),
  requestedPreset?.width ?? Number.parseInt(dom.slider.value, 10),
  dom.slider,
)
const requestedShowIndicators = parseBooleanParam(
  params.get('showIndicators'),
  requestedPreset?.showIndicators ?? dom.showIndicators.checked,
)

const state: State = {
  controls: {
    colWidth: requestedWidth,
    showIndicators: requestedShowIndicators,
  },
  events: {
    widthInput: null,
    showIndicatorsInput: null,
  },
}

let scheduledRaf: number | null = null
let cssOverlayRequestId = 0
let latestFrame: DemoFrame | null = null
let reportPublished = false
let resources: ReturnType<typeof createDemoResources> | null = null
let latestCssOverlaySummary: CssOverlaySummary = { riverMarkCount: 0 }

if (reportRequested) {
  clearNavigationReport()
  publishNavigationPhase('loading', requestId)
}

dom.slider.addEventListener('input', () => {
  state.events.widthInput = Number.parseInt(dom.slider.value, 10)
  scheduleRender()
})

dom.showIndicators.addEventListener('input', () => {
  state.events.showIndicatorsInput = dom.showIndicators.checked
  scheduleRender()
})

window.addEventListener('resize', scheduleRender)

await document.fonts.ready

if (reportRequested) {
  publishNavigationPhase('measuring', requestId)
}

resources = createDemoResources()
render()

function scheduleRender(): void {
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(function renderAndSyncCssOverlay() {
    scheduledRaf = null
    render()
  })
}

function render(): void {
  if (resources === null) throw new Error('Demo resources not ready')

  let colWidth = state.controls.colWidth
  if (state.events.widthInput !== null) colWidth = state.events.widthInput

  let showIndicators = state.controls.showIndicators
  if (state.events.showIndicatorsInput !== null) showIndicators = state.events.showIndicatorsInput

  const nextControls = { colWidth, showIndicators }
  const frame = buildDemoFrame(resources, nextControls)
  latestFrame = frame

  state.controls = nextControls
  state.events.widthInput = null
  state.events.showIndicatorsInput = null

  renderFrame(dom, frame, resources.normalSpaceWidth)
  renderProbeRail(frame.controls)
  renderPresetCards(frame.controls)
  scheduleCssOverlaySync()
}

function scheduleCssOverlaySync(): void {
  const requestId = ++cssOverlayRequestId
  requestAnimationFrame(function syncCssOverlayAfterLayout() {
    if (requestId !== cssOverlayRequestId) return
    if (resources === null || latestFrame === null) return
    latestCssOverlaySummary = syncCssRiverOverlay(
      dom,
      state.controls,
      resources.normalSpaceWidth,
      { measureWhenHidden: reportRequested },
    )
    syncSummaryPanel(
      buildReport(
        latestFrame,
        resources.normalSpaceWidth,
        latestCssOverlaySummary,
        dom.cssCol.getBoundingClientRect().height,
      ),
    )
    maybePublishReport()
  })
}

function maybePublishReport(): void {
  if (!reportRequested || reportPublished || resources === null || latestFrame === null) return
  reportPublished = true
  publishNavigationReport(
    withRequestId(
      buildReport(
        latestFrame,
        resources.normalSpaceWidth,
        latestCssOverlaySummary,
        dom.cssCol.getBoundingClientRect().height,
      ),
    ),
  )
}

function buildReport(
  frame: DemoFrame,
  normalSpaceWidth: number,
  cssOverlaySummary: CssOverlaySummary,
  cssColumnHeight: number,
): JustificationReport {
  const matchedPreset = findMatchingJustificationPreset(frame.controls)
  return {
    status: 'ready',
    presetKey: matchedPreset?.key,
    environment: getEnvironmentFingerprint(),
    controls: frame.controls,
    normalSpaceWidth: Number(normalSpaceWidth.toFixed(3)),
    cssOverlayRiverCount: cssOverlaySummary.riverMarkCount,
    columns: {
      css: toColumnMetrics(frame.css.metrics, cssColumnHeight),
      hyphen: toColumnMetrics(frame.hyphen.metrics, frame.hyphen.totalHeight),
      optimal: toColumnMetrics(frame.optimal.metrics, frame.optimal.totalHeight),
    },
    comparisons: {
      hyphenVsCss: buildMetricsDelta(frame.hyphen.metrics, frame.css.metrics),
      optimalVsHyphen: buildMetricsDelta(frame.optimal.metrics, frame.hyphen.metrics),
      optimalVsCss: buildMetricsDelta(frame.optimal.metrics, frame.css.metrics),
    },
    bestColumns: {
      avgDeviation: pickBestColumn(frame, column => column.avgDeviation),
      maxDeviation: pickBestColumn(frame, column => column.maxDeviation),
      riverCount: pickBestColumn(frame, column => column.riverCount),
    },
  }
}

function toColumnMetrics(metrics: QualityMetrics, totalHeight: number): ColumnMetricsReport {
  return {
    ...metrics,
    avgDeviation: Number(metrics.avgDeviation.toFixed(6)),
    maxDeviation: Number(metrics.maxDeviation.toFixed(6)),
    totalHeight: Number(totalHeight.toFixed(3)),
  }
}

function syncSummaryPanel(report: JustificationReport): void {
  summaryPanelNode.textContent = formatSummary(report)
  renderComparisonGrid(report)
}

function buildMetricsDelta(
  candidate: QualityMetrics,
  baseline: QualityMetrics,
): MetricsDelta {
  return {
    avgDeviationDelta: Number((candidate.avgDeviation - baseline.avgDeviation).toFixed(6)),
    maxDeviationDelta: Number((candidate.maxDeviation - baseline.maxDeviation).toFixed(6)),
    riverCountDelta: candidate.riverCount - baseline.riverCount,
    lineCountDelta: candidate.lineCount - baseline.lineCount,
  }
}

function formatSummary(report: JustificationReport): string {
  const controls = report.controls
  return [
    `preset ${report.presetKey ?? 'manual'}  width ${controls.colWidth}px  indicators ${controls.showIndicators ? 'on' : 'off'}`,
    `best avg/max/river ${report.bestColumns.avgDeviation} / ${report.bestColumns.maxDeviation} / ${report.bestColumns.riverCount}`,
    `css lines ${report.columns.css.lineCount} rivers ${report.cssOverlayRiverCount}  hyphen lines ${report.columns.hyphen.lineCount}  optimal lines ${report.columns.optimal.lineCount}`,
    `Δhyphen-css avg ${formatSignedPercent(report.comparisons.hyphenVsCss.avgDeviationDelta)} max ${formatSignedPercent(report.comparisons.hyphenVsCss.maxDeviationDelta)} rivers ${formatSignedInt(report.comparisons.hyphenVsCss.riverCountDelta)}`,
    `Δoptimal-css avg ${formatSignedPercent(report.comparisons.optimalVsCss.avgDeviationDelta)} max ${formatSignedPercent(report.comparisons.optimalVsCss.maxDeviationDelta)} rivers ${formatSignedInt(report.comparisons.optimalVsCss.riverCountDelta)}`,
  ].join('\n')
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function formatSignedInt(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

function renderComparisonGrid(report: JustificationReport): void {
  const cards = [
    createComparisonCard('CSS', report.columns.css, report, {
      avgBest: report.bestColumns.avgDeviation === 'css',
      maxBest: report.bestColumns.maxDeviation === 'css',
      riverBest: report.bestColumns.riverCount === 'css',
      deltaLabel: 'baseline',
      deltaValue: 'native',
    }),
    createComparisonCard('Hyphen', report.columns.hyphen, report, {
      avgBest: report.bestColumns.avgDeviation === 'hyphen',
      maxBest: report.bestColumns.maxDeviation === 'hyphen',
      riverBest: report.bestColumns.riverCount === 'hyphen',
      deltaLabel: 'Δvs css',
      deltaValue:
        `avg ${formatSignedPercent(report.comparisons.hyphenVsCss.avgDeviationDelta)} ` +
        `max ${formatSignedPercent(report.comparisons.hyphenVsCss.maxDeviationDelta)} ` +
        `r ${formatSignedInt(report.comparisons.hyphenVsCss.riverCountDelta)}`,
    }),
    createComparisonCard('Optimal', report.columns.optimal, report, {
      avgBest: report.bestColumns.avgDeviation === 'optimal',
      maxBest: report.bestColumns.maxDeviation === 'optimal',
      riverBest: report.bestColumns.riverCount === 'optimal',
      deltaLabel: 'Δvs css',
      deltaValue:
        `avg ${formatSignedPercent(report.comparisons.optimalVsCss.avgDeviationDelta)} ` +
        `max ${formatSignedPercent(report.comparisons.optimalVsCss.maxDeviationDelta)} ` +
        `r ${formatSignedInt(report.comparisons.optimalVsCss.riverCountDelta)}`,
    }),
  ]

  comparisonGridNode.replaceChildren(...cards)
}

function createComparisonCard(
  label: string,
  column: ColumnMetricsReport,
  report: JustificationReport,
  options: {
    avgBest: boolean
    maxBest: boolean
    riverBest: boolean
    deltaLabel: string
    deltaValue: string
  },
): HTMLElement {
  const card = document.createElement('article')
  card.className = options.avgBest || options.maxBest || options.riverBest ? 'summary-card is-best' : 'summary-card'

  const titleRow = document.createElement('div')
  titleRow.className = 'summary-card-title'
  const title = document.createElement('span')
  title.textContent = label
  titleRow.append(title)
  const badgeText = buildBestBadge(options)
  if (badgeText !== null) {
    const badge = document.createElement('span')
    badge.className = 'summary-card-badge'
    badge.textContent = badgeText
    titleRow.append(badge)
  }

  const rows = [
    createComparisonRow('lines', String(column.lineCount)),
    createComparisonRow('avg dev', `${(column.avgDeviation * 100).toFixed(1)}%`),
    createComparisonRow('max dev', `${(column.maxDeviation * 100).toFixed(1)}%`),
    createComparisonRow('rivers', label === 'CSS' ? String(report.cssOverlayRiverCount) : String(column.riverCount)),
    createComparisonRow(options.deltaLabel, options.deltaValue),
  ]

  card.append(titleRow, ...rows)
  return card
}

function buildBestBadge(options: { avgBest: boolean; maxBest: boolean; riverBest: boolean }): string | null {
  const wins: string[] = []
  if (options.avgBest) wins.push('avg')
  if (options.maxBest) wins.push('max')
  if (options.riverBest) wins.push('river')
  return wins.length === 0 ? null : `best ${wins.join('/')}`
}

function createComparisonRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'summary-card-row'
  const labelNode = document.createElement('span')
  labelNode.className = 'summary-card-label'
  labelNode.textContent = label
  const valueNode = document.createElement('span')
  valueNode.className = 'summary-card-value'
  valueNode.textContent = value
  row.append(labelNode, valueNode)
  return row
}

function pickBestColumn(
  frame: DemoFrame,
  selector: (metrics: QualityMetrics) => number,
): 'css' | 'hyphen' | 'optimal' {
  const entries = [
    ['css', frame.css.metrics],
    ['hyphen', frame.hyphen.metrics],
    ['optimal', frame.optimal.metrics],
  ] as const

  let best = entries[0]!
  for (let index = 1; index < entries.length; index++) {
    const current = entries[index]!
    if (selector(current[1]) < selector(best[1])) best = current
  }
  return best[0]
}

function parseWidthParam(
  raw: string | null,
  fallback: number,
  slider: HTMLInputElement,
): number {
  if (raw === null) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  const min = Number.parseInt(slider.min, 10)
  const max = Number.parseInt(slider.max, 10)
  return Math.min(max, Math.max(min, parsed))
}

function parseBooleanParam(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback
  if (raw === '1' || raw.toLowerCase() === 'true') return true
  if (raw === '0' || raw.toLowerCase() === 'false') return false
  return fallback
}

function renderProbeRail(controls: DemoControls): void {
  const probeState = toJustificationProbeState(controls)
  const presets = JUSTIFICATION_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildProbeHref({ presetKey: preset.key }),
    active: isJustificationPresetActive(preset, probeState),
  }))
  probeRailNode.replaceChildren(...presets.map(createProbeLink))
}

function renderPresetCards(controls: DemoControls): void {
  const probeState = toJustificationProbeState(controls)
  const cards = JUSTIFICATION_PROBE_PRESETS.map(preset =>
    createPresetCard({
      label: preset.label,
      href: buildProbeHref({ presetKey: preset.key }),
      active: isJustificationPresetActive(preset, probeState),
      widthSummary: `${preset.width}px`,
      indicatorSummary: preset.showIndicators ? 'visualizers on' : 'visualizers off',
    }),
  )
  presetCardGridNode.replaceChildren(...cards)
}

function toJustificationProbeState(controls: DemoControls): JustificationProbeState {
  return {
    colWidth: controls.colWidth,
    showIndicators: controls.showIndicators,
  }
}

function findMatchingJustificationPreset(controls: DemoControls): JustificationProbePreset | null {
  const state = toJustificationProbeState(controls)
  return JUSTIFICATION_PROBE_PRESETS.find(preset => isJustificationPresetActive(preset, state)) ?? null
}

function isJustificationPresetActive(
  preset: JustificationProbePreset,
  state: JustificationProbeState,
): boolean {
  return state.colWidth === preset.width && state.showIndicators === preset.showIndicators
}

function createProbeLink(definition: { label: string; href: string; active: boolean }): HTMLAnchorElement {
  const element = document.createElement('a')
  element.className = definition.active ? 'probe-link is-active' : 'probe-link'
  element.href = definition.href
  element.textContent = definition.label
  return element
}

function createPresetCard(definition: {
  label: string
  href: string
  active: boolean
  widthSummary: string
  indicatorSummary: string
}): HTMLAnchorElement {
  const element = document.createElement('a')
  element.className = definition.active ? 'preset-card is-active' : 'preset-card'
  element.href = definition.href

  const head = document.createElement('div')
  head.className = 'preset-card-head'
  const title = document.createElement('span')
  title.className = 'preset-card-title'
  title.textContent = definition.label
  head.append(title)
  if (definition.active) {
    const badge = document.createElement('span')
    badge.className = 'preset-card-badge'
    badge.textContent = 'active'
    head.append(badge)
  }

  element.append(
    head,
    createPresetCardRow('width', definition.widthSummary),
    createPresetCardRow('indicator', definition.indicatorSummary),
  )
  return element
}

function createPresetCardRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'preset-card-row'
  const left = document.createElement('span')
  left.textContent = label
  const right = document.createElement('span')
  right.textContent = value
  row.append(left, right)
  return row
}

function buildProbeHref(options: { presetKey?: string; width?: number; showIndicators?: boolean }): string {
  const next = new URLSearchParams()
  if (options.presetKey !== undefined) {
    next.set('preset', options.presetKey)
  } else {
    if (options.width !== undefined) next.set('width', String(options.width))
    if (options.showIndicators !== undefined) next.set('showIndicators', options.showIndicators ? '1' : '0')
  }
  return `${location.pathname}?${next.toString()}`
}

function findPresetParam(raw: string | null) {
  if (raw === null || raw.trim() === '') return null
  return findJustificationProbePreset(raw.trim())
}

function withRequestId(report: JustificationReport): JustificationReport {
  return requestId === undefined ? report : { ...report, requestId }
}

function getEnvironmentFingerprint(): EnvironmentFingerprint {
  return {
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      visualViewportScale: window.visualViewport?.scale ?? null,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
    },
  }
}
