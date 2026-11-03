# City taste v2 — overnight coordinator protocol (2026-11-02 → 11-03 morning)

History: this protocol let weak parts pass; its successor is the [long-polish-loop skill](../../.agents/skills/long-polish-loop/SKILL.md).

You are the **coordinator** (Opus). You do not implement; you brief, review and integrate. The owner is asleep and approves visuals in the morning; nothing goes to `main`.

## Read first

`AGENTS.md`, `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md`, `docs/handoffs/city-taste-v2.md`, `artifacts/city-taste-v2/parts.md`, `artifacts/city-taste-v2/prompts.md`, `.agents/skills/closeup-polish/SKILL.md` (round discipline, Gemini recipe, capture lessons). Look at `target/master-day.png` and `baseline/hero-h16.png`.

## Git

- Integration branch `feat/city-taste-v2` (pushed). Work in your own worktree on it; nobody else commits there.
- Each part runs on `feat/city-taste-v2-<part>` cut from the integration tip. After you pass a part: merge `--no-ff` into `feat/city-taste-v2`, rerun `npm test && npm run build && git diff --check` on the merge, push. Never touch `main` or `feat/elevator-closeup-lod`.

## Part loop (P1 → P6, then P7 once the night target exists)

1. Write `artifacts/city-taste-v2/<part>/spec-rN.md`: what in the target this part must match, parts with sizes, materials, files to read, tests to update, screenshot list. Precise specs keep rounds few.
2. Start ONE fresh session per part (`start_session`, `initiation: "user_asked"` — the owner asked for one session per part; `context: "fresh"`, `model: "sonnet"`, own worktree from your branch tip). The brief names the spec path and says: implement, run `npm test && npm run build && git diff --check`, start its own Vite on a free port, capture hero day/night (URL and recipe in `parts.md` / the handoff Step 0), build `rN/vs-target.jpg` (baseline | round | target), sample hero FPS (vsync 1920×1080 `data-fps`, discard first sample), commit + push its branch, stop every server it started, report.
3. When it reports, review the actual images and diff yourself (a report is not proof). Decide:
   - **polish again** — write `spec-r(N+1).md`, `SendMessage` the same part session (keeps its context). Max 3 rounds per part.
   - **pass** — merge as above, start the next part's fresh session.
   - **revert** — drop the branch, note why, move on.
   Judge against the taste's review question and the target; hero must stay ≥ 60 FPS day and night.
4. Append a dated `## <part> rN` entry to `docs/handoffs/city-taste-v2.md` each round (decision, evidence path, checks, FPS).

## Night target (after 00:35 JST 2026-11-03)

Gemini /u/3 resets ~2.5 h after 22:00. After 00:35, brief a Sonnet subagent (Agent tool, `model: sonnet`) with `prompts.md` § Night master + the Gemini recipe in the closeup-polish skill: two variants → `gen/master-night-1|2.png`. Pick the one closest to `master-day.png` geometry, copy to `target/master-night.png`, commit. If the quota still blocks, retry once ~30 min later, then skip P7 and note it. The owner confirms your pick in the morning.

## Owner rules that apply

- The four Meter sites need NOT be visible from hero; delete blocking hero-sightline assertions rather than bending designs (see `parts.md`).
- All UI text Japanese. Greenery lush. No floating islands / rocks / waterfalls. Glow only from a system.
- `ponytail:` comments only for deliberate shortcuts with real limits.

## Keep going

Invoke the `loop` skill (dynamic, no interval) so you wake every 20–30 min as a fallback when no session event arrives. Stop at 11:00 JST 2026-11-03 (owner moved it from 08:30 on 2026-11-02) or when P1–P7 are done; have the morning deliverable ready by 11:00.

## Morning deliverable (before stopping)

- `artifacts/city-taste-v2/review.html` (or `review.jpg`): per part, baseline | final | target, plus the final whole hero day/night next to `master-day.png` / `master-night.png`.
- Handoff: status, every part's decision, checks, FPS, what was reverted or skipped, and what needs the owner (night pick, P8 scope, merge to main).
- Send the review file to the owner (SendUserFile, `proactive`).
