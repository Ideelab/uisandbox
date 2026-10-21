import { describe, it, expect } from 'vitest'
import { rewriteCss } from '../../sandbox/rewrite'
import { SubstitutionTable, varName } from '../../sandbox/table'
import { genPatch } from '../genSheet'

// A live Next.js app: its CSS arrives as the dev server's own build, a file
// that is not in the repo. The patch says where the literals really live.
describe('the patch names where a value lives', () => {
  const t = new SubstitutionTable()
  rewriteCss(':root{--primary:#4f39f6}.btn{border-radius:8px}', t, '_next/static/css/app/layout.css')
  rewriteCss('.card{color:#111111}', t, '/src/index.css')
  const moved = Object.fromEntries(t.entries.map((e) => [varName(e.id), e.kind === 'color' ? '#e11d48' : '12px']))
  const out = genPatch(t, moved)
  it('a Next.js build file gets the note to look in the source CSS', () => {
    expect(out).toMatch(/## _next\/static\/css\/app\/layout\.css\n# Built by Next\.js from your source CSS/)
  })
  it('a Vite source file does not', () => {
    expect(out).toMatch(/## \/src\/index\.css\n(?!# Built)/)
  })
})

// One literal in many places, only some moved: each line says where it sits,
// so an agent does not guess (decision 217, the agent-prompt test).
describe('each patch line names where its value sits', () => {
  const t = new SubstitutionTable()
  rewriteCss(':root{--primary-foreground:oklch(0.985 0 0);--chart-1:#4f39f6;--primary:#4f39f6}.dark{--primary:#7c6cf6}.rounded-md{border-radius:6px}', t, '/src/index.css')
  const vars = Object.fromEntries(t.entries.map((e) => [varName(e.id), e.kind === 'color' ? '#14b8a6' : '9px']))
  const out = genPatch(t, vars)
  it('a variable by its name, outside :root with its selector, a rule by selector and property', () => {
    expect(out).toMatch(/#4f39f6\s+→\s+#14b8a6\s+\(×2: --chart-1, --primary\)|#4f39f6\s+→\s+#14b8a6\s+\(×2: --primary, --chart-1\)/)
    expect(out).toMatch(/\.dark --primary\)/)
    expect(out).toMatch(/\.rounded-md \{ border-radius \}/)
  })
})

