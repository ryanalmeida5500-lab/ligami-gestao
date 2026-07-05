# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo contains a single file: `ligami-gestao.jsx`. It is a self-contained React
component (default export `App`) for LIGAMI, a management dashboard for a med-school
intensive-care student league ("Liga de Medicina Intensiva") in Itaperuna, Brazil. All UI
text and data fields are in Portuguese.

There is no `package.json`, build tooling, linter, or test suite — this is not a scaffolded
project. It's meant to run as a hosted React artifact/canvas (the kind of environment that
injects React, `lucide-react`, and a global `window.storage` API), not as a standalone app
you `npm install` and run locally. There are no build/lint/test commands to run because none
exist; don't invent a toolchain unless the user asks you to turn this into a real project.

## Persistence model

State is **not** local-only — it's shared/multiplayer by design:

- `loadState()` / `saveState()` (top of the file) read/write a single JSON blob under the key
  `"ligami:v1"` via `window.storage.get(key, true)` / `.set(key, value, true)` — the `true`
  flag makes storage shared across all clients rather than per-browser.
- Every mutation goes through the `update(next)` function passed down from `App`, which does
  an optimistic `setState` and then persists the entire state object. There is no per-field
  or per-record save — always write back the whole `state` tree.
- The footer text and "Salvando…/Sincronizado" indicator in the header exist to make this
  shared-state model visible to the user — preserve that UX signal if you touch persistence.
- `window.storage` is a host-provided global, not something defined in this file. Don't try
  to polyfill or reimplement it locally.

## State shape

Everything hangs off one `state` object (`emptyState` defines the shape):

```js
{
  ligantes: [],   // { id, nome, periodo }
  escalas: [],    // { id, liganteId, local: "CTI"|"UPA", data: "YYYY-MM-DD", turno }
  reunioes: [],   // { id, tema, data, responsavel, presentes: [liganteId] }
  eventos: [],    // { id, nome, data, tipo, status, checklist: [{id, texto, ok}] }
}
```

Cross-entity invariants to preserve when editing:
- Deleting a `ligante` (in `Ligantes`) must also cascade: remove their `escalas` entries and
  strip their id from every `reunioes[].presentes` array. See `del` in the `Ligantes`
  component for the pattern.
- Dates are plain `"YYYY-MM-DD"` strings, sorted with `localeCompare` (not `Date` objects) and
  formatted for display via `fmtData`/`DateChip`.
- Attendance (`presenca`) is derived, not stored: the "Presença" tab computes a ranking
  (percentage present, consecutive absences) from `reunioes` + `ligantes` on the fly via
  `useMemo` — it has no own data of its own. If you add new derived stats, follow this
  pattern rather than persisting computed values.

## Structure inside the file

Single-file, top-to-bottom sections marked by `// ── ... ──` comments:
1. Design tokens (`C` object) — a dark "clinical" palette (`ink`/`panel`/`ecg` red/`monitor`
   green). All styling is inline `style={}` objects using these tokens; there's no CSS
   file/Tailwind/styled-components. Keep new UI consistent with this token set rather than
   hardcoding new colors.
2. Persistence helpers (`loadState`/`saveState`/`emptyState`/`uid`/`fmtData`).
3. `App` — owns `state`, `tab` (active nav tab), and `saving` (UI flag only, not shared
   state); renders the header/nav/footer chrome and dispatches to one tab component.
4. Shared visual primitives: `EcgMark`, `EcgPulse`, `Section`, `Btn`, `Card`, `Empty`,
   `DateChip`, `BarRow`. Reuse these instead of writing new one-off containers/buttons.
5. One component per tab, each taking `{ state, update }` (or `{ state, setTab }` for
   read-only/derived views): `Dashboard`, `Ligantes`, `Escalas`, `Reunioes`, `Presenca`,
   `Eventos`. Each tab component owns its own local form state (`useState` for the "add new
   X" form) and reads/writes the shared `state` via `update`.

Adding a new tab means: add an entry to the `tabs` array in `App`, add the render branch in
`<main>`, and add a new field to `emptyState` if it needs its own data collection — follow the
existing components' shape (local form state + `update({ ...state, x: [...] })` mutations).
