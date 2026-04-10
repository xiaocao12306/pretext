import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const outdir = path.join(root, 'site')
const entrypoints = [
  'pages/demos/index.html',
  'pages/demos/accordion.html',
  'pages/demos/bubbles.html',
  'pages/demos/dynamic-layout.html',
  'pages/demos/emoji-test.html',
  'pages/demos/editorial-engine.html',
  'pages/demos/justification-comparison.html',
  'pages/demos/masonry/index.html',
  'pages/demos/rich-note.html',
  'pages/demos/variable-typographic-ascii.html',
  'pages/emoji-test.html',
  'pages/justification-comparison.html',
  'pages/assets.html',
  'pages/assets/index.html',
]

const result = Bun.spawnSync(
  ['bun', 'build', ...entrypoints, '--outdir', outdir],
  {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  },
)

if (result.exitCode !== 0) {
  process.exit(result.exitCode)
}

const targets = [
  { source: 'index.html', target: 'index.html' },
  { source: 'accordion.html', target: 'accordion/index.html' },
  { source: 'bubbles.html', target: 'bubbles/index.html' },
  { source: 'dynamic-layout.html', target: 'dynamic-layout/index.html' },
  { source: 'pages/demos/emoji-test.html', target: 'demos/emoji-test.html' },
  { source: 'editorial-engine.html', target: 'editorial-engine/index.html' },
  { source: 'justification-comparison.html', target: 'justification-comparison/index.html' },
  { source: 'masonry/index.html', target: 'masonry/index.html' },
  { source: 'rich-note.html', target: 'rich-note/index.html' },
  { source: 'variable-typographic-ascii.html', target: 'variable-typographic-ascii/index.html' },
  { source: 'emoji-test.html', target: 'emoji-test/index.html' },
  { source: 'pages/justification-comparison.html', target: 'justification-comparison.html' },
  { source: 'assets.html', target: 'assets.html' },
  { source: 'assets/index.html', target: 'assets/index.html' },
]

for (let index = 0; index < targets.length; index++) {
  const entry = targets[index]!
  await moveBuiltHtml(entry.source, entry.target)
}

await copyStaticAssetFiles()
await rm(path.join(outdir, 'pages'), { recursive: true, force: true })

async function resolveBuiltHtmlPath(relativePath: string): Promise<string> {
  const normalizedPath = relativePath.replace(/^\.\/+/, '')
  const strippedPagesPath = normalizedPath.replace(/^pages\//, '')
  const candidates = [
    path.join(outdir, normalizedPath),
    path.join(outdir, strippedPagesPath),
    path.join(outdir, 'pages', normalizedPath),
    path.join(outdir, 'pages', strippedPagesPath),
    path.join(outdir, 'pages', 'demos', normalizedPath),
    path.join(outdir, 'pages', 'demos', strippedPagesPath),
  ]
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index]!
    if (await Bun.file(candidate).exists()) return candidate
  }
  throw new Error(`Built HTML not found for ${relativePath}`)
}

async function moveBuiltHtml(sourceRelativePath: string, targetRelativePath: string): Promise<void> {
  const sourcePath = await resolveBuiltHtmlPath(sourceRelativePath)
  const targetPath = path.join(outdir, targetRelativePath)
  let html = await readFile(sourcePath, 'utf8')
  html = rebaseRelativeAssetUrls(html, sourcePath, targetPath)
  html = rewriteRootRelativeSiteLinks(html, targetRelativePath)
  html = rewriteDemoLinksForStaticRoot(html, targetRelativePath)

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, html)
  if (sourcePath !== targetPath) await rm(sourcePath)
}

function rebaseRelativeAssetUrls(html: string, sourcePath: string, targetPath: string): string {
  return html.replace(/\b(src|href)="([^"]+)"/g, (_match, attr: string, value: string) => {
    if (!value.startsWith('.')) return `${attr}="${value}"`

    const absoluteAssetPath = path.resolve(path.dirname(sourcePath), value)
    let relativeAssetPath = path.relative(path.dirname(targetPath), absoluteAssetPath)
    relativeAssetPath = relativeAssetPath.split(path.sep).join('/')
    if (!relativeAssetPath.startsWith('.')) relativeAssetPath = `./${relativeAssetPath}`
    return `${attr}="${relativeAssetPath}"`
  })
}

function rewriteDemoLinksForStaticRoot(html: string, targetRelativePath: string): string {
  if (targetRelativePath !== 'index.html') return html
  return html
    .replace(/\bhref="\/demos\/([^"?#\/]+)([^"]*)"/g, (_match, slug: string, suffix: string) => `href="./${slug}${suffix}"`)
    .replace(/\bhref="\/(dynamic-layout|editorial-engine|justification-comparison|emoji-test)([^"]*)"/g, (_match, slug: string, suffix: string) => `href="./${slug}${suffix}"`)
}

function rewriteRootRelativeSiteLinks(html: string, targetRelativePath: string): string {
  const routePrefixPattern = [
    'assets',
    'demos',
    'emoji-test',
    'dynamic-layout',
    'editorial-engine',
    'justification-comparison',
    'accordion',
    'bubbles',
    'rich-note',
    'variable-typographic-ascii',
    'masonry',
  ].join('|')
  const quotedRootRelativePattern = new RegExp(`(["'\`])\\/((?:${routePrefixPattern})[^"'\\s<>\`]*?)\\1`, 'g')

  return html.replace(quotedRootRelativePattern, (_match, quote: string, sitePath: string) => {
    return `${quote}${toRelativeSiteHref(targetRelativePath, `/${sitePath}`)}${quote}`
  })
}

function toRelativeSiteHref(targetRelativePath: string, rootRelativeHref: string): string {
  const parsed = new URL(rootRelativeHref, 'https://pretext.invalid')
  const targetDir = path.posix.dirname(targetRelativePath)
  const normalizedPathname = parsed.pathname.replace(/^\/+/, '')
  let relativePath = path.posix.relative(targetDir, normalizedPathname)
  if (relativePath === '') relativePath = '.'
  if (!relativePath.startsWith('.')) relativePath = `./${relativePath}`
  return `${relativePath}${parsed.search}${parsed.hash}`
}

async function copyStaticAssetFiles(): Promise<void> {
  const assetSourceDir = path.join(root, 'pages', 'assets')
  const assetTargetDir = path.join(outdir, 'assets')
  await mkdir(assetTargetDir, { recursive: true })

  const entries = await readdir(assetSourceDir, { withFileTypes: true })
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!
    if (!entry.isFile()) continue
    if (entry.name === 'index.html') continue
    await copyFile(
      path.join(assetSourceDir, entry.name),
      path.join(assetTargetDir, entry.name),
    )
  }
}
