/** The CSS that makes the chosen fonts load and the display font apply, for
 *  one configuration: the stage's, or a look's (LookGrid), from one function
 *  so the two cannot disagree. */
import type { Config } from '../tokens/types'
import { buildTokens } from '../tokens/buildTokens'
import { googleFontsImport, isCustomFont, customFontFamily, SYSTEM_FONT } from '../tokens/fonts'
import { customFontUrl } from '../tokens/customFonts'

export function fontCssFor(cfg: Config, base: Config): string {
  const chosen = [cfg.fontDisplay, cfg.fontBody].filter((f, i) => f !== (i === 0 ? base.fontDisplay : base.fontBody) && f !== SYSTEM_FONT)
  if (!chosen.length) return ''
  const google = chosen.filter((f) => !isCustomFont(f))
  const custom = chosen.filter(isCustomFont)
  const parts: string[] = []
  if (google.length) parts.push(googleFontsImport(google[0]!, google[1] ?? google[0]!))
  for (const f of custom) {
    const url = customFontUrl(f)
    if (url) parts.push(`@font-face{font-family:'${customFontFamily(f)}';src:url(${url});font-weight:100 900;font-display:swap}`)
  }
  // Display font: most apps set ONE family and let headings inherit it, so
  // there is no heading literal for the sheet to move. The knob therefore
  // speaks by SELECTOR — the one semantic override that is honest, because
  // "which face do headings use" is a real question in every app.
  if (cfg.fontDisplay !== base.fontDisplay) {
    const stack = String(buildTokens(cfg).vars['--k-font-display'])
    parts.push(`h1,h2,h3,h4,h5,h6,[class*="title"],[class*="heading"],[class*="hero"],[class*="display"]{font-family:${stack} !important}`)
  }
  return parts.join('\n')
}
