import { layout, prepare, type PreparedText } from '../../src/layout.ts'
import {
  ACCORDION_PROBE_PRESETS,
  findAccordionProbePreset,
  type AccordionProbePreset,
} from '../probe-presets.ts'
import { clearNavigationReport, publishNavigationPhase, publishNavigationReport } from '../report-utils.ts'

type AccordionItem = {
  id: string
  title: string
  text: string
}

type AccordionItemDom = {
  root: HTMLElement
  toggle: HTMLButtonElement
  title: HTMLSpanElement
  meta: HTMLSpanElement
  glyph: HTMLSpanElement
  body: HTMLDivElement
  inner: HTMLDivElement
  copy: HTMLParagraphElement
}

type State = {
  openItemId: string | null
  events: {
    clickedItemId: string | null
  }
}

type AccordionProbeState = {
  pageWidth: number
  openItemId: string | null
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

type AccordionReport = {
  status: 'ready' | 'error'
  requestId?: string
  presetKey?: string
  environment: EnvironmentFingerprint
  accordion: {
    pageWidth: number
    contentWidth: number
    openItemId: string | null
    itemCount: number
    openLineCount: number
    maxPanelHeight: number
  }
  items: Array<{
    id: string
    lineCount: number
    height: number
  }>
}

type DomCache = {
  page: HTMLElement
  list: HTMLElement
  summary: HTMLPreElement
  routeCards: HTMLElement
  presetCards: HTMLElement
  probeRail: HTMLElement
  items: AccordionItemDom[]
}

const items: AccordionItem[] = [
  {
    id: 'shipping',
    title: 'Section 1',
    text:
      'Mina cut the release note to three crisp lines, then realized the support caveat still needed one more sentence before it could ship without surprises.',
  },
  {
    id: 'ops',
    title: 'Section 2',
    text:
      'The handoff doc now reads like a proper morning checklist instead of a diary entry. Restart the worker, verify the queue drains, and only then mark the incident quiet. If the backlog grows again, page the same owner instead of opening a new thread.',
  },
  {
    id: 'research',
    title: 'Section 3',
    text:
      'We learned the hard way that a giant native scroll range can dominate everything else. The bug looked like DOM churn, then like pooling, then like rendering pressure, until the repros were stripped down enough to show the real limit. That changed the fix completely: simplify the DOM, keep virtualization honest, and stop hiding the worst-case path behind caches that only make the common frame look cheaper.',
  },
  {
    id: 'mixed',
    title: 'Section 4',
    text:
      'AGI 春天到了. بدأت الرحلة 🚀 and the long URL is https://example.com/reports/q3?lang=ar&mode=full. Nora wrote “please keep 10\u202F000 rows visible,” Mina replied “trans\u00ADatlantic labels are still weird.”',
  },
]

const st: State = {
  openItemId: null,
  events: {
    clickedItemId: null,
  },
}

let domCache: DomCache | null = null
const params = new URLSearchParams(location.search)
const requestedPreset = findPresetParam(params.get('preset'))
const requestId = params.get('requestId') ?? undefined
const reportRequested = params.get('report') === '1'
const requestedPageWidth = parseDimensionParam(params.get('pageWidth')) ?? requestedPreset?.pageWidth ?? null
const requestedOpenItemId = parseOpenItemId(params.get('open')) ?? requestedPreset?.openItemId ?? 'shipping'
st.openItemId = requestedOpenItemId

const preparedCache = {
  font: '',
  items: [] as PreparedText[],
}

let scheduledRaf: number | null = null
let lastProbeUiSignature: string | null = null
let reportPublished = false

if (reportRequested) {
  clearNavigationReport()
  publishNavigationPhase('loading', requestId)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
  boot()
}

function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) throw new Error(`#${id} not found`)
  return element
}

function getRequiredChild<T extends Element>(
  parent: Element,
  selector: string,
  ctor: { new (): T },
): T {
  const element = parent.querySelector(selector)
  if (!(element instanceof ctor)) throw new Error(`${selector} not found`)
  return element
}

function getAccordionItemNodes(list: HTMLElement): AccordionItemDom[] {
  const roots = Array.from(list.querySelectorAll<HTMLElement>('.accordion-item'))
  if (roots.length !== items.length) throw new Error('accordion item count mismatch')

  return roots.map(root => ({
    root,
    toggle: getRequiredChild(root, '.accordion-toggle', HTMLButtonElement),
    title: getRequiredChild(root, '.accordion-title', HTMLSpanElement),
    meta: getRequiredChild(root, '.accordion-meta', HTMLSpanElement),
    glyph: getRequiredChild(root, '.accordion-glyph', HTMLSpanElement),
    body: getRequiredChild(root, '.accordion-body', HTMLDivElement),
    inner: getRequiredChild(root, '.accordion-inner', HTMLDivElement),
    copy: getRequiredChild(root, '.accordion-copy', HTMLParagraphElement),
  }))
}

function initializeStaticContent(): void {
  if (domCache === null) return
  for (let index = 0; index < items.length; index++) {
    const item = items[index]!
    const itemDom = domCache.items[index]!
    itemDom.root.dataset['id'] = item.id
    itemDom.toggle.dataset['id'] = item.id
    itemDom.title.textContent = item.title
    itemDom.copy.textContent = item.text
  }
}

function parseDimensionParam(raw: string | null): number | null {
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function parseOpenItemId(raw: string | null): string | null {
  if (raw === null || raw.trim() === '') return null
  const normalized = raw.trim()
  return items.some(item => item.id === normalized) ? normalized : null
}

function findPresetParam(raw: string | null): AccordionProbePreset | null {
  if (raw === null || raw.trim() === '') return null
  return findAccordionProbePreset(raw.trim())
}

function parsePx(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getFontFromStyles(styles: CSSStyleDeclaration): string {
  return styles.font.length > 0
    ? styles.font
    : `${styles.fontStyle} ${styles.fontVariant} ${styles.fontWeight} ${styles.fontSize} / ${styles.lineHeight} ${styles.fontFamily}`
}

function refreshPrepared(font: string): void {
  if (preparedCache.font === font) return
  preparedCache.font = font
  preparedCache.items = items.map(item => prepare(item.text, font))
}

function scheduleRender(): void {
  if (domCache === null) return
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(function renderAccordionFrame(now) {
    scheduledRaf = null
    if (render(now)) scheduleRender()
  })
}

function boot(): void {
  const list = getRequiredElement('list')
  const page = document.querySelector('.page')
  if (!(page instanceof HTMLElement)) throw new Error('.page not found')
  domCache = {
    page,
    list,
    summary: getRequiredPre('summaryPanel'),
    routeCards: getRequiredElement('routeCardGrid'),
    presetCards: getRequiredElement('presetCardGrid'),
    probeRail: getRequiredElement('probeRail'),
    items: getAccordionItemNodes(list),
  }

  initializeStaticContent()
  applyScenarioFrame()

  domCache.list.addEventListener('click', event => {
    const target = event.target
    if (!(target instanceof Element)) return
    const toggle = target.closest<HTMLButtonElement>('.accordion-toggle')
    if (toggle === null) return

    const id = toggle.dataset['id']
    if (id === undefined) return

    st.events.clickedItemId = id
    scheduleRender()
  })

  document.fonts.ready.then(() => {
    if (reportRequested) publishNavigationPhase('measuring', requestId)
    scheduleRender()
  })

  window.addEventListener('resize', () => {
    scheduleRender()
  })

  scheduleRender()
}

function getRequiredPre(id: string): HTMLPreElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLPreElement)) throw new Error(`#${id} not found`)
  return element
}

function applyScenarioFrame(): void {
  if (domCache === null || requestedPageWidth === null) return
  domCache.page.style.width = `${requestedPageWidth}px`
  domCache.page.style.maxWidth = 'none'
}

function render(_now: number): boolean {
  if (domCache === null) return false
  const firstCopy = domCache.items[0]?.copy
  const firstInner = domCache.items[0]?.inner
  if (firstCopy === undefined || firstInner === undefined) return false

  const copyStyles = getComputedStyle(firstCopy)
  const innerStyles = getComputedStyle(firstInner)
  const font = getFontFromStyles(copyStyles)
  const lineHeight = parsePx(copyStyles.lineHeight)
  const contentWidth = firstCopy.getBoundingClientRect().width
  const paddingY = parsePx(innerStyles.paddingTop) + parsePx(innerStyles.paddingBottom)
  const pageWidth = Math.round(domCache.page.getBoundingClientRect().width)

  let openItemId = st.openItemId
  if (st.events.clickedItemId !== null) {
    openItemId = openItemId === st.events.clickedItemId ? null : st.events.clickedItemId
  }

  refreshPrepared(font)

  const panelHeights: number[] = []
  const panelMeta: string[] = []
  const panelLineCounts: number[] = []
  for (let index = 0; index < items.length; index++) {
    const metrics = layout(preparedCache.items[index]!, contentWidth, lineHeight)
    panelHeights.push(Math.ceil(metrics.height + paddingY))
    panelLineCounts.push(metrics.lineCount)
    panelMeta.push(`Measurement: ${metrics.lineCount} lines · ${Math.round(metrics.height)}px`)
  }

  st.openItemId = openItemId
  st.events.clickedItemId = null

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!
    const itemDom = domCache.items[index]!
    const expanded = openItemId === item.id

    itemDom.meta.textContent = panelMeta[index]!
    itemDom.body.style.height = expanded ? `${panelHeights[index]}px` : '0px'
    itemDom.glyph.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)'
    itemDom.toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false')
  }

  syncPresetUi(pageWidth, openItemId)
  const report = buildAccordionReport(pageWidth, contentWidth, openItemId, panelHeights, panelLineCounts)
  syncSummaryPanel(report)
  maybePublishReport(report)

  return false
}

function syncPresetUi(pageWidth: number, openItemId: string | null): void {
  if (domCache === null) return
  const signature = `${pageWidth}:${openItemId ?? 'none'}`
  if (signature === lastProbeUiSignature) return
  lastProbeUiSignature = signature
  renderProbeRail(pageWidth, openItemId)
  renderPresetCards(pageWidth, openItemId)
  renderScenarioCards(pageWidth, openItemId)
}

function renderProbeRail(pageWidth: number, openItemId: string | null): void {
  if (domCache === null) return
  const state = toAccordionProbeState(pageWidth, openItemId)
  const presets = ACCORDION_PROBE_PRESETS.map(preset => ({
    label: preset.label,
    href: buildProbeHref({ presetKey: preset.key }),
    active: isAccordionPresetActive(preset, state),
  }))
  domCache.probeRail.replaceChildren(...presets.map(createProbeLink))
}

function renderPresetCards(pageWidth: number, openItemId: string | null): void {
  if (domCache === null) return
  const state = toAccordionProbeState(pageWidth, openItemId)
  const cards = ACCORDION_PROBE_PRESETS.map(preset =>
    createPresetCard({
      label: preset.label,
      href: buildProbeHref({ presetKey: preset.key }),
      active: isAccordionPresetActive(preset, state),
      pageWidthSummary: `${preset.pageWidth}px`,
      openSummary: preset.openItemId,
    }),
  )
  domCache.presetCards.replaceChildren(...cards)
}

function renderScenarioCards(pageWidth: number, openItemId: string | null): void {
  if (domCache === null) return
  const cards = buildScenarioCardDefinitions(pageWidth, openItemId).map(createScenarioCard)
  domCache.routeCards.replaceChildren(...cards)
}

function toAccordionProbeState(pageWidth: number, openItemId: string | null): AccordionProbeState {
  return { pageWidth, openItemId }
}

function findMatchingAccordionPreset(pageWidth: number, openItemId: string | null): AccordionProbePreset | null {
  const state = toAccordionProbeState(pageWidth, openItemId)
  return ACCORDION_PROBE_PRESETS.find(preset => isAccordionPresetActive(preset, state)) ?? null
}

function isAccordionPresetActive(
  preset: AccordionProbePreset,
  state: AccordionProbeState,
): boolean {
  return state.pageWidth === preset.pageWidth && state.openItemId === preset.openItemId
}

function buildScenarioCardDefinitions(
  pageWidth: number,
  openItemId: string | null,
): Array<{
  label: string
  href: string
  mode: string
  route: string
  path: string
}> {
  const matchedPreset = findMatchingAccordionPreset(pageWidth, openItemId)
  const query = buildScenarioQuery(pageWidth, openItemId, matchedPreset)
  const demoPath = normalizeAccordionPath(location.pathname, 'demo')
  const rootPath = normalizeAccordionPath(location.pathname, 'root')
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
  pageWidth: number,
  openItemId: string | null,
  matchedPreset: AccordionProbePreset | null,
): string {
  const next = new URLSearchParams()
  if (matchedPreset !== null) {
    next.set('preset', matchedPreset.key)
  } else {
    next.set('pageWidth', String(pageWidth))
    if (openItemId !== null) next.set('open', openItemId)
  }
  const query = next.toString()
  return query.length === 0 ? '' : `?${query}`
}

function appendReportQuery(query: string): string {
  const next = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
  next.set('report', '1')
  return `?${next.toString()}`
}

function normalizeAccordionPath(pathname: string, target: 'demo' | 'root'): string {
  if (target === 'demo') {
    return pathname.includes('/demos/')
      ? pathname.replace(/\/accordion\/?$/, '/accordion')
      : pathname.replace(/\/accordion\/?$/, '/demos/accordion')
  }
  return pathname.includes('/demos/')
    ? pathname.replace(/\/demos\/accordion\/?$/, '/accordion')
    : pathname.replace(/\/accordion\/?$/, '/accordion')
}

function buildProbeHref(options: { presetKey?: string; pageWidth?: number; openItemId?: string | null }): string {
  const next = new URLSearchParams()
  if (options.presetKey !== undefined) {
    next.set('preset', options.presetKey)
  } else {
    if (options.pageWidth !== undefined) next.set('pageWidth', String(options.pageWidth))
    if (options.openItemId !== undefined && options.openItemId !== null) next.set('open', options.openItemId)
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
  pageWidthSummary: string
  openSummary: string
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
    createPresetCardRow('page', definition.pageWidthSummary),
    createPresetCardRow('open', definition.openSummary),
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

function buildAccordionReport(
  pageWidth: number,
  contentWidth: number,
  openItemId: string | null,
  panelHeights: number[],
  panelLineCounts: number[],
): AccordionReport {
  const matchedPreset = findMatchingAccordionPreset(pageWidth, openItemId)
  return {
    status: 'ready',
    presetKey: matchedPreset?.key,
    environment: getEnvironmentFingerprint(),
    accordion: {
      pageWidth,
      contentWidth: Math.round(contentWidth),
      openItemId,
      itemCount: items.length,
      openLineCount: openItemId === null ? 0 : panelLineCounts[items.findIndex(item => item.id === openItemId)] ?? 0,
      maxPanelHeight: panelHeights.reduce((max, value) => Math.max(max, value), 0),
    },
    items: items.map((item, index) => ({
      id: item.id,
      lineCount: panelLineCounts[index] ?? 0,
      height: panelHeights[index] ?? 0,
    })),
  }
}

function syncSummaryPanel(report: AccordionReport): void {
  if (domCache === null) return
  domCache.summary.textContent = [
    `preset ${report.presetKey ?? 'manual'}`,
    `page ${report.accordion.pageWidth}px • content ${report.accordion.contentWidth}px • open ${report.accordion.openItemId ?? 'none'}`,
    `items ${report.accordion.itemCount} • open lines ${report.accordion.openLineCount} • max panel ${report.accordion.maxPanelHeight}px`,
    report.items.map(item => `${item.id}:${item.lineCount}L/${item.height}px`).join(' • '),
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

function withRequestId(report: AccordionReport): AccordionReport {
  return requestId === undefined ? report : { ...report, requestId }
}

function maybePublishReport(report: AccordionReport): void {
  if (!reportRequested || reportPublished) return
  reportPublished = true
  publishNavigationReport(withRequestId(report))
}
