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

type AssetKey = 'openai' | 'claude'

type AssetAtlasReport = {
  status: 'ready' | 'error'
  requestId?: string
  assetCount?: number
  visibleAssetCount?: number
  focusAsset?: AssetKey | null
  previewSize?: number
  routeCount?: number
  assets?: Array<{
    key: AssetKey
    label: string
    sourceHref: string
    visible: boolean
    viewBox: string
    nativeSize: string
  }>
  message?: string
}

type AssetRun = {
  asset: AssetKey | null
  size: number
  pathMode: 'demo' | 'root'
}

type AssetSummaryRow = {
  label: string
  previewSize: number
  visibleAssetCount: number
  routeCount: number
  pathMode: 'demo' | 'root'
}

function parseStringFlag(name: string): string | null {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))
  return arg === undefined ? null : arg.slice(prefix.length)
}

function parseBrowser(value: string | null): BrowserKind {
  const browser = (value ?? process.env['ASSETS_CHECK_BROWSER'] ?? 'chrome').toLowerCase()
  if (browser !== 'chrome' && browser !== 'safari' && browser !== 'firefox') {
    throw new Error(`Unsupported browser ${browser}; expected chrome, safari, or firefox`)
  }
  return browser
}

function parseAssetList(raw: string | null): Array<AssetKey | null> {
  const value = raw ?? process.env['ASSETS_CHECK_ASSETS'] ?? 'all,openai,claude'
  const entries = value
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(part => part.length > 0)
    .map(part => {
      if (part === 'all') return null
      if (part === 'openai' || part === 'claude') return part
      throw new Error(`Unknown asset scope ${part}; expected all, openai, or claude`)
    })
  return [...new Set(entries)]
}

function parseSizeList(raw: string | null): number[] {
  const value = raw ?? process.env['ASSETS_CHECK_SIZES'] ?? '72,96,144'
  const sizes = value
    .split(',')
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(size => size === 48 || size === 72 || size === 96 || size === 144)
  if (sizes.length === 0) {
    throw new Error(`Expected --sizes to contain 48,72,96,144 values; received ${value}`)
  }
  return [...new Set(sizes)]
}

function parsePathModes(raw: string | null): Array<'demo' | 'root'> {
  const value = raw ?? process.env['ASSETS_CHECK_PATH_MODE'] ?? 'demo'
  const modes = value
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(part => part.length > 0)
    .map(part => {
      if (part === 'demo' || part === 'root') return part
      throw new Error(`Unknown path mode ${part}; expected demo or root`)
    })
  return [...new Set(modes)]
}

function buildRuns(
  assets: Array<AssetKey | null>,
  sizes: number[],
  pathModes: Array<'demo' | 'root'>,
): AssetRun[] {
  const runs: AssetRun[] = []
  for (let assetIndex = 0; assetIndex < assets.length; assetIndex++) {
    const asset = assets[assetIndex]!
    for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
      const size = sizes[sizeIndex]!
      for (let modeIndex = 0; modeIndex < pathModes.length; modeIndex++) {
        runs.push({ asset, size, pathMode: pathModes[modeIndex]! })
      }
    }
  }
  return runs
}

function formatRunLabel(run: AssetRun): string {
  return `${run.asset ?? 'all'} @ ${run.size}px (${run.pathMode})`
}

function printReport(report: AssetAtlasReport): void {
  if (report.status === 'error') {
    console.log(`error: ${report.message ?? 'unknown error'}`)
    return
  }

  console.log(
    `focus ${report.focusAsset ?? 'all'} | ` +
    `preview ${report.previewSize ?? '?'}px | ` +
    `visible ${report.visibleAssetCount ?? '?'} / ${report.assetCount ?? '?'} | ` +
    `routes ${report.routeCount ?? '?'}`,
  )

  for (const asset of report.assets ?? []) {
    console.log(
      `  ${asset.key} | ${asset.visible ? 'visible' : 'hidden'} | ${asset.nativeSize} | ${asset.viewBox} | ${asset.sourceHref}`,
    )
  }
}

function validateReport(report: AssetAtlasReport, run: AssetRun): boolean {
  if (report.status === 'error') return false
  const expectedVisibleCount = run.asset === null ? 2 : 1
  if (report.focusAsset !== run.asset) {
    console.log(`protocol error: expected focusAsset ${run.asset ?? 'all'}, received ${report.focusAsset ?? 'all'}`)
    return false
  }
  if (report.previewSize !== run.size) {
    console.log(`protocol error: expected previewSize ${run.size}, received ${report.previewSize ?? 'none'}`)
    return false
  }
  if (report.visibleAssetCount !== expectedVisibleCount) {
    console.log(`protocol error: expected visibleAssetCount ${expectedVisibleCount}, received ${report.visibleAssetCount ?? 'none'}`)
    return false
  }
  if (report.routeCount !== 4) {
    console.log(`protocol error: expected routeCount 4, received ${report.routeCount ?? 'none'}`)
    return false
  }
  return true
}

function toSummaryRow(entry: { run: AssetRun; report: AssetAtlasReport }): AssetSummaryRow | null {
  const report = entry.report
  if (report.status === 'error') return null
  return {
    label: entry.run.asset ?? 'all',
    previewSize: report.previewSize ?? entry.run.size,
    visibleAssetCount: report.visibleAssetCount ?? 0,
    routeCount: report.routeCount ?? 0,
    pathMode: entry.run.pathMode,
  }
}

function printMatrixSummary(entries: Array<{ run: AssetRun; report: AssetAtlasReport }>): void {
  const rows = entries
    .map(toSummaryRow)
    .filter((row): row is AssetSummaryRow => row !== null)

  console.log('matrix summary:')
  console.log(`  runs ${entries.length} ready ${rows.length} error ${entries.length - rows.length}`)
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    console.log(
      `  ${row.label} -> preview ${row.previewSize}px | visible ${row.visibleAssetCount} | routes ${row.routeCount} | path ${row.pathMode}`,
    )
  }
}

const browser = parseBrowser(parseStringFlag('browser'))
const assets = parseAssetList(parseStringFlag('assets'))
const sizes = parseSizeList(parseStringFlag('sizes'))
const pathModes = parsePathModes(parseStringFlag('pathMode'))
const runs = buildRuns(assets, sizes, pathModes)
const output = parseStringFlag('output')
const requestedPortRaw = parseStringFlag('port')
const requestedPort = requestedPortRaw === null ? null : Number.parseInt(requestedPortRaw, 10)
const timeoutMs = Number.parseInt(process.env['ASSETS_CHECK_TIMEOUT_MS'] ?? '60000', 10)

let serverProcess: ChildProcess | null = null
const lock = await acquireBrowserAutomationLock(browser)
const session = createBrowserSession(browser)
const reports: Array<{ run: AssetRun; report: AssetAtlasReport }> = []

try {
  const port = await getAvailablePort(requestedPort)
  const pageServer = await ensurePageServer(port, '/assets/', process.cwd())
  serverProcess = pageServer.process

  for (let index = 0; index < runs.length; index++) {
    const run = runs[index]!
    const requestId = `${Date.now()}-${run.asset ?? 'all'}-${run.size}-${Math.random().toString(36).slice(2, 8)}`
    const basePath = run.pathMode === 'root' ? '/assets' : '/assets/'
    const url =
      `${pageServer.baseUrl}${basePath}?report=1` +
      `&requestId=${encodeURIComponent(requestId)}` +
      (run.asset === null ? '' : `&asset=${encodeURIComponent(run.asset)}`) +
      `&size=${encodeURIComponent(String(run.size))}`

    const report = await loadHashReport<AssetAtlasReport>(session, url, requestId, browser, timeoutMs)
    reports.push({ run, report })
    console.log(`[run:${formatRunLabel(run)}]`)
    printReport(report)

    if (report.status === 'error' || !validateReport(report, run)) {
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
