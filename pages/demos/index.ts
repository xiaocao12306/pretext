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
    href: buildHref('../dynamic-layout', { preset: preset.key }),
  })),
])

mountActions('editorialEngineActions', [
  { label: 'Live demo', href: '../editorial-engine' },
  ...EDITORIAL_ENGINE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildHref('../editorial-engine', { preset: preset.key }),
  })),
])

mountActions('justificationActions', JUSTIFICATION_PROBE_PRESETS.map(preset => ({
  label: preset.label,
  href: buildHref('../justification-comparison', { preset: preset.key }),
})))

mountActions('emojiActions', EMOJI_PROBE_PRESETS.map(preset => ({
  label: preset.label,
  href: buildHref('../emoji-test', { preset: preset.key }),
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
