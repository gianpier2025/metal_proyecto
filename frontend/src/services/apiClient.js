import { requireSupabase } from './supabaseClient.js';

function normalizeApiBaseUrl(configuredUrl) {
  const value = configuredUrl?.trim();
  if (!value) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${path.endsWith('/api') ? path : `${path}/api`}`;
  } catch {
    return value.replace(/\/$/, '');
  }
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const GET_CACHE_MS = 20_000;
const getCache = new Map();
const inFlightGets = new Map();
let cacheGeneration = 0;

function copyJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clearGetCache() {
  cacheGeneration += 1;
  getCache.clear();
  inFlightGets.clear();
}

function saveGetCache(key, value, generation) {
  if (generation !== cacheGeneration) return;
  const now = Date.now();
  for (const [entryKey, entry] of getCache) {
    if (entry.expiresAt <= now) getCache.delete(entryKey);
  }
  if (getCache.size >= 100) getCache.delete(getCache.keys().next().value);
  getCache.set(key, { value: copyJson(value), expiresAt: now + GET_CACHE_MS });
}

export async function apiRequest(path, {
  method = 'GET',
  body,
  headers = {},
  rawBody = false,
  responseType = 'json',
} = {}) {
  if (!apiBaseUrl) {
    throw new Error('Falta configurar VITE_API_BASE_URL en frontend/.env.');
  }

  const client = requireSupabase();
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');

  const cacheable = method === 'GET' && responseType === 'json';
  const cacheKey = cacheable ? `${session.access_token}:${path}` : null;
  const requestGeneration = cacheGeneration;
  if (cacheable) {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return copyJson(cached.value);
    if (inFlightGets.has(cacheKey)) return copyJson(await inFlightGets.get(cacheKey));
  }

  const request = (async () => {
    let response;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(body === undefined || rawBody ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : rawBody ? body : JSON.stringify(body),
      });
    } catch {
      throw new Error('No se pudo conectar con el backend. Comprueba que esté iniciado.');
    }

    const contentType = response.headers.get('content-type') || '';
    const result = response.ok && responseType === 'blob'
      ? await response.blob()
      : contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      const message = typeof result === 'object' && result?.error
        ? result.error
        : `El backend respondió con error (${response.status}).`;
      throw new Error(message);
    }

    if (method !== 'GET') clearGetCache();
    if (cacheable) saveGetCache(cacheKey, result, requestGeneration);
    return result;
  })();

  if (cacheable) inFlightGets.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (cacheable && inFlightGets.get(cacheKey) === request) inFlightGets.delete(cacheKey);
  }
}
