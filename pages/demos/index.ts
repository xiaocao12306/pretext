import {
  DYNAMIC_LAYOUT_PROBE_PRESETS,
  EDITORIAL_ENGINE_PROBE_PRESETS,
  EMOJI_PROBE_PRESETS,
  JUSTIFICATION_PROBE_PRESETS,
} from '../probe-presets.ts'

type ActionDefinition = {
  label: string
  href: string
}

mountActions('dynamicLayoutActions', [
  { label: 'Live demo', href: '../dynamic-layout' },
  ...DYNAMIC_LAYOUT_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../dynamic-layout', {
      pageWidth: preset.pageWidth,
      pageHeight: preset.pageHeight,
      openaiAngle: preset.openaiAngle === 0 ? null : preset.openaiAngle.toFixed(6),
      claudeAngle: preset.claudeAngle === 0 ? null : preset.claudeAngle.toFixed(6),
      showDiagnostics: preset.showDiagnostics ? '1' : '0',
    }),
  })),
])

mountActions('editorialEngineActions', [
  { label: 'Live demo', href: '../editorial-engine' },
  ...EDITORIAL_ENGINE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../editorial-engine', {
      pageWidth: preset.pageWidth,
      pageHeight: preset.pageHeight,
      orbPreset: preset.orbPreset === 'default' ? null : preset.orbPreset,
      animate: preset.animate ? '1' : '0',
      showDiagnostics: preset.showDiagnostics ? '1' : '0',
    }),
  })),
])

mountActions('justificationActions', JUSTIFICATION_PROBE_PRESETS.map(preset => ({
  label: preset.label,
  href: buildHref('../justification-comparison', {
    width: preset.width,
    showIndicators: preset.showIndicators ? '1' : '0',
  }),
})))

mountActions('emojiActions', EMOJI_PROBE_PRESETS.map(preset => ({
  label: preset.label,
  href: buildHref('../emoji-test', {
    sizes: preset.sizes.join(','),
    threshold: String(preset.threshold),
  }),
})))

function mountActions(id: string, actions: ActionDefinition[]): void {
  const container = document.getElementById(id)
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`#${id} not found`)
  }
  container.replaceChildren(...actions.map(createActionLink))
}

function createActionLink(action: ActionDefinition): HTMLAnchorElement {
  const link = document.createElement('a')
  link.className = 'action'
  link.href = action.href
  link.textContent = action.label
  return link
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
