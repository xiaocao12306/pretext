import { type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { BUBBLE_PROBE_PRESETS, findBubbleProbePreset, type BubbleProbePreset } from '../pages/probe-presets.ts'
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

type BubblesReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment?: EnvironmentFingerprint
  controls?: {
    chatWidth: number
    maxChatWidth: number
    bubbleMaxWidth: number
    bubbleCount: number
  }
  waste?: {
    totalWastedPixels: number
    totalSavedWidth: number
    maxSavedWidth: number
    maxCssWidth: number
    maxTightWidth: number
  }
  message?: string
}

type BubbleRun = {
  label: string
  requestedChatWidth: number
  presetKey?: BubbleProbePreset['key']
}

type BubbleSummaryRow = {
  preset: string
  chatWidth: number
  maxChatWidth: number
  totalWastedPixels: number
  totalSavedWidth: number
  maxSavedWidth: number
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['BUBBLES_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseWidths(raw: string | null): number[] {
  const value = raw ?? process.env['BUBBLES_CHECK_WIDTHS'] ?? '260,340,460'
  const widths = value
    .split(',')
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(width => Number.isFinite(width) && width > 0)
  if (widths.length === 0) {
    throw new Error(`Expected --widths=... to contain at least one positive integer width, received ${value}`)
  }
  return widths
}

function parsePresetKeys(raw: string | null): BubbleProbePreset[] {
  const value = raw ?? process.env['BUBBLES_CHECK_PRESETS'] ?? ''
  if (value.trim() === '') return []
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(key => {
      const preset = findBubbleProbePreset(key)
      if (preset === null) {
        throw new Error(`Unknown bubbles preset ${key}; expected one of ${BUBBLE_PROBE_PRESETS.map(item => item.key).join(', ')}`)
      }
      return preset
    })
}

function buildRuns(presets: BubbleProbePreset[], widths: number[]): BubbleRun[] {
  if (presets.length > 0) {
    return presets.map(preset => ({
      label: preset.key,
      requestedChatWidth: preset.chatWidth,
      presetKey: preset.key,
    }))
  }
  return widths.map(width => ({
    label: `${width}px`,
    requestedChatWidth: width,
  }))
}

function formatRunLabel(run: BubbleRun): string {
  return run.presetKey === undefined
    ? run.label
    : `${run.presetKey} (${run.requestedChatWidth}px)`
}

function printReport(report: BubblesReport, run: BubbleRun): void {
  const descriptor = formatRunLabel(run)
  if (report.status === 'error') {
    console.log(`${descriptor} | error: ${report.message ?? 'unknown error'}`)
    return
  }

  const controls = report.controls
  const waste = report.waste
  if (controls === undefined || waste === undefined) {
    console.log(`${descriptor} | error: incomplete bubbles report`)
    return
  }

  console.log(
    `${descriptor} -> preset ${report.presetKey ?? 'manual'} | ` +
    `chat ${controls.chatWidth}px / max ${controls.maxChatWidth}px | ` +
    `bubble max ${controls.bubbleMaxWidth}px | count ${controls.bubbleCount}`,
  )
  console.log(
    `  waste ${Math.round(waste.totalWastedPixels).toLocaleString()} px² | ` +
    `saved ${waste.totalSavedWidth}px total | max saved ${waste.maxSavedWidth}px | ` +
    `css/tight ${waste.maxCssWidth}px/${waste.maxTightWidth}px`,
  )
}

function validatePresetReport(report: BubblesReport, run: BubbleRun): boolean {
  if (run.presetKey === undefined || report.status === 'error') return report.status !== 'error'
  if (report.presetKey === run.presetKey) return true
  console.log(`protocol error: expected presetKey ${run.presetKey}, received ${report.presetKey ?? 'none'}`)
  return false
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}..${max}`
}

function toSummaryRow(entry: { requestedChatWidth: number; report: BubblesReport }): BubbleSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  if (report.controls === undefined || report.waste === undefined) return null
  return {
    preset: report.presetKey ?? `${entry.requestedChatWidth}px`,
    chatWidth: report.controls.chatWidth,
    maxChatWidth: report.controls.maxChatWidth,
    totalWastedPixels: report.waste.totalWastedPixels,
    totalSavedWidth: report.waste.totalSavedWidth,
    maxSavedWidth: report.waste.maxSavedWidth,
  }
}

function printMatrixSummary(entries: Array<{ requestedChatWidth: number; report: BubblesReport }>): void {
  const rows = entries
    .map(toSummaryRow)
    .filter((row): row is BubbleSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  if (rows.length === 0) return

  const chatWidths = rows.map(row => row.chatWidth)
  const maxChatWidths = rows.map(row => row.maxChatWidth)
  const wastedPixels = rows.map(row => row.totalWastedPixels)
  const totalSavedWidths = rows.map(row => row.totalSavedWidth)
  const maxSavedWidths = rows.map(row => row.maxSavedWidth)
  console.log(
    `  chat ${formatRange(Math.min(...chatWidths), Math.max(...chatWidths))} | ` +
    `viewport max ${formatRange(Math.min(...maxChatWidths), Math.max(...maxChatWidths))} | ` +
    `waste ${formatRange(Math.round(Math.min(...wastedPixels)), Math.round(Math.max(...wastedPixels)))} px²`,
  )
  console.log(
    `  total saved ${formatRange(Math.min(...totalSavedWidths), Math.max(...totalSavedWidths))}px | ` +
    `max saved ${formatRange(Math.min(...maxSavedWidths), Math.max(...maxSavedWidths))}px`,
  )

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.preset} -> chat ${row.chatWidth}px | ` +
      `max ${row.maxChatWidth}px | waste ${Math.round(row.totalWastedPixels)} px² | ` +
      `saved ${row.totalSavedWidth}px | max saved ${row.maxSavedWidth}px`,
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const presets = parsePresetKeys(parseStringFlag('presets'))
const widths = parseWidths(parseStringFlag('widths'))
const runs = buildRuns(presets, widths)
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['BUBBLES_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ requestedChatWidth: number; report: BubblesReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/bubbles', process.cwd())
  serverProcess = pageServer.process

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const run = runs[runIndex]!
    const requestId = `${Date.now()}-${run.requestedChatWidth}-${Math.random().toString(36).slice(2, 8)}`
    const url =
      run.presetKey === undefined
        ? `${pageServer.baseUrl}/demos/bubbles?report=1` +
          `&requestId=${encodeURIComponent(requestId)}` +
          `&chatWidth=${run.requestedChatWidth}`
        : `${pageServer.baseUrl}/demos/bubbles?report=1` +
          `&requestId=${encodeURIComponent(requestId)}` +
          `&preset=${encodeURIComponent(run.presetKey)}`
    const report = await loadHashReport<BubblesReport>(session, url, requestId, browser, timeoutMs)
    reports.push({ requestedChatWidth: run.requestedChatWidth, report })
    printReport(report, run)

    if (report.status === 'error' || !validatePresetReport(report, run)) {
      process.exitCode = 1
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
