# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

LIGAMI · Gestão is a management dashboard for a med-school intensive-care student league
("Liga de Medicina Intensiva") in Itaperuna, Brazil. All UI text and data fields are in
Portuguese. It's a Vite + React app backed by Supabase (Postgres + Auth), deployed on Vercel.

`ligami-gestao.jsx` at the repo root is the **original** single-file version that ran as a
hosted React artifact and persisted everything through a host-injected `window.storage` global.
It has been superseded by `src/App.jsx` (real Supabase-backed persistence, email/password auth)
and is kept only for historical reference — don't edit it or treat it as live code.

## Commands

```
npm install       # install deps
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # production build (used by Vercel)
npm run preview   # preview a production build locally
```

No test suite or linter is configured.

## Environment / secrets

Needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (gitignored) — see
`.env.example`. Both are safe to expose client-side (Vite inlines `VITE_`-prefixed vars into
the bundle at build time); access control is enforced by Postgres RLS, not by hiding the key.
**Never** put a Supabase `service_role`/secret key in a `VITE_` var — it bypasses RLS entirely
and would ship straight to the browser.

Vite bakes env vars in at build time. Changing them in the Vercel dashboard requires a fresh
deploy (Redeploy) to take effect — updating the dashboard alone does not patch an existing
build's bundle.

## Auth model

Email/password via Supabase Auth, gated in `src/App.jsx` (`if (!session) return <Login />`).
There is intentionally no public sign-up flow — director accounts are created manually in the
Supabase dashboard (**Authentication → Users → Add user**, with "Auto Confirm User" checked).
Any authenticated user has full read/write access to all tables (single flat role — "director"
— no per-user permission tiers); see the RLS policies below.

`App`'s top-level `useEffect` subscribes to `supabase.auth.onAuthStateChange` only — it
deliberately does **not** also call `getSession()` in parallel. That combination is a known
race: a `getSession()` promise started before login can resolve *after* the login's
`SIGNED_IN` event and overwrite the valid session with a stale `null`, bouncing the user back
to the login screen a moment after a successful sign-in. `onAuthStateChange` alone already
delivers the current session immediately on subscribe, so it's sufficient.

## Data model

Postgres tables (schema in `supabase/schema.sql` — rerun there if tables need to be
recreated), all with RLS enabled and a single `for all to authenticated using (true)` policy
(any logged-in director has full access, matching the old shared-`window.storage` behavior):

```
ligantes  { id, nome, periodo, na_rodagem: boolean }
reunioes  { id, tema, data, responsavel, presentes: uuid[] }   -- array of ligantes.id
eventos   { id, nome, data, tipo, status, checklist: jsonb }   -- [{id, texto, ok}], embedded
ciclos    { id, nome, inicio, semanas, upa: jsonb, cti: jsonb } -- rodagem, see below
```

`escalas` (`{ id, ligante_id, local: 'CTI'|'UPA', data, turno }`, manual one-off shift entries)
still exists in Postgres but is **no longer used by the app** — the tab that read/wrote it was
replaced by the `ciclos`-based Rodagem module below and removed. It's dormant, harmless to
leave in place, and safe to drop manually if you ever want to; don't reintroduce fetches/writes
to it.

- `reunioes.presentes` is a plain array column, not a join table, so it does **not**
  cascade automatically: `Ligantes`' delete handler (`removerDasReunioes` in `src/App.jsx`)
  explicitly strips the deleted id from every affected `reunioes` row before deleting the
  ligante. Preserve this pairing if you touch ligante deletion.
- `eventos.checklist` is a JSONB blob, not a separate table (matches the original in-row
  checklist shape) — toggling/adding/removing an item reads the array out of local `state`,
  edits it in JS, and writes the whole array back with one `update`. There's no per-item DB
  row.
- `ciclos.upa` and `ciclos.cti` are JSONB blobs, same embedded pattern as `eventos.checklist`:
  `upa` is `[{ ligante_id, dia }]` (0=domingo..6=sábado), `cti` is
  `[{ ligante_id, dia, turno: 'dia'|'noite' }]`. Like `reunioes.presentes`, these embed
  `ligantes.id` without a DB-level cascade — `Ligantes`' delete handler
  (`removerDosCiclos` in `src/App.jsx`) strips the deleted id from every affected ciclo's
  `upa`/`cti` arrays before deleting the ligante. Preserve this pairing too.
- Dates are plain `"YYYY-MM-DD"` strings (Postgres `date` columns), sorted with
  `localeCompare` rather than `Date` objects, and formatted for display via `fmtData`/`DateChip`.
  `ciclos` additionally uses `parseData`/`addDias` (also in `src/App.jsx`) to compute a cycle's
  end date and to figure out which weekday "today" falls on.

## Rodagem (internship-rotation scheduling)

The nav tab is labeled **"Escalas"** but is powered by the `Rodagem` component (`src/App.jsx`,
tab id `"rodagem"` — id and label deliberately differ here, same as the `"eventos"` id showing
as "Simpósios"). It generates recurring UPA/CTI shift schedules for ligantes flagged
`na_rodagem` in the Ligantes tab — only those show up as eligible when building a cycle. This
replaced an earlier manual one-off-shift "Escalas" tab/component, which was deleted outright
(see the `escalas` table note above) rather than kept alongside it.

- A **ciclo** covers `semanas` weeks (defaults to 8, i.e. two months) starting at `inicio`.
  UPA takes up to 7 ligantes, one fixed weekday each, 7h–19h. CTI takes up to 14, one fixed
  weekday each, half on the day shift and half on the night shift (`turno: 'dia'|'noite'`).
  The schedule is generated once at creation time (each person gets a fixed day-of-week for
  the whole cycle) — see `salvarCiclo` in the `Rodagem` component.
- "Gerar próximo ciclo" (`proximoCiclo`) rotates groups instead of reusing the same lineup:
  everyone previously on UPA moves to CTI, and the first 7 people previously on CTI move up
  to UPA. It inserts a new `ciclos` row starting the day after the previous one ends — it does
  not mutate the old cycle, so history stays intact.
- Day/shift can be adjusted per-person after generation (`mudarDia`), which rewrites the whole
  `upa`/`cti` array on that one `ciclos` row (same jsonb-rewrite pattern as `eventos.checklist`).
- The Dashboard's "Plantões de hoje" section finds the ciclo active for today's date
  (`hoje >= c.inicio && hoje < addDias(c.inicio, c.semanas * 7)`) and lists whoever is on
  today's weekday in that cycle's `upa`/`cti` arrays — it's a derived view, not a stored one.

## Data flow (no client-side store)

`src/App.jsx` holds one `state` object (`{ ligantes, reunioes, eventos, ciclos }`), fetched
by `fetchAll()`/`refresh()` — parallel `supabase.from(x).select("*")` calls. There is no
optimistic local mutation: every write goes through `mutate(fn)`, which runs `fn` (a Supabase
insert/update/delete call), then re-runs `refresh()` to pull the authoritative state back from
Postgres, toggling the "Salvando…/Sincronizado" header indicator around the whole cycle. This
means every action is a full round-trip, not a local array edit — follow this pattern
(`mutate(() => supabase.from(...)...)`) for new mutations rather than reintroducing local
optimistic state.

There's no realtime subscription — a director's own actions refresh their own view, but one
director's changes don't push live to another director's already-open tab (they'd see it on
their next action or reload). That matches the original artifact's behavior; adding
`supabase.channel(...)` realtime sync would be a deliberate new feature, not a fix.

## Structure inside `src/App.jsx`

Same single-file organization as the original artifact (design tokens → visual primitives →
one component per tab), just with Supabase calls instead of `window.storage`:
1. Design tokens (`C` object) — dark "clinical" palette (`ink`/`panel`/`ecg` red/`monitor`
   green). All styling is inline `style={}`; no CSS file/Tailwind/styled-components.
2. `fetchAll()` / `emptyState` / `uid()` (still used for client-side-only ids like checklist
   items) / `fmtData()` / `parseData()` / `addDias()` / `DIAS` / `DIAS_LONGO`.
3. `App` — session state + auth listener, `state`, `tab`, `saving`, `errorMsg`, `refresh()`,
   `mutate()`. Renders header/nav/footer chrome, gates on `session`, dispatches to one tab.
4. `Login` — email/password form, calls `supabase.auth.signInWithPassword`.
5. Shared visual primitives: `EcgMark`, `EcgPulse`, `Section`, `Btn`, `Card`, `Empty`,
   `DateChip`, `BarRow`.
6. One component per tab, each taking `{ state, mutate }` (or `{ state, setTab }` for
   read-only/derived views): `Dashboard`, `Ligantes`, `Rodagem` (tab id `"rodagem"`, labeled
   "Escalas"), `Reunioes`, `Presenca`, `Eventos`. `Presenca` is purely derived (`useMemo` over
   `state.reunioes` + `state.ligantes`) and has no table of its own — follow that pattern for
   new derived stats rather than persisting computed values. `Rodagem` renders each `ciclos`
   row through the `GradeCiclo` helper component (weekly grid + manual day/turno adjustment
   `<details>`).

## Deploy

Vercel, connected to GitHub (`main` branch auto-deploys). Standard Vite build — no custom
`vercel.json`. Remember: adding/changing env vars in the Vercel dashboard needs a manual
**Redeploy** of the latest deployment to actually take effect.
