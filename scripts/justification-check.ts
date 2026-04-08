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
  focusColumn?: 'css' | 'hyphen' | 'optimal' | null
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
  showIndicators: boolean
  cssOverlayRiverCount: number
  bestAvg: string
  bestRiver: string
  hyphenAvgDelta: number
  optimalAvgDelta: number
}

type JustificationRun = {
  label: string
  width: number
  showIndicators: boolean
  presetKey?: JustificationProbePreset['key']
  focusColumn: 'css' | 'hyphen' | 'optimal' | null
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

function parseShowIndicatorModes(raw: string | null): boolean[] {
  const value = raw ?? process.env['JUSTIFICATION_CHECK_SHOW_INDICATORS'] ?? '0'
  const modes = value
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(part => part.length > 0)
    .map(part => part === '1' || part === 'true')

  if (modes.length === 0) {
    throw new Error(`Expected --showIndicators=... to contain 0/1 or false/true values, received ${value}`)
  }

  return [...new Set(modes)]
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

function parseFocusColumn(raw: string | null): 'css' | 'hyphen' | 'optimal' | null {
  if (raw === 'css' || raw === 'hyphen' || raw === 'optimal') return raw
  return null
}

function buildRuns(
  presets: JustificationProbePreset[],
  widths: number[],
  showIndicators: boolean[],
  focusColumn: 'css' | 'hyphen' | 'optimal' | null,
): JustificationRun[] {
  if (presets.length > 0) {
    return presets.map(preset => ({
      label: preset.key,
      width: preset.width,
      showIndicators: preset.showIndicators,
      presetKey: preset.key,
      focusColumn,
    }))
  }

  const runs: JustificationRun[] = []
  for (let widthIndex = 0; widthIndex < widths.length; widthIndex++) {
    const width = widths[widthIndex]!
    for (let indicatorIndex = 0; indicatorIndex < showIndicators.length; indicatorIndex++) {
      const indicatorMode = showIndicators[indicatorIndex]!
      runs.push({
        label: `${width}px ${indicatorMode ? 'indicators-on' : 'indicators-off'}`,
        width,
        showIndicators: indicatorMode,
        focusColumn,
      })
    }
  }
  return runs
}

function formatRunLabel(run: JustificationRun): string {
  return run.presetKey === undefined
    ? `${run.label}${run.focusColumn === null ? '' : ` @ ${run.focusColumn}`}`
    : `${run.presetKey} (${run.width}px, ${run.showIndicators ? 'indicators-on' : 'indicators-off'}${run.focusColumn === null ? '' : ` @ ${run.focusColumn}`})`
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
    `${controls.colWidth}px | indicators ${controls.showIndicators ? 'on' : 'off'} | ` +
    `focus ${report.focusColumn ?? 'all-columns'} | ` +
    `css ${formatColumn(columns.css)} | ` +
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

function validateFocusColumn(
  report: JustificationReport,
  expectedFocusColumn: 'css' | 'hyphen' | 'optimal' | null,
): boolean {
  if (report.status === 'error') return false
  if ((report.focusColumn ?? null) === expectedFocusColumn) return true
  console.log(
    `protocol error: expected focusColumn ${expectedFocusColumn ?? 'all-columns'}, received ${report.focusColumn ?? 'all-columns'}`,
  )
  return false
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}..${max}`
}

function printManualReport(report: JustificationReport, run: JustificationRun): void {
  console.log(`[manual:${formatRunLabel(run)}]`)
  printReport(report)
}

function toMatrixSummaryRow(entry: { run: JustificationRun; report: JustificationReport }): JustificationSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  if (report.controls === undefined || report.comparisons === undefined || report.bestColumns === undefined) return null
  return {
    preset: report.presetKey ?? entry.run.label,
    width: report.controls.colWidth,
    showIndicators: report.controls.showIndicators,
    cssOverlayRiverCount: report.cssOverlayRiverCount ?? 0,
    bestAvg: report.bestColumns.avgDeviation,
    bestRiver: report.bestColumns.riverCount,
    hyphenAvgDelta: report.comparisons.hyphenVsCss.avgDeviationDelta,
    optimalAvgDelta: report.comparisons.optimalVsCss.avgDeviationDelta,
  }
}

function printMatrixSummary(entries: Array<{ run: JustificationRun; report: JustificationReport }>): void {
  const rows = entries
    .map(toMatrixSummaryRow)
    .filter((row): row is JustificationSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  if (rows.length === 0) return

  const widths = rows.map(row => row.width)
  const rivers = rows.map(row => row.cssOverlayRiverCount)
  const hyphenDeltas = rows.map(row => row.hyphenAvgDelta * 100)
  const optimalDeltas = rows.map(row => row.optimalAvgDelta * 100)
  const indicatorOnCount = rows.filter(row => row.showIndicators).length
  console.log(
    `  widths ${formatRange(Math.min(...widths), Math.max(...widths))} | ` +
    `indicators on ${indicatorOnCount}/${rows.length} | ` +
    `css rivers ${formatRange(Math.min(...rivers), Math.max(...rivers))} | ` +
    `Δhyphen avg ${formatRange(Number(Math.min(...hyphenDeltas).toFixed(1)), Number(Math.max(...hyphenDeltas).toFixed(1)))}% | ` +
    `Δoptimal avg ${formatRange(Number(Math.min(...optimalDeltas).toFixed(1)), Number(Math.max(...optimalDeltas).toFixed(1)))}%`,
  )

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.preset} -> width ${row.width} | indicators ${row.showIndicators ? 'on' : 'off'} | ` +
      `rivers ${row.cssOverlayRiverCount} | ` +
      `best avg ${row.bestAvg} | best river ${row.bestRiver} | ` +
      `Δhyphen ${formatSignedPercent(row.hyphenAvgDelta)} | Δoptimal ${formatSignedPercent(row.optimalAvgDelta)}`,
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const widths = parseWidths(parseStringFlag('widths'))
const showIndicators = parseShowIndicatorModes(parseStringFlag('showIndicators'))
const presets = parsePresetKeys(parseStringFlag('presets'))
const focusColumn = parseFocusColumn(parseStringFlag('focusColumn'))
const runs = buildRuns(presets, widths, showIndicators, focusColumn)
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['JUSTIFICATION_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ run: JustificationRun; report: JustificationReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/justification-comparison', process.cwd())
  serverProcess = pageServer.process

  for (let index = 0; index < runs.length; index++) {
    const run = runs[index]!
    const requestId = `${Date.now()}-${run.width}-${run.showIndicators ? '1' : '0'}-${Math.random().toString(36).slice(2, 8)}`
    const url =
      run.presetKey === undefined
        ? `${pageServer.baseUrl}/demos/justification-comparison?report=1` +
          `&width=${run.width}` +
          `&showIndicators=${run.showIndicators ? '1' : '0'}` +
          (run.focusColumn === null ? '' : `&focusColumn=${encodeURIComponent(run.focusColumn)}`) +
          `&requestId=${encodeURIComponent(requestId)}`
        : `${pageServer.baseUrl}/demos/justification-comparison?report=1` +
          `&preset=${encodeURIComponent(run.presetKey)}` +
          (run.focusColumn === null ? '' : `&focusColumn=${encodeURIComponent(run.focusColumn)}`) +
          `&requestId=${encodeURIComponent(requestId)}`
    const report = await loadHashReport<JustificationReport>(session, url, requestId, browser, timeoutMs)
    reports.push({ run, report })

    if (run.presetKey === undefined) {
      printManualReport(report, run)
      if (report.status === 'error' || !validateFocusColumn(report, run.focusColumn)) {
        process.exitCode = 1
      }
    } else {
      console.log(`[preset:${run.presetKey}]`)
      printReport(report)
      if (
        report.status === 'error' ||
        !validatePresetReport(report, run.presetKey) ||
        !validateFocusColumn(report, run.focusColumn)
      ) {
        process.exitCode = 1
      }
    }
  }

  printMatrixSummary(reports)

  if (output !== null) {
    writeFileSync(output, `${JSON.stringify(reports, null, 2)}\n`, 'utf8')
    console.log(`wrote ${output}`)
  }
} finally {
  session.close()
  serverProcess?.kill('SIGTERM')
  lock.release()
}
