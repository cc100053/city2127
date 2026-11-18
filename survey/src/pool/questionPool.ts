/**
 * Question pool: the planning team's hypothesis-linked questions (docs/planning-team/SURVEY_V2.md),
 * kept beside the exhibition question set and not wired into it. Options carry no votes or effects;
 * how many questions a guest answers and how parameters move the city are decided separately.
 */
export const POOL_OPTION_IDS = ['A', 'B', 'C'] as const;
export const POOL_VARIANTS = ['P', 'U'] as const;
export type PoolOptionId = typeof POOL_OPTION_IDS[number];
export type PoolVariantId = typeof POOL_VARIANTS[number];

export type PoolParameter = { id: string; label: string; category: string };
/** `cityChange` is present on U (urban planning) options only. */
export type PoolOption = { id: PoolOptionId; label: string; reason: string; cityChange?: string };
export type PoolVariant = { title: string; text: string; situation: string; options: PoolOption[]; notes: string[] };
export type PoolQuestion = {
  id: string; parameter: string; hypotheses: string[];
  variants: Record<PoolVariantId, PoolVariant>; notes: string[];
};
export type QuestionPool = { version: 1; source: string; parameters: PoolParameter[]; questions: PoolQuestion[] };

export class QuestionPoolError extends Error {
  override name = 'QuestionPoolError';
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new QuestionPoolError(`${where} must be a non-empty string`);
  return value;
}

function texts(value: unknown, where: string, nonEmpty = false): string[] {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) throw new QuestionPoolError(`${where} must be ${nonEmpty ? 'a non-empty' : 'an'} array`);
  return value.map((item, index) => text(item, `${where}[${index}]`));
}

function option(raw: unknown, index: number, variant: PoolVariantId, where: string): PoolOption {
  const at = `${where}.options[${index}]`;
  if (!isObject(raw)) throw new QuestionPoolError(`${at} must be an object`);
  if (raw.id !== POOL_OPTION_IDS[index]) throw new QuestionPoolError(`${at}.id must be "${POOL_OPTION_IDS[index]}"`);
  const result: PoolOption = { id: POOL_OPTION_IDS[index], label: text(raw.label, `${at}.label`), reason: text(raw.reason, `${at}.reason`) };
  if (variant === 'U') result.cityChange = text(raw.cityChange, `${at}.cityChange`);
  else if (raw.cityChange !== undefined) throw new QuestionPoolError(`${at}.cityChange is only allowed on U options`);
  return result;
}

function variant(raw: unknown, id: PoolVariantId, where: string): PoolVariant {
  const at = `${where}.variants.${id}`;
  if (!isObject(raw)) throw new QuestionPoolError(`${at} must be an object`);
  if (!Array.isArray(raw.options) || raw.options.length !== POOL_OPTION_IDS.length)
    throw new QuestionPoolError(`${at} must have exactly options A, B and C`);
  return {
    title: text(raw.title, `${at}.title`), text: text(raw.text, `${at}.text`), situation: text(raw.situation, `${at}.situation`),
    options: raw.options.map((o, index) => option(o, index, id, at)), notes: texts(raw.notes, `${at}.notes`),
  };
}

/** Validates untrusted JSON into a question pool; throws QuestionPoolError naming the first problem. */
export function parseQuestionPool(input: unknown): QuestionPool {
  if (!isObject(input)) throw new QuestionPoolError('question pool must be an object');
  if (input.version !== 1) throw new QuestionPoolError('version must be 1');
  const source = text(input.source, 'source');
  if (!Array.isArray(input.parameters) || input.parameters.length === 0) throw new QuestionPoolError('parameters must be a non-empty array');
  const parameterIds = new Set<string>();
  const parameters = input.parameters.map((raw, index): PoolParameter => {
    if (!isObject(raw)) throw new QuestionPoolError(`parameters[${index}] must be an object`);
    const id = text(raw.id, `parameters[${index}].id`);
    if (parameterIds.has(id)) throw new QuestionPoolError(`duplicate parameter id "${id}"`);
    parameterIds.add(id);
    return { id, label: text(raw.label, `parameter "${id}".label`), category: text(raw.category, `parameter "${id}".category`) };
  });
  if (!Array.isArray(input.questions) || input.questions.length === 0) throw new QuestionPoolError('questions must be a non-empty array');
  const questionIds = new Set<string>();
  const questions = input.questions.map((raw, index): PoolQuestion => {
    if (!isObject(raw)) throw new QuestionPoolError(`questions[${index}] must be an object`);
    const id = text(raw.id, `questions[${index}].id`);
    if (questionIds.has(id)) throw new QuestionPoolError(`duplicate question id "${id}"`);
    questionIds.add(id);
    const where = `question "${id}"`;
    const parameter = text(raw.parameter, `${where}.parameter`);
    if (!parameterIds.has(parameter)) throw new QuestionPoolError(`${where} references unknown parameter "${parameter}"`);
    if (!isObject(raw.variants)) throw new QuestionPoolError(`${where}.variants must be an object`);
    const variants = raw.variants;
    return {
      id, parameter, hypotheses: texts(raw.hypotheses, `${where}.hypotheses`, true),
      variants: { P: variant(variants.P, 'P', where), U: variant(variants.U, 'U', where) },
      notes: texts(raw.notes, `${where}.notes`),
    };
  });
  return { version: 1, source, parameters, questions };
}
