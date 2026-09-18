# Collaboration and Git workflow

Three contributors work in independent local clones. Each task has one named owner and a task-specific `docs/handoffs/<task-id>.md` copied from the [template](handoffs/TEMPLATE.md). Record primary ownership areas and coordinate before overlapping edits to a module or binary asset; contributors may work across areas. GitHub Issues are optional indexes. Worktrees, PRs, external reviewers, CODEOWNERS and PR templates are not required.

Read [AGENTS.md](../AGENTS.md), the task handoff, [PROJECT.md](PROJECT.md) and [VALIDATION.md](VALIDATION.md) before changing relevant behavior. An assignment authorizes its scope under AGENTS.md; explicit restrictions in that assignment take precedence.

## Independent-clone setup

With Git and Node.js 24+ installed (Node 26 has been used here), clone the team's repository URL and enter it:

```sh
git clone <repository-url> city2127
cd city2127
git status --short
git branch --show-current
git log -1 --oneline
npm ci
```

Replace angle-bracket placeholders with real values. `npm ci` uses the existing tracked lockfile; do not create or change dependencies incidentally. Configure your own Git identity and remote authentication before committing/pushing. Inspect existing work before switching branches. If unrelated changes exist, preserve them and coordinate; do not reset, stash, overwrite or commit them as part of your task.

## Code and documentation workflow

Every session starts with the [mandatory preflight](../AGENTS.md) — confirm the workspace, inspect branch/HEAD/working tree, `git fetch --prune origin`, check for divergence and read the handoff. Fetching never authorizes switching, merging, resetting or discarding local work.

### Starting a new task

Only with a clean working tree. Use a short-lived task branch; clear names include `feat/<task>`, `fix/<task>` and `docs/<task>` (Codex defaults to `codex/<task>` unless instructed otherwise).

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/<task>
```

Confirm local `main` contains `origin/main` before creating the branch (`git merge-base --is-ancestor origin/main main`). If `main` carries unexpected local commits or the histories have diverged, stop and inspect the cause; never reset or force-pull to make the fast-forward succeed. If the working tree is dirty, preserve and coordinate that work first — do not stash, discard or commit it into your task.

### Resuming an existing task

Do not automatically pull or merge `main` into an active task branch. After fetching:

- Read the existing handoff.
- Inspect local changes (`git status --short`, `git diff`) and the task's commits.
- Compare the task branch with `origin/main` (`git log --oneline --left-right <task-branch>...origin/main`).
- Decide whether upstream integration is actually needed now.
- Preserve unrelated and uncommitted work.

Integrate upstream only deliberately: merge `origin/main` into the task branch, resolve conflicts without discarding others' work, and rerun the relevant checks.

Record the base commit (`git rev-parse HEAD`) and owner in the task handoff. Make focused commits, keep branches small and fetch frequently. Keep shared branch history intact.

Before integration, update affected documentation and the handoff, inspect `git status --short`, `git diff`, new-file contents and the complete task diff against `origin/main`. For code changes the minimum checks from the project root are:

```sh
npm test
npm run build
git diff --check
```

Visual or motion changes also require the relevant [browser checks](VALIDATION.md). Documentation-only changes use local Markdown link/fact checks, full diff review and `git diff --check`; they do not require rendering or build reruns. Record actual results and limitations in the handoff, then stage only task files and review the staged diff:

```sh
git add <task-files>
git diff --cached
git diff --cached --check
git commit
git push -u origin <task-branch>
```

Use Conventional Commits: `<type>(<scope>): <subject>` with a concise English title and English bullet points in the body. Check the committed task diff too (`git diff --check origin/main...HEAD`); an empty working-tree diff alone does not check committed changes.

Self-review is sufficient; no PR or mandatory external review. The [CI workflow](../.github/workflows/ci.yml) is configured in Stage 2 for branch pushes and optional PRs: Node 24, `npm ci`, `npm test`, `npm run build` and diff whitespace checks. Remote execution passed on `2b0e8cc` ([run](https://github.com/cc100053/city2127/actions/runs/35356530469)). Require successful checks on the current task-branch commit before merging, and verify main's checks after pushing. Do not describe a configured workflow as a passing run. No branch protection or deployment is configured.

## Concurrent integration

Only integrate with a clean working tree. Immediately before merging or pushing, fetch origin again and inspect remote main; confirm the latest remote main is incorporated into the intended result:

```sh
git fetch --prune origin
git log --oneline --left-right main...origin/main
git switch main
git merge --ff-only origin/main
git merge --no-ff <task-branch>
```

`--no-ff` preserves task-level integration history. If the fast-forward fails, inspect local-only commits and coordinate; do not reset main or conceal unexpected divergence. Resolve task conflicts on the task branch or merge result, review the resolutions and rerun the relevant checks. If CI is active and branch contents change, push the updated branch and wait for its successful checks before merging.

Validate the integrated result with the same applicable checks above, inspect `git diff --check origin/main..HEAD` and the integration diff, and record the integrated commit/results in the task handoff. Commit a focused handoff update if necessary; check its links and diff. Before pushing, fetch again and confirm remote main is still an ancestor of the result:

```sh
git fetch --prune origin
git merge-base --is-ancestor origin/main HEAD
git push origin main
```

Run the push only if the ancestor check succeeds. If remote main advanced, integrate the new commits: merge the newly fetched `origin/main` into the local integration result, resolve conflicts, review the integration diff and rerun the applicable validation. Recheck remote main before retrying the push. A push may still lose a race and be rejected: fetch, integrate and revalidate again. Never force-push main or overwrite concurrent work. After a successful push, fetch to confirm your integration is on remote main; verify CI on main when it exists. Record failures and coordinate fixes rather than claiming integration succeeded.

## Blender asset workflow

The asset-only exception allows Blender-related asset files on main. Confirm the asset owner before editing; avoid simultaneous edits to the same binary file. Keep both source `.blend` and production `.glb` in Git. Do not install Git LFS now; it remains an option for large assets later.

1. For new asset work, start from a clean tree and update main first (`git fetch --prune origin`, then `git pull --ff-only origin main`); record ownership, source/export paths and the base commit in the task handoff. If unfinished local asset changes exist, preserve them before attempting any synchronization; never discard or overwrite them to make the fast-forward succeed.
2. Validate the changed files: open the `.blend` in Blender, verify the `.glb` imports, and check any existing application consumers with the relevant browser checks. Run code checks if executable integration is affected. Never publish a broken replacement for an asset currently used by the app. If validation cannot be performed, record the blocker and do not publish the replacement.
3. Before committing, fetch and synchronize main again. If local asset edits prevent synchronization, preserve them and coordinate a safe save outside the checkout before retrying; do not discard them. Inspect concurrent asset changes and agree on the intended version rather than choosing a binary merge side blindly. Revalidate against the synchronized result.
4. Review and commit only the asset files and their directly related documentation/handoff. Recheck remote main before pushing using the concurrent-integration procedure above; integrate and revalidate if it advances. Never force-push, never overwrite another contributor's binary asset and never choose a conflict side automatically.

This exception does not cover unrelated TypeScript integration changes. If an asset requires code integration, use a feature branch for the code and any coupled asset replacement needed to keep main working. Follow the [Blender export and optimization standards](BLENDER.md) introduced in Stage 3. They define manual source/export handoff; no automated asset pipeline or runtime loader is introduced.
