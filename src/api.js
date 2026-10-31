// Only GET /health is verified. This transport does not invent business DTOs or routes.
export class ApiError extends Error {
  constructor(message, status, requestId = null) {
    super(message); this.name = 'ApiError'; this.status = status; this.requestId = requestId;
  }
}
export class ApiClient {
  #accessToken = null;
  #sessionVersion = 0;
  #notified = false;
  #pending = 0;
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 10000, onUnauthenticated = () => {}, onRequestStateChange = () => {} } = {}) {
    this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs; this.onUnauthenticated = onUnauthenticated; this.onRequestStateChange=onRequestStateChange;
  }
  setAccessToken(token) {
    if (typeof token !== 'string' || !token || /\s/.test(token)) throw new ApiError('Token không hợp lệ.', 400);
    this.#accessToken = token; this.#sessionVersion++; this.#notified = false;
  }
  clearSession() { this.#accessToken = null; this.#sessionVersion++; }
  async request(path, { method = 'GET', body, headers = {}, signal } = {}) {
    let parsed;
    try {
      if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('#')) throw new Error();
      const decoded = decodeURIComponent(path.split('?')[0]);
      if (decoded.split('/').some(segment => segment === '.' || segment === '..')) throw new Error();
      parsed = new URL(path, 'https://folio.local');
      if (parsed.origin !== 'https://folio.local' || parsed.pathname !== '/backend/health' && !parsed.pathname.startsWith('/api/v1/')) throw new Error();
    } catch { throw new ApiError('Đường dẫn API không hợp lệ.', 400); }
    const publicRequest = parsed.pathname === '/backend/health';
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Accept', 'application/json');
    requestHeaders.set('X-Request-ID', crypto.randomUUID());
    requestHeaders.delete('Authorization');
    if (!publicRequest && this.#accessToken) requestHeaders.set('Authorization', 'Bearer ' + this.#accessToken);
    const isJson = body !== undefined && body !== null && (Array.isArray(body) || Object.getPrototypeOf(body) === Object.prototype);
    if (isJson) { body = JSON.stringify(body); requestHeaders.set('Content-Type', 'application/json'); }
    else if (body instanceof FormData) requestHeaders.delete('Content-Type');
    this.#pending++;
    this.onRequestStateChange({pending:this.#pending,phase:'start',method,path:parsed.pathname});
    try {
    const sessionVersion = this.#sessionVersion;
    let response, payload;
    const abortSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)]) : AbortSignal.timeout(this.timeoutMs);
    try {
      response = await this.fetchImpl.call(globalThis,parsed.pathname + parsed.search, { method, body, headers: requestHeaders, signal: abortSignal, cache:'no-store', credentials:'omit', redirect:'error' });
    } catch {
      if (signal?.aborted) throw new ApiError('Yêu cầu đã được hủy.', 499);
      throw new ApiError(abortSignal.aborted ? 'Backend phản hồi quá thời gian chờ.' : 'Không thể kết nối backend.', 503);
    }
    const requestId = response.headers.get('X-Request-ID');
    // Authentication failure invalidates the matching in-memory session even if
    // an upstream reverse proxy returned HTML instead of the expected JSON.
    if (response.status === 401 && !publicRequest && sessionVersion === this.#sessionVersion && !this.#notified) {
      this.#accessToken = null; this.#notified = true;
      this.onUnauthenticated();
    }
    try { payload = await response.json(); }
    catch {
      if (signal?.aborted) throw new ApiError('Yêu cầu đã được hủy.', 499, requestId);
      if (abortSignal.aborted) throw new ApiError('Backend phản hồi quá thời gian chờ.', 503, requestId);
      throw new ApiError('Backend không trả JSON đúng hợp đồng.', 502, requestId);
    }
    if (!payload || typeof payload !== 'object' || payload.code !== response.status || typeof payload.message !== 'string' || !Object.hasOwn(payload, 'data') || !response.ok && payload.data !== null) {
      throw new ApiError('Phản hồi backend không đúng hợp đồng.', 502, requestId);
    }
    if (!response.ok) throw new ApiError(payload.message || 'Dịch vụ chưa sẵn sàng.', response.status, requestId);
    return { data:payload.data, message:payload.message, requestId, status:response.status };
    } finally {
      this.#pending--;
      this.onRequestStateChange({pending:this.#pending,phase:'finish',method,path:parsed.pathname});
    }
  }
  async health() {
    const result = await this.request('/backend/health');
    if (result.status !== 200 || result.data?.status !== 'ok') throw new ApiError('Phản hồi health không đúng OpenAPI.', 502, result.requestId);
    return { code:200, message:result.message, data:result.data, requestId:result.requestId, checkedAt:new Date().toISOString() };
  }
}
export const apiClient = new ApiClient({ onUnauthenticated: () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('folio:unauthenticated'));
}, onRequestStateChange: detail => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('docsense:request-state',{detail}));
} });
export const checkHealth = () => apiClient.health();
