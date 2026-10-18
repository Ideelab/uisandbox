/* Types for the parts of generate.mjs that UISandbox calls. The .mjs is the
 * engine as it came across from Ideelab/uicockpit and stays byte-identical to
 * its source (SOURCE.md), so its types live beside it rather than in it. */
import type { KitId } from './detect.mjs'

export type RoleValues = Partial<Record<
  | 'brand' | 'onBrand' | 'page' | 'surface' | 'ink' | 'inkMuted' | 'line'
  | 'success' | 'warning' | 'danger' | 'focus'
  | 'fontHeading' | 'fontBody'
  | 'elevation' | 'lineHeight' | 'letterSpacing' | 'fontWeight' | 'borderWidth' | 'space' | 'radius' | 'baseText',
  string | number>>

/** One row of what a kit's own stylesheet never reads (MANIFEST.md). */
export interface Unread { kit: KitId; name: string; role: string; names: string[]; instead: string[]; tokensOnly: boolean }

export interface GenerateOptions {
  name?: string
  unread?: Unread[]
  /** DESIGN.md's Overview. Without one it opens "No brand description was
   *  written", which is true in the generator and misleading here. */
  overview?: string
}

/** Path → file contents: theme.css, install.md, MANIFEST.md, DESIGN.md,
 *  .claude/skills/<slug>/SKILL.md, tokens.json, AGENTS.md, CLAUDE.md,
 *  .cursor/rules, and a kit's own extras (antd.theme.ts …). */
export function generate(values: RoleValues, kitIds: KitId[], kits: Record<string, unknown>, opts?: GenerateOptions): Record<string, string>
