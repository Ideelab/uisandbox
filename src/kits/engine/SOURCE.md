# Where this came from

The UIcockpit engine, moved in whole from `Ideelab/uicockpit`, `dsg/`, at commit
`37ed9bc` ("The merge brief: UISandbox is the host, this engine moves in").
The brief is `MERGE-INTO-UISANDBOX.md` in that repo.

**Copied byte for byte, not rewritten.** The tests are the reason the numbers
can be trusted, and a test that was edited on the way across is a test that
might now be checking something else. The control run, same nine files on both
sides:

    Ideelab/uicockpit  dsg/              103 tests · 103 pass
    Ideelab/uisandbox  src/kits/engine/  103 tests · 103 pass

The flat layout is kept on purpose: the tests read `kits/<id>.json` relative
to the working directory, so `pnpm test:kits` runs them from here rather than
editing a path in each one.

## What is here, and what is still to come

Here (phase 2a, the export): `color` `roles` `stack` `palettes` `generate`
`kit-defaults` `fonts`, the nine kits' fetched values, and the tests of exactly
those.

Not yet, and arriving with the code that uses them:

| test | needs | arrives with |
|---|---|---|
| `material.test.mjs` | `wall-bindings` `scenes` `parts` `fidelity` | the kit door (2b) |
| `wall.test.mjs` `sweep.test.mjs` | the render layer | the kit door (2b) |
| `live.test.mjs` | `live.js` | the third way in (2c) |

## What is UISandbox's own, beside it

Not from the source, and free to change:

- `detect.mjs` — `detect()` lifted out of `live.js` unchanged, so a dropped
  build and the bridge answer with the same rules. 2c makes `live.js` inline it.
- `*.d.mts` — types for the parts UISandbox calls, kept beside the engine so the
  `.mjs` files stay byte-identical.
- `kits/unread.json` — which variables each kit's own stylesheet never reads,
  as uicockpit.com ships it: 16 rows, sha256 of its canonical JSON
  `a663ccbbb71d…`, fetched 2026-10-18 and identical to a local build of
  `37ed9bc`. It is built from `orphans.mjs` over the compiled kit sheets, which
  arrive with 2b; until then this is the list, and 2b's gate must reproduce it.

## While uicockpit.com is still live

It serves its own copy, so for a while there are two. Any change to an engine
file here or there must be carried to the other until the cutover (phase 4),
after which `Ideelab/uicockpit` is the redirect and this is the only copy.
`cmp` against the source at `37ed9bc` is the drift check.
