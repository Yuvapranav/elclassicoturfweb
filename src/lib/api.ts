// Thin typed fetch wrapper for talking to the Express API.
// All requests include credentials so the httpOnly JWT cookie is sent/received.

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

// CSRF synchronizer token for the current session, held in memory only (never
// in a cookie/localStorage). The auth layer sets it from login/signup/me
// responses; we attach it to every mutating request so the server can tell a
// genuine same-app call from a forged cross-site one.
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

function mutatingHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (body && (body.error || body.message)) || res.statusText || 'Request failed';
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: mutatingHeaders(data !== undefined),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: mutatingHeaders(data !== undefined),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: mutatingHeaders(false),
  });
  return handleResponse<T>(res);
}
