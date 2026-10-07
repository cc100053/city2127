export function createJobId() {
  // randomUUID requires HTTPS; getRandomValues also works for local LAN testing.
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function api(path, { body, signal, ...options } = {}) {
  try {
  const response = await fetch(path, {
    ...options,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'サービスに接続できません。'), { status: response.status, code: result.code });
  return result;
  } catch (error) {
    if (error.status || error.name === 'AbortError') throw error;
    throw new Error(error.name === 'TimeoutError'
      ? '接続がタイムアウトしました。もう一度お試しください。'
      : '接続できません。ネットワークを確認してください。');
  }
}

export function uploadMedia(sessionId, file, jobId, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/sessions/${encodeURIComponent(sessionId)}/media`);
    xhr.setRequestHeader('Idempotency-Key', jobId);
    xhr.timeout = 180000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(result);
        else reject(Object.assign(new Error(result.error || 'アップロードに失敗しました。'), { status: xhr.status }));
      } catch { reject(new Error('サーバーの応答を確認できません。もう一度お試しください。')); }
    };
    xhr.onerror = xhr.ontimeout = () => reject(new Error('送信が中断しました。選択したファイルをそのまま再送してください。重複アップロードは防止されます。'));
    const form = new FormData();
    form.append('media', file);
    xhr.send(form);
  });
}
