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

type ProbeReport = {
  status: 'ready' | 'error'
  requestId?: string
  whiteSpace?: 'normal' | 'pre-wrap'
  browserLineMethod?: 'range' | 'span'
  width?: number
  predictedHeight?: number
  actualHeight?: number
  diffPx?: number
  predictedLineCount?: number
  browserLineCount?: number
  firstBreakMismatch?: {
    line: number
    oursStart: number
    browserStart: number
    oursEnd: number
    browserEnd: number
    oursText: string
    browserText: string
    oursRenderedText: string
    browserRenderedText: string
    oursContext: string
    browserContext: string
    deltaText: string
    reasonGuess: string
    oursSumWidth: number
    oursDomWidth: number
    oursFullWidth: number
    browserDomWidth: number
    browserFullWidth: number
  } | null
  alternateBrowserLineMethod?: 'range' | 'span'
  alternateBrowserLineCount?: number
  alternateFirstBreakMismatch?: object | null
  extractorSensitivity?: string | null
  message?: string
}

type ProbeSummaryRow = {
  width: number
  diffPx: number
  predictedLineCount: number
  browserLineCount: number
  predictedHeight: number
  actualHeight: number
  browserLineMethod: string
  exact: boolean
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseNumberFlag(name: string, fallback: number): number {
  const raw = parseStringFlag(name)
  if (raw === null) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) throw new Error(`Invalid value for --${name}: ${raw}`)
  return parsed
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['PROBE_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseWidths(): number[] {
  const widthsRaw = parseStringFlag('widths')
  if (widthsRaw !== null) {
    const widths = widthsRaw
      .split(',')
      .map(part => Number.parseInt(part.trim(), 10))
      .filter(width => Number.isFinite(width))
    if (widths.length === 0) {
      throw new Error(`Expected --widths=... to contain at least one integer width, received ${widthsRaw}`)
    }
    return widths
  }
  return [parseNumberFlag('width', 600)]
}

function requireFlag(name: string): string {
  const value = parseStringFlag(name)
  if (value === null || value.length === 0) throw new Error(`Missing --${name}=...`)
  return value
}

function printReport(report: ProbeReport): void {
  if (report.status === 'error') {
    console.log(`error: ${report.message ?? 'unknown error'}`)
    return
  }

  console.log(
    `width ${report.width}: diff ${report.diffPx}px | lines ${report.predictedLineCount}/${report.browserLineCount} | height ${report.predictedHeight}/${report.actualHeight}`,
  )
  if (report.browserLineMethod !== undefined) {
    console.log(`  browser line method: ${report.browserLineMethod}`)
  }
  if (report.extractorSensitivity !== null && report.extractorSensitivity !== undefined) {
    console.log(`  extractor sensitivity: ${report.extractorSensitivity}`)
  }
  if (
    report.alternateBrowserLineMethod !== undefined &&
    report.alternateBrowserLineCount !== undefined
  ) {
    console.log(
      `  alternate method: ${report.alternateBrowserLineMethod} (${report.predictedLineCount}/${report.alternateBrowserLineCount} lines)` +
      (report.alternateFirstBreakMismatch === null ? ' exact' : ''),
    )
  }
  if (report.firstBreakMismatch !== null && report.firstBreakMismatch !== undefined) {
    const mismatch = report.firstBreakMismatch
    console.log(`  break L${mismatch.line}: ${mismatch.reasonGuess}`)
    console.log(`  offsets: ours ${mismatch.oursStart}-${mismatch.oursEnd} | browser ${mismatch.browserStart}-${mismatch.browserEnd}`)
    console.log(`  delta: ${JSON.stringify(mismatch.deltaText)}`)
    console.log(`  ours text:    ${JSON.stringify(mismatch.oursText)}`)
    console.log(`  browser text: ${JSON.stringify(mismatch.browserText)}`)
    console.log(`  ours rendered:    ${JSON.stringify(mismatch.oursRenderedText)}`)
    console.log(`  browser rendered: ${JSON.stringify(mismatch.browserRenderedText)}`)
    console.log(`  ours:    ${mismatch.oursContext}`)
    console.log(`  browser: ${mismatch.browserContext}`)
    console.log(
      `  widths: ours sum/dom/full ${mismatch.oursSumWidth.toFixed(3)}/${mismatch.oursDomWidth.toFixed(3)}/${mismatch.oursFullWidth.toFixed(3)} | browser dom/full ${mismatch.browserDomWidth.toFixed(3)}/${mismatch.browserFullWidth.toFixed(3)}`,
    )
  }
}

function toSummaryRow(report: ProbeReport): ProbeSummaryRow | null {
  if (
    report.status !== 'ready' ||
    report.width === undefined ||
    report.diffPx === undefined ||
    report.predictedLineCount === undefined ||
    report.browserLineCount === undefined ||
    report.predictedHeight === undefined ||
    report.actualHeight === undefined
  ) {
    return null
  }

  return {
    width: report.width,
    diffPx: report.diffPx,
    predictedLineCount: report.predictedLineCount,
    browserLineCount: report.browserLineCount,
    predictedHeight: report.predictedHeight,
    actualHeight: report.actualHeight,
    browserLineMethod: report.browserLineMethod ?? 'unknown',
    exact:
      report.diffPx === 0 &&
      report.predictedLineCount === report.browserLineCount &&
      report.predictedHeight === report.actualHeight,
  }
}

function printMatrixSummary(reports: ProbeReport[]): void {
  const rows = reports
    .map(toSummaryRow)
    .filter((row): row is ProbeSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${reports.length} ready ${rows.length} error ${reports.length - rows.length}`)
  if (rows.length === 0) return

  const diffs = rows.map(row => row.diffPx)
  const widths = rows.map(row => row.width)
  const exactCount = rows.filter(row => row.exact).length
  console.log(
    `  widths ${Math.min(...widths)}..${Math.max(...widths)} | ` +
    `diff ${Math.min(...diffs)}..${Math.max(...diffs)} | exact ${exactCount}/${rows.length}`,
  )

  for (const row of rows) {
    console.log(
      `  ${row.width}px -> diff ${row.diffPx}px | ` +
      `lines ${row.predictedLineCount}/${row.browserLineCount} | ` +
      `height ${row.predictedHeight}/${row.actualHeight} | ` +
      `${row.browserLineMethod} | ${row.exact ? 'exact' : 'mismatch'}`,
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const requestedPort = parseNumberFlag('port', Number.parseInt(process.env['PROBE_CHECK_PORT'] ?? '0', 10))
const text = requireFlag('text')
const widths = parseWidths()
const font = parseStringFlag('font') ?? '18px serif'
const lineHeight = parseNumberFlag('lineHeight', 32)
const dir = parseStringFlag('dir') ?? 'ltr'
const lang = parseStringFlag('lang') ?? (dir === 'rtl' ? 'ar' : 'en')
const method = parseStringFlag('method')
const whiteSpace = parseStringFlag('whiteSpace') === 'pre-wrap' ? 'pre-wrap' : 'normal'
const output = parseStringFlag('output')

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)

try {
  const port = await getAvailablePort(requestedPort === 0 ? null : requestedPort)
  const pageServer = await ensurePageServer(port, '/probe', process.cwd())
  serverProcess = pageServer.process
  const reports: ProbeReport[] = []
  for (const width of widths) {
    const requestId = `${Date.now()}-${width}-${Math.random().toString(36).slice(2)}`
    const url =
      `${pageServer.baseUrl}/probe?text=${encodeURIComponent(text)}` +
      `&width=${width}` +
      `&font=${encodeURIComponent(font)}` +
      `&lineHeight=${lineHeight}` +
      `&dir=${encodeURIComponent(dir)}` +
      `&lang=${encodeURIComponent(lang)}` +
      `&whiteSpace=${encodeURIComponent(whiteSpace)}` +
      (method === null ? '' : `&method=${encodeURIComponent(method)}`) +
      `&requestId=${encodeURIComponent(requestId)}`
    const report = await loadHashReport<ProbeReport>(session, url, requestId, browser)
    reports.push(report)
    if (widths.length > 1) {
      console.log(`[width:${width}]`)
    }
    printReport(report)
  }
  if (widths.length > 1) {
    printMatrixSummary(reports)
  }
  if (output !== null) {
    const payload = widths.length === 1 ? reports[0] : reports
    writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  }
} finally {
  session.close()
  serverProcess?.kill()
  lock.release()
}
