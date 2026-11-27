// OFFLINE PREVIEW ONLY: replaces fetch('/api/...') and WebSocket('/ws') with an in-page fake so the real guest UI
// runs from a single static HTML file. Nothing leaves the page. Responses copy the shapes of src/server (protocol.ts).
import rotation from '../src/survey/questions.rotation.v1.json';

// Hand-control iPad UI (住民の窓): the guest page reads ?hand at load; no camera/model offline, so it falls back to touch/mouse.
if (!new URLSearchParams(location.search).has('hand')) history.replaceState(null, '', location.pathname.endsWith('.html') ? location.pathname + '?hand' + location.hash : location.href + (location.search ? '&hand' : '?hand'));

type Opt = { id: string; label: string };
type Q = { id: string; text: string; online?: boolean; initial: string; options: Opt[] };
const questions = (rotation as { questions: Q[] }).questions.filter(q => q.online !== false);
const pub = (q: Q) => ({ id: q.id, text: q.text, options: q.options.map(o => ({ id: o.id, label: o.label })) });
const ZERO = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
const iso = () => new Date().toISOString();
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');

const runId = uid();
let revision = 0, guestCount = 12;
const state = () => ({ runId, revision, guestCount, algorithmVersion: 2, voteSums: ZERO, recentVotes: ZERO, scores: ZERO, updatedAt: iso() });
const shown: Record<string, string> = Object.fromEntries(questions.map(q => [q.id, q.initial]));
// Seed crowd tallies so the same-choice share (hidden below 10 votes) shows up like a busy exhibition day.
const tallies: Record<string, Record<string, number>> = Object.fromEntries(questions.map(q =>
  [q.id, Object.fromEntries(q.options.map((o, i) => [o.id, 8 + ((i * 7 + q.id.charCodeAt(2)) % 9)]))]));
const sessions = new Map<string, { session: Record<string, unknown>; questions: ReturnType<typeof pub>[] }>();
const ok = (data: unknown) => ({ ok: true, data });
const fail = (code: string, message: string) => ({ ok: false, error: { code, message } });

function newSession(stationId?: string) {
  const picked = [...questions].sort(() => Math.random() - 0.5).slice(0, 4).sort((a, b) => a.id.localeCompare(b.id));
  const session = { id: crypto.randomUUID?.() ?? uid(), runId, questionSetVersion: 1, ...(stationId ? { stationId } : {}),
    questionIds: picked.map(q => q.id), status: 'reserved', createdAt: iso(), expiresAt: new Date(Date.now() + 3_600_000).toISOString(), submittedAt: null };
  const entry = { session, questions: picked.map(pub) };
  sessions.set(session.id as string, entry);
  return ok({ ...entry, state: state() });
}

function submit(body: { submissionId: string; guestSessionId: string; answers: { questionId: string; optionId: string }[] }) {
  const entry = sessions.get(body.guestSessionId);
  if (!entry) return fail('session_not_found', 'Unknown session.');
  for (const a of body.answers) tallies[a.questionId][a.optionId]++;
  const changed = body.answers.find(a => shown[a.questionId] !== a.optionId);
  const outcome = changed ? { kind: 'swap', questionId: changed.questionId, from: shown[changed.questionId], to: changed.optionId }
    : { kind: 'fallback', questionId: body.answers[0].questionId };
  if (changed) shown[changed.questionId] = changed.optionId;
  revision++; guestCount++;
  const layout = { version: 2, bands: { nw: 'mixed', ne: 'mixed', sw: 'mixed', se: 'mixed' }, tiers: { nw: 0, ne: 0, sw: 0, se: 0 },
    automatedPorts: 3, sharedSeats: 4, treeCount: 8, plantedFraction: 0.5, coolingFins: 3, functionModules: 4 };
  const shares = body.answers.map(a => {
    const counts = tallies[a.questionId], total = Object.values(counts).reduce((s, n) => s + n, 0);
    return { questionId: a.questionId, optionId: a.optionId, votes: counts[a.optionId], total, percent: Math.round(100 * counts[a.optionId] / total) };
  });
  const proposal = { id: body.submissionId, runId, guestSessionId: body.guestSessionId, ordinal: guestCount, stationId: entry.session.stationId, displayAt: iso(),
    questionSetVersion: 1, algorithmVersion: 2,
    answers: body.answers.map(a => { const q = questions.find(x => x.id === a.questionId)!; return { questionId: q.id, optionId: a.optionId, questionText: q.text, optionLabel: q.options.find(o => o.id === a.optionId)!.label }; }),
    votes: ZERO, revisionBefore: revision - 1, revisionAfter: revision, beforeScores: ZERO, afterScores: ZERO,
    beforeLayout: layout, afterLayout: layout, cityChanges: [], rotation: { outcome, shares } };
  entry.session.status = 'submitted';
  return ok({ proposal, state: state(), replayed: false, displayWaitMs: 0, displayRemainingMs: 13000 });
}

function route(path: string, method: string, body: any) {
  if (path === '/api/proposal-sessions' && method === 'POST') return newSession(body?.stationId);
  if (path === '/api/proposals' && method === 'POST') return submit(body);
  if (path === '/api/explore') return ok({ target: body?.target ?? null });
  const one = /^\/api\/proposal-sessions\/([^/]+)(\/end)?$/.exec(path);
  if (one) {
    const entry = sessions.get(decodeURIComponent(one[1]));
    if (!entry) return fail('session_not_found', 'Unknown session.');
    return one[2] ? ok({ ended: true }) : ok({ ...entry, state: state() });
  }
  if (path === '/api/city-state') return ok(state());
  if (path === '/api/health') return ok({ status: 'ok', runId, revision, questionSetVersion: 1 });
  return fail('not_found', 'Not found.');
}

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://offline.invalid/');
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  await new Promise(r => setTimeout(r, 120)); // a little latency so busy states show
  return new Response(JSON.stringify(route(url.pathname, init?.method ?? 'GET', body)), { headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

class FakeSocket extends EventTarget {
  constructor() {
    super();
    setTimeout(() => {
      this.dispatchEvent(new Event('open'));
      this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'city-state-snapshot', state: state(), view: { version: 2, ...state() } }) }));
    }, 50);
  }
  send() {}
  close() {}
}
window.WebSocket = FakeSocket as unknown as typeof WebSocket;
