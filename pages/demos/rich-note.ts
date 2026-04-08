import {
  BODY_DEFAULT_WIDTH,
  BODY_MIN_WIDTH,
  DEFAULT_RICH_NOTE_SPECS,
  prepareRichInlineFlow,
  layoutRichNote,
  LINE_HEIGHT,
  resolveRichNoteBodyWidth,
  type RichLine,
} from './rich-note.model.ts'
import {
  RICH_NOTE_PROBE_PRESETS,
  findRichNoteProbePreset,
  type RichNoteProbePreset,
} from '../probe-presets.ts'
import { clearNavigationReport, publishNavigationPhase, publishNavigationReport } from '../report-utils.ts'

type State = {
  events: {
    sliderValue: number | null
  }
  requestedWidth: number
}

type RichNoteProbeState = {
  bodyWidth: number
}

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
}

type RichNoteReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment: EnvironmentFingerprint
  note: {
    bodyWidth: number
    maxBodyWidth: number
    noteWidth: number
    lineCount: number
    noteBodyHeight: number
    chipCount: number
    fragmentCount: number
  }
}

const domCache = {
  root: document.documentElement, // cache lifetime: page
  noteBody: getRequiredDiv('note-body'), // cache lifetime: page
  widthSlider: getRequiredInput('width-slider'), // cache lifetime: page
  widthValue: getRequiredSpan('width-value'), // cache lifetime: page
  summary: getRequiredPre('summaryPanel'), // cache lifetime: page
  routeCards: getRequiredElement('routeCardGrid'), // cache lifetime: page
  presetCards: getRequiredElement('presetCardGrid'), // cache lifetime: page
  probeRail: getRequiredElement('probeRail'), // cache lifetime: page
}

const richInline = prepareRichInlineFlow(DEFAULT_RICH_NOTE_SPECS)
const params = new URLSearchParams(location.search)
const requestedPreset = findPresetParam(params.get('preset'))
const requestId = params.get('requestId') ?? undefined
const reportRequested = params.get('report') === '1'

const st: State = {
  events: {
    sliderValue: null,
  },
  requestedWidth: parseDimensionParam(params.get('bodyWidth')) ?? requestedPreset?.bodyWidth ?? BODY_DEFAULT_WIDTH,
}

let scheduledRaf: number | null = null
let lastProbeUiSignature: string | null = null
let reportPublished = false

if (reportRequested) {
  clearNavigationReport()
  publishNavigationPhase('loading', requestId)
}

domCache.widthSlider.addEventListener('input', () => {
  st.events.sliderValue = Number.parseInt(domCache.widthSlider.value, 10)
  scheduleRender()
})

window.addEventListener('resize', () => scheduleRender())

document.fonts.ready.then(() => {
  if (reportRequested) publishNavigationPhase('measuring', requestId)
})

scheduleRender()

function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) throw new Error(`#${id} not found`)
  return element
}

function getRequiredDiv(id: string): HTMLDivElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLDivElement)) throw new Error(`#${id} not found`)
  return element
}

function getRequiredInput(id: string): HTMLInputElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLInputElement)) throw new Error(`#${id} not found`)
  return element
}

function getRequiredSpan(id: string): HTMLSpanElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLSpanElement)) throw new Error(`#${id} not found`)
  return element
}

function getRequiredPre(id: string): HTMLPreElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLPreElement)) throw new Error(`#${id} not found`)
  return element
}

function parseDimensionParam(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function findPresetParam(raw: string | null): RichNoteProbePreset | null {
  if (raw === null || raw.trim() === '') return null
  return findRichNoteProbePreset(raw.trim())
}

function scheduleRender(): void {
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(function renderRichNoteDemo() {
    scheduledRaf = null
    render()
  })
}

function renderBody(lines: RichLine[]): void {
  domCache.noteBody.textContent = ''
  const fragment = document.createDocumentFragment()

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!
    const row = document.createElement('div')
    row.className = 'line-row'
    row.style.top = `${lineIndex * LINE_HEIGHT}px`

    for (let fragmentIndex = 0; fragmentIndex < line.fragments.length; fragmentIndex++) {
      const part = line.fragments[fragmentIndex]!
      const element = document.createElement('span')
      element.className = part.className
      element.textContent = part.text
      if (part.leadingGap > 0) element.style.marginLeft = `${part.leadingGap}px`
      row.appendChild(element)
    }

    fragment.appendChild(row)
  }

  domCache.noteBody.appendChild(fragment)
}

function render(): void {
  // DOM reads
  const viewportWidth = document.documentElement.clientWidth

  // Handle inputs
  let requestedWidth = st.requestedWidth
  if (st.events.sliderValue !== null) requestedWidth = st.events.sliderValue

  // Layout
  const { bodyWidth, maxBodyWidth } = resolveRichNoteBodyWidth(viewportWidth, requestedWidth)
  const layout = layoutRichNote(richInline, bodyWidth)

  // Commit state
  st.requestedWidth = bodyWidth
  st.events.sliderValue = null

  // DOM writes
  domCache.widthSlider.min = String(BODY_MIN_WIDTH)
  domCache.widthSlider.max = String(maxBodyWidth)
  domCache.widthSlider.value = String(bodyWidth)
  domCache.widthValue.textContent = `${Math.round(bodyWidth)}px`
  domCache.root.style.setProperty('--note-width', `${layout.noteWidth}px`)
  domCache.root.style.setProperty('--note-content-width', `${bodyWidth}px`)
  domCache.noteBody.style.height = `${layout.noteBodyHeight}px`

  renderBody(layout.lines)
  syncPresetUi(bodyWidth)
  const report = buildRichNoteReport(layout, maxBodyWidth)
  syncSummaryPanel(report)
  maybePublishReport(report)
}

function syncPresetUi(bodyWidth: number): void {
  const signature = String(bodyWidth)
  if (signature === lastProbeUiSignature) return
  lastProbeUiSignature = signature
  renderProbeRail(bodyWidth)
  renderPresetCards(bodyWidth)
  renderScenarioCards(bodyWidth)
}

function renderProbeRail(bodyWidth: number): void {
  const state = toRichNoteProbeState(bodyWidth)
  const presets = RICH_NOTE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildProbeHref({ presetKey: preset.key }),
    active: isRichNotePresetActive(preset, state),
  }))
  domCache.probeRail.replaceChildren(...presets.map(createProbeLink))
}

function renderPresetCards(bodyWidth: number): void {
  const state = toRichNoteProbeState(bodyWidth)
  const cards = RICH_NOTE_PROBE_PRESETS.map(preset =>
    createPresetCard({
      label: preset.label,
      href: buildProbeHref({ presetKey: preset.key }),
      active: isRichNotePresetActive(preset, state),
      bodyWidthSummary: `${preset.bodyWidth}px`,
      shellWidthSummary: `${preset.bodyWidth + 40}px`,
    }),
  )
  domCache.presetCards.replaceChildren(...cards)
}

function renderScenarioCards(bodyWidth: number): void {
  const cards = buildScenarioCardDefinitions(bodyWidth).map(createScenarioCard)
  domCache.routeCards.replaceChildren(...cards)
}

function toRichNoteProbeState(bodyWidth: number): RichNoteProbeState {
  return { bodyWidth }
}

function findMatchingRichNotePreset(bodyWidth: number): RichNoteProbePreset | null {
  const state = toRichNoteProbeState(bodyWidth)
  return RICH_NOTE_PROBE_PRESETS.find(preset => isRichNotePresetActive(preset, state)) ?? null
}

function isRichNotePresetActive(
  preset: RichNoteProbePreset,
  state: RichNoteProbeState,
): boolean {
  return state.bodyWidth === preset.bodyWidth
}

function buildScenarioCardDefinitions(bodyWidth: number): Array<{
  label: string
  href: string
  mode: string
  route: string
  path: string
}> {
  const matchedPreset = findMatchingRichNotePreset(bodyWidth)
  const query = buildScenarioQuery(bodyWidth, matchedPreset)
  const demoPath = normalizeRichNotePath(location.pathname, 'demo')
  const rootPath = normalizeRichNotePath(location.pathname, 'root')
  return [
    {
      label: 'Demo path',
      href: `${demoPath}${query}`,
      mode: matchedPreset?.key ?? 'manual',
      route: 'interactive',
      path: demoPath,
    },
    {
      label: 'Root alias',
      href: `${rootPath}${query}`,
      mode: matchedPreset?.key ?? 'manual',
      route: 'redirect',
      path: rootPath,
    },
    {
      label: 'Report run',
      href: `${demoPath}${appendReportQuery(query)}`,
      mode: matchedPreset?.key ?? 'manual',
      route: 'checker',
      path: `${demoPath}?report=1`,
    },
  ]
}

function buildScenarioQuery(
  bodyWidth: number,
  matchedPreset: RichNoteProbePreset | null,
): string {
  const next = new URLSearchParams()
  if (matchedPreset !== null) {
    next.set('preset', matchedPreset.key)
  } else {
    next.set('bodyWidth', String(bodyWidth))
  }
  const query = next.toString()
  return query.length === 0 ? '' : `?${query}`
}

function appendReportQuery(query: string): string {
  const next = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
  next.set('report', '1')
  return `?${next.toString()}`
}

function normalizeRichNotePath(pathname: string, target: 'demo' | 'root'): string {
  if (target === 'demo') {
    return pathname.includes('/demos/')
      ? pathname.replace(/\/rich-note\/?$/, '/rich-note')
      : pathname.replace(/\/rich-note\/?$/, '/demos/rich-note')
  }
  return pathname.includes('/demos/')
    ? pathname.replace(/\/demos\/rich-note\/?$/, '/rich-note')
    : pathname.replace(/\/rich-note\/?$/, '/rich-note')
}

function buildProbeHref(options: { presetKey?: string; bodyWidth?: number }): string {
  const next = new URLSearchParams()
  if (options.presetKey !== undefined) {
    next.set('preset', options.presetKey)
  } else if (options.bodyWidth !== undefined) {
    next.set('bodyWidth', String(options.bodyWidth))
  }
  const query = next.toString()
  return query.length === 0 ? location.pathname : `${location.pathname}?${query}`
}

function createProbeLink(definition: { label: string; href: string; active: boolean }): HTMLAnchorElement {
  const element = document.createElement('a')
  element.className = definition.active ? 'probe-link is-active' : 'probe-link'
  element.href = definition.href
  element.textContent = definition.label
  return element
}

function createPresetCard(definition: {
  label: string
  href: string
  active: boolean
  bodyWidthSummary: string
  shellWidthSummary: string
}): HTMLAnchorElement {
  const element = document.createElement('a')
  element.className = definition.active ? 'preset-card is-active' : 'preset-card'
  element.href = definition.href

  const head = document.createElement('div')
  head.className = 'preset-card-head'
  const title = document.createElement('span')
  title.className = 'preset-card-title'
  title.textContent = definition.label
  head.append(title)
  if (definition.active) {
    const badge = document.createElement('span')
    badge.className = 'preset-card-badge'
    badge.textContent = 'active'
    head.append(badge)
  }

  element.append(
    head,
    createPresetCardRow('body', definition.bodyWidthSummary),
    createPresetCardRow('shell', definition.shellWidthSummary),
  )
  return element
}

function createPresetCardRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'preset-card-row'
  const left = document.createElement('span')
  left.className = 'preset-card-label'
  left.textContent = label
  const right = document.createElement('span')
  right.className = 'preset-card-value'
  right.textContent = value
  row.append(left, right)
  return row
}

function createScenarioCard(definition: {
  label: string
  href: string
  mode: string
  route: string
  path: string
}): HTMLAnchorElement {
  const element = document.createElement('a')
  element.className = 'route-card'
  element.href = definition.href

  const title = document.createElement('div')
  title.className = 'route-card-title'
  title.textContent = definition.label

  element.append(
    title,
    createRouteCardRow('mode', definition.mode),
    createRouteCardRow('route', definition.route),
    createRouteCardRow('path', definition.path),
  )
  return element
}

function createRouteCardRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'route-card-row'
  const left = document.createElement('span')
  left.className = 'route-card-label'
  left.textContent = label
  const right = document.createElement('span')
  right.className = 'route-card-value'
  right.textContent = value
  row.append(left, right)
  return row
}

function buildRichNoteReport(
  layout: ReturnType<typeof layoutRichNote>,
  maxBodyWidth: number,
): RichNoteReport {
  const matchedPreset = findMatchingRichNotePreset(layout.bodyWidth)
  return {
    status: 'ready',
    presetKey: matchedPreset?.key,
    environment: getEnvironmentFingerprint(),
    note: {
      bodyWidth: layout.bodyWidth,
      maxBodyWidth,
      noteWidth: layout.noteWidth,
      lineCount: layout.lineCount,
      noteBodyHeight: layout.noteBodyHeight,
      chipCount: DEFAULT_RICH_NOTE_SPECS.filter(spec => spec.kind === 'chip').length,
      fragmentCount: layout.lines.reduce((sum, line) => sum + line.fragments.length, 0),
    },
  }
}

function syncSummaryPanel(report: RichNoteReport): void {
  domCache.summary.textContent = [
    `preset ${report.presetKey ?? 'manual'}`,
    `body ${report.note.bodyWidth}px • shell ${report.note.noteWidth}px • viewport max ${report.note.maxBodyWidth}px`,
    `lines ${report.note.lineCount} • fragments ${report.note.fragmentCount} • chips ${report.note.chipCount}`,
    `note body ${report.note.noteBodyHeight}px`,
  ].join('\n')
}

function getEnvironmentFingerprint(): EnvironmentFingerprint {
  return {
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      visualViewportScale: window.visualViewport?.scale ?? null,
    },
  }
}

function withRequestId(report: RichNoteReport): RichNoteReport {
  return requestId === undefined ? report : { ...report, requestId }
}

function maybePublishReport(report: RichNoteReport): void {
  if (!reportRequested || reportPublished) return
  reportPublished = true
  publishNavigationReport(withRequestId(report))
}
