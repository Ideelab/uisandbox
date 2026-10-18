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
