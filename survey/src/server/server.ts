import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ApiResponse, ErrorCode, HealthData } from '../shared/protocol.ts';
import type { CitySurveyState, ExhibitionState } from '../shared/citySurveyState.ts';
import type { CityView } from '../shared/cityView.ts';
import { loadQuestionSetFile, validateExhibitionQuestionSet } from '../survey/questionLoader.ts';
import { fail, type ServiceOutcome, type SurveyContext } from './context.ts';
import { openDatabase } from './database.ts';
import { restoreOrCreateRun } from './runStore.ts';
import { createGuestSession, getGuestQuestion, RESERVATION_MS } from './sessionService.ts';
import { currentState, currentView, submitAnswer, viewOf } from './answerService.ts';
import { currentRun, isLoopbackAddress, lifecycleCommand, readDisplayMode, setDisplayMode, recentEvents, settleStations } from './adminService.ts';
import { attachRealtime } from './realtime.ts';
import { createProposalSession, getProposalSession, submitProposal, endStationSession } from './proposalService.ts';
import { UnsupportedRunVersionError } from './runStore.ts';
import { devSurveyConfig } from './devSurvey.ts';

const statusFor: Record<ErrorCode, number> = {
  bad_request: 400, not_found: 404, forbidden: 403, internal_error: 500,
  unsupported_version: 409,
  no_question_available: 409, session_not_found: 404, session_expired: 410, already_answered: 409,
  unknown_question: 400, unknown_option: 400, option_question_mismatch: 400, question_not_assigned: 409,
  revision_conflict: 409, answer_conflict: 409, reset_confirmation_invalid: 400, proposal_undone: 409,
  lifecycle_conflict: 409, lifecycle_blocked: 409,
};

const MAX_BODY = 16 * 1024;
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};
/** Debug pages from the Vite build. /admin is loopback-only like the admin API. */
const pages: Record<string, string> = { '/guest': 'guest.html', '/monitor': 'monitor.html', '/admin': 'admin.html' };

class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  constructor(status: number, code: ErrorCode, message: string) { super(message); this.status = status; this.code = code; }
}

function sendJson<T>(res: ServerResponse, response: ApiResponse<T>, okStatus = 200) {
  const status = response.ok ? okStatus : statusFor[response.error.code];
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(response));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'bad_request', 'Content-Type must be application/json.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > MAX_BODY) throw new HttpError(413, 'bad_request', 'Request body is too large.');
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'bad_request', 'Request body is not valid JSON.'); }
}

export type SurveyServerOptions = {
  ctx: SurveyContext;
  /** DEV-ONLY: disabled by default. Remove/migrate auto-answer tooling before exhibition. */
  devAuto?: boolean;
  /** Directory with the Vite build (guest.html, monitor.html, admin.html, assets/). */
  staticDir?: string;
  /** Source address used for the loopback check; tests substitute a LAN address here. */
  remoteAddress?: (req: IncomingMessage) => string | undefined;
};

export function createSurveyServer({ ctx, staticDir, devAuto = false, remoteAddress = req => req.socket.remoteAddress }: SurveyServerOptions) {
  const server = createServer((req, res) => {
    handle(req, res).catch(error => {
      if (error instanceof UnsupportedRunVersionError) {
        sendJson(res, fail('unsupported_version', error.message));
        return;
      }
      if (error instanceof HttpError) {
        res.writeHead(error.status, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(fail(error.code, error.message)));
        return;
      }
      console.error('Survey server error', error);
      if (!res.headersSent) sendJson(res, fail('internal_error', 'Internal server error.'));
      else res.end();
    });
  });
  const realtime = attachRealtime(server, () => { const state = currentState(ctx); return { state, view: viewOf(ctx, state), displayMode: readDisplayMode(ctx.db) }; });
  const stationTimer = setInterval(() => {
    try { const outcome = settleStations(ctx); if (outcome?.event) realtime.broadcast(outcome.event); }
    catch (error) { console.error('Station lifecycle error', error); }
  }, 1000);
  stationTimer.unref();
  server.on('close', () => clearInterval(stationTimer));
  const publish = <T>(res: ServerResponse, outcome: ServiceOutcome<T>, okStatus = 200) => {
    sendJson(res, outcome.response, okStatus);
    if (outcome.event) realtime.broadcast(outcome.event);
  };

  async function serveFile(res: ServerResponse, relative: string) {
    if (!staticDir) throw new HttpError(404, 'not_found', 'Not found.');
    const root = resolve(staticDir), file = resolve(root, '.' + relative);
    if (!file.startsWith(root + sep)) throw new HttpError(404, 'not_found', 'Not found.');
    let body: Buffer;
    try { body = await readFile(file); }
    catch { throw new HttpError(404, 'not_found', relative.endsWith('.html') ? 'Page not built. Run npm run build first.' : 'Not found.'); }
    res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost'), path = url.pathname, method = req.method ?? 'GET';
    const isAdmin = path === '/admin' || path === '/admin.html' || path.startsWith('/api/admin/');
    if (isAdmin && !isLoopbackAddress(remoteAddress(req))) throw new HttpError(403, 'forbidden', 'Admin is available only from the exhibition PC (loopback).');

    if (isAdmin && method === 'POST' && req.headers.origin !== undefined && req.headers.origin !== `http://${req.headers.host}`)
      throw new HttpError(403, 'forbidden', 'Cross-origin admin request refused.');

    // DEV-ONLY: never add option effects to the public guest/session API.
    if (path === '/api/admin/dev-survey-config' && method === 'GET') {
      if (!devAuto) throw new HttpError(404, 'not_found', 'Development auto-answer is disabled.');
      return sendJson(res, { ok: true, data: devSurveyConfig(ctx.questions) });
    }

    if (path === '/api/health' && method === 'GET') {
      const state = currentState(ctx);
      return sendJson<HealthData>(res, { ok: true, data: { status: 'ok', runId: state.runId, revision: state.revision, questionVersion: ctx.questions.version } });
    }
    if (path === '/api/city-state' && method === 'GET') return sendJson<CitySurveyState | ExhibitionState>(res, { ok: true, data: currentState(ctx) });
    if (path === '/api/city-view' && method === 'GET') return sendJson<CityView>(res, { ok: true, data: currentView(ctx) });
    if (path === '/api/guest-sessions' && method === 'POST') return sendJson(res, createGuestSession(ctx), 201);
    const question = /^\/api\/guest-sessions\/([^/]+)\/question$/.exec(path);
    if (question && method === 'GET') return sendJson(res, getGuestQuestion(ctx, question[1]));
    if (path === '/api/answers' && method === 'POST') {
      const outcome = submitAnswer(ctx, await readJson(req));
      return publish(res, outcome, outcome.response.ok && !outcome.response.data.replayed ? 201 : 200);
    }
    if (path === '/api/proposal-sessions' && method === 'POST') return publish(res, createProposalSession(ctx, await readJson(req)), 201);
    const endSession = /^\/api\/proposal-sessions\/([^/]+)\/end$/.exec(path);
    if (endSession && method === 'POST') return publish(res, endStationSession(ctx, endSession[1]));
    const proposalSession = /^\/api\/proposal-sessions\/([^/]+)$/.exec(path);
    if (proposalSession && method === 'GET') return sendJson(res, getProposalSession(ctx, proposalSession[1]));
    if (path === '/api/proposals' && method === 'POST') {
      const outcome = submitProposal(ctx, await readJson(req));
      return publish(res, outcome, outcome.response.ok && !outcome.response.data.replayed ? 201 : 200);
    }
    if (path === '/api/admin/display-mode' && method === 'POST') return publish(res, setDisplayMode(ctx, await readJson(req)));
    if (path === '/api/admin/current-run' && method === 'GET') return sendJson(res, { ok: true, data: currentRun(ctx) });
    if (path === '/api/admin/events' && method === 'GET') {
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
      return sendJson(res, { ok: true, data: recentEvents(ctx, limit) });
    }
    if (path === '/api/admin/lifecycle' && method === 'POST') {
      return publish(res, lifecycleCommand(ctx, await readJson(req)));
    }
    if (path.startsWith('/api/') || path === '/ws') throw new HttpError(404, 'not_found', 'Not found.');
    if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'bad_request', 'Method not allowed.');
    return serveFile(res, pages[path] ? '/' + pages[path] : path === '/' ? '/index.html' : path);
  }

  return { server, realtime };
}

/** Builds the runtime context: validates the question JSON, migrates and restores the database. */
export function createContext(options: { dbPath: string; questionsPath: string; legacyQuestionsPath?: string; now?: () => Date }): SurveyContext {
  const questions = validateExhibitionQuestionSet(loadQuestionSetFile(options.questionsPath));
  const legacyQuestions = loadQuestionSetFile(options.legacyQuestionsPath ?? resolve(dirname(options.questionsPath), 'questions.mvp.json'));
  const db = openDatabase(options.dbPath);
  const now = options.now ?? (() => new Date());
  try { restoreOrCreateRun(db, randomUUID, now); }
  catch (error) { db.close(); throw error; }
  return { db, questions, legacyQuestions, now, newId: randomUUID, reservationMs: RESERVATION_MS };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const port = Number(env.SURVEY_PORT ?? 8787), host = env.SURVEY_HOST ?? '127.0.0.1';
  const dbPath = resolve(env.SURVEY_DB_PATH ?? 'data/survey.sqlite');
  const ctx = createContext({ dbPath, questionsPath: resolve(env.SURVEY_QUESTIONS ?? 'src/survey/questions.exhibition.json') });
  const { server, realtime } = createSurveyServer({ ctx, staticDir: resolve(env.SURVEY_STATIC_DIR ?? 'dist'), devAuto: env.SURVEY_DEV_AUTO === '1' });
  const state = currentState(ctx);
  server.listen(port, host, () => {
    console.log(`Survey server on http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}  (db ${dbPath})`);
    console.log(`Run ${state.runId}, revision ${state.revision}, ${ctx.questions.questions.length} questions (version ${ctx.questions.version})`);
    console.log('Pages: /guest  /monitor  /admin (loopback only)');
  });
  const stop = () => { realtime.close(); server.close(() => { ctx.db.close(); process.exit(0); }); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
