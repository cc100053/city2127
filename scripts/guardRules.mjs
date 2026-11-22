// Claude Code PreToolUse hook enforcing the owner's no-`sed` rule (AGENTS.md "Working agreement"; macOS sed -i broke an edit,
// 2026-11-14). Worktrees are allowed since 2026-11-21 (owner: preferred over clones, cleaned up when the task is done).
// Registered in .claude/settings.json; `--self-test` runs in `npm test`.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const SED = /(?:^|[;&|(]|\bxargs\s|\bsudo\s)\s*sed(?:\s|$)/;

/** @returns {{decision:'deny', reason:string}|null} */
export function verdict(tool, input = {}) {
  const cmd = String(input.command ?? '');
  if (tool === 'Bash' && SED.test(cmd)) return { decision: 'deny', reason: 'sed is banned in this repo: use the Edit tool or python3 (owner rule, AGENTS.md).' };
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) {
    const sed = c => verdict('Bash', { command: c })?.decision;
    for (const c of ["sed -i '' 's/a/b/' f", 'cd x && sed -n 1p f', 'cat f | sed s/a/b/', 'ls; sed p f', 'git ls-files | xargs sed -i x']) assert.equal(sed(c), 'deny', c);
    for (const c of ['grep -rnw sed docs', 'python3 - <<EOF\n- macOS `sed -i` is different\nEOF', 'echo "sed"', 'git status', 'python3 -c "print(1)"']) assert.equal(sed(c), undefined, c);
    assert.equal(sed('git worktree add ../x -b y'), undefined);
    assert.equal(verdict('EnterWorktree'), null);
    assert.equal(verdict('Edit', { command: 'sed' }), null);
    console.log('guardRules self-test PASS');
  } else {
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    const j = JSON.parse(raw || '{}');
    const v = verdict(j.tool_name, j.tool_input);
    if (v) { console.error(v.reason); process.exit(2); }
  }
}
