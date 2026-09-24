import { readFileSync } from 'node:fs';
import { isCityAxis } from '../shared/citySurveyState.ts';
import type { CityEffects, Question, QuestionOption, QuestionSet, QuestionTrigger } from '../shared/question.ts';

export const EFFECT_MIN = -3, EFFECT_MAX = 3;

export class QuestionSetError extends Error {
  override name = 'QuestionSetError';
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new QuestionSetError(`${where} must be a non-empty string`);
  return value;
}

function effects(value: unknown, where: string): CityEffects {
  if (!isObject(value)) throw new QuestionSetError(`${where} must be an object`);
  const result: CityEffects = {};
  for (const [axis, amount] of Object.entries(value)) {
    if (!isCityAxis(axis)) throw new QuestionSetError(`${where} has unknown city axis "${axis}"`);
    if (typeof amount !== 'number' || !Number.isInteger(amount)) throw new QuestionSetError(`${where}.${axis} must be an integer`);
    if (amount < EFFECT_MIN || amount > EFFECT_MAX) throw new QuestionSetError(`${where}.${axis} must be between ${EFFECT_MIN} and ${EFFECT_MAX}`);
    result[axis] = amount;
  }
  return result;
}

function optionalText(value: unknown, where: string): string | undefined {
  return value === undefined ? undefined : text(value, where);
}

function trigger(value: unknown, where: string): QuestionTrigger | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) throw new QuestionSetError(`${where} must be an object`);
  const result: QuestionTrigger = {};
  for (const [axis, bound] of Object.entries(value)) {
    if (!isCityAxis(axis)) throw new QuestionSetError(`${where} has unknown city axis "${axis}"`);
    if (!isObject(bound) || Object.keys(bound).length === 0) throw new QuestionSetError(`${where}.${axis} must be an object with gte and/or lte`);
    for (const [key, limit] of Object.entries(bound)) {
      if (key !== 'gte' && key !== 'lte') throw new QuestionSetError(`${where}.${axis} has unknown bound "${key}"`);
      if (typeof limit !== 'number' || !Number.isInteger(limit)) throw new QuestionSetError(`${where}.${axis}.${key} must be an integer`);
    }
    result[axis] = bound as { gte?: number; lte?: number };
  }
  return result;
}

/** Validates untrusted JSON into a question set; throws QuestionSetError naming the first problem. */
export function parseQuestionSet(input: unknown): QuestionSet {
  if (!isObject(input)) throw new QuestionSetError('question set must be an object');
  const { version } = input;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) throw new QuestionSetError('version must be a positive integer');
  if (!Array.isArray(input.questions) || input.questions.length === 0) throw new QuestionSetError('questions must be a non-empty array');
  const questionIds = new Set<string>();
  const questions = input.questions.map((raw: unknown, index): Question => {
    if (!isObject(raw)) throw new QuestionSetError(`questions[${index}] must be an object`);
    const id = text(raw.id, `questions[${index}].id`);
    if (questionIds.has(id)) throw new QuestionSetError(`duplicate question id "${id}"`);
    questionIds.add(id);
    if (!Array.isArray(raw.options) || raw.options.length === 0) throw new QuestionSetError(`question "${id}" has no options`);
    const optionIds = new Set<string>();
    const options = raw.options.map((option: unknown, optionIndex): QuestionOption => {
      const where = `question "${id}" options[${optionIndex}]`;
      if (!isObject(option)) throw new QuestionSetError(`${where} must be an object`);
      const optionId = text(option.id, `${where}.id`);
      if (optionIds.has(optionId)) throw new QuestionSetError(`duplicate option id "${optionId}" in question "${id}"`);
      optionIds.add(optionId);
      return { id: optionId, label: text(option.label, `${where}.label`), effects: effects(option.effects, `${where}.effects`) };
    });
    const year = raw.year;
    if (year !== undefined && (typeof year !== 'number' || !Number.isInteger(year))) throw new QuestionSetError(`question "${id}".year must be an integer`);
    return {
      id, text: text(raw.text, `question "${id}".text`), options, year,
      pressure: optionalText(raw.pressure, `question "${id}".pressure`),
      background: optionalText(raw.background, `question "${id}".background`),
      trigger: trigger(raw.trigger, `question "${id}".trigger`),
    };
  });
  return { version, questions };
}

export function loadQuestionSetFile(path: string): QuestionSet {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new QuestionSetError(`cannot read question file ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parseQuestionSet(json);
}
