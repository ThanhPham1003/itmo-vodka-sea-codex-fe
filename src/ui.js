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
export function closeModal() { document.querySelector('#modal-root').innerHTML = ''; document.body.classList.remove('modal-open'); if(returnFocus?.isConnected)returnFocus.focus();else document.querySelector('#main-content')?.focus({preventScroll:true}); }
export function requestCloseModal() {
  if(document.querySelector('.modal[aria-busy="true"]'))return;
  closeModal();
}
let fieldSequence = 0;
export function setFieldError(field,message) {
  if(!field)return;
  let error=document.getElementById(field.dataset.errorId);
  if(!error){error=document.createElement('span');error.className='field-error';error.id='field-error-'+(++fieldSequence);field.dataset.errorId=error.id;(field.closest('label,.auth-field')||field.parentElement).append(error);}
  error.textContent=message;field.setAttribute('aria-invalid','true');
  field.setAttribute('aria-describedby',[...new Set([...(field.getAttribute('aria-describedby')||'').split(' ').filter(Boolean),error.id])].join(' '));
}
function clearFieldError(field) {
  field.removeAttribute('aria-invalid');
  const id=field.dataset.errorId;
  document.getElementById(id)?.remove();
  const described=(field.getAttribute('aria-describedby')||'').split(' ').filter(value=>value&&value!==id);
  if(described.length)field.setAttribute('aria-describedby',described.join(' '));else field.removeAttribute('aria-describedby');
  delete field.dataset.errorId;
}
export function bindFormValidation(form) {
  if(!form||form.dataset.validationBound)return;
  form.dataset.validationBound='true';form.noValidate=true;
  form.addEventListener('invalid',event=>{
    const field=event.target;event.preventDefault();
    const message=field.validity.valueMissing?'Vui lòng nhập thông tin này.':field.validity.typeMismatch&&field.type==='email'?'Nhập địa chỉ email hợp lệ.':field.validity.tooShort?`Nhập ít nhất ${field.minLength} ký tự.`:'Kiểm tra lại giá trị đã nhập.';
    setFieldError(field,message);
  },true);
  const clear=event=>{const field=event.target;if(field.matches('input,select,textarea')&&field.validity.valid)clearFieldError(field);};
  form.addEventListener('input',clear);form.addEventListener('change',clear);
}
const busyButtons=new WeakMap();
export function setButtonLoading(button,busy,label='Đang xử lý…') {
  if(!button)return;
  if(busy){
    if(busyButtons.has(button))return;
    busyButtons.set(button,{html:button.innerHTML,disabled:button.disabled});button.disabled=true;
    button.classList.add('is-loading');button.setAttribute('aria-busy','true');
    button.innerHTML='<span class="loading-indicator" aria-hidden="true"></span><span>'+escape(label)+'</span>';
  } else {
    const saved=busyButtons.get(button);if(!saved)return;
    button.innerHTML=saved.html;button.disabled=saved.disabled;button.classList.remove('is-loading');button.removeAttribute('aria-busy');busyButtons.delete(button);
  }
}
export function modal(title, description, content, submitLabel, onSubmit) {
  returnFocus = document.activeElement;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><h2 id="modal-title">${escape(title)}</h2><p>${escape(description)}</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Đóng">${icon('close')}</button></div><form id="modal-form"><div class="form-body">${content}</div><p class="form-error" id="form-error" role="alert"></p><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Hủy</button><button class="button primary" type="submit">${escape(submitLabel)}</button></div></form></section></div>`;
  document.body.classList.add('modal-open');
  const form=document.querySelector('#modal-form');bindFormValidation(form);
  form.onsubmit = async event => {
    event.preventDefault();if(form.dataset.submitting)return;
    if(!form.checkValidity()){form.querySelector(':invalid')?.focus();return;}
    const data=new FormData(form);const submit=event.submitter||form.querySelector('[type="submit"]');
    const dialog=form.closest('.modal');form.dataset.submitting='true';dialog.setAttribute('aria-busy','true');setButtonLoading(submit,true);
    const controls=[...dialog.querySelectorAll('input,select,textarea,button')].filter(el=>el!==submit).map(el=>({el,disabled:el.disabled}));controls.forEach(({el})=>el.disabled=true);
    const error=form.querySelector('#form-error');if(error)error.textContent='';
    try { await onSubmit(data); } catch (failure) { if(error?.isConnected){error.textContent=failure.message;error.scrollIntoView({block:'nearest'});}else notify(failure.message); }
    finally { if(submit?.isConnected)setButtonLoading(submit,false);controls.forEach(({el,disabled})=>{if(el.isConnected)el.disabled=disabled;});dialog.removeAttribute('aria-busy');delete form.dataset.submitting; }
  };
  (form.querySelector('input:not([type="hidden"]),select,textarea')||document.querySelector('.modal button'))?.focus();
  return form;
}
export function trapModal(event) {
  const el = document.querySelector('.modal'); if (!el) return false;
  if (event.key === 'Escape') {event.preventDefault();requestCloseModal();}
  if (event.key === 'Tab') { const list = [...el.querySelectorAll('button,input,select,textarea,a[href]')].filter(x => !x.disabled&&x.getClientRects().length); if(!list.length){event.preventDefault();return true;} if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === list.at(-1)) { event.preventDefault(); list[0].focus(); } }
  return true;
}

export function bindRequestLoading() {
  const host=document.querySelector('#network-status');if(!host)return;
  let timer,roots=[];
  const hide=()=>{clearTimeout(timer);timer=null;host.innerHTML='';host.hidden=true;for(const [root,inert,busy]of roots){root.inert=inert;if(busy===null)root.removeAttribute('aria-busy');else root.setAttribute('aria-busy',busy);}roots=[];};
  window.addEventListener('docsense:request-state',event=>{
    const pending=event.detail.pending;host.dataset.pending=String(pending);
    if(!pending){hide();return;}
    const count=host.querySelector('.network-request-count');if(count)count.textContent=pending>1?`${pending} yêu cầu đang được xử lý`:'Đang kết nối với máy chủ';
    if(host.querySelector('.is-visible')||timer)return;
    timer=setTimeout(()=>{
      timer=null;host.hidden=false;
      roots=[document.querySelector('#app'),document.querySelector('#modal-root')].filter(Boolean).map(root=>[root,root.inert,root.getAttribute('aria-busy')]);
      for(const [root]of roots){root.inert=true;root.setAttribute('aria-busy','true');}
      host.innerHTML='<div class="network-wait-overlay is-visible" role="status" aria-live="polite"><div class="network-wait-card"><span class="network-brand"><img src="/assets/logo.svg" alt="" width="30" height="30"/>DocSense AI</span><span class="network-spinner" aria-hidden="true"></span><strong class="network-wait-title">Đang chờ phản hồi từ máy chủ</strong><p class="network-wait-description">Vui lòng chờ trong giây lát…</p><div class="network-skeleton" aria-hidden="true"><span></span><span></span><span></span></div><small class="network-request-count"></small></div></div>';
      host.querySelector('.network-request-count').textContent=Number(host.dataset.pending)>1?host.dataset.pending+' yêu cầu đang được xử lý':'Đang kết nối với máy chủ';
    },150);
  });
  window.addEventListener('pagehide',hide);
}
