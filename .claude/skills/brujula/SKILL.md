---
name: brujula
description: Command cheat-sheet for the build-brujula-b repo (Build night, team brujula-b). Use it whenever the task in this repo involves running, testing, checking or shipping the app — starting or stopping the dev server, running build or typecheck, smoke-testing the /api/ia route, validating the ficha with the buildnight CLI, committing or pushing to main, adding shadcn components, or setting up .env.local — even if the user only says "run it", "does it build?", "ship it" or "check before pushing".
---

# brujula · run, test, deploy

Everything runs from the repo root (`~/hackathon/build-brujula-b`). Tooling: Bun 1.4 (via mise) and Node 26. The app is served under the basePath `/brujula-b`, so the local URL is `http://localhost:3000/brujula-b` and `/` is a 404 by design.

Pushing to `main` deploys to production on Vercel (`https://build.barraca.house/brujula-b`), and `bun run build` failing locally means the deploy fails too. That's why the sequence below ends with a build, and why nothing goes to `main` without it.

## Run

```sh
bun install --frozen-lockfile     # after pulling, or when package.json/bun.lock changed
bun run dev                       # http://localhost:3000/brujula-b (Turbopack, hot reload)
```

From Claude Code, start the dev server with `run_in_background: true` and stop it with `TaskStop` when done; a server left running fights `bun run build` for `.next/`. If port 3000 is already taken by a stale server:

```sh
ss -ltnp | grep ':3000'           # find the pid
kill <pid>
```

Smoke-test without a browser:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/brujula-b          # expect 200
curl -s http://localhost:3000/brujula-b | grep -o '<title>[^<]*</title>'
curl -s -X POST http://localhost:3000/brujula-b/api/ia \
  -H 'content-type: application/json' \
  -d '{"pregunta":"me han echado del trabajo"}'                                   # needs .env.local
```

## AI key (local only)

`.env.local` is gitignored and never committed. Production already has the keys on Vercel.

```sh
cat > .env.local <<'EOF'
HELMCODE_API_KEY=<from the organisers>
HELMCODE_MODEL=glm5.3-flash
# HELMCODE_BASE_URL=   # only if they give one; default is https://api.helmcode.com/v1
EOF
```

Call the model only from `src/app/api/*` or Server Actions via `completar()` in `src/lib/ia.ts`. Limits are shared by all teams: never call it per keystroke.

## Test

There is no test runner in the template; the gates are the type checker and the production build.

```sh
bun run typecheck                 # tsc --noEmit
bun run build                     # next build --webpack; must pass before any push
```

Run the build with the dev server stopped. If it passes, the deploy will too.

## Event CLI (`buildnight`)

Checks the six platform rules, validates `ficha.json` and registers the entry. Needs `gh auth login` (already done as `archector`). Install once:

```sh
curl -fsSL https://build.barraca.house/instalar.sh | sh
```

Then, from the repo root:

```sh
buildnight                        # team, track, countdown
buildnight observar               # leave running during the build: counts tokens for the ranking
git add . && buildnight ficha validar
buildnight revisar                # the six rules; the public-URL rule fails until first deploy
buildnight registrar              # final hand-in
```

`revisar` only looks at versioned files, so stage before running it.

## Ship

Work on `main` (branches have no preview). Git in this folder uses the personal GitHub account configured in `~/.gitconfig-hackathon`; confirm with `git var GIT_COMMITTER_IDENT` if in doubt.

```sh
git pull --rebase                 # someone else may have pushed
bun run build                     # the gate
git add -A
git commit -m "One sentence, imperative, no body"
git push                          # deploys to https://build.barraca.house/brujula-b
```

Before committing, `git status` should show only our files: `src/`, `ficha.json`, `package.json`, `bun.lock`, `next.config.ts`, `README.md`. The organisers' material (`datos/`, `comun/`, `contexto.md`, `SETUP.md`, `AGENTS.md`) must stay untouched. `next.config.ts` has `agentRules: false` so `next dev` stops rewriting `AGENTS.md`.

Verify the deploy:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://build.barraca.house/brujula-b
```

## Add UI components

shadcn/ui with Base UI, pinned version. Answer **no** if it offers to overwrite an existing component (`Button` has the custom `sunset` variant). Never `--overwrite` or `shadcn init`.

```sh
bunx shadcn@4.22.1 add <componente>
git add package.json bun.lock src/components/ui/
```

## Look things up

```sh
python3 -c "import json;[print(e['id']) for e in json.load(open('datos/catalogo-tramites-ayudas.json'))['items']]"
grep -n 'palabra' contexto.md comun/*.md         # search, don't read: 200 KB + 470 KB
ls node_modules/next/dist/docs/                  # Next 16 docs; APIs differ from older versions
```
