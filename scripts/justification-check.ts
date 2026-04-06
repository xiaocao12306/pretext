import { type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { JUSTIFICATION_PROBE_PRESETS, findJustificationProbePreset, type JustificationProbePreset } from '../pages/probe-presets.ts'
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
  presetKey?: string
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

type JustificationSummaryRow = {
  preset: string
  width: number
  cssOverlayRiverCount: number
  bestAvg: string
  bestRiver: string
  hyphenAvgDelta: number
  optimalAvgDelta: number
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

function parsePresetKeys(raw: string | null): JustificationProbePreset[] {
  const value = raw ?? process.env['JUSTIFICATION_CHECK_PRESETS'] ?? ''
  if (value.trim() === '') return []
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(key => {
      const preset = findJustificationProbePreset(key)
      if (preset === null) {
        throw new Error(`Unknown justification preset ${key}; expected one of ${JUSTIFICATION_PROBE_PRESETS.map(item => item.key).join(', ')}`)
      }
      return preset
    })
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
    `preset ${report.presetKey ?? 'manual'} | ` +
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

function validatePresetReport(report: JustificationReport, expectedPresetKey: JustificationProbePreset['key']): boolean {
  if (report.status === 'error') return false
  if (report.presetKey === expectedPresetKey) return true
  console.log(`protocol error: expected presetKey ${expectedPresetKey}, received ${report.presetKey ?? 'none'}`)
  return false
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}..${max}`
}

function toSummaryRow(entry: { preset: JustificationProbePreset['key']; report: JustificationReport }): JustificationSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  if (report.controls === undefined || report.comparisons === undefined || report.bestColumns === undefined) return null
  return {
    preset: report.presetKey ?? entry.preset,
    width: report.controls.colWidth,
    cssOverlayRiverCount: report.cssOverlayRiverCount ?? 0,
    bestAvg: report.bestColumns.avgDeviation,
    bestRiver: report.bestColumns.riverCount,
    hyphenAvgDelta: report.comparisons.hyphenVsCss.avgDeviationDelta,
    optimalAvgDelta: report.comparisons.optimalVsCss.avgDeviationDelta,
  }
}

function printMatrixSummary(entries: Array<{ preset: JustificationProbePreset['key']; report: JustificationReport }>): void {
  const rows = entries
    .map(toSummaryRow)
    .filter((row): row is JustificationSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  if (rows.length === 0) return

  const widths = rows.map(row => row.width)
  const rivers = rows.map(row => row.cssOverlayRiverCount)
  const hyphenDeltas = rows.map(row => row.hyphenAvgDelta * 100)
  const optimalDeltas = rows.map(row => row.optimalAvgDelta * 100)
  console.log(
    `  widths ${formatRange(Math.min(...widths), Math.max(...widths))} | ` +
    `css rivers ${formatRange(Math.min(...rivers), Math.max(...rivers))} | ` +
    `Δhyphen avg ${formatRange(Number(Math.min(...hyphenDeltas).toFixed(1)), Number(Math.max(...hyphenDeltas).toFixed(1)))}% | ` +
    `Δoptimal avg ${formatRange(Number(Math.min(...optimalDeltas).toFixed(1)), Number(Math.max(...optimalDeltas).toFixed(1)))}%`,
  )

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.preset} -> width ${row.width} | rivers ${row.cssOverlayRiverCount} | ` +
      `best avg ${row.bestAvg} | best river ${row.bestRiver} | ` +
      `Δhyphen ${formatSignedPercent(row.hyphenAvgDelta)} | Δoptimal ${formatSignedPercent(row.optimalAvgDelta)}`,
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const widths = parseWidths(parseStringFlag('widths'))
const presets = parsePresetKeys(parseStringFlag('presets'))
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['JUSTIFICATION_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<JustificationReport | { preset: JustificationProbePreset['key']; report: JustificationReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/justification-comparison', process.cwd())
  serverProcess = pageServer.process

  if (presets.length > 0) {
    const presetReports: Array<{ preset: JustificationProbePreset['key']; report: JustificationReport }> = []
    for (let index = 0; index < presets.length; index++) {
      const preset = presets[index]!
      const requestId = `${Date.now()}-${preset.key}-${Math.random().toString(36).slice(2, 8)}`
      const url =
        `${pageServer.baseUrl}/demos/justification-comparison?report=1` +
        `&preset=${encodeURIComponent(preset.key)}` +
        `&requestId=${encodeURIComponent(requestId)}`
      const report = await loadHashReport<JustificationReport>(session, url, requestId, browser, timeoutMs)
      reports.push({ preset: preset.key, report })
      presetReports.push({ preset: preset.key, report })
      console.log(`[preset:${preset.key}]`)
      printReport(report)
      if (report.status === 'error' || !validatePresetReport(report, preset.key)) {
        process.exitCode = 1
      }
    }
    printMatrixSummary(presetReports)
  } else {
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
