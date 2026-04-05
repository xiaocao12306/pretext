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

type DynamicLayoutReport = {
  status: 'ready' | 'error'
  requestId?: string
  page?: {
    width: number
    height: number
    isNarrow: boolean
    gutter: number
    centerGap: number
    columnWidth: number
  }
  headline?: {
    lineCount: number
    rectCount: number
  }
  body?: {
    leftLineCount: number
    rightLineCount: number
    totalLineCount: number
    rightColumnUsed: boolean
    consumedAllText: boolean
    remainingSegmentIndex: number
    remainingGraphemeIndex: number
  }
  logos?: {
    openai: {
      angle: number
      layoutHullPoints: number
      hitHullPoints: number
    }
    claude: {
      angle: number
      layoutHullPoints: number
      hitHullPoints: number
    }
  }
  message?: string
}

type Scenario = {
  width: number
  height: number
}

type AnglePair = {
  openaiAngle: string
  claudeAngle: string
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['DYNAMIC_LAYOUT_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parseScenarios(raw: string | null): Scenario[] {
  const value = raw ?? process.env['DYNAMIC_LAYOUT_CHECK_SCENARIOS'] ?? '1365x900,700x900,900x540'
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

function parseAnglePairs(raw: string | null): AnglePair[] {
  const value = raw ?? process.env['DYNAMIC_LAYOUT_CHECK_ANGLE_PAIRS'] ?? '0:0,-3.141593:0,0:3.141593'
  const pairs = value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(parseAnglePair)
  if (pairs.length === 0) {
    throw new Error(`Expected --anglePairs=openai:claude,... to contain at least one pair, received ${value}`)
  }
  return pairs
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

function parseAnglePair(raw: string): AnglePair {
  const [openaiAngle, claudeAngle, ...rest] = raw.split(':')
  if (openaiAngle === undefined || claudeAngle === undefined || rest.length > 0) {
    throw new Error(`Invalid angle pair ${raw}; expected openai:claude`)
  }
  if (!Number.isFinite(Number.parseFloat(openaiAngle)) || !Number.isFinite(Number.parseFloat(claudeAngle))) {
    throw new Error(`Invalid angle pair ${raw}; expected numeric values`)
  }
  return { openaiAngle, claudeAngle }
}

function printReport(report: DynamicLayoutReport, scenario: Scenario, anglePair: AnglePair): void {
  if (report.status === 'error') {
    console.log(`${scenario.width}x${scenario.height} @ ${anglePair.openaiAngle}:${anglePair.claudeAngle} | error: ${report.message ?? 'unknown error'}`)
    return
  }

  const page = report.page
  const headline = report.headline
  const body = report.body
  const logos = report.logos
  if (page === undefined || headline === undefined || body === undefined || logos === undefined) {
    console.log(`${scenario.width}x${scenario.height} @ ${anglePair.openaiAngle}:${anglePair.claudeAngle} | error: incomplete dynamic-layout report`)
    return
  }

  console.log(
    `${scenario.width}x${scenario.height} @ ${anglePair.openaiAngle}:${anglePair.claudeAngle} -> ${page.width}x${page.height} | ${page.isNarrow ? 'narrow' : 'spread'} | ` +
    `headline ${headline.lineCount} | body ${body.leftLineCount}+${body.rightLineCount}=${body.totalLineCount} | ` +
    `${body.consumedAllText ? 'complete' : `truncated@${body.remainingSegmentIndex}:${body.remainingGraphemeIndex}`}`,
  )
  console.log(
    `  right-column ${body.rightColumnUsed ? 'used' : 'unused'} | ` +
    `openai hull ${logos.openai.layoutHullPoints}/${logos.openai.hitHullPoints} angle ${logos.openai.angle.toFixed(3)} | ` +
    `claude hull ${logos.claude.layoutHullPoints}/${logos.claude.hitHullPoints} angle ${logos.claude.angle.toFixed(3)}`,
  )
}

const browser = parseBrowser(parseStringFlag('browser'))
const scenarios = parseScenarios(parseStringFlag('scenarios'))
const anglePairs = parseAnglePairs(parseStringFlag('anglePairs'))
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['DYNAMIC_LAYOUT_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ scenario: Scenario; anglePair: AnglePair; report: DynamicLayoutReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/dynamic-layout', process.cwd())
  serverProcess = pageServer.process

  for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
    const scenario = scenarios[scenarioIndex]!
    for (let angleIndex = 0; angleIndex < anglePairs.length; angleIndex++) {
      const anglePair = anglePairs[angleIndex]!
      const requestId =
        `${Date.now()}-${scenario.width}x${scenario.height}-${anglePair.openaiAngle}:${anglePair.claudeAngle}-` +
        `${Math.random().toString(36).slice(2, 8)}`
      const url =
        `${pageServer.baseUrl}/demos/dynamic-layout?report=1` +
        `&requestId=${encodeURIComponent(requestId)}` +
        `&pageWidth=${scenario.width}` +
        `&pageHeight=${scenario.height}` +
        `&openaiAngle=${encodeURIComponent(anglePair.openaiAngle)}` +
        `&claudeAngle=${encodeURIComponent(anglePair.claudeAngle)}`
      const report = await loadHashReport<DynamicLayoutReport>(session, url, requestId, browser, timeoutMs)
      reports.push({ scenario, anglePair, report })
      printReport(report, scenario, anglePair)

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
