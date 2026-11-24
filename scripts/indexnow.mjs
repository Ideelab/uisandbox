#!/usr/bin/env node
/**
 * Tell the search engines that take IndexNow (Bing, Yandex, Seznam, Naver;
 * Bing feeds ChatGPT search and Copilot) which pages changed, so they crawl
 * them now instead of whenever they come by (decision 231). Run it after a
 * deploy, never before: the engines check the key file on the live site.
 *
 *   pnpm indexnow                    every URL in public/sitemap.xml
 *   pnpm indexnow /mcp/ /guides/     only these
 *   pnpm indexnow --dry              print what would be sent, send nothing
 *
 * The key is public/<32 hex>.txt, holding its own name. It is not a secret:
 * IndexNow requires it to be served, so anyone can read it; all it proves is
 * that whoever pings owns the site.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOST = 'uisandbox.org'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

const keys = readdirSync(pub).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))
if (keys.length !== 1) throw new Error(`indexnow: expected one key file in public/, found ${keys.length}`)
const key = keys[0].slice(0, -4)
const keyLocation = `https://${HOST}/${key}.txt`

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const paths = args.filter((a) => !a.startsWith('--'))
const sitemap = [...readFileSync(join(pub, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const urlList = paths.length ? paths.map((p) => new URL(p, `https://${HOST}`).toString()) : sitemap

if (dry) {
  console.log(JSON.stringify({ host: HOST, key, keyLocation, urlList }, null, 2))
  process.exit(0)
}

// The engines fetch the key file before they accept a ping; check it first,
// so an undeployed key says so here and not as a 403 later.
const live = await fetch(keyLocation, { redirect: 'manual' })
const body = live.ok ? (await live.text()).trim() : ''
if (body !== key) {
  const got = live.ok ? 'something else, likely the app' : `HTTP ${live.status}`
  console.error(`indexnow: ${keyLocation} does not serve the key yet (${got}). Deploy first.`)
  process.exit(1)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
})
const said = {
  200: 'accepted',
  202: 'received; the key is still being checked, the URLs are queued',
  400: 'bad request',
  403: 'the key was not found or does not match',
  422: 'a URL is not on this host, or the key does not match',
  429: 'too many requests; try again later',
}[res.status] ?? 'unexpected answer'
console.log(`indexnow: ${urlList.length} URL${urlList.length === 1 ? '' : 's'}, HTTP ${res.status}, ${said}`)
if (res.status >= 400) process.exit(1)
