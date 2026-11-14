// Claude Code PreToolUse hook enforcing two owner rules (AGENTS.md "Working agreement"):
// no `sed` (macOS sed -i broke an edit, 2026-11-14), and no worktree unless the owner said so.
// Registered in .claude/settings.json; `--self-test` runs in `npm test`.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const SED = /(?:^|[;&|(]|\bxargs\s|\bsudo\s)\s*sed(?:\s|$)/;
const WORKTREE = /\bgit\s+worktree\s+add\b/;

/** @returns {{decision:'deny'|'ask', reason:string}|null} */
export function verdict(tool, input = {}) {
  const cmd = String(input.command ?? '');
  if (tool === 'Bash' && SED.test(cmd)) return { decision: 'deny', reason: 'sed is banned in this repo: use the Edit tool or python3 (owner rule, AGENTS.md).' };
  if (tool === 'EnterWorktree' || (tool === 'Bash' && WORKTREE.test(cmd))) return { decision: 'ask', reason: 'Work in a worktree only if the owner told you to (AGENTS.md). Confirm with the owner.' };
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) {
    const sed = c => verdict('Bash', { command: c })?.decision;
    for (const c of ["sed -i '' 's/a/b/' f", 'cd x && sed -n 1p f', 'cat f | sed s/a/b/', 'ls; sed p f', 'git ls-files | xargs sed -i x']) assert.equal(sed(c), 'deny', c);
    for (const c of ['grep -rnw sed docs', 'python3 - <<EOF\n- macOS `sed -i` is different\nEOF', 'echo "sed"', 'git status', 'python3 -c "print(1)"']) assert.equal(sed(c), undefined, c);
    assert.equal(sed('git worktree add ../x -b y'), 'ask');
    assert.equal(sed('git worktree list'), undefined);
    assert.equal(verdict('EnterWorktree')?.decision, 'ask');
    assert.equal(verdict('Edit', { command: 'sed' }), null);
    console.log('guardRules self-test PASS');
  } else {
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    const j = JSON.parse(raw || '{}');
    const v = verdict(j.tool_name, j.tool_input);
    if (v?.decision === 'deny') { console.error(v.reason); process.exit(2); }
    if (v) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: v.reason } }));
  }
}
