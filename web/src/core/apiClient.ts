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

// Same as upload(), but reports progress (0..1) — fetch has no upload progress
// events, which a 40MB video needs.
function uploadWithProgress<T>(path: string, field: string, file: File, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${config.apiBaseUrl}${path}`);
    if (config.apiKey) xhr.setRequestHeader('X-API-Key', config.apiKey);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let json: { ok: boolean; data?: T; error?: string } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.ok) resolve(json.data as T);
      else reject(new ApiError(xhr.status, json?.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Network error during upload — check your connection and try again'));
    const form = new FormData();
    form.append(field, file);
    xhr.send(form);
  });
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload,
  uploadWithProgress,
};
