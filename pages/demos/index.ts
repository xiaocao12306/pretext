import {
  ACCORDION_PROBE_PRESETS,
  BUBBLE_PROBE_PRESETS,
  DYNAMIC_LAYOUT_PROBE_PRESETS,
  EDITORIAL_ENGINE_PROBE_PRESETS,
  EMOJI_PROBE_PRESETS,
  JUSTIFICATION_PROBE_PRESETS,
  RICH_NOTE_PROBE_PRESETS,
} from '../probe-presets.ts'
import openaiLogoUrl from '../assets/openai-symbol.svg'
import claudeLogoUrl from '../assets/claude-symbol.svg'

type ActionDefinition = {
  label: string
  href: string
  meta: string
}

type RouteActionDefinition = {
  demoPath: string
  rootPath: string
  demoMeta: string
  rootMeta: string
  reportMeta: string
}

mountAssetPreview('dynamicLayoutAssets', [
  { label: 'OpenAI', src: resolveImportedAssetUrl(openaiLogoUrl) },
  { label: 'Claude', src: resolveImportedAssetUrl(claudeLogoUrl) },
])

mountActions('accordionActions', [
  ...buildRouteActions({
    demoPath: './accordion',
    rootPath: '../accordion',
    demoMeta: 'predicted panel heights • route cards • open-state presets',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • accordion-check target • hash export',
  }),
  ...ACCORDION_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./accordion', { preset: preset.key }),
    meta: `${preset.pageWidth}px page • open ${preset.openItemId}`,
  })),
])

mountActions('bubbleActions', [
  ...buildRouteActions({
    demoPath: './bubbles',
    rootPath: '../bubbles',
    demoMeta: 'shrinkwrap search • wasted-area readout • route cards',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • bubbles-check target • waste summary',
  }),
  ...BUBBLE_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./bubbles', { preset: preset.key }),
    meta: `${preset.chatWidth}px chat • ${Math.floor(preset.chatWidth * 0.8)}px bubble max`,
  })),
])

mountActions('richNoteActions', [
  ...buildRouteActions({
    demoPath: './rich-note',
    rootPath: '../rich-note',
    demoMeta: 'inline-flow chips • route cards • width presets',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • rich-note-check target • note summary',
  }),
  ...RICH_NOTE_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./rich-note', { preset: preset.key }),
    meta: `${preset.bodyWidth}px body • ${preset.bodyWidth + 40}px shell`,
  })),
])

mountActions('dynamicLayoutActions', [
  ...buildRouteActions({
    demoPath: './dynamic-layout',
    rootPath: '../dynamic-layout',
    demoMeta: 'free resize • live logo rotation • asset wrap hulls',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • dynamic-layout-check target • asset routing',
  }),
  ...DYNAMIC_LAYOUT_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./dynamic-layout', { preset: preset.key }),
    meta:
      `${preset.pageWidth}x${preset.pageHeight} • ` +
      `OA ${formatAngle(preset.openaiAngle)} • ` +
      `CL ${formatAngle(preset.claudeAngle)}`,
  })),
])

mountActions('editorialEngineActions', [
  ...buildRouteActions({
    demoPath: './editorial-engine',
    rootPath: '../editorial-engine',
    demoMeta: 'drag orbs • live reflow • multicolumn continuation',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • editorial-engine-check target • orb routing',
  }),
  ...EDITORIAL_ENGINE_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./editorial-engine', { preset: preset.key }),
    meta:
      `${preset.pageWidth}x${preset.pageHeight} • ` +
      `${preset.orbPreset} • ${preset.animate ? 'live' : 'paused'}`,
  })),
])

mountActions('justificationActions', [
  ...buildRouteActions({
    demoPath: './justification-comparison',
    rootPath: '../justification-comparison',
    demoMeta: 'css rivers • greedy hyphenation • optimal paragraph layout',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • justification-check target • comparison digest',
  }),
  ...JUSTIFICATION_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./justification-comparison', { preset: preset.key }),
    meta: `${preset.width}px • ${preset.showIndicators ? 'indicators on' : 'indicators off'}`,
  })),
])

mountActions('emojiActions', [
  ...buildRouteActions({
    demoPath: './emoji-test',
    rootPath: '../emoji-test',
    demoMeta: 'multi-font batch • size cards • font cards',
    rootMeta: 'top-level alias • redirect parity • query preserved',
    reportMeta: 'report=1 • emoji-check target • font drift summary',
  }),
  ...EMOJI_PROBE_PRESETS.map(preset => ({
    label: `Preset ${preset.label}`,
    href: buildHref('./emoji-test', { preset: preset.key }),
    meta: `${formatSizeSummary(preset.sizes)} • th ${preset.threshold.toFixed(2)}px`,
  })),
])

function mountActions(id: string, actions: ActionDefinition[]): void {
  const container = document.getElementById(id)
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`#${id} not found`)
  }
  container.replaceChildren(...actions.map(createActionLink))
}

function mountAssetPreview(
  id: string,
  assets: Array<{ label: string; src: string }>,
): void {
  const container = document.getElementById(id)
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`#${id} not found`)
  }
  container.replaceChildren(...assets.map(createAssetChip))
}

function createActionLink(action: ActionDefinition): HTMLAnchorElement {
  const link = document.createElement('a')
  link.className = 'action'
  link.href = action.href
  const title = document.createElement('span')
  title.className = 'action-title'
  title.textContent = action.label
  const meta = document.createElement('span')
  meta.className = 'action-meta'
  meta.textContent = action.meta
  link.append(title, meta)
  return link
}

function createAssetChip(asset: { label: string; src: string }): HTMLElement {
  const chip = document.createElement('div')
  chip.className = 'asset-chip'
  const image = document.createElement('img')
  image.src = asset.src
  image.alt = `${asset.label} symbol`
  const label = document.createElement('span')
  label.textContent = asset.label
  chip.append(image, label)
  return chip
}

function buildRouteActions(definition: RouteActionDefinition): ActionDefinition[] {
  return [
    {
      label: 'Demo path',
      href: definition.demoPath,
      meta: definition.demoMeta,
    },
    {
      label: 'Root alias',
      href: definition.rootPath,
      meta: definition.rootMeta,
    },
    {
      label: 'Report run',
      href: buildHref(definition.demoPath, { report: 1 }),
      meta: definition.reportMeta,
    },
  ]
}

function buildHref(basePath: string, params: Record<string, string | number | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null) continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query.length === 0 ? basePath : `${basePath}?${query}`
}

function formatSizeSummary(sizes: number[]): string {
  if (sizes.length === 0) return 'none'
  return `${sizes[0]}..${sizes[sizes.length - 1]} (${sizes.length})`
}

function formatAngle(angle: number): string {
  if (Math.abs(angle) < 0.0005) return '0'
  const fraction = angle / Math.PI
  return `${fraction.toFixed(1)}π`
}

function resolveImportedAssetUrl(assetUrl: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(assetUrl) || assetUrl.startsWith('data:') || assetUrl.startsWith('blob:')) {
    return assetUrl
  }
  if (assetUrl.startsWith('/')) {
    return new URL(assetUrl, window.location.origin).href
  }
  return new URL(assetUrl, import.meta.url).href
}
