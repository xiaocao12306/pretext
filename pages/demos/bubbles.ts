import {
  computeBubbleRender,
  formatPixelCount,
  getMaxChatWidth,
  prepareBubbleTexts,
} from './bubbles-shared.ts'
import {
  BUBBLE_PROBE_PRESETS,
  findBubbleProbePreset,
  type BubbleProbePreset,
} from '../probe-presets.ts'
import { clearNavigationReport, publishNavigationPhase, publishNavigationReport } from '../report-utils.ts'

type State = {
  requestedChatWidth: number
  events: {
    sliderValue: number | null
  }
}

type BubbleProbeState = {
  chatWidth: number
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

type BubblesReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment: EnvironmentFingerprint
  controls: {
    chatWidth: number
    maxChatWidth: number
    bubbleMaxWidth: number
    bubbleCount: number
  }
  waste: {
    totalWastedPixels: number
    totalSavedWidth: number
    maxSavedWidth: number
    maxCssWidth: number
    maxTightWidth: number
  }
}

const domCache = {
  root: document.documentElement,
  chatShrink: getRequiredDiv('chat-shrink'),
  slider: getRequiredInput('slider'),
  valLabel: getRequiredSpan('val'),
  cssWaste: getRequiredSpan('css-waste'),
  shrinkWaste: getRequiredSpan('shrink-waste'),
  summary: getRequiredPre('summaryPanel'),
  routeCards: getRequiredElement('routeCardGrid'),
  presetCards: getRequiredElement('presetCardGrid'),
  probeRail: getRequiredElement('probeRail'),
}

const params = new URLSearchParams(location.search)
const requestedPreset = findPresetParam(params.get('preset'))
const requestId = params.get('requestId') ?? undefined
const reportRequested = params.get('report') === '1'
const requestedChatWidthOverride = parseDimensionParam(params.get('chatWidth')) ?? requestedPreset?.chatWidth ?? getInitialChatWidth()

const shrinkNodes = getChatMessageNodes(domCache.chatShrink)
const preparedBubbles = prepareBubbleTexts(shrinkNodes.map(readNodeText))
const st: State = {
  requestedChatWidth: requestedChatWidthOverride,
  events: {
    sliderValue: null,
  },
}

let scheduledRaf: number | null = null
let lastProbeUiSignature: string | null = null
let reportPublished = false

if (reportRequested) {
  clearNavigationReport()
  publishNavigationPhase('loading', requestId)
}

domCache.slider.addEventListener('input', () => {
  st.events.sliderValue = Number.parseInt(domCache.slider.value, 10)
  scheduleRender()
})

window.addEventListener('resize', () => {
  scheduleRender()
})

document.fonts.ready.then(() => {
  if (reportRequested) publishNavigationPhase('measuring', requestId)
  scheduleRender()
})

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

function getInitialChatWidth(): number {
  const datasetValue = domCache.root.dataset['bubblesChatWidth']
  const parsed = datasetValue === undefined ? Number.NaN : Number.parseInt(datasetValue, 10)
  if (Number.isFinite(parsed)) return parsed
  return Number.parseInt(domCache.slider.value, 10)
}

function parseDimensionParam(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function findPresetParam(raw: string | null): BubbleProbePreset | null {
  if (raw === null || raw.trim() === '') return null
  return findBubbleProbePreset(raw.trim())
}

function getChatMessageNodes(chat: HTMLDivElement): HTMLDivElement[] {
  return Array.from(chat.querySelectorAll<HTMLDivElement>('.msg'))
}

function readNodeText(node: HTMLDivElement): string {
  return node.textContent ?? ''
}

function scheduleRender(): void {
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(function renderBubblesFrame() {
    scheduledRaf = null
    render()
  })
}

function render(): void {
  const minWidth = Number.parseInt(domCache.slider.min, 10)
  let requestedChatWidth = st.requestedChatWidth
  if (st.events.sliderValue !== null) requestedChatWidth = st.events.sliderValue
  const maxWidth = getMaxChatWidth(minWidth, document.documentElement.clientWidth)
  const chatWidth = Math.min(requestedChatWidth, maxWidth)

  st.requestedChatWidth = requestedChatWidth
  st.events.sliderValue = null

  domCache.slider.max = String(maxWidth)
  domCache.slider.value = String(chatWidth)
  domCache.valLabel.textContent = `${chatWidth}px`

  const report = updateBubbles(chatWidth, maxWidth)
  syncPresetUi(chatWidth)
  syncSummaryPanel(report)
  maybePublishReport(report)
}

function updateBubbles(chatWidth: number, maxChatWidth: number): BubblesReport {
  const renderState = computeBubbleRender(preparedBubbles, chatWidth)
  domCache.root.style.setProperty('--chat-width', `${renderState.chatWidth}px`)
  domCache.root.style.setProperty('--bubble-max-width', `${renderState.bubbleMaxWidth}px`)

  for (let index = 0; index < shrinkNodes.length; index++) {
    const shrinkNode = shrinkNodes[index]!
    const widths = renderState.widths[index]!
    shrinkNode.style.maxWidth = `${renderState.bubbleMaxWidth}px`
    shrinkNode.style.width = `${widths.tightWidth}px`
  }

  domCache.cssWaste.textContent = formatPixelCount(renderState.totalWastedPixels)
  domCache.shrinkWaste.textContent = '0'

  return buildBubblesReport(chatWidth, maxChatWidth, renderState)
}

function syncPresetUi(chatWidth: number): void {
  const signature = String(chatWidth)
  if (signature === lastProbeUiSignature) return
  lastProbeUiSignature = signature
  renderProbeRail(chatWidth)
  renderPresetCards(chatWidth)
  renderScenarioCards(chatWidth)
}

function renderProbeRail(chatWidth: number): void {
  const state = toBubbleProbeState(chatWidth)
  const presets = BUBBLE_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildProbeHref({ presetKey: preset.key }),
    active: isBubblePresetActive(preset, state),
  }))
  domCache.probeRail.replaceChildren(...presets.map(createProbeLink))
}

function renderPresetCards(chatWidth: number): void {
  const state = toBubbleProbeState(chatWidth)
  const cards = BUBBLE_PROBE_PRESETS.map(preset =>
    createPresetCard({
      label: preset.label,
      href: buildProbeHref({ presetKey: preset.key }),
      active: isBubblePresetActive(preset, state),
      widthSummary: `${preset.chatWidth}px`,
      bubbleMaxSummary: `${Math.floor(preset.chatWidth * 0.8)}px`,
    }),
  )
  domCache.presetCards.replaceChildren(...cards)
}

function renderScenarioCards(chatWidth: number): void {
  const cards = buildScenarioCardDefinitions(chatWidth).map(createScenarioCard)
  domCache.routeCards.replaceChildren(...cards)
}

function toBubbleProbeState(chatWidth: number): BubbleProbeState {
  return { chatWidth }
}

function findMatchingBubblePreset(chatWidth: number): BubbleProbePreset | null {
  const state = toBubbleProbeState(chatWidth)
  return BUBBLE_PROBE_PRESETS.find(preset => isBubblePresetActive(preset, state)) ?? null
}

function isBubblePresetActive(
  preset: BubbleProbePreset,
  state: BubbleProbeState,
): boolean {
  return state.chatWidth === preset.chatWidth
}

function buildScenarioCardDefinitions(chatWidth: number): Array<{
  label: string
  href: string
  mode: string
  route: string
  path: string
}> {
  const matchedPreset = findMatchingBubblePreset(chatWidth)
  const query = buildScenarioQuery(chatWidth, matchedPreset)
  const demoPath = normalizeBubblesPath(location.pathname, 'demo')
  const rootPath = normalizeBubblesPath(location.pathname, 'root')
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
  chatWidth: number,
  matchedPreset: BubbleProbePreset | null,
): string {
  const next = new URLSearchParams()
  if (matchedPreset !== null) {
    next.set('preset', matchedPreset.key)
  } else {
    next.set('chatWidth', String(chatWidth))
  }
  const query = next.toString()
  return query.length === 0 ? '' : `?${query}`
}

function appendReportQuery(query: string): string {
  const next = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
  next.set('report', '1')
  return `?${next.toString()}`
}

function normalizeBubblesPath(pathname: string, target: 'demo' | 'root'): string {
  if (target === 'demo') {
    return pathname.includes('/demos/')
      ? pathname.replace(/\/bubbles\/?$/, '/bubbles')
      : pathname.replace(/\/bubbles\/?$/, '/demos/bubbles')
  }
  return pathname.includes('/demos/')
    ? pathname.replace(/\/demos\/bubbles\/?$/, '/bubbles')
    : pathname.replace(/\/bubbles\/?$/, '/bubbles')
}

function buildProbeHref(options: { presetKey?: string; chatWidth?: number }): string {
  const next = new URLSearchParams()
  if (options.presetKey !== undefined) {
    next.set('preset', options.presetKey)
  } else if (options.chatWidth !== undefined) {
    next.set('chatWidth', String(options.chatWidth))
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
  widthSummary: string
  bubbleMaxSummary: string
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
    createPresetCardRow('chat', definition.widthSummary),
    createPresetCardRow('bubble max', definition.bubbleMaxSummary),
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

function buildBubblesReport(chatWidth: number, maxChatWidth: number, renderState: ReturnType<typeof computeBubbleRender>): BubblesReport {
  const matchedPreset = findMatchingBubblePreset(chatWidth)
  const savedWidths = renderState.widths.map(widths => Math.max(0, widths.cssWidth - widths.tightWidth))
  return {
    status: 'ready',
    presetKey: matchedPreset?.key,
    environment: getEnvironmentFingerprint(),
    controls: {
      chatWidth,
      maxChatWidth,
      bubbleMaxWidth: renderState.bubbleMaxWidth,
      bubbleCount: renderState.widths.length,
    },
    waste: {
      totalWastedPixels: renderState.totalWastedPixels,
      totalSavedWidth: savedWidths.reduce((sum, value) => sum + value, 0),
      maxSavedWidth: savedWidths.reduce((max, value) => Math.max(max, value), 0),
      maxCssWidth: renderState.widths.reduce((max, value) => Math.max(max, value.cssWidth), 0),
      maxTightWidth: renderState.widths.reduce((max, value) => Math.max(max, value.tightWidth), 0),
    },
  }
}

function syncSummaryPanel(report: BubblesReport): void {
  domCache.summary.textContent = formatSummary(report)
}

function formatSummary(report: BubblesReport): string {
  return [
    `preset ${report.presetKey ?? 'manual'}`,
    `chat ${report.controls.chatWidth}px • bubble max ${report.controls.bubbleMaxWidth}px • viewport max ${report.controls.maxChatWidth}px`,
    `waste ${formatPixelCount(report.waste.totalWastedPixels)} px² • total saved ${report.waste.totalSavedWidth}px`,
    `widest css ${report.waste.maxCssWidth}px • widest tight ${report.waste.maxTightWidth}px • max saved ${report.waste.maxSavedWidth}px`,
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

function withRequestId(report: BubblesReport): BubblesReport {
  return requestId === undefined ? report : { ...report, requestId }
}

function maybePublishReport(report: BubblesReport): void {
  if (!reportRequested || reportPublished) return
  reportPublished = true
  publishNavigationReport(withRequestId(report))
}
