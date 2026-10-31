const paths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v2"/>',
  shield:'<path d="m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7Z"/><path d="m8 12 3 3 5-6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', down:'<path d="m6 9 6 6 6-6"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h5"/>',
  check:'<path d="m5 12 4 4L19 6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  warning:'<path d="m12 3 10 18H2Z"/><path d="M12 9v4m0 4h.01"/>', upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-12 9a3 3 0 0 0 6 0"/>',
  building:'<path d="M5 22V3h14v19M2 22h20M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-4 7v-4h2v4"/>',
  logout:'<path d="M9 4H4v16h5m6-12 4 4-4 4m-6-4h10"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 1-1 1-1 2m0 3h.01"/>',
  history:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-3v5l3 2"/>', book:'<path d="M3 3h6l3 3 3-3h6v17h-6l-3 2-3-2H3Zm9 3v16"/>',
  link:'<path d="m10 13 4-4m-7 6-1 1a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6m1-3 1-1a4 4 0 0 0-6-6L8 6a4 4 0 0 0 0 6"/>',
  refresh:'<path d="M20 7a9 9 0 1 0 1 9m-1-14v5h-5"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
};
export const icon = name => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const avatar = (name, tone = 0) => `<span class="avatar tone-${tone % 4}">${escape(name.split(' ').slice(-2).map(x => x[0]).join(''))}</span>`;
export const statusNames = { PROCESSING:'Đang xử lý', MISSING_DOCUMENT:'Thiếu giấy tờ', INVALID_DOCUMENT:'Có sai lệch', VALID_DOCUMENT:'Chờ kiểm duyệt', APPROVED_DOCUMENT:'Đã phê duyệt', REJECTED:'Đã từ chối', UPLOADED:'Đã tiếp nhận', EXTRACTED:'Đã trích xuất', FAILED:'Xử lý lỗi', UNKNOWN:'Chờ phân loại', PENDING_CONDITION:'Chờ xác định', NOT_REQUIRED:'Không áp dụng', RESOLVED:'Khớp', OPEN:'Cần xử lý', PENDING_DOCUMENTS:'Chờ dữ liệu', ACKNOWLEDGED:'Đã xác nhận', active:'Hoạt động', invited:'Đã mời', suspended:'Tạm ngưng' };
export const badge = status => `<span class="badge ${status}"><i></i>${statusNames[status] || escape(status)}</span>`;
export const empty = (title, description, glyph = 'folder') => `<div class="empty">${icon(glyph)}<h3>${title}</h3><p>${description}</p></div>`;
export const button = (label, action, glyph = '', style = '') => `<button class="button ${style}" data-action="${action}">${glyph ? icon(glyph) : ''}${label}</button>`;
export function notify(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('visible'), 4200);
}
let returnFocus;
export function closeModal() { document.querySelector('#modal-root').innerHTML = ''; document.body.classList.remove('modal-open'); returnFocus?.isConnected && returnFocus.focus(); }
export function modal(title, description, content, submitLabel, onSubmit) {
  returnFocus = document.activeElement;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><h2 id="modal-title">${escape(title)}</h2><p>${escape(description)}</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Đóng">${icon('close')}</button></div><form id="modal-form"><div class="form-body">${content}</div><p class="form-error" id="form-error" role="alert"></p><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Hủy</button><button class="button primary" type="submit">${escape(submitLabel)}</button></div></form></section></div>`;
  document.body.classList.add('modal-open');
  document.querySelector('#modal-form').onsubmit = async event => {
    event.preventDefault(); const submit = event.submitter; if (submit) submit.disabled = true;
    try { await onSubmit(new FormData(event.target)); } catch (error) { const el = document.querySelector('#form-error'); if (el) el.textContent = error.message; else notify(error.message); } finally { if (submit?.isConnected) submit.disabled = false; }
  };
  document.querySelector('.modal input, .modal select, .modal textarea, .modal button')?.focus();
}
export function trapModal(event) {
  const el = document.querySelector('.modal'); if (!el) return false;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') { const list = [...el.querySelectorAll('button,input,select,textarea,a[href]')].filter(x => !x.disabled); if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === list.at(-1)) { event.preventDefault(); list[0].focus(); } }
  return true;
}
