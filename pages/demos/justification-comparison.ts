import { clearNavigationReport, publishNavigationPhase, publishNavigationReport } from '../report-utils.ts'
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

const dom = createDomCache()
const probeRailNode = document.getElementById('probeRail')
if (!(probeRailNode instanceof HTMLElement)) throw new Error('#probeRail not found')
const params = new URLSearchParams(location.search)
const requestId = params.get('requestId') ?? undefined
const reportRequested = params.get('report') === '1'
const requestedWidth = parseWidthParam(params.get('width'), Number.parseInt(dom.slider.value, 10), dom.slider)
const requestedShowIndicators = parseBooleanParam(params.get('showIndicators'), dom.showIndicators.checked)

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
  return {
    status: 'ready',
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
  const presets = [
    {
      label: 'Default 364',
      href: buildProbeHref({ width: 364, showIndicators: true }),
      active: controls.colWidth === 364 && controls.showIndicators,
    },
    {
      label: 'Narrow 260',
      href: buildProbeHref({ width: 260, showIndicators: true }),
      active: controls.colWidth === 260 && controls.showIndicators,
    },
    {
      label: 'Probe 364',
      href: buildProbeHref({ width: 364, showIndicators: false }),
      active: controls.colWidth === 364 && !controls.showIndicators,
    },
    {
      label: 'Wide 520',
      href: buildProbeHref({ width: 520, showIndicators: false }),
      active: controls.colWidth === 520 && !controls.showIndicators,
    },
  ]
  probeRailNode.replaceChildren(...presets.map(createProbeLink))
}

function createProbeLink(definition: { label: string; href: string; active: boolean }): HTMLAnchorElement {
  const element = document.createElement('a')
  element.className = definition.active ? 'probe-link is-active' : 'probe-link'
  element.href = definition.href
  element.textContent = definition.label
  return element
}

function buildProbeHref(options: { width: number; showIndicators: boolean }): string {
  const next = new URLSearchParams()
  next.set('width', String(options.width))
  next.set('showIndicators', options.showIndicators ? '1' : '0')
  return `${location.pathname}?${next.toString()}`
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
