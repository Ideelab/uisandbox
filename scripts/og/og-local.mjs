// The link cards from a running app (decisions 227, 228): scripts/og/social-preview.html
// around brand/marketing/local-app-six-1440.png (Ledgerly on localhost:5173, opened by
// `npx uisandbox-mcp open`, six ways).
//
//   node scripts/og/og-local.mjs
//
// Writes brand/marketing/social-preview-1280.png (GitHub's social preview, 1280×640 at 2x),
// brand/marketing/og-local-light.png (2400×1260) and public/og.png (1200×630, the site's card).
import { chromium } from 'playwright'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const page = 'file://' + join(root, 'scripts', 'og', 'social-preview.html')
const b = await chromium.launch()
const shot = async (w, h, dsf, path) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf })).newPage()
  await p.goto(page); await p.waitForLoadState('networkidle')
  await p.addStyleTag({ content: `body{width:${w}px;height:${h}px}` }); await p.waitForTimeout(800)
  await p.screenshot({ path }); await p.context().close()
}
await shot(1280, 640, 2, join(root, 'brand', 'marketing', 'social-preview-1280.png'))
await shot(1200, 630, 2, join(root, 'brand', 'marketing', 'og-local-light.png'))
await shot(1200, 630, 1, join(root, 'public', 'og.png'))
await b.close(); console.log('ok')
