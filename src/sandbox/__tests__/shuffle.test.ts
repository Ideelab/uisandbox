import { describe, it, expect } from 'vitest'
import { shuffle } from '../shuffle'
import { DEFAULT_CONFIG } from '../../tokens/defaults'
import { buildTokens } from '../../tokens/buildTokens'
import type { Baseline } from '../mapping'

const baseline = { cfg: DEFAULT_CONFIG, tokens: buildTokens(DEFAULT_CONFIG) } as Baseline
let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

describe('shuffle', () => {
  it('on a kit leaves Hue, Saturation and Contrast where they stand (the panel hides them there)', () => {
    for (let i = 0; i < 20; i++) {
      const out = shuffle(DEFAULT_CONFIG, baseline, rnd, { kit: true })
      expect(out.sb.hue).toBe(DEFAULT_CONFIG.sb.hue)
      expect(out.sb.sat).toBe(DEFAULT_CONFIG.sb.sat)
      expect(out.sb.contrast).toBe(DEFAULT_CONFIG.sb.contrast)
    }
  })
  it('on a build of yours still rolls them (control)', () => {
    const rolled = Array.from({ length: 20 }, () => shuffle(DEFAULT_CONFIG, baseline, rnd))
    expect(rolled.some((c) => c.sb.hue !== DEFAULT_CONFIG.sb.hue)).toBe(true)
  })
})
