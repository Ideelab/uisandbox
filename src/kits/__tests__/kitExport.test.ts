import { describe, it, expect } from 'vitest'
import { roleValues } from '../values'
import { kitExport } from '../kitExport'
import type { Measured } from '../../export/measured'

const row = (value: string, extra: object = {}) => ({ value, was: value, changed: false, count: 1, props: [], painted: 1, ...extra })

/** What the sandbox measures off an AdminLTE-shaped Bootstrap 5 build. */
const M: Measured = {
  brand: '#0d6efd',
  colors: { text: [], surface: [], border: [], icon: [], other: [] },
  palette: [
    { name: 'primary', ...row('#0d6efd') },
    { name: 'text', ...row('#212529') },
    { name: 'surface', ...row('#f8f9fa') },
    { name: 'surface-alt', ...row('#ffffff') },
    { name: 'text-muted', ...row('#6c757d') },
    { name: 'border', ...row('#dee2e6') },
  ],
  fonts: { display: 'Source Sans 3', body: 'Source Sans 3', stacks: [] },
  sizes: [], spacing: [], shadows: [], lineHeights: [], weights: [],
  radii: [
    { name: 'sm', ...row('.25rem', { painted: 4 }) },
    { name: 'md', ...row('.375rem', { painted: 50 }) },   // the one controls wear
    { name: 'full', ...row('50rem', { painted: 80 }) },   // pills: not "the" radius
  ],
  totals: { values: 1107, moved: 0 },
  anchors: {
    text: '#212529', background: '#f8f9fa',
    type: {
      body: { fontFamily: '"Source Sans 3", sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '24px' },
      display: { fontFamily: '"Source Sans 3", sans-serif', fontSize: '28px', fontWeight: '500', lineHeight: '33.6px' },
    },
  },
  fromScreen: true,
}

describe("what the sandbox measured, as the engine's role values", () => {
  const v = roleValues(M)

  it("maps the measured palette onto the engine's roles", () => {
    // The measured `surface` is the ground, which the engine calls `page`.
    expect(v).toMatchObject({ brand: '#0d6efd', ink: '#212529', page: '#f8f9fa', surface: '#ffffff', inkMuted: '#6c757d', line: '#dee2e6' })
  })

  it('passes lengths in px, because some kits read them with parseFloat', () => {
    expect(v.baseText).toBe('16px')
    expect(v.radius).toBe('6px')          // .375rem, the most-painted step
  })

  it('takes the radius controls wear, not the pill and not the smallest', () => {
    expect(v.radius).not.toBe('800px')
    expect(v.radius).not.toBe('4px')
  })

  it('turns the computed line height into the ratio the engine takes', () => {
    expect(v.lineHeight).toBe(1.5)
  })

  it('invents nothing it did not read', () => {
    for (const k of ['focus', 'onBrand', 'elevation', 'success', 'warning', 'danger'] as const) expect(v[k]).toBeUndefined()
  })

  it('refuses a translucent colour as a role', () => {
    const t = roleValues({ ...M, palette: [{ name: 'border', ...row('rgba(0, 0, 0, .1)') }] })
    expect(t.line).toBeUndefined()
  })
})

describe('the design system for a build that runs on one of the nine', () => {
  it("writes theme, DESIGN.md, SKILL.md and tokens.json in Bootstrap's own names", async () => {
    const f = await kitExport('bootstrap', roleValues(M), 'AdminLTE')
    expect(f['theme.css']).toMatch(/--bs-body-bg: #f8f9fa/)
    expect(f['DESIGN.md']).toBeTruthy()
    expect(f['.claude/skills/adminlte/SKILL.md']).toMatch(/btn-primary/)
    expect(() => JSON.parse(f['tokens.json']!)).not.toThrow()
  })

  it('says which variables the kit never reads, instead of claiming none', async () => {
    // Bootstrap writes --bs-primary and its own sheet reads --bs-link-color and
    // --bs-primary-rgb instead. Without the unread list the manifest would say
    // "Nothing. Every variable this theme writes is read".
    const f = await kitExport('bootstrap', roleValues(M), 'AdminLTE')
    expect(f['MANIFEST.md']).not.toMatch(/^Nothing\. Every variable this theme writes is read/m)
    expect(f['MANIFEST.md']).toMatch(/--bs-primary/)
  })
})
