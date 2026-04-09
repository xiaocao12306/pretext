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

type EmojiFontSummary = {
  fontFamily: string
  mismatchSizeCount: number
  mismatchSizes: number[]
  totalMismatches: number
  maxAbsDiff: number
  worstEmoji: string | null
  worstSize: number | null
  correctionDiffs: number[]
}

type EmojiReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  focus?: {
    size: number | null
    fontFamily: string | null
  }
  environment?: EnvironmentFingerprint
  emojiCount?: number
  fontCount?: number
  thresholdPx?: number
  sizes?: number[]
  totalMismatchObservations?: number
  sizeSummaries?: EmojiSizeSummary[]
  fontSummaries?: EmojiFontSummary[]
  constantAcrossAllSizes?: boolean
  fontIndependentSizes?: number[]
  variableSizes?: number[]
  routeCount?: number
  assetPreviewSize?: number
  message?: string
}

type EmojiSummaryRow = {
  preset: string
  constantAcrossAllSizes: boolean
  totalMismatchObservations: number
  variableSizeCount: number
  maxVariance: number
  noisyFontCount: number
  hottestFont: string | null
  focus: string
  routeCount: number
  assetPreviewSize: number | null
}

const ASSET_PREVIEW_SIZES = [48, 72, 96, 144] as const

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

function parseOptionalPositiveInt(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseSizes(raw: string | null): number[] {
  const fallback = EMOJI_PROBE_PRESETS[0]?.sizes ?? [16, 24, 32]
  if (raw === null || raw.trim() === '') return fallback.slice()
  const parsed = raw
    .split(',')
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(value => Number.isFinite(value) && value > 0)
  return parsed.length === 0 ? fallback.slice() : parsed
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
    `preset ${report.presetKey ?? 'manual'} | ` +
    `emoji ${report.emojiCount ?? '?'} | fonts ${report.fontCount ?? '?'} | ` +
    `constant-all-sizes ${report.constantAcrossAllSizes ? 'yes' : 'no'} | ` +
    `threshold ${report.thresholdPx?.toFixed(2) ?? '?'} | ` +
    `sizes ${(report.sizes ?? []).join(',') || '?'} | ` +
    `routes ${report.routeCount ?? '?'} | asset ${report.assetPreviewSize ?? '?'}px`,
  )
  console.log(`focus: ${formatEmojiFocus(report.focus)}`)
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

  for (const summary of report.fontSummaries ?? []) {
    const diffs = summary.correctionDiffs.length === 0
      ? 'none'
      : summary.correctionDiffs.map(diff => `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`).join(', ')
    console.log(
      `font ${compactFontLabel(summary.fontFamily)} | sizes ${summary.mismatchSizes.join(',') || 'none'} | ` +
      `mismatch ${summary.totalMismatches} | max ${summary.maxAbsDiff.toFixed(2)}px | ` +
      `correction ${diffs}` +
      (summary.worstEmoji === null || summary.worstSize === null ? '' : ` | worst ${summary.worstEmoji}@${summary.worstSize}px`),
    )
  }
}

function validatePresetReport(report: EmojiReport, expectedPresetKey: EmojiProbePreset['key']): boolean {
  if (report.status === 'error') return false
  if (report.presetKey === expectedPresetKey) return true
  console.log(`protocol error: expected presetKey ${expectedPresetKey}, received ${report.presetKey ?? 'none'}`)
  return false
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}..${max}`
}

function toSummaryRow(entry: { preset: EmojiProbePreset['key']; report: EmojiReport }): EmojiSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  const sizeSummaries = report.sizeSummaries ?? []
  const fontSummaries = report.fontSummaries ?? []
  const variances = sizeSummaries.map(summary => summary.maxVariance)
  const noisyFonts = fontSummaries.filter(summary => summary.totalMismatches > 0)
  const hottestFont = noisyFonts.reduce<EmojiFontSummary | null>((best, current) => {
    if (best === null) return current
    return current.totalMismatches > best.totalMismatches ? current : best
  }, null)
  return {
    preset: report.presetKey ?? entry.preset,
    constantAcrossAllSizes: report.constantAcrossAllSizes ?? false,
    totalMismatchObservations: report.totalMismatchObservations ?? 0,
    variableSizeCount: (report.variableSizes ?? []).length,
    maxVariance: variances.length === 0 ? 0 : Math.max(...variances),
    noisyFontCount: noisyFonts.length,
    hottestFont: hottestFont === null ? null : compactFontLabel(hottestFont.fontFamily),
    focus: formatEmojiFocus(report.focus),
    routeCount: report.routeCount ?? 0,
    assetPreviewSize: report.assetPreviewSize ?? null,
  }
}

function printMatrixSummary(entries: Array<{ preset: EmojiProbePreset['key']; report: EmojiReport }>): void {
  const rows = entries
    .map(toSummaryRow)
    .filter((row): row is EmojiSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  if (rows.length === 0) return

  const constantCount = rows.filter(row => row.constantAcrossAllSizes).length
  const mismatchObservations = rows.map(row => row.totalMismatchObservations)
  const variableSizeCounts = rows.map(row => row.variableSizeCount)
  const maxVariances = rows.map(row => row.maxVariance)
  const noisyFontCounts = rows.map(row => row.noisyFontCount)
  console.log(
    `  constant-all-sizes ${constantCount}/${rows.length} | ` +
    `mismatch observations ${formatRange(Math.min(...mismatchObservations), Math.max(...mismatchObservations))} | ` +
    `variable sizes ${formatRange(Math.min(...variableSizeCounts), Math.max(...variableSizeCounts))} | ` +
    `max variance ${Number(Math.min(...maxVariances).toFixed(2))}..${Number(Math.max(...maxVariances).toFixed(2))}px | ` +
    `noisy fonts ${formatRange(Math.min(...noisyFontCounts), Math.max(...noisyFontCounts))}`,
  )

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.preset} -> ${row.constantAcrossAllSizes ? 'constant' : 'variable'} | ` +
      `mismatch ${row.totalMismatchObservations} | variable sizes ${row.variableSizeCount} | ` +
      `max variance ${row.maxVariance.toFixed(2)}px | noisy fonts ${row.noisyFontCount}` +
      (row.hottestFont === null ? '' : ` | hot ${row.hottestFont}`) +
      ` | routes ${row.routeCount} | asset ${row.assetPreviewSize ?? '?'}px | focus ${row.focus}`,
    )
  }
}

function compactFontLabel(fontFamily: string): string {
  const normalized = fontFamily.replaceAll('"', '')
  return normalized.split(',')[0] ?? normalized
}

function formatEmojiFocus(
  focus: { size: number | null; fontFamily: string | null } | undefined,
): string {
  const size = focus?.size ?? null
  const fontFamily = focus?.fontFamily ?? null
  const parts: string[] = []
  if (size !== null) parts.push(`${size}px`)
  if (fontFamily !== null) parts.push(compactFontLabel(fontFamily))
  return parts.length === 0 ? 'all sizes x fonts' : parts.join(' x ')
}

function validateFocusReport(
  report: EmojiReport,
  expected: { size: number | null; fontFamily: string | null },
): boolean {
  if (report.status === 'error') return false
  const actual = report.focus ?? { size: null, fontFamily: null }
  const normalizedActualFont = actual.fontFamily === null ? null : compactFontLabel(actual.fontFamily)
  const normalizedExpectedFont = expected.fontFamily === null ? null : compactFontLabel(expected.fontFamily)
  if (actual.size === expected.size && normalizedActualFont === normalizedExpectedFont) return true
  console.log(`protocol error: expected focus ${formatEmojiFocus(expected)}, received ${formatEmojiFocus(actual)}`)
  return false
}

function pickNearestAssetPreviewSize(value: number): number {
  let best = ASSET_PREVIEW_SIZES[0]!
  let bestDistance = Math.abs(best - value)
  for (let index = 1; index < ASSET_PREVIEW_SIZES.length; index++) {
    const candidate = ASSET_PREVIEW_SIZES[index]!
    const distance = Math.abs(candidate - value)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function expectedEmojiAssetPreviewSize(
  sizeList: number[],
  focus: { size: number | null; fontFamily: string | null },
): number {
  const fallbackPreset = EMOJI_PROBE_PRESETS[0]
  const fallbackSize =
    fallbackPreset?.sizes[Math.floor(fallbackPreset.sizes.length / 2)] ?? 96
  const anchorSize = focus.size ?? sizeList[Math.floor(sizeList.length / 2)] ?? fallbackSize
  return pickNearestAssetPreviewSize(anchorSize)
}

function validateRouteReport(
  report: EmojiReport,
  expected: { routeCount: number; assetPreviewSize: number },
): boolean {
  if (report.status === 'error') return false
  if (report.routeCount !== expected.routeCount) {
    console.log(`protocol error: expected routeCount ${expected.routeCount}, received ${report.routeCount ?? 'none'}`)
    return false
  }
  if (report.assetPreviewSize !== expected.assetPreviewSize) {
    console.log(
      `protocol error: expected assetPreviewSize ${expected.assetPreviewSize}, received ${report.assetPreviewSize ?? 'none'}`,
    )
    return false
  }
  return true
}

const browser = parseBrowser(parseStringFlag('browser'))
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const output = parseStringFlag('output')
const timeoutMs = Number.parseInt(process.env['EMOJI_CHECK_TIMEOUT_MS'] ?? '60000', 10)
const sizes = parseStringFlag('sizes')
const parsedSizes = parseSizes(sizes)
const threshold = parseStringFlag('threshold')
const presets = parsePresetKeys(parseStringFlag('presets'))
const focusSize = parseOptionalPositiveInt(parseStringFlag('focusSize'))
const focusFont = parseStringFlag('focusFont')

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
      (threshold === null ? '' : `&threshold=${encodeURIComponent(threshold)}`) +
      (focusSize === null ? '' : `&focusSize=${encodeURIComponent(String(focusSize))}`) +
      (focusFont === null ? '' : `&focusFont=${encodeURIComponent(focusFont)}`)
    const report = await loadHashReport<EmojiReport>(session, url, requestId, browser, timeoutMs)
    printReport(report)

    if (output !== null) {
      writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      console.log(`wrote ${output}`)
    }

    if (report.status === 'error') {
      process.exitCode = 1
    } else if (
      !validateFocusReport(report, { size: focusSize, fontFamily: focusFont }) ||
      !validateRouteReport(report, {
        routeCount: 5,
        assetPreviewSize: expectedEmojiAssetPreviewSize(parsedSizes, { size: focusSize, fontFamily: focusFont }),
      })
    ) {
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
        `&preset=${encodeURIComponent(preset.key)}` +
        (focusSize === null ? '' : `&focusSize=${encodeURIComponent(String(focusSize))}`) +
        (focusFont === null ? '' : `&focusFont=${encodeURIComponent(focusFont)}`)
      const report = await loadHashReport<EmojiReport>(session, url, requestId, browser, timeoutMs)
      console.log(`[preset:${preset.key}]`)
      printReport(report)
      reports.push({ preset: preset.key, report })
      if (
        report.status === 'error' ||
        !validatePresetReport(report, preset.key) ||
        !validateFocusReport(report, { size: focusSize, fontFamily: focusFont }) ||
        !validateRouteReport(report, {
          routeCount: 5,
          assetPreviewSize: expectedEmojiAssetPreviewSize(preset.sizes, { size: focusSize, fontFamily: focusFont }),
        })
      ) {
        process.exitCode = 1
      }
    }

    printMatrixSummary(reports)

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
