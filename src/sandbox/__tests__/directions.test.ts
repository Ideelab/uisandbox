import { describe, expect, it } from 'vitest'
import { DIRECTIONS, applyDirection, firstRoll, reroll } from '../directions'
import { ALL_FONTS } from '../../tokens/fonts'
import { DIALS } from '../dials'
import { DEFAULT_CONFIG } from '../../tokens/defaults'

describe('looks (directions)', () => {
  it('names only fonts the font picker can load', () => {
    for (const d of DIRECTIONS) for (const pair of d.fonts) for (const f of pair) expect(ALL_FONTS).toContain(f)
  })
  it('turns dials only within their own range', () => {
    for (const d of DIRECTIONS) for (const [k, v] of Object.entries(d.sb)) {
      const dial = DIALS.find((x) => x.key === k)!
      expect(dial, k).toBeTruthy()
      expect(v).toBeGreaterThanOrEqual(dial.min)
      expect(v).toBeLessThanOrEqual(dial.max)
    }
  })
  it('stays off the tells it was made to avoid: no Inter', () => {
    for (const d of DIRECTIONS) expect(d.fonts.flat()).not.toContain('Inter')
  })
  it('never touches colour: the six are compared on style, in your colour (decision 216)', () => {
    const tinted = { ...DEFAULT_CONFIG, cPrimary: '#0f766e' as const, neutral: 'auto' as const }
    for (const d of DIRECTIONS) {
      const c = applyDirection(tinted, d)
      expect(c.cPrimary).toBe(tinted.cPrimary)
      expect(c.neutral).toBe(tinted.neutral)
      for (const k of ['hue', 'sat', 'contrast', 'cBackground', 'cSecondary', 'cAccent'] as const) expect(c.sb[k]).toEqual(tinted.sb[k])
    }
  })
  it('keeps the fonts when they are locked', () => {
    const d = DIRECTIONS[0]!
    const locked = applyDirection(DEFAULT_CONFIG, d, { font: 1 }, { font: true })
    expect(locked.fontBody).toBe(DEFAULT_CONFIG.fontBody)
    expect(locked.sb.radius).toBe(d.sb.radius)
    const free = applyDirection(DEFAULT_CONFIG, d, { font: 1 })
    expect(free.fontDisplay).toBe(d.fonts[1]![0])
  })
  it('a shuffle shows every direction a type pair it did not show before', () => {
    const a = firstRoll()
    const b = reroll(a, () => 0.5)
    for (const d of DIRECTIONS) if (d.fonts.length > 1) expect(b[d.id]!.font).not.toBe(a[d.id]!.font)
  })
})
