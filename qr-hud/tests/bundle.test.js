import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

test('client bundle contains neither Supabase SDK nor server secret configuration', async () => {
  const files = await readdir('dist/assets');
  for (const file of files.filter(name => name.endsWith('.js'))) {
    const text = await readFile(`dist/assets/${file}`, 'utf8');
    assert.doesNotMatch(text, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|supabase-js|sb_secret_/);
  }
});
