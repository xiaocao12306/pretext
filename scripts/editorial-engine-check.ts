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

type OrbPreset = 'default' | 'stacked' | 'diagonal' | 'corridor'

type EditorialEngineReport = {
  status: 'ready' | 'error'
  requestId?: string
  page?: {
    width: number
    height: number
    isNarrow: boolean
    columnCount: number
    columnWidth: number
    activeOrbCount: number
  }
  headline?: {
    lineCount: number
  }
  body?: {
    lineCount: number
    columnLineCounts: number[]
    consumedAllText: boolean
    remainingSegmentIndex: number
    remainingGraphemeIndex: number
  }
  pullquotes?: {
    count: number
    totalLineCount: number
  }
  routing?: {
    bandCount: number
    blockedBandCount: number
    skippedBandCount: number
    avgChosenSlotWidth: number | null
    minChosenSlotWidth: number | null
    maxChosenSlotWidth: number | null
  }
  orbs?: {
    preset: OrbPreset
    animated: boolean
    activeCount: number
    pausedCount: number
  }
  message?: string
}

type Scenario = {
  width: number
  height: number
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['EDITORIAL_ENGINE_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseScenarios(raw: string | null): Scenario[] {
  const value = raw ?? process.env['EDITORIAL_ENGINE_CHECK_SCENARIOS'] ?? '1365x900,960x900,640x900'
  const scenarios = value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(parseScenario)
  if (scenarios.length === 0) {
    throw new Error(`Expected --scenarios=WxH,... to contain at least one scenario, received ${value}`)
  }
  return scenarios
}

function parsePresets(raw: string | null): OrbPreset[] {
  const value = raw ?? process.env['EDITORIAL_ENGINE_CHECK_PRESETS'] ?? 'default,stacked,diagonal'
  const presets = value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(parsePreset)
  if (presets.length === 0) {
    throw new Error(`Expected --presets=... to contain at least one preset, received ${value}`)
  }
  return presets
}

function parseScenario(raw: string): Scenario {
  const match = /^(\d+)x(\d+)$/i.exec(raw)
  if (match === null) {
    throw new Error(`Invalid scenario ${raw}; expected WxH`)
  }
  const width = Number.parseInt(match[1]!, 10)
  const height = Number.parseInt(match[2]!, 10)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid scenario ${raw}; expected positive integers`)
  }
  return { width, height }
}

function parsePreset(raw: string): OrbPreset {
  switch (raw) {
    case 'default':
    case 'stacked':
    case 'diagonal':
    case 'corridor':
      return raw
    default:
      throw new Error(`Invalid preset ${raw}; expected default|stacked|diagonal|corridor`)
  }
}

function printReport(report: EditorialEngineReport, scenario: Scenario, preset: OrbPreset): void {
  if (report.status === 'error') {
    console.log(`${scenario.width}x${scenario.height} @ ${preset} | error: ${report.message ?? 'unknown error'}`)
    return
  }

  const page = report.page
  const headline = report.headline
  const body = report.body
  const pullquotes = report.pullquotes
  const routing = report.routing
  const orbs = report.orbs
  if (
    page === undefined ||
    headline === undefined ||
    body === undefined ||
    pullquotes === undefined ||
    routing === undefined ||
    orbs === undefined
  ) {
    console.log(`${scenario.width}x${scenario.height} @ ${preset} | error: incomplete editorial-engine report`)
    return
  }

  console.log(
    `${scenario.width}x${scenario.height} @ ${preset} -> ${page.columnCount}col ${page.isNarrow ? 'narrow' : 'spread'} | ` +
    `headline ${headline.lineCount} | body ${body.lineCount} (${body.columnLineCounts.join('+') || '0'}) | ` +
    `pullquotes ${pullquotes.count}/${pullquotes.totalLineCount}`,
  )
  console.log(
    `  orbs ${orbs.activeCount} active ${orbs.pausedCount} paused | ` +
    `routing bands ${routing.bandCount} blocked ${routing.blockedBandCount} skipped ${routing.skippedBandCount} | ` +
    `slot avg ${formatWidth(routing.avgChosenSlotWidth)}`,
  )
  console.log(
    `  ${body.consumedAllText ? 'body complete' : `body cursor ${body.remainingSegmentIndex}:${body.remainingGraphemeIndex}`}`,
  )
}

function formatWidth(value: number | null): string {
  return value === null ? 'none' : `${value.toFixed(1)}px`
}

const browser = parseBrowser(parseStringFlag('browser'))
const scenarios = parseScenarios(parseStringFlag('scenarios'))
const presets = parsePresets(parseStringFlag('presets'))
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['EDITORIAL_ENGINE_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ scenario: Scenario; preset: OrbPreset; report: EditorialEngineReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/editorial-engine', process.cwd())
  serverProcess = pageServer.process

  for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
    const scenario = scenarios[scenarioIndex]!
    for (let presetIndex = 0; presetIndex < presets.length; presetIndex++) {
      const preset = presets[presetIndex]!
      const requestId = `${Date.now()}-${scenario.width}x${scenario.height}-${preset}-${Math.random().toString(36).slice(2, 8)}`
      const url =
        `${pageServer.baseUrl}/demos/editorial-engine?report=1` +
        `&requestId=${encodeURIComponent(requestId)}` +
        `&pageWidth=${scenario.width}` +
        `&pageHeight=${scenario.height}` +
        `&orbPreset=${encodeURIComponent(preset)}` +
        `&animate=0`
      const report = await loadHashReport<EditorialEngineReport>(session, url, requestId, browser, timeoutMs)
      reports.push({ scenario, preset, report })
      printReport(report, scenario, preset)

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
