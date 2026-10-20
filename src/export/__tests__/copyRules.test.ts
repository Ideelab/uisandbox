import { describe, it, expect } from 'vitest'
import { rewriteCss } from '../../sandbox/rewrite'
import { SubstitutionTable } from '../../sandbox/table'
import { DEFAULT_CONFIG } from '../../tokens/defaults'
import { genDesignMd } from '../genDesignMd'
import { genAgentsBlock } from '../genAgents'
import { genDtcg } from '../genDtcg'
import { genReadme } from '../genReadme'
import { genCss } from '../genCss'
import { genJson } from '../genJson'
import { genTailwind } from '../genTailwind'
import { genShadcn } from '../genShadcn'
import { genSwift, genAssetCatalog } from '../genSwift'
import { genAndroidColorsXml, genAndroidKotlin } from '../genAndroid'
import { genSheetCss, genSheetJson, genPatch } from '../genSheet'

/* Every file the export hands over, read for the two rules the copy keeps:
 * no em-dash (it reads as generated text, and the export goes straight to an
 * agent and into a repo) and the product's own name (two headers still said
 * UIcockpit). Decision 216. */
const CSS = `body{color:#212529;background:#fff;font-size:16px}.card{background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08)}.btn{background:#4f39f6;color:#fff;border-radius:8px}h2{font-size:24px;font-weight:700}`
const t = new SubstitutionTable()
rewriteCss(CSS, t, 'app.css')
const moved = Object.fromEntries(Object.entries(t.identityVars()).map(([k, v]) => [k, v === '#4f39f6' ? '#0f766e' : v]))
const cfg = { ...DEFAULT_CONFIG, cPrimary: '#0f766e' as const, fontDisplay: 'Fraunces', fontBody: 'Figtree' }

const files: Record<string, string> = {
  'DESIGN.md': genDesignMd(t, moved, cfg, 'demo', { date: '2026-10-21', webfonts: ['Fraunces', 'Figtree'] }),
  'AGENTS.md': genAgentsBlock('demo', { date: '2026-10-21', moved: 1 }),
  'design.tokens.json': genDtcg(t, moved, cfg, 'demo', { date: '2026-10-21' }),
  'README.md': genReadme('demo', [{ name: 'DESIGN.md', what: 'x' }], { moved: 1, total: 9, changedFiles: 1, date: '2026-10-21' }),
  'tokens.css': genCss(cfg),
  'tokens.json': genJson(cfg),
  'tailwind.css': genTailwind(cfg),
  'shadcn.css': genShadcn(cfg),
  'DesignTokens.swift': genSwift(cfg),
  'colors.xml': genAndroidColorsXml(cfg),
  'colors-night.xml': genAndroidColorsXml(cfg, 'dark'),
  'DesignTokens.kt': genAndroidKotlin(cfg),
  'sheet.css': genSheetCss(t, moved),
  'sheet.json': genSheetJson(t, moved),
  'patch.txt': genPatch(t, moved),
  'patch-none.txt': genPatch(t, t.identityVars()),
  ...Object.fromEntries(genAssetCatalog(cfg).map((f) => [f.path, f.content])),
}

describe('what the export writes keeps the copy rules', () => {
  for (const [name, text] of Object.entries(files)) {
    it(`${name}: no em-dash, no old name`, () => {
      const at = text.indexOf('—')
      expect(at < 0 ? '' : text.slice(Math.max(0, at - 50), at + 20)).toBe('')
      expect(text).not.toMatch(/UIcockpit/i)
    })
  }
})
