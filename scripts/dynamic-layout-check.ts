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

function printReport(report: DynamicLayoutReport): void {
  if (report.status === 'error') {
    console.log(`error: ${report.message ?? 'unknown error'}`)
    return
  }

  const page = report.page
  const headline = report.headline
  const body = report.body
  const logos = report.logos
  if (page === undefined || headline === undefined || body === undefined || logos === undefined) {
    console.log('error: incomplete dynamic-layout report')
    return
  }

  console.log(
    `${page.width}x${page.height} | ${page.isNarrow ? 'narrow' : 'spread'} | ` +
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
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['DYNAMIC_LAYOUT_CHECK_TIMEOUT_MS'] ?? '60000', 10)
const openaiAngle = parseStringFlag('openaiAngle')
const claudeAngle = parseStringFlag('claudeAngle')

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/demos/dynamic-layout', process.cwd())
  serverProcess = pageServer.process
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const url =
    `${pageServer.baseUrl}/demos/dynamic-layout?report=1` +
    `&requestId=${encodeURIComponent(requestId)}` +
    (openaiAngle === null ? '' : `&openaiAngle=${encodeURIComponent(openaiAngle)}`) +
    (claudeAngle === null ? '' : `&claudeAngle=${encodeURIComponent(claudeAngle)}`)
  const report = await loadHashReport<DynamicLayoutReport>(session, url, requestId, browser, timeoutMs)
  printReport(report)

  if (output !== null) {
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`wrote ${output}`)
  }

  if (report.status === 'error') {
    process.exitCode = 1
  }
} finally {
  session.close()
  serverProcess?.kill('SIGTERM')
  lock.release()
}
