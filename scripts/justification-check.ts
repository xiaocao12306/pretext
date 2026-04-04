import { type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import {
  acquireBrowserAutomationLock,
  createBrowserSession,
  ensurePageServer,
  getAvailablePort,
  loadHashReport,
  type BrowserKind,
} from './browser-automation.ts'

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
}

type ColumnMetricsReport = {
  avgDeviation: number
  maxDeviation: number
  riverCount: number
  lineCount: number
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
  environment?: EnvironmentFingerprint
  controls?: {
    colWidth: number
    showIndicators: boolean
  }
  normalSpaceWidth?: number
  cssOverlayRiverCount?: number
  columns?: {
    css: ColumnMetricsReport
    hyphen: ColumnMetricsReport
    optimal: ColumnMetricsReport
  }
  comparisons?: {
    hyphenVsCss: MetricsDelta
    optimalVsHyphen: MetricsDelta
    optimalVsCss: MetricsDelta
  }
  bestColumns?: {
    avgDeviation: 'css' | 'hyphen' | 'optimal'
    maxDeviation: 'css' | 'hyphen' | 'optimal'
    riverCount: 'css' | 'hyphen' | 'optimal'
  }
  message?: string
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['JUSTIFICATION_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseWidths(raw: string | null): number[] {
  const value = raw ?? process.env['JUSTIFICATION_CHECK_WIDTHS'] ?? '260,364,520'
  const widths = value
    .split(',')
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(width => Number.isFinite(width))
  if (widths.length === 0) {
    throw new Error(`Expected --widths=... to contain at least one integer width, received ${value}`)
  }
  return widths
}

function printReport(report: JustificationReport): void {
  if (report.status === 'error') {
    console.log(`error: ${report.message ?? 'unknown error'}`)
    return
  }

  const controls = report.controls
  const columns = report.columns
  const comparisons = report.comparisons
  if (controls === undefined || columns === undefined || comparisons === undefined) {
    console.log('error: incomplete justification report')
    return
  }

  console.log(
    `${controls.colWidth}px | css ${formatColumn(columns.css)} | ` +
    `hyphen ${formatColumn(columns.hyphen)} | ` +
    `optimal ${formatColumn(columns.optimal)}`,
  )
  console.log(
    `  overlay rivers ${report.cssOverlayRiverCount ?? 0} | ` +
    `Δhyphen-css ${formatDelta(comparisons.hyphenVsCss)} | ` +
    `Δoptimal-hyphen ${formatDelta(comparisons.optimalVsHyphen)} | ` +
    `best avg/max/river ${report.bestColumns?.avgDeviation ?? '?'} / ${report.bestColumns?.maxDeviation ?? '?'} / ${report.bestColumns?.riverCount ?? '?'}`,
  )
}

function formatColumn(column: ColumnMetricsReport): string {
  return `L${column.lineCount} avg ${(column.avgDeviation * 100).toFixed(1)}% max ${(column.maxDeviation * 100).toFixed(1)}% rivers ${column.riverCount}`
}

function formatDelta(delta: MetricsDelta): string {
  return `avg ${formatSignedPercent(delta.avgDeviationDelta)} max ${formatSignedPercent(delta.maxDeviationDelta)} rivers ${formatSignedInt(delta.riverCountDelta)}`
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function formatSignedInt(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

const browser = parseBrowser(parseStringFlag('browser'))
const widths = parseWidths(parseStringFlag('widths'))
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['JUSTIFICATION_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: JustificationReport[] = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/justification-comparison', process.cwd())
  serverProcess = pageServer.process

  for (let index = 0; index < widths.length; index++) {
    const width = widths[index]!
    const requestId = `${Date.now()}-${width}-${Math.random().toString(36).slice(2, 8)}`
    const url =
      `${pageServer.baseUrl}/demos/justification-comparison?report=1` +
      `&width=${width}` +
      `&showIndicators=0` +
      `&requestId=${encodeURIComponent(requestId)}`
    const report = await loadHashReport<JustificationReport>(session, url, requestId, browser, timeoutMs)
    reports.push(report)
    printReport(report)
    if (report.status === 'error') {
      process.exitCode = 1
    }
  }

  if (output !== null) {
    writeFileSync(output, `${JSON.stringify(reports, null, 2)}\n`, 'utf8')
    console.log(`wrote ${output}`)
  }
} finally {
  session.close()
  serverProcess?.kill('SIGTERM')
  lock.release()
}
