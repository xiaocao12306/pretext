import { type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { ACCORDION_PROBE_PRESETS, findAccordionProbePreset, type AccordionProbePreset } from '../pages/probe-presets.ts'
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

type AccordionItemReport = {
  id: string
  lineCount: number
  height: number
}

type AccordionReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment?: EnvironmentFingerprint
  accordion?: {
    pageWidth: number
    contentWidth: number
    openItemId: string | null
    itemCount: number
    openLineCount: number
    maxPanelHeight: number
  }
  items?: AccordionItemReport[]
  message?: string
}

type AccordionRun = {
  label: string
  pageWidth: number
  openItemId: string
  presetKey?: AccordionProbePreset['key']
}

type AccordionSummaryRow = {
  preset: string
  pageWidth: number
  contentWidth: number
  openItemId: string | null
  openLineCount: number
  maxPanelHeight: number
}

const ACCORDION_ITEM_IDS = ['shipping', 'ops', 'research', 'mixed'] as const
type AccordionItemId = typeof ACCORDION_ITEM_IDS[number]

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['ACCORDION_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseWidths(raw: string | null): number[] {
  const value = raw ?? process.env['ACCORDION_CHECK_WIDTHS'] ?? '520,780'
  const widths = value
    .split(',')
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(width => Number.isFinite(width) && width > 0)
  if (widths.length === 0) {
    throw new Error(`Expected --widths=... to contain at least one positive integer width, received ${value}`)
  }
  return widths
}

function parseOpenIds(raw: string | null): AccordionItemId[] {
  const value = raw ?? process.env['ACCORDION_CHECK_OPEN_IDS'] ?? 'shipping,research,mixed'
  const openIds = value
    .split(',')
    .map(part => part.trim())
    .filter((part): part is AccordionItemId => (ACCORDION_ITEM_IDS as readonly string[]).includes(part))
  if (openIds.length === 0) {
    throw new Error(`Expected --openIds=... to contain one of ${ACCORDION_ITEM_IDS.join(', ')}, received ${value}`)
  }
  return openIds
}

function parsePresetKeys(raw: string | null): AccordionProbePreset[] {
  const value = raw ?? process.env['ACCORDION_CHECK_PRESETS'] ?? ''
  if (value.trim() === '') return []
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(key => {
      const preset = findAccordionProbePreset(key)
      if (preset === null) {
        throw new Error(`Unknown accordion preset ${key}; expected one of ${ACCORDION_PROBE_PRESETS.map(item => item.key).join(', ')}`)
      }
      return preset
    })
}

function buildRuns(
  presets: AccordionProbePreset[],
  widths: number[],
  openIds: AccordionItemId[],
): AccordionRun[] {
  if (presets.length > 0) {
    return presets.map(preset => ({
      label: preset.key,
      pageWidth: preset.pageWidth,
      openItemId: preset.openItemId,
      presetKey: preset.key,
    }))
  }

  const runs: AccordionRun[] = []
  for (let widthIndex = 0; widthIndex < widths.length; widthIndex++) {
    const width = widths[widthIndex]!
    for (let openIndex = 0; openIndex < openIds.length; openIndex++) {
      const openItemId = openIds[openIndex]!
      runs.push({
        label: `${width}px @ ${openItemId}`,
        pageWidth: width,
        openItemId,
      })
    }
  }
  return runs
}

function formatRunLabel(run: AccordionRun): string {
  return run.presetKey === undefined
    ? run.label
    : `${run.presetKey} (${run.pageWidth}px @ ${run.openItemId})`
}

function printReport(report: AccordionReport, run: AccordionRun): void {
  const descriptor = formatRunLabel(run)
  if (report.status === 'error') {
    console.log(`${descriptor} | error: ${report.message ?? 'unknown error'}`)
    return
  }

  const accordion = report.accordion
  const items = report.items
  if (accordion === undefined || items === undefined) {
    console.log(`${descriptor} | error: incomplete accordion report`)
    return
  }

  console.log(
    `${descriptor} -> preset ${report.presetKey ?? 'manual'} | ` +
    `page ${accordion.pageWidth}px / content ${accordion.contentWidth}px | ` +
    `open ${accordion.openItemId ?? 'none'} | open lines ${accordion.openLineCount} | max panel ${accordion.maxPanelHeight}px`,
  )
  console.log(
    `  items ${items.map(item => `${item.id}:${item.lineCount}L/${item.height}px`).join(' | ')}`,
  )
}

function validatePresetReport(report: AccordionReport, run: AccordionRun): boolean {
  if (run.presetKey === undefined || report.status === 'error') return report.status !== 'error'
  if (report.presetKey === run.presetKey) return true
  console.log(`protocol error: expected presetKey ${run.presetKey}, received ${report.presetKey ?? 'none'}`)
  return false
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}..${max}`
}

function toSummaryRow(entry: { pageWidth: number; openItemId: string; report: AccordionReport }): AccordionSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  if (report.accordion === undefined) return null
  return {
    preset: report.presetKey ?? `${entry.pageWidth}px@${entry.openItemId}`,
    pageWidth: report.accordion.pageWidth,
    contentWidth: report.accordion.contentWidth,
    openItemId: report.accordion.openItemId,
    openLineCount: report.accordion.openLineCount,
    maxPanelHeight: report.accordion.maxPanelHeight,
  }
}

function printMatrixSummary(entries: Array<{ pageWidth: number; openItemId: string; report: AccordionReport }>): void {
  const rows = entries
    .map(toSummaryRow)
    .filter((row): row is AccordionSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  if (rows.length === 0) return

  const pageWidths = rows.map(row => row.pageWidth)
  const contentWidths = rows.map(row => row.contentWidth)
  const openLineCounts = rows.map(row => row.openLineCount)
  const maxPanelHeights = rows.map(row => row.maxPanelHeight)
  console.log(
    `  page ${formatRange(Math.min(...pageWidths), Math.max(...pageWidths))} | ` +
    `content ${formatRange(Math.min(...contentWidths), Math.max(...contentWidths))} | ` +
    `open lines ${formatRange(Math.min(...openLineCounts), Math.max(...openLineCounts))}`,
  )
  console.log(
    `  max panel ${formatRange(Math.min(...maxPanelHeights), Math.max(...maxPanelHeights))}px`,
  )

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.preset} -> page ${row.pageWidth}px | content ${row.contentWidth}px | ` +
      `open ${row.openItemId ?? 'none'} | lines ${row.openLineCount} | max panel ${row.maxPanelHeight}px`,
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const presets = parsePresetKeys(parseStringFlag('presets'))
const widths = parseWidths(parseStringFlag('widths'))
const openIds = parseOpenIds(parseStringFlag('openIds'))
const runs = buildRuns(presets, widths, openIds)
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['ACCORDION_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ pageWidth: number; openItemId: string; report: AccordionReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/accordion', process.cwd())
  serverProcess = pageServer.process

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const run = runs[runIndex]!
    const requestId = `${Date.now()}-${run.pageWidth}-${run.openItemId}-${Math.random().toString(36).slice(2, 8)}`
    const url =
      run.presetKey === undefined
        ? `${pageServer.baseUrl}/demos/accordion?report=1` +
          `&requestId=${encodeURIComponent(requestId)}` +
          `&pageWidth=${run.pageWidth}` +
          `&open=${encodeURIComponent(run.openItemId)}`
        : `${pageServer.baseUrl}/demos/accordion?report=1` +
          `&requestId=${encodeURIComponent(requestId)}` +
          `&preset=${encodeURIComponent(run.presetKey)}`
    const report = await loadHashReport<AccordionReport>(session, url, requestId, browser, timeoutMs)
    reports.push({ pageWidth: run.pageWidth, openItemId: run.openItemId, report })
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
