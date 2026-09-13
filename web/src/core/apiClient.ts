import { config } from './config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Query = Record<string, string | number | boolean | undefined | null | string[]>;

function buildQuery(params?: Query): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, opts?: { body?: unknown; query?: Query }): Promise<T> {
  // Read config fresh on every call (not captured at import time) so a
  // Settings-screen change to the backend URL/API key takes effect on the
  // very next request without a reload.
  const url = `${config.apiBaseUrl}${path}${buildQuery(opts?.query)}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let json: { ok: boolean; data?: T; error?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response (e.g. a 502 from a cold Render instance)
  }

  if (!res.ok || !json?.ok) {
    throw new ApiError(res.status, json?.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

async function upload<T>(path: string, field: string, file: File): Promise<T> {
  const form = new FormData();
  form.append(field, file);
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: config.apiKey ? { 'X-API-Key': config.apiKey } : undefined,
    body: form,
  });
  let json: { ok: boolean; data?: T; error?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok || !json?.ok) throw new ApiError(res.status, json?.error || `Upload failed (${res.status})`);
  return json.data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload,
};
