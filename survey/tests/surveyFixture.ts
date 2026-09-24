import { openDatabase } from '../src/server/database.ts';
import type { SurveyContext } from '../src/server/context.ts';
import { restoreOrCreateRun } from '../src/server/runStore.ts';
import { createGuestSession, RESERVATION_MS } from '../src/server/sessionService.ts';
import { submitAnswer } from '../src/server/answerService.ts';
import { loadQuestionSetFile } from '../src/survey/questionLoader.ts';
import type { AnswerData, ApiResponse, GuestQuestionData } from '../src/shared/protocol.ts';

export const QUESTIONS_PATH = new URL('../src/survey/questions.test.json', import.meta.url).pathname;

/** In-memory (or given file) survey context with a controllable clock and readable sequential IDs. */
export function fixture(dbPath = ':memory:', startMs = Date.parse('2026-09-23T10:00:00.000Z')) {
  const clock = { ms: startMs };
  let counter = 0;
  const db = openDatabase(dbPath);
  const ctx: SurveyContext = {
    db, questions: loadQuestionSetFile(QUESTIONS_PATH), now: () => new Date(clock.ms),
    newId: () => `id-${++counter}-${Math.random().toString(16).slice(2, 8)}`, reservationMs: RESERVATION_MS,
  };
  restoreOrCreateRun(db, ctx.newId, ctx.now);
  return { ctx, clock };
}

export function ok<T>(response: ApiResponse<T>): T {
  if (!response.ok) throw new Error(`expected ok, got ${response.error.code}: ${response.error.message}`);
  return response.data;
}

export function errorCode<T>(response: ApiResponse<T>): string {
  if (response.ok) throw new Error('expected an error response');
  return response.error.code;
}

let answerCounter = 0;
/** Creates a guest session and answers its question with the option at optionIndex (or optionId). */
export function answerNext(ctx: SurveyContext, option: number | string = 0): { guest: GuestQuestionData; answer: AnswerData } {
  const guest = ok(createGuestSession(ctx));
  const optionId = typeof option === 'number' ? guest.question.options[option].id : option;
  const answer = ok(submitAnswer(ctx, {
    answerId: `answer-${++answerCounter}`, guestSessionId: guest.session.id, questionId: guest.question.id, optionId, expectedRevision: guest.state.revision,
  }).response);
  return { guest, answer };
}

/** Starts the real HTTP/WebSocket server on an ephemeral loopback port. */
export async function startServer(ctx: SurveyContext, remoteAddress?: (req: import('node:http').IncomingMessage) => string | undefined) {
  const { createSurveyServer } = await import('../src/server/server.ts');
  const { server, realtime } = createSurveyServer({ ctx, remoteAddress });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  const base = `http://127.0.0.1:${address.port}`;
  const request = async <T>(path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(base + path, body === undefined ? { headers }
      : { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as ApiResponse<T> };
  };
  const close = () => new Promise<void>(resolve => { realtime.close(); server.closeAllConnections(); server.close(() => resolve()); });
  return { base, port: address.port, request, close };
}
