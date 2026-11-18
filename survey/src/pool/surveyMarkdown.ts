import { parseQuestionPool, QuestionPoolError, type QuestionPool } from './questionPool.ts';

/**
 * Reads docs/planning-team/SURVEY_V2.md (the planning team's source text) into a question pool.
 * Strict: any line the format does not expect throws, so a changed layout is noticed instead of dropped.
 */
export function parseSurveyMarkdown(markdown: string, source: string): QuestionPool {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const parameters: Json[] = [];
  const questions: Json[] = [];
  let question: Json | undefined;
  let variant: Json | undefined;
  let header: string[] | undefined;

  const fail = (index: number, message: string): never => {
    throw new QuestionPoolError(`${source}:${index + 1}: ${message}`);
  };
  const field = (line: string, name: string) => line.startsWith(name) ? line.slice(name.length).trim() : undefined;

  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    const heading = /^## (Q(\d{2}))｜(.+)$/.exec(line);
    if (heading) {
      question = { id: heading[1], number: heading[2], heading: heading[3].trim(), notes: [], variants: {} };
      questions.push(question);
      variant = undefined;
      continue;
    }
    if (line.startsWith('## ')) { question = undefined; variant = undefined; continue; }
    if (!question || line === '' || line === '---') continue;

    const variantHeading = /^### ([PU])(\d{2})（(.+)）$/.exec(line);
    if (variantHeading) {
      if (variantHeading[2] !== question.number) fail(index, `${variantHeading[1]}${variantHeading[2]} is under ${question.id}`);
      variant = { title: variantHeading[3], options: [], notes: [] };
      (question.variants as Json)[variantHeading[1]] = variant;
      header = undefined;
      continue;
    }

    if (!variant) {
      const hypotheses = field(line, '- **関連仮説：**');
      const category = field(line, '- **上位カテゴリー：**');
      const parameter = field(line, '- **内部パラメータ：**');
      if (hypotheses !== undefined) question.hypotheses = hypotheses.split('／').map(s => s.trim());
      else if (category !== undefined) question.category = category;
      else if (parameter !== undefined) question.parameterLabel = parameter;
      else if (line.startsWith('>')) (question.notes as string[]).push(line.replace(/^>\s?/, ''));
      else fail(index, `unexpected line before the P/U versions: ${line}`);
      continue;
    }

    const questionText = field(line, '**質問文：**');
    const situation = field(line, '**日常的な状況・外的要因：**');
    if (questionText !== undefined) { variant.text = questionText; continue; }
    if (situation !== undefined) { variant.situation = situation; continue; }
    if (line.startsWith('※')) { (variant.notes as string[]).push(line); continue; }
    if (line.startsWith('|')) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      if (cells.every(cell => /^:?-+:?$/.test(cell))) continue;
      if (!header) { header = cells; continue; }
      if (cells.length !== header.length) fail(index, `table row has ${cells.length} cells, header has ${header.length}`);
      const cell = (name: string) => cells[header!.indexOf(name)];
      const option: Json = { id: cell('選択肢'), label: cell('内容'), reason: cell('そう解釈する理由') };
      if (header.includes('都市の具体的な変化')) option.cityChange = cell('都市の具体的な変化');
      (variant.options as Json[]).push(option);
      continue;
    }
    fail(index, `unexpected line in a P/U version: ${line}`);
  }

  if (questions.length === 0) throw new QuestionPoolError(`${source}: no "## Qnn｜" sections found`);
  const pool = {
    version: 1, source,
    parameters,
    questions: questions.map(q => {
      if (q.parameterLabel !== q.heading) throw new QuestionPoolError(`${source}: ${q.id} heading "${q.heading}" differs from 内部パラメータ "${q.parameterLabel}"`);
      const parameter = `param${q.number}`;
      parameters.push({ id: parameter, label: q.parameterLabel, category: q.category });
      return { id: q.id, parameter, hypotheses: q.hypotheses, variants: q.variants, notes: q.notes };
    }),
  };
  return parseQuestionPool(pool);
}

// Loose shape while reading; parseQuestionPool validates the result.
type Json = Record<string, any>;
