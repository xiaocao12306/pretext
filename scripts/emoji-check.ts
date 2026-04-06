import { type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { EMOJI_PROBE_PRESETS, findEmojiProbePreset, type EmojiProbePreset } from '../pages/probe-presets.ts'
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
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
  }
}

type EmojiSizeSummary = {
  size: number
  mismatchedEmojiCount: number
  correctionDiffs: number[]
  constantAcrossFonts: boolean
  maxVariance: number
  worstEmoji: string | null
}

type EmojiReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment?: EnvironmentFingerprint
  emojiCount?: number
  fontCount?: number
  thresholdPx?: number
  sizes?: number[]
  totalMismatchObservations?: number
  sizeSummaries?: EmojiSizeSummary[]
  constantAcrossAllSizes?: boolean
  fontIndependentSizes?: number[]
  variableSizes?: number[]
  message?: string
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['EMOJI_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari') {
    throw new Error(`Unsupported browser ${browser}; expected chrome or safari`)
  }
  return browser
}

function parsePresetKeys(raw: string | null): EmojiProbePreset[] {
  const value = raw ?? process.env['EMOJI_CHECK_PRESETS'] ?? ''
  if (value.trim() === '') return []
  const presets = value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(key => {
      const preset = findEmojiProbePreset(key)
      if (preset === null) {
        throw new Error(`Unknown emoji preset ${key}; expected one of ${EMOJI_PROBE_PRESETS.map(item => item.key).join(', ')}`)
      }
      return preset
    })
  return presets
}

function printReport(report: EmojiReport): void {
  if (report.status === 'error') {
    console.log(`error: ${report.message ?? 'unknown error'}`)
    return
  }

  console.log(
    `emoji ${report.emojiCount ?? '?'} | fonts ${report.fontCount ?? '?'} | ` +
    `constant-all-sizes ${report.constantAcrossAllSizes ? 'yes' : 'no'} | ` +
    `threshold ${report.thresholdPx?.toFixed(2) ?? '?'} | ` +
    `sizes ${(report.sizes ?? []).join(',') || '?'}`,
  )
  if (report.environment !== undefined) {
    const env = report.environment
    console.log(
      `env: dpr ${env.devicePixelRatio} | viewport ${env.viewport.innerWidth}x${env.viewport.innerHeight} | ` +
      `outer ${env.viewport.outerWidth}x${env.viewport.outerHeight}`,
    )
  }
  if (report.totalMismatchObservations !== undefined) {
    console.log(`mismatch observations: ${report.totalMismatchObservations}`)
  }

  for (const summary of report.sizeSummaries ?? []) {
    const diffs = summary.correctionDiffs.length === 0
      ? 'none'
      : summary.correctionDiffs.map(diff => `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`).join(', ')
    console.log(
      `${summary.size}px | mismatch ${summary.mismatchedEmojiCount} | ` +
      `${summary.constantAcrossFonts ? 'constant' : `varies ${summary.maxVariance.toFixed(2)}px`} | ` +
      `correction ${diffs}` +
      (summary.worstEmoji === null ? '' : ` | worst ${summary.worstEmoji}`),
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const output = parseStringFlag('output')
const timeoutMs = Number.parseInt(process.env['EMOJI_CHECK_TIMEOUT_MS'] ?? '60000', 10)
const sizes = parseStringFlag('sizes')
const threshold = parseStringFlag('threshold')
const presets = parsePresetKeys(parseStringFlag('presets'))

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/emoji-test', process.cwd())
  serverProcess = pageServer.process

  if (presets.length === 0) {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const url =
      `${pageServer.baseUrl}/emoji-test?report=1` +
      `&requestId=${encodeURIComponent(requestId)}` +
      (sizes === null ? '' : `&sizes=${encodeURIComponent(sizes)}`) +
      (threshold === null ? '' : `&threshold=${encodeURIComponent(threshold)}`)
    const report = await loadHashReport<EmojiReport>(session, url, requestId, browser, timeoutMs)
    printReport(report)

    if (output !== null) {
      writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      console.log(`wrote ${output}`)
    }

    if (report.status === 'error') {
      process.exitCode = 1
    }
  } else {
    const reports: Array<{ preset: EmojiProbePreset['key']; report: EmojiReport }> = []
    for (let index = 0; index < presets.length; index++) {
      const preset = presets[index]!
      const requestId = `${Date.now()}-${preset.key}-${Math.random().toString(36).slice(2, 8)}`
      const url =
        `${pageServer.baseUrl}/emoji-test?report=1` +
        `&requestId=${encodeURIComponent(requestId)}` +
        `&preset=${encodeURIComponent(preset.key)}`
      const report = await loadHashReport<EmojiReport>(session, url, requestId, browser, timeoutMs)
      console.log(`[preset:${preset.key}]`)
      printReport(report)
      reports.push({ preset: preset.key, report })
      if (report.status === 'error') {
        process.exitCode = 1
      }
    }

    if (output !== null) {
      writeFileSync(output, `${JSON.stringify(reports, null, 2)}\n`, 'utf8')
      console.log(`wrote ${output}`)
    }
  }
} finally {
  session.close()
  serverProcess?.kill('SIGTERM')
  lock.release()
}
