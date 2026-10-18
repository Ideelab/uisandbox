#!/usr/bin/env node
/**
 * public/live.js = src/kits/live.template.js with the kit rules of
 * src/kits/engine/detect.mjs inlined.
 *
 * The bridge runs inside somebody else's page as a plain script and cannot
 * import, so the rules are pasted in at build time rather than copied by
 * hand: a dropped build and an app over postMessage are then judged by one
 * set of rules, and src/kits/__tests__/live.test.ts fails if public/live.js
 * is ever out of date with either source.
 *
 *   node scripts/live-build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export function buildLive() {
  const template = readFileSync(join(root, 'src/kits/live.template.js'), 'utf8')
  const detect = readFileSync(join(root, 'src/kits/engine/detect.mjs'), 'utf8').replace(/^export /m, '').trim()
  if (!template.includes('/*DETECT*/')) throw new Error('live.template.js has no /*DETECT*/ marker')
  const indented = detect.split('\n').map((l) => (l ? '  ' + l : l)).join('\n')
  return template.replace('  /*DETECT*/', indented)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = buildLive()
  writeFileSync(join(root, 'public/live.js'), out)
  console.log(`public/live.js · ${out.length} bytes`)
}
