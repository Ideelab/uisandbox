import { describe, it, expect } from 'vitest'
import { fontCssFor } from '../app/fontCss'
import { DEFAULT_CONFIG } from '../tokens/defaults'
import type { Config } from '../tokens/types'

const base: Config = { ...DEFAULT_CONFIG, sb: { ...DEFAULT_CONFIG.sb } }
const withSb = (sb: Partial<Config['sb']>): Config => ({ ...base, sb: { ...base.sb, ...sb } })

describe('heading weight (decision 222)', () => {
  it('as is writes nothing', () => {
    expect(fontCssFor(base, base)).toBe('')
  })
  it('a picked weight lands on the headings by selector, without a font change', () => {
    const css = fontCssFor(withSb({ headWeight: 800 }), base)
    expect(css).toMatch(/^h1,h2,h3,h4,h5,h6,.*\{font-weight:800 !important\}$/)
  })
  it('and next to a heading font when one is picked', () => {
    const css = fontCssFor({ ...withSb({ headWeight: 300 }), fontDisplay: base.fontDisplay === 'Outfit' ? 'Inter' : 'Outfit' }, base)
    expect(css).toMatch(/font-family:[^}]+!important\}/)
    expect(css).toMatch(/\{font-weight:300 !important\}/)
  })
})
