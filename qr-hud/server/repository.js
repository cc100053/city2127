import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const columns = 'id,status,proposal_number,media_url,created_at,updated_at';
const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4' };

export function createRepository(config) {
  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(120000) }) },
  });
  const prefix = `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${config.bucket}/`;
  function check(error) { if (error) throw error; }
  return {
    async create(id) {
      const { data, error } = await client.from('sessions').insert({ id }).select(columns).single();
      check(error);
      return data;
    },
    async get(id) {
      const { data, error } = await client.from('sessions').select(columns).eq('id', id).maybeSingle();
      check(error);
      return data;
    },
    async setStatus(id, status, mediaUrl = null) {
      const { data, error } = await client.from('sessions').update({ status, media_url: mediaUrl }).eq('id', id).select('id').single();
      check(error);
      if (!data) throw new Error('Session not found');
    },
    async upload(job, filePath) {
      const body = await readFile(filePath);
      const { error } = await client.storage.from(config.bucket).upload(job.objectPath, body, {
        contentType: job.mime, upsert: true, cacheControl: '3600',
      });
      check(error);
      return prefix + job.objectPath;
    },
    async publicSession(record) {
      const result = { ...record, media_url: null, media_type: null };
      if (record.status !== 'ready' || !record.media_url) return result;
      if (!record.media_url.startsWith(prefix)) throw new Error('Unexpected Storage location');
      const objectPath = record.media_url.slice(prefix.length);
      if (!/^[A-Za-z0-9_-]+\/[a-f0-9-]+\.(png|jpg|jpeg|webp|mp4)$/.test(objectPath)) throw new Error('Invalid Storage path');
      const { data, error } = await client.storage.from(config.bucket).createSignedUrl(objectPath, config.signedUrlTtl);
      check(error);
      return {
        ...result, media_url: data.signedUrl,
        media_type: types[objectPath.split('.').pop()],
        media_expires_at: new Date(Date.now() + config.signedUrlTtl * 1000).toISOString(),
      };
    },
  };
}
