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

mountAssetPreview('dynamicLayoutAssets', [
  { label: 'OpenAI', src: resolveImportedAssetUrl(openaiLogoUrl) },
  { label: 'Claude', src: resolveImportedAssetUrl(claudeLogoUrl) },
])

mountActions('accordionActions', [
  {
    label: 'Live demo',
    href: '../accordion',
    meta: 'predicted panel heights • route cards • open-state presets',
  },
  ...ACCORDION_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../accordion', { preset: preset.key }),
    meta: `${preset.pageWidth}px page • open ${preset.openItemId}`,
  })),
])

mountActions('bubbleActions', [
  {
    label: 'Live demo',
    href: '../bubbles',
    meta: 'shrinkwrap search • wasted-area readout • route cards',
  },
  ...BUBBLE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../bubbles', { preset: preset.key }),
    meta: `${preset.chatWidth}px chat • ${Math.floor(preset.chatWidth * 0.8)}px bubble max`,
  })),
])

mountActions('richNoteActions', [
  {
    label: 'Live demo',
    href: '../rich-note',
    meta: 'inline-flow chips • route cards • width presets',
  },
  ...RICH_NOTE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../rich-note', { preset: preset.key }),
    meta: `${preset.bodyWidth}px body • ${preset.bodyWidth + 40}px shell`,
  })),
])

mountActions('dynamicLayoutActions', [
  {
    label: 'Live demo',
    href: '../dynamic-layout',
    meta: 'free resize • live logo rotation • asset wrap hulls',
  },
  ...DYNAMIC_LAYOUT_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../dynamic-layout', { preset: preset.key }),
    meta:
      `${preset.pageWidth}x${preset.pageHeight} • ` +
      `OA ${formatAngle(preset.openaiAngle)} • ` +
      `CL ${formatAngle(preset.claudeAngle)}`,
  })),
])

mountActions('editorialEngineActions', [
  {
    label: 'Live demo',
    href: '../editorial-engine',
    meta: 'drag orbs • live reflow • multicolumn continuation',
  },
  ...EDITORIAL_ENGINE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../editorial-engine', { preset: preset.key }),
    meta:
      `${preset.pageWidth}x${preset.pageHeight} • ` +
      `${preset.orbPreset} • ${preset.animate ? 'live' : 'paused'}`,
  })),
])

mountActions('justificationActions', JUSTIFICATION_PROBE_PRESETS.map(preset => ({
  label: preset.label,
  href: buildHref('../justification-comparison', { preset: preset.key }),
  meta: `${preset.width}px • ${preset.showIndicators ? 'indicators on' : 'indicators off'}`,
})))

mountActions('emojiActions', [
  {
    label: 'Live sweep',
    href: '../emoji-test',
    meta: 'multi-font batch • size cards • font cards',
  },
  ...EMOJI_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../emoji-test', { preset: preset.key }),
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
