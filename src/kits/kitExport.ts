/**
 * The design system for a build that runs on one of the nine: the engine's
 * own generate(), fed what the sandbox measured, written in that kit's names.
 *
 * Only the detected kit's values are fetched. The nine together are 4 MB of
 * JSON read out of their packages, and a build that is Bootstrap has no use
 * for Ant Design's 240 KB.
 */
import { generate, type RoleValues, type Unread, type GenerateOptions } from './engine/generate.mjs'
import type { KitId } from './engine/detect.mjs'
import unreadRows from './engine/kits/unread.json'

const KITS: Record<KitId, () => Promise<{ default: unknown }>> = {
  antd: () => import('./engine/kits/antd.json'),
  bootstrap: () => import('./engine/kits/bootstrap.json'),
  daisyui: () => import('./engine/kits/daisyui.json'),
  mantine: () => import('./engine/kits/mantine.json'),
  material: () => import('./engine/kits/material.json'),
  openprops: () => import('./engine/kits/openprops.json'),
  radix: () => import('./engine/kits/radix.json'),
  shadcn: () => import('./engine/kits/shadcn.json'),
  tailwind: () => import('./engine/kits/tailwind.json'),
}

/* Which variables each kit's own stylesheet never reads. Passed in because
 * without it MANIFEST.md says "Nothing. Every variable this theme writes is
 * read by the kit it belongs to" — a claim that would then rest on nothing.
 * This is the list uicockpit.com ships (SOURCE.md has its hash); recomputing
 * it needs orphans.mjs and the compiled kit sheets, which arrive with 2b. */
const UNREAD = unreadRows as Unread[]

export async function kitExport(kit: KitId, values: RoleValues, name: string, opts: Pick<GenerateOptions, 'overview'> = {}): Promise<Record<string, string>> {
  const data = (await KITS[kit]()).default
  return generate(values, [kit], { [kit]: data }, { ...opts, name, unread: UNREAD })
}

/* What a person downloads, out of what generate() returns: every file it
 * writes — including what only one kit needs, Bootstrap's _custom.scss for the
 * brand it compiles and Ant Design's antd.theme.ts because it has no
 * stylesheet to edit — except the engine's whole AGENTS.md, CLAUDE.md and
 * .cursor/rules. Unzipped into a repo those would overwrite somebody's build
 * and test instructions; the export hands over a block to append instead.
 *
 * Written as a rule rather than a list because a list is how the first
 * version shipped install.md telling Bootstrap users to compile _custom.scss,
 * in a zip that did not contain it. */
const NOT_SHIPPED = new Set(['AGENTS.md', 'CLAUDE.md', '.cursor/rules'])
export function kitPackage(files: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(files)
    .filter((e): e is [string, string] => typeof e[1] === 'string' && !NOT_SHIPPED.has(e[0])))
}
