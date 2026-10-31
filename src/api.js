// /health is the ONLY verified backend endpoint. Business screens use demo-service.js.
export class ApiError extends Error {
  constructor(message, status, requestId) { super(message); this.status = status; this.requestId = requestId; }
}
export async function checkHealth() {
  let response;
  try { response = await fetch('/backend/health', { signal:AbortSignal.timeout(6500), headers:{ Accept:'application/json' }, cache:'no-store' }); }
  catch { throw new ApiError('Không thể kết nối backend.', 503); }
  const requestId = response.headers.get('X-Request-ID');
  let body;
  try { body = await response.json(); } catch { throw new ApiError('Backend không trả JSON đúng hợp đồng.', response.status, requestId); }
  if (!response.ok) throw new ApiError(body.message || 'Dịch vụ chưa sẵn sàng.', response.status, requestId);
  if (body.code !== 200 || body.data?.status !== 'ok') throw new ApiError('Phản hồi health không đúng OpenAPI.', response.status, requestId);
  return { ...body, requestId, checkedAt:new Date().toISOString() };
}
