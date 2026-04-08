import { type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { RICH_NOTE_PROBE_PRESETS, findRichNoteProbePreset, type RichNoteProbePreset } from '../pages/probe-presets.ts'
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

type RichNoteReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment?: EnvironmentFingerprint
  note?: {
    bodyWidth: number
    maxBodyWidth: number
    noteWidth: number
    lineCount: number
    noteBodyHeight: number
    chipCount: number
    fragmentCount: number
  }
  message?: string
}

type RichNoteRun = {
  label: string
  requestedBodyWidth: number
  presetKey?: RichNoteProbePreset['key']
}

type RichNoteSummaryRow = {
  preset: string
  bodyWidth: number
  maxBodyWidth: number
  noteWidth: number
  lineCount: number
  noteBodyHeight: number
  chipCount: number
  fragmentCount: number
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['RICH_NOTE_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseWidths(raw: string | null): number[] {
  const value = raw ?? process.env['RICH_NOTE_CHECK_WIDTHS'] ?? '320,516,680'
  const widths = value
    .split(',')
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(width => Number.isFinite(width) && width > 0)
  if (widths.length === 0) {
    throw new Error(`Expected --widths=... to contain at least one positive integer width, received ${value}`)
  }
  return widths
}

function parsePresetKeys(raw: string | null): RichNoteProbePreset[] {
  const value = raw ?? process.env['RICH_NOTE_CHECK_PRESETS'] ?? ''
  if (value.trim() === '') return []
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(key => {
      const preset = findRichNoteProbePreset(key)
      if (preset === null) {
        throw new Error(`Unknown rich-note preset ${key}; expected one of ${RICH_NOTE_PROBE_PRESETS.map(item => item.key).join(', ')}`)
      }
      return preset
    })
}

function buildRuns(presets: RichNoteProbePreset[], widths: number[]): RichNoteRun[] {
  if (presets.length > 0) {
    return presets.map(preset => ({
      label: preset.key,
      requestedBodyWidth: preset.bodyWidth,
      presetKey: preset.key,
    }))
  }
  return widths.map(width => ({
    label: `${width}px`,
    requestedBodyWidth: width,
  }))
}

function formatRunLabel(run: RichNoteRun): string {
  return run.presetKey === undefined
    ? run.label
    : `${run.presetKey} (${run.requestedBodyWidth}px)`
}

function printReport(report: RichNoteReport, run: RichNoteRun): void {
  const descriptor = formatRunLabel(run)
  if (report.status === 'error') {
    console.log(`${descriptor} | error: ${report.message ?? 'unknown error'}`)
    return
  }

  const note = report.note
  if (note === undefined) {
    console.log(`${descriptor} | error: incomplete rich-note report`)
    return
  }

  console.log(
    `${descriptor} -> preset ${report.presetKey ?? 'manual'} | ` +
    `body ${note.bodyWidth}px / max ${note.maxBodyWidth}px | ` +
    `shell ${note.noteWidth}px | lines ${note.lineCount} | height ${note.noteBodyHeight}px`,
  )
  console.log(
    `  chips ${note.chipCount} | fragments ${note.fragmentCount}`,
  )
}

function validatePresetReport(report: RichNoteReport, run: RichNoteRun): boolean {
  if (run.presetKey === undefined || report.status === 'error') return report.status !== 'error'
  if (report.presetKey === run.presetKey) return true
  console.log(`protocol error: expected presetKey ${run.presetKey}, received ${report.presetKey ?? 'none'}`)
  return false
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}..${max}`
}

function toSummaryRow(entry: { requestedBodyWidth: number; report: RichNoteReport }): RichNoteSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  if (report.note === undefined) return null
  return {
    preset: report.presetKey ?? `${entry.requestedBodyWidth}px`,
    bodyWidth: report.note.bodyWidth,
    maxBodyWidth: report.note.maxBodyWidth,
    noteWidth: report.note.noteWidth,
    lineCount: report.note.lineCount,
    noteBodyHeight: report.note.noteBodyHeight,
    chipCount: report.note.chipCount,
    fragmentCount: report.note.fragmentCount,
  }
}

function printMatrixSummary(entries: Array<{ requestedBodyWidth: number; report: RichNoteReport }>): void {
  const rows = entries
    .map(toSummaryRow)
    .filter((row): row is RichNoteSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  if (rows.length === 0) return

  const bodyWidths = rows.map(row => row.bodyWidth)
  const maxBodyWidths = rows.map(row => row.maxBodyWidth)
  const noteWidths = rows.map(row => row.noteWidth)
  const lineCounts = rows.map(row => row.lineCount)
  const noteHeights = rows.map(row => row.noteBodyHeight)
  const fragmentCounts = rows.map(row => row.fragmentCount)
  console.log(
    `  body ${formatRange(Math.min(...bodyWidths), Math.max(...bodyWidths))} | ` +
    `viewport max ${formatRange(Math.min(...maxBodyWidths), Math.max(...maxBodyWidths))} | ` +
    `shell ${formatRange(Math.min(...noteWidths), Math.max(...noteWidths))}`,
  )
  console.log(
    `  lines ${formatRange(Math.min(...lineCounts), Math.max(...lineCounts))} | ` +
    `height ${formatRange(Math.min(...noteHeights), Math.max(...noteHeights))}px | ` +
    `fragments ${formatRange(Math.min(...fragmentCounts), Math.max(...fragmentCounts))}`,
  )

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.preset} -> body ${row.bodyWidth}px | ` +
      `shell ${row.noteWidth}px | lines ${row.lineCount} | height ${row.noteBodyHeight}px | ` +
      `chips ${row.chipCount} | fragments ${row.fragmentCount}`,
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
const timeoutMs = Number.parseInt(process.env['RICH_NOTE_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ requestedBodyWidth: number; report: RichNoteReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/rich-note', process.cwd())
  serverProcess = pageServer.process

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const run = runs[runIndex]!
    const requestId = `${Date.now()}-${run.requestedBodyWidth}-${Math.random().toString(36).slice(2, 8)}`
    const url =
      run.presetKey === undefined
        ? `${pageServer.baseUrl}/demos/rich-note?report=1` +
          `&requestId=${encodeURIComponent(requestId)}` +
          `&bodyWidth=${run.requestedBodyWidth}`
        : `${pageServer.baseUrl}/demos/rich-note?report=1` +
          `&requestId=${encodeURIComponent(requestId)}` +
          `&preset=${encodeURIComponent(run.presetKey)}`
    const report = await loadHashReport<RichNoteReport>(session, url, requestId, browser, timeoutMs)
    reports.push({ requestedBodyWidth: run.requestedBodyWidth, report })
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
