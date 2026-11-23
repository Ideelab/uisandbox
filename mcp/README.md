# UISandbox MCP server

Play with your app's design, right in the browser, from your agent or your terminal. The same engine [uisandbox.org](https://uisandbox.org) runs, as tools: no second implementation. Open the real sandbox with your app in it, let the user turn the knobs, and get back what they turned and the patch.

```bash
npx uisandbox-mcp                          # the published package (stdio); add it to your client as below
UISANDBOX_URL=http://localhost:5190 npx uisandbox-mcp   # render tools against a local app instead of uisandbox.org

# from a clone of the repo:
pnpm mcp                                   # stdio server straight from the sources (tsx)
pnpm mcp:build && pnpm mcp:pack            # bundle the engine into mcp/dist/server.mjs and pack uisandbox-mcp
npx tsx mcp/smoke.ts fixtures/x.zip        # load → set → export → verify → screenshot (MCP_CMD to point at a build)
```

`verify` and `screenshot` need Chromium: `npx playwright install chromium` once (Playwright ships with the package; only the browser is downloaded; `load`, `set`, `export` and `open` work without it).

## Tools

| tool | input | returns |
|---|---|---|
| `try_designs` | `url?`, `carry?` | **the one call for "let me try some designs"**: finds the user's app (the dev server running on this machine, read from package.json or found on the usual ports; else the build in this folder), opens the sandbox with it live, and returns the id for `wait_for_send`; lists the apps when more than one runs |
| `load` | `devUrl`, or `zipUrl` / `zipPath` | `devUrl` (e.g. `http://localhost:5173`): a RUNNING dev server, in live mode, no build needed, hot reload passed through; a zip: project id, screens, values, the baseline (brand, fonts, families, palette, canvas, dark mode), or a refusal with the reason |
| `open` | `id`, `screen?` | **the sandbox itself** in the user's browser: the web app ships in the package and is served from 127.0.0.1 by this process with the archive; what the user turns flows back (`state`) |
| `state` | `id` | the knobs now, including what was turned by hand in an opened sandbox |
| `wait_for_send` | `id`, `timeoutSeconds?` | waits until the user presses **Send to your agent** in the opened sandbox, then returns what they turned (from → to), how many values moved, and the patch for their source; says `stillOpen` when the time runs out first |
| `screens` | `id` | the screens |
| `set` | `id`, `knobs`: `cPrimary`, `fontDisplay`, `fontBody`, dials (`radius`, `space`, `type`, `lineHeight`, `tracking`, `weight`, `borderWidth`, `borderTone`, `shadow`, `motion`, `hue`, `sat`, `contrast`, `gradAngle`), `cBackground`, family colours, `dark`, `reset` | what moved (count, sample) |
| `export` | `id`, `format`: `sheet-css` · `sheet-json` · `patch` · `tokens-css` · `tokens-json` · `tailwind` · `shadcn` · `swift` · `android-xml` · `android-kotlin` | text |
| `verify` | `id`, `screen?`, `width?` | the 1:1 check in headless Chromium (untouched vs. tokenised, computed styles per element) + reach |
| `screenshot` | `id`, `screen?`, `width?` | PNG of the screen with the current knobs |

`load`/`set`/`export`/`state` are pure Node. `open` serves the bundled app on 127.0.0.1 and opens the browser; nothing leaves the machine. `verify`/`screenshot` drive the app in headless Chromium (the bundled one on 127.0.0.1; `UISANDBOX_URL` to point elsewhere) with the archive served from a route inside the browser, so the number an agent gets is the number a visitor gets.

The conversation this is built for: *"Let me try some designs on this"* → the agent calls `try_designs`, which finds your running app and opens it; you pick one of six looks or turn the knobs and press **Send to your agent**; the agent gets what you turned and the patch, shows it to you, and applies it when you say yes. (Or come back and say *"export what I did"* → `state` → `export`.) Opened from the terminal with `npx uisandbox-mcp open`, the button is **Send to the terminal** and prints the same there.

## Without an agent

```bash
npx uisandbox-mcp open                         # the app running on this machine, live (else the build in this folder); hot reload included
npx uisandbox-mcp open http://localhost:3000   # that dev server, when more than one runs (a folder or zip works too)
npx uisandbox-mcp open --detach                # opens it and returns at once (for an agent without MCP); the patch goes to a file; `stop` ends it
npx uisandbox-mcp start                        # only the helper: on uisandbox.org, "Connect a running app" lists your running apps
npx uisandbox-mcp                              # typed in a terminal: the same as start (an MCP client pipes stdin and gets the server)
```

An agent without the MCP tools runs `open --detach`: one command that finishes, and the sandbox opens in the user's own browser. An agent's built-in browser cannot reach the user's localhost from uisandbox.org (no local network permission there), so the site's Connect menu is for the user's own browser.

**The helper.** A page on uisandbox.org cannot read your localhost; the server can. It listens on `127.0.0.1:47319` (inside the MCP server whenever your client runs it, or with `start`) and answers uisandbox.org and localhost pages only: which dev servers run (`GET /apps`) and open one (`POST /open`), served from this process. Chrome asks once whether uisandbox.org may reach your local network; `http://127.0.0.1:47319/` lists the same apps in any browser with nothing to allow (Safari does not let a site ask). It looks on the usual dev ports and the runs around them (3000–3010, 4000–4010, 4200–4210, 4300–4330, 5000–5010, 5170–5180, 8000–8010, 8080–8090 and a few more) and the one your package.json names; `UISANDBOX_PORTS=4400,9000` adds your own.

## Slash commands

Where the client shows MCP prompts (Claude Desktop, Claude Code): `/uisandbox:open` (build the current repo, load, open the sandbox) and `/uisandbox:try <change>` (apply, verify 1:1, screenshot, patch). The server also sends `instructions` to the client, so the model knows when to offer the sandbox on its own.

## Claude Desktop / Claude Code / Cursor

```json
{
  "mcpServers": {
    "uisandbox": { "command": "npx", "args": ["-y", "uisandbox-mcp"] }
  }
}
```

Claude Code: `claude mcp add uisandbox -- npx -y uisandbox-mcp`

## Publishing (maintainer)

`pnpm mcp:pack` → `cd mcp && npm publish` (the `files` field ships `dist/server.mjs`, README, LICENSE only). `mcp/server.json` is the manifest for the official MCP registry (`mcp-publisher publish` from `mcp/`); the other directories (Smithery, PulseMCP, Glama, mcp.so) take the npm name.

## A prompt to paste

> Open this app in UISandbox so I can play with the design. Build it first. (Later:) Export the patch for what I changed.

> Test my design: load https://github.com/me/site/archive/refs/heads/gh-pages.zip in UISandbox, set the brand to #e11d48 and radius ×1.5, verify it is still 1:1, show me a screenshot, and give me the patch.
