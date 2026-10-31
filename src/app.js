import { demo as demoService, roles, companies } from './demo-service.js';
import { checkHealth, apiClient } from './api.js';
import { createBackendService, catalogView, roleDefaults } from './backend-service.js';
import { initI18n, languageSwitcher, getLocale } from './i18n.js';
import { liveDocumentPreview } from './document-view.js';
import { renderAuthPage } from './auth-view.js';

const mode = new URLSearchParams(location.search).get('mode') === 'demo' ? 'demo' : 'api';
const live = mode === 'api';
const demo = live ? createBackendService(apiClient) : demoService;
import { openCatalogEditor } from './catalog-editor.js';
import { icon, escape as e, avatar, badge, empty, button, modal, closeModal, notify, trapModal, statusNames, requestCloseModal, bindFormValidation, setFieldError, bindRequestLoading, setButtonLoading } from './ui.js';

const STATUS = ['PROCESSING','MISSING_DOCUMENT','INVALID_DOCUMENT','VALID_DOCUMENT','APPROVED_DOCUMENT','REJECTED'];
const state = { page:'dashboard', id:null, tab:'overview', search:'', status:'', type:'', assignee:'', from:'', to:'', metric:'current', doc:null, mobile:false, catalog:'dossiers', catalogCode:null, auditAction:'', revealed:new Map(), original:new Set(), health:null, healthLoading:false, healthError:null, offset:0, loading:false, error:null, previewUrl:null, previewMime:null };
let renderedView = null;
let mobileCloseTimer;
let loadController, loadSequence=0, pollTimer, searchTimer;
const can = permission => Boolean(demo.session && demo.can(permission));
const session = () => demo.session;
const company = () => live ? demo.company : companies.find(c => c.id === session()?.companyId);
const navItems = [
  ['dashboard','grid','Tổng quan','dashboard:read'],
  ['dossiers','folder','Hồ sơ','dossier:read'],
  ['review','shield','Kiểm duyệt','dossier:review'],
  ['members','users','Thành viên',live?'user:manage':'users:manage'],
  ['catalog','book','Cấu hình hồ sơ','catalog:manage'],
  ['audit','history','Nhật ký hoạt động','audit:read'],
];
const titles = { dashboard:'Tổng quan', dossiers:'Hồ sơ', detail:'Chi tiết hồ sơ', review:'Kiểm duyệt', members:'Thành viên', catalog:'Cấu hình hồ sơ', audit:'Nhật ký hoạt động', connection:'Kết nối backend' };
const time = value => new Date(value).toLocaleDateString(getLocale()==='en'?'en-GB':'vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Ho_Chi_Minh' });
const dateTime = value => new Date(value).toLocaleString(getLocale()==='en'?'en-GB':'vi-VN', { hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh' });
const shortName = value => String(value || 'Chưa phân công').split(' ').slice(-2).join(' ');
const members = () => demo.listMembers();
const member = id => members().find(m => m.id === id);
const assigneeName = id => member(id)?.name||(id?'Đã phân công':'Chưa phân công');
const assigneeShort = id => member(id)?shortName(member(id).name):assigneeName(id);
const getDossier = () => state.id ? demo.getDossier(state.id) : null;
const isFinal = d => ['APPROVED_DOCUMENT','REJECTED'].includes(d.status);
const currentFilters = () => ({ search:state.search, status:state.status, type:state.type, assignee:state.assignee, from:state.from, to:state.to, metric:state.metric });
const count = status => live ? demo.stats()?.counts?.[status]||0 : demo.listDossiers({status}).length;
function heading(eyebrow, title, description, actions = '') { return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`; }
function panelHeading(title, description = '', actions = '') { return `<div class="panel-heading"><div><h2>${title}</h2>${description ? `<p>${description}</p>`:''}</div>${actions}</div>`; }
const optionList = (items, value, labelKey='name', valueKey='id') => items.map(item => `<option data-user-content value="${e(item[valueKey])}" ${value===item[valueKey]?'selected':''}>${e(item[labelKey])}</option>`).join('');
const nav = () => navItems.filter(([, , ,permission]) => can(permission)).map(([page,glyph,label]) => `<button class="nav-item ${state.page === page || state.page === 'detail' && page === 'dossiers' ? 'active':''}" data-page="${page}" aria-label="${label}" ${state.page===page?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span>${!live&&page==='review'&&count('VALID_DOCUMENT')?`<small>${count('VALID_DOCUMENT')}</small>`:''}</button>`).join('');

function render() {
  const viewKey=session()?`${state.page}:${state.id}:${state.tab}:${state.catalog}`:`auth:${state.page}`;
  const entering=viewKey!==renderedView;renderedView=viewKey;
  document.body.classList.toggle('menu-open',state.mobile);
  if (!session()) { document.querySelector('#app').innerHTML = authPage();if(entering)document.querySelector('.auth-card')?.classList.add('page-enter');bindFormValidation(document.querySelector('.auth-form'));return; }
  const forbidden = navItems.find(([p]) => p === state.page)?.[3];
  let content;
  try {
    content = forbidden && !can(forbidden) ? empty('Bạn không có quyền truy cập','Chọn một chức năng trong menu của bạn.','shield') : state.loading ? '<div class="page-loading" role="status"><span class="loading-indicator"></span> Đang tải dữ liệu…</div>' : state.error ? `${empty('Không thể tải dữ liệu',e(state.error),'warning')}${button('Tải lại','reload','refresh','primary')}` : ({ dashboard:dashboard, dossiers:dossiers, detail:detail, review:reviewQueue, members:memberPage, catalog:catalogPage, audit:auditPage, connection:connectionPage }[state.page] || dossiers)();
  } catch (error) { content = empty('Không thể mở nội dung',e(error.message),'warning'); }
  document.title = `${titles[state.page] || 'DocSense AI'} · DocSense AI`;
  document.querySelector('#app').innerHTML = `<a class="skip-link" href="#main-content">Đến nội dung chính</a>
    ${state.mobile?'<button class="mobile-backdrop" data-action="mobile" aria-label="Đóng menu"></button>':''}
    <aside id="workspace-menu" class="sidebar ${state.mobile?'open':''}" aria-label="Menu không gian làm việc" ${state.mobile?'role="dialog" aria-modal="true"':''}>
      <div class="sidebar-scroll">
      <a class="brand" href="#/dashboard"><img src="/assets/logo.svg" alt="" width="31" height="31"/>DocSense <span>AI</span></a>
      <div class="nav-label">KHÔNG GIAN LÀM VIỆC</div>
      <div class="tenant-card"><span class="tenant-logo">${e(company()?.initials||'CT')}</span><span><strong>${e(company()?.name||'Doanh nghiệp')}</strong><small>Không gian doanh nghiệp</small></span>${icon('building')}</div>
      <div class="nav-label management-label">QUẢN LÝ</div><nav aria-label="Điều hướng chính">${nav()}</nav>
      <div class="sidebar-bottom"><div class="workspace-note"><span class="note-symbol">${icon('shield')}</span><strong>Rõ dữ liệu.<br/>Chắc quyết định.</strong><p>Một không gian cho mọi bước xử lý hồ sơ.</p><button class="text-link" data-action="guide">Khám phá quy trình ${icon('arrow')}</button></div><button class="nav-item ${state.page==='connection'?'active':''}" data-page="connection">${icon('link')}<span>Kết nối backend</span><span class="health-dot ${state.health?'connected':''}"></span></button></div></div><button class="user-button" data-action="account">${avatar(session().name,1)}<span><strong>${e(session().name)}</strong><small>${e(roles[session().role])}</small></span>${icon('down')}</button>
    </aside>
    <div class="app-shell" ${state.mobile?'inert':''}><header class="topbar"><div class="breadcrumbs"><button class="mobile-toggle icon-button" data-action="mobile" aria-label="Mở menu" aria-controls="workspace-menu" aria-expanded="${state.mobile}">${icon('menu')}</button><span>${e(company()?.name)}</span><span class="crumb-slash">/</span><strong>${titles[state.page]}</strong></div><div class="top-actions">${languageSwitcher()}<span class="demo-pill"><i></i>${live?'Không gian doanh nghiệp':'Bản demo'}</span><button class="icon-button" data-action="notifications" aria-label="Thông báo">${icon('bell')}</button><span class="top-divider"></span><button class="avatar-button" data-action="account" aria-label="Tài khoản">${avatar(session().name,1)}</button></div></header>
    <main id="main-content" class="main ${entering?'page-enter':''}" tabindex="-1">${content}</main><footer class="page-footer"><span>DocSense AI workspace <b>·</b> Không gian xử lý hồ sơ</span><span>${live?'Dữ liệu được lưu trong không gian doanh nghiệp.':'Dữ liệu và kết quả nghiệp vụ mô phỏng.'}</span></footer></div>`;
}

function dashboard() {
  const stats = demo.stats({from:state.from,to:state.to,type:state.type,metric:state.metric});
  const waiting = count('VALID_DOCUMENT');
  const tasks = demo.listDossiers().filter(d => ['INVALID_DOCUMENT','MISSING_DOCUMENT','VALID_DOCUMENT'].includes(d.status)).slice(0,3);
  const days = demo.stats({from:state.from,to:state.to,type:state.type,metric:live?'activity':'transitions'})?.series?.slice(-7) || [];
  const max = Math.max(1,...days.map(day => STATUS.reduce((total,s) => total+(day.counts?.[s]||0),0)));
  const metricText = state.metric==='current'?'Số hồ sơ theo trạng thái hiện tại · không áp dụng khoảng ngày':state.metric==='unique'?'Hồ sơ duy nhất đã vào từng trạng thái trong kỳ':'Số lượt chuyển vào từng trạng thái trong kỳ';
  return `${heading('TỔNG QUAN DOANH NGHIỆP','Xin chào, '+e(shortName(session().name))+' <span class="greeting-wave">✳</span>','Cùng bắt đầu một ngày làm việc rõ ràng và hiệu quả.',`<span class="date-chip">${icon('clock')}${time(new Date())}</span>${can('dossier:create')?button('Tạo hồ sơ','create','plus','primary'):''}`)}
    <section class="hero"><div class="hero-copy"><div class="hero-label"><span></span> MỌI HỒ SƠ, MỘT KHÔNG GIAN</div><h2>Quản lý gọn gàng.<br/><span>Kiểm duyệt vững vàng.</span></h2><p>Từ tiếp nhận đến phê duyệt, theo dõi từng bước<br class="desktop-break"/> và để mọi quyết định có cơ sở.</p><button class="button primary" data-page="${can('dossier:review')?'review':'dossiers'}">${can('dossier:review')?'Đến hàng đợi kiểm duyệt':'Khám phá hồ sơ'} ${icon('arrow')}</button></div><img class="hero-art" src="/assets/workspace.svg" alt="Minh họa các lớp tài liệu và dấu xác nhận xanh"/><div class="hero-footer"><span>${icon('shield')} Cấu hình theo doanh nghiệp</span><span>${icon('history')} Lịch sử rõ ràng</span><span>${icon('check')} Kiểm duyệt có kiểm soát</span></div></section>
    <div class="section-title"><div><h2>Nhịp làm việc hôm nay</h2><p>${metricText}</p></div><button class="text-link" data-action="dashboard-filters">${icon('settings')} Bộ lọc thống kê</button></div>
    <section class="stats-grid">${[[stats.total,state.metric==='current'?'Tổng hồ sơ':state.metric==='unique'?'Tổng hồ sơ/trạng thái':'Tổng lượt chuyển','folder','', 'neutral'],[stats.counts?.VALID_DOCUMENT||0,'Chờ kiểm duyệt','shield','VALID_DOCUMENT','green'],[stats.counts?.MISSING_DOCUMENT||0,'Thiếu giấy tờ','clock','MISSING_DOCUMENT','amber'],[stats.counts?.APPROVED_DOCUMENT||0,'Đã phê duyệt','check','APPROVED_DOCUMENT','green']].map(([n,label,glyph,s,tone],i)=>`<button class="stat-card" data-stat="${s}"><span class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon(glyph)}</span></span><span class="stat-value">${String(n).padStart(2,'0')}<span class="stat-mini">${['↗','→','↗','↗'][i]}</span></span><span class="stat-foot">${i===0?'Hồ sơ trong không gian':i===1?'Đã đủ điều kiện tiếp nhận duyệt':i===2?'Cần bổ sung để tiếp tục xử lý':'Hoàn tất kiểm tra pháp lý'} ${icon('arrow')}</span></button>`).join('')}</section>
    <div class="overview-grid"><section class="panel chart-panel">${panelHeading('Hoạt động xử lý',live&&state.metric!=='unique'?'Lượt chuyển trạng thái theo ngày':'Hồ sơ duy nhất chuyển trạng thái theo ngày', '<span class="date-chip">'+(state.from||'7 ngày gần nhất')+'</span>')}<div class="chart"><div class="chart-axis"><span>${max}</span><span>${Math.round(max/2)}</span><span>0</span></div><div class="chart-bars">${days.map(day=>`<div class="chart-bar-group"><div class="chart-stack">${['PROCESSING','MISSING_DOCUMENT','INVALID_DOCUMENT','VALID_DOCUMENT','APPROVED_DOCUMENT','REJECTED'].map(s=>`<button class="chart-bar ${s}" data-chart-status="${s}" data-chart-date="${day.date}" style="height:${(day.counts?.[s]||0)/max*100}%" title="${e(time(day.date))}: ${statusNames[s]} — ${day.counts?.[s]||0}" aria-label="${e(time(day.date))}: ${statusNames[s]} — ${day.counts?.[s]||0}"></button>`).join('')}</div><span class="chart-label">${new Date(day.date).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</span></div>`).join('')}</div></div><div class="chart-legend">${[['APPROVED_DOCUMENT','Đã duyệt'],['VALID_DOCUMENT','Chờ duyệt'],['MISSING_DOCUMENT','Thiếu giấy tờ'],['INVALID_DOCUMENT','Sai lệch'],['PROCESSING','Đang xử lý'],['REJECTED','Từ chối']].map(([s,l])=>`<span><i class="legend-dot ${s}"></i>${l}</span>`).join('')}</div></section>
    <section class="panel">${panelHeading('Cần bạn chú ý','Ưu tiên những việc quan trọng',`<span class="count-label">${tasks.length}</span>`)}${tasks.map(d=>`<button class="task-row" data-open="${d.id}"><span class="task-icon ${d.status}">${icon(d.status==='INVALID_DOCUMENT'?'warning':d.status==='VALID_DOCUMENT'?'shield':'file')}</span><span class="task-content"><strong>${statusNames[d.status]}</strong><span>${e(d.name)}</span><small>${e(d.reference)}</small></span><span class="task-arrow">↗</span></button>`).join('')||empty('Đã hoàn tất công việc','Không có hồ sơ cần chú ý.','check')}<div class="panel-bottom"><span class="health-dot connected"></span> ${waiting} hồ sơ sẵn sàng kiểm duyệt</div></section></div>
    <section class="panel recent-panel">${panelHeading('Hồ sơ gần đây','Tiếp tục công việc từ nơi bạn đã dừng lại',`<button class="text-link" data-page="dossiers">Xem tất cả ${icon('arrow')}</button>`)}${dossierTable(demo.listDossiers().slice(0,5),true)}</section>`;
}

function dossierTable(rows, compact = false) {
  if (!rows.length) return empty('Chưa có hồ sơ phù hợp','Thử thay đổi bộ lọc hoặc tạo một hồ sơ mới.');
  return `<div class="table-wrap"><table><thead><tr><th>HỒ SƠ</th>${compact?'':'<th>LOẠI BỘ HỒ SƠ</th>'}<th>TRẠNG THÁI</th><th>PHỤ TRÁCH</th><th>NGÀY TẠO</th><th><span class="sr-only">Mở hồ sơ</span></th></tr></thead><tbody>${rows.map((d,i)=>`<tr><td><button class="record-link" data-open="${d.id}"><span class="file-icon">${icon('file')}</span><span><strong>${e(d.name)}</strong><small>${e(d.reference)}</small></span></button></td>${compact?'':`<td data-user-content>${e(d.typeName)}</td>`}<td>${badge(d.status)}</td><td><span class="assignee">${avatar(assigneeName(d.assigneeId),i)}<span ${member(d.assigneeId)?'data-user-content':''}>${e(assigneeShort(d.assigneeId))}</span></span></td><td class="date-cell">${time(d.createdAt)}</td><td><button class="icon-button" data-open="${d.id}" aria-label="Mở ${e(d.name)}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function dossiers() {
  const rows = demo.listDossiers(currentFilters());
  return `${heading('QUẢN LÝ HỒ SƠ','Mỗi hồ sơ, một hành trình.','Tập trung tài liệu, theo dõi tiến độ và phối hợp cùng đội ngũ.',can('dossier:create')?button('Tạo hồ sơ','create','plus','primary'):'')}
    <section class="panel"><div class="tab-bar status-tabs"><button class="${!state.status?'selected':''}" data-status="">Tất cả ${live?'':`<span>${demo.listDossiers().length}</span>`}</button>${STATUS.map(s=>`<button class="${state.status===s?'selected':''}" data-status="${s}">${statusNames[s]}${live?'':`<span>${count(s)}</span>`}</button>`).join('')}</div><div class="toolbar"><label class="search-box">${icon('search')}<input id="dossier-search" placeholder="Tìm tên hoặc mã hồ sơ…" value="${e(state.search)}" aria-label="Tìm hồ sơ"/></label><select class="filter-select" id="type-filter" aria-label="Loại bộ hồ sơ"><option value="">Tất cả loại hồ sơ</option>${optionList(demo.listDossierTypes().filter(t=>t.active!==false),state.type,'name','code')}</select>${live&&session().role!=='company_admin'?`<label>Người phụ trách (ID)<input id="assignee-filter" value="${e(state.assignee)}" placeholder="UUID người phụ trách"/></label>`:`<select class="filter-select" id="assignee-filter" aria-label="Người phụ trách"><option value="">Tất cả người phụ trách</option>${optionList(members().filter(m=>m.status==='active'),state.assignee)}</select>`}${button(live?'Ngày chuyển trạng thái':'Ngày tạo','list-dates','clock')}</div><div class="filter-summary"><span id="result-count">${live?demo.pagination.total:rows.length} hồ sơ</span>${state.from||state.to?`<span>${e(state.from||'…')} — ${e(state.to||'…')}</span>`:''}<button class="text-link" data-action="reset-filters">Xóa bộ lọc</button></div><div id="dossier-results">${dossierTable(rows)}</div>${pagination()}</section>`;
}
function pagination() {
  if(!live)return '';
  const {total,offset,limit}=demo.pagination;
  return `<div class="panel-bottom pagination"><span>${total?offset+1:0}–${Math.min(offset+limit,total)} / ${total}</span><button class="button small" data-offset="${Math.max(0,offset-limit)}" ${offset===0?'disabled':''}>Trang trước</button><button class="button small" data-offset="${offset+limit}" ${offset+limit>=total?'disabled':''}>Trang sau</button></div>`;
}

function detail() {
  const d=getDossier();if(!d)return empty('Không tìm thấy hồ sơ','Hồ sơ không thuộc công ty hoặc phạm vi của tài khoản.','shield');
  return `<button class="back-link" data-page="dossiers">← Danh sách hồ sơ</button>${heading(e(d.reference),`<span data-user-content>${e(d.name)}</span>`,`<span data-user-content>${e(d.typeName)}</span> <span class="dot-separator">·</span> Tạo ngày ${time(d.createdAt)}`,`${badge(d.status)}${can('dossier:upload')&&!isFinal(d)?button('Thêm tài liệu','upload','upload','primary'):''}`)}
    <div class="detail-meta"><span>${icon('users')} <span ${member(d.assigneeId)?'data-user-content':''}>${e(assigneeName(d.assigneeId))}</span>${can('dossier:assign')&&!isFinal(d)?button('Thay đổi','assign','','subtle small'):''}</span><span>${icon('settings')} Cấu hình v${d.configVersion}</span><span>${icon('file')} Lượt xử lý ${d.version}</span></div>
    <div class="tab-bar detail-tabs">${[['overview','Tổng quan'],['documents','Tài liệu'],['issues','Đối soát & kiểm duyệt'],['history','Lịch sử']].map(([key,label])=>`<button class="${state.tab===key?'selected':''}" data-tab="${key}">${label}${key==='documents'?`<span>${d.files.length}</span>`:''}</button>`).join('')}</div>
    ${d.change_request?`<div class="notice">${icon('warning')} ${e(d.change_request)}</div>`:''}${isFinal(d)?`<div class="notice ${d.status==='APPROVED_DOCUMENT'?'success':''}">${icon('shield')} ${d.status==='APPROVED_DOCUMENT'?'Hồ sơ đã phê duyệt. Nội dung được khóa cho đến khi mở lại.':'Hồ sơ đã bị từ chối. Xem lý do trong lịch sử kiểm duyệt.'}${d.status==='APPROVED_DOCUMENT'&&can('dossier:reopen')?button('Mở lại hồ sơ','reopen','','subtle small'):''}</div>`:''}
    ${state.tab==='overview'?dossierOverview(d):state.tab==='documents'?documentReview(d):state.tab==='issues'?issuePanel(d):historyPanel(d)}`;
}
function dossierOverview(d) {
  const ready=d.checklist.filter(c=>['EXTRACTED','NOT_REQUIRED'].includes(c.status)).length;
  const batches=[...new Set(d.files.map(f=>f.batch))];
  return `<div class="detail-grid"><section class="panel">${panelHeading('Danh mục giấy tờ','Checklist theo phiên bản cấu hình của hồ sơ',`<span class="count-label">${ready}/${d.checklist.length}</span>`)}${d.checklist.map(item=>`<div class="checklist-row"><span class="checklist-icon ${item.status==='EXTRACTED'?'green':''}">${icon(item.status==='EXTRACTED'?'check':'file')}</span><span class="checklist-content"><strong>${e(item.name)}</strong><small>${item.conditional?'Có điều kiện':item.required?'Bắt buộc':'Không bắt buộc'}${item.triggerReason?' · '+e(item.triggerReason):''}</small></span>${badge(item.status)}${item.conditional&&can('dossier:upload')&&!isFinal(d)?`<button class="icon-button" data-requirement="${e(live?item.id:item.code)}" aria-label="Đánh dấu không áp dụng cho ${e(item.name)}">${icon('close')}</button>`:''}</div>`).join('')}<div class="panel-bottom">${can('dossier:upload')&&!isFinal(d)?button('Thêm yêu cầu phát sinh','requirement','plus','subtle small'):'Checklist được cập nhật từ tài liệu trong hồ sơ.'}</div></section><aside class="panel">${panelHeading('Bước tiếp theo','Tiến độ của hồ sơ')}<div class="next-step"><span class="large-icon">${icon(d.status==='VALID_DOCUMENT'?'shield':d.status==='INVALID_DOCUMENT'?'warning':'folder')}</span><h3>${d.status==='VALID_DOCUMENT'?'Sẵn sàng kiểm duyệt':d.status==='APPROVED_DOCUMENT'?'Đã hoàn tất':d.status==='INVALID_DOCUMENT'?'Xử lý vấn đề đối soát':'Hoàn thiện tài liệu'}</h3><p>${d.status==='VALID_DOCUMENT'?'Đối chiếu nguồn, xử lý cảnh báo và ghi nhận quyết định cuối cùng.':d.status==='APPROVED_DOCUMENT'?'Đội ngũ tiếp tục quy trình nghiệp vụ nội bộ.':'Kiểm tra giấy tờ còn thiếu và các vấn đề cần xác minh.'}</p><button class="button primary" data-tab="${d.status==='VALID_DOCUMENT'||d.status==='INVALID_DOCUMENT'?'issues':'documents'}">${d.status==='VALID_DOCUMENT'||d.status==='INVALID_DOCUMENT'?'Xem kết quả đối soát':'Xem tài liệu'} ${icon('arrow')}</button></div></aside></div>
    <section class="panel batches">${panelHeading('Các đợt tiếp nhận','Bổ sung nhiều lần trên cùng một hồ sơ')}${batches.map(n=>{const files=d.files.filter(f=>f.batch===n);return `<div class="batch-row"><span class="file-icon">${icon('upload')}</span><strong>Đợt ${String(n).padStart(2,'0')}</strong><span>${files.length} tài liệu</span><span>${files.filter(f=>f.status==='EXTRACTED').length} đã trích xuất</span><small>Giữ nguyên tệp gốc và nguồn trang</small></div>`;}).join('')||empty('Chưa có đợt tiếp nhận','Thêm tài liệu để bắt đầu xử lý.','upload')}</section>`;
}
function documentReview(d) {
  const file=d.files.find(f=>f.id===state.doc)||d.files[0];
  if(file)state.doc=file.id;
  if(live&&file?.sourceFileId&&!file.sourcePages.includes(state.evidencePage))state.evidencePage=file.sourcePages[0]||1;
  const editing=can('dossier:correct')&&!isFinal(d)&&file?.status==='EXTRACTED';
  const original=file&&state.original.has(d.id+file.id);
  const evidencePage=state.evidencePage||1;
  const totalPages=Math.max(1,...(file?.sourcePages||[]),...(file?.fields||[]).map(f=>f.source?.page||1));
  return `<div class="review-layout"><aside class="panel document-list">${panelHeading('Tài liệu',`${d.files.length} tệp trong hồ sơ`)}${d.files.map(f=>`<button class="document-item ${f.id===file?.id?'selected':''}" data-doc="${f.id}">${icon('file')}<span><strong>${e(f.name)}</strong><small>Đợt ${f.batch} · ${e(f.typeName||'Chưa phân loại')}</small>${badge(f.status)}</span></button>`).join('')||empty('Chưa có tài liệu','Thêm ảnh hoặc PDF.')}</aside>
    ${file?`${live?liveDocumentPreview(d,file,state,can):`<section class="document-preview"><div class="preview-toolbar"><span data-user-content>${icon('file')} ${e(file.name)}</span><span class="page-indicator" aria-live="polite">Trang ${evidencePage} / ${totalPages}</span></div><div class="preview-notice">Bản minh họa · Không phải tệp gốc hoặc kết quả OCR thực tế</div><div class="paper"><div class="paper-watermark">MẪU DEMO</div><div class="paper-emblem">✧</div><h4>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4><small>Độc lập – Tự do – Hạnh phúc</small><hr/><h3>${e(file.typeName||'TÀI LIỆU CHƯA PHÂN LOẠI')}</h3><div class="paper-fields">${(file.fields||[]).filter(f=>(f.source?.page||1)===evidencePage).map(f=>`<p tabindex="-1" class="evidence-target ${state.evidenceField===f.key?'source-highlight':''}" data-source-field="${e(f.key)}" aria-label="Bằng chứng ${e(f.label)} · Trang ${f.source?.page||1}"><span>${e(f.label)}</span><strong>${e(state.revealed.get(d.id+file.id+f.key)??f.value)}</strong></p>`).join('')||'<p>Tài liệu đang chờ phân loại / xử lý.</p>'}</div><div class="paper-signature"><small>Chỉ dùng minh họa giao diện</small><br/><span>DocSense AI demo</span></div></div><div class="preview-source">${icon('link')} ${file.sourceFileId?'Tệp dẫn xuất · nguồn trang '+e(file.sourcePages?.join(', ')):'Tệp gốc · lưu liên kết nguồn'}${can('dossier:image_view')?`<button class="text-link" data-action="view-original">${original?'Đã ghi nhận lượt xem':'Xem bản gốc (demo)'}</button>`:''}</div></section>`}
    <section class="panel extraction">${panelHeading('Dữ liệu trích xuất',live?'Kết quả trích xuất theo schema của doanh nghiệp':'Giá trị mẫu theo schema của doanh nghiệp')}<div class="form-body"><div class="extraction-meta"><span>${badge(file.status)}</span><small>Schema v${file.schema_version||d.configVersion} · ${e(live?file.model_version||'Chưa xử lý':'Model demo')}</small></div>${file.status==='FAILED'?`<div class="notice error">${icon('warning')} ${e(file.error||'Không đọc được tài liệu.')}</div>${can('dossier:upload')&&!isFinal(d)?button('Thử xử lý lại','retry','refresh','primary full'):''}`:''}
    ${!isFinal(d)&&can('dossier:classify')?`<label>Phân loại giấy tờ<select id="classify-select"><option value="">Chọn loại giấy tờ</option>${optionList(d.checklist.map(c=>({code:c.code,name:c.name})),live&&file.groups?.length===1?file.groups[0].document_type:file.typeCode,'name','code')}</select></label>${live?`<label>Nhóm tài liệu<select id="classify-group">${file.groups?.length===1?'':`<option value="">${file.groups?.length?'Chọn nhóm tài liệu':'Toàn bộ tệp'}</option>`}${(file.groups||[]).map(g=>`<option value="${e(g.id)}">${e(g.document_type)} · ${e(g.role)} · Trang ${e((g.pages||[]).join(', '))}</option>`).join('')}</select></label><label>Vai trò chủ thể<input id="classify-role" value="${e(file.groups?.length===1?file.groups[0].role||'':file.role||'')}" maxlength="80"/></label>`:''}${button('Xác nhận phân loại','classify','','full')}`:''}
    ${(file.fields||[]).map(f=>`<div class="field-row ${f.confidence<.8?'low-confidence':''} ${state.evidenceField===f.key?'is-focused':''}" data-evidence-field="${e(f.key)}"><div class="field-label"><button class="text-link" data-source="${e(f.key)}">${e(f.label)} ${f.pii?'<span class="pii-tag">PII</span>':''}</button><span class="confidence ${f.confidence<.8?'low':''}">${Math.round((f.confidence||0)*100)}%</span></div><div class="field-value"><span>${e(state.revealed.get(d.id+file.id+f.key)??f.value)}</span>${f.pii&&can('pii:view')?`<button class="icon-button" data-reveal="${e(f.key)}" aria-label="Hiện ${e(f.label)}">${icon('eye')}</button>`:''}${editing?`<button class="text-link" data-correct="${e(f.key)}">Sửa</button>`:''}</div><small>Trang ${f.source?.page||1} · ${e(f.source?.excerpt||'Nguồn mô phỏng')}</small></div>`).join('')}
    <div class="notice">${icon('shield')} Giá trị nhạy cảm được che mặc định. Thao tác hiện dữ liệu và xem bản gốc được ghi nhật ký.</div></div></section>`:empty('Chưa có tài liệu','Tải lên ảnh hoặc PDF để bắt đầu.','upload')}</div>`;
}
function issuePanel(d) {
  const issues=d.issues||[];
  const unresolved=issues.filter(i=>['OPEN','PENDING_DOCUMENTS'].includes(i.status));
  const approvable=d.status==='VALID_DOCUMENT'&&unresolved.length===0&&!d.checklist.some(c=>c.status==='PENDING_CONDITION'||c.required&&!['EXTRACTED','NOT_REQUIRED'].includes(c.status))&&can('dossier:review')&&(!live||session().role==='company_admin'||d.assigneeId===session().userId);
  return `<section class="panel">${panelHeading('Kết quả đối soát',live?'So sánh đúng nguồn, đúng đối tượng':'So sánh đúng nguồn, đúng đối tượng · Kết quả mô phỏng',`<span class="count-label">${unresolved.length} cần xử lý</span>`)}${issues.map(i=>`<div class="rule-row"><div class="rule-name"><span class="rule-icon ${i.severity}">${icon(i.status==='RESOLVED'?'check':i.status==='PENDING_DOCUMENTS'?'clock':'warning')}</span><div><strong>${e(i.name)}</strong><small>${e(i.message)}</small><span class="severity ${i.severity}">${e(i.severity)}</span></div></div><div class="rule-values"><div><small>${e(i.left?.label||'Nguồn thứ nhất')}</small><span>${e(i.left?.value||'Chưa có dữ liệu')}</span></div><span>↔</span><div><small>${e(i.right?.label||'Nguồn thứ hai')}</small><span>${e(i.right?.value||'Chưa có dữ liệu')}</span></div></div><div class="rule-action">${badge(i.status)}${i.status==='OPEN'&&i.severity==='WARNING'&&can('dossier:review')&&!isFinal(d)?`<button class="text-link" data-ack="${i.id}">Xác nhận cảnh báo</button>`:''}</div></div>`).join('')||empty('Chưa có kết quả đối soát','Quy tắc chỉ chạy khi đủ dữ liệu nguồn.','shield')}
    <div class="decision-panel"><div><h3>Quyết định kiểm duyệt</h3><p>${approvable?'Hồ sơ đã đủ điều kiện ghi nhận quyết định.':'Cần đủ tài liệu, không còn blocker, cảnh báo chưa xử lý hoặc quy tắc chờ dữ liệu.'}</p></div><div class="decision-actions">${can('dossier:review')&&!isFinal(d)&&(!live||session().role==='company_admin'||d.assigneeId===session().userId)?`${button('Yêu cầu bổ sung','supplement','','')}${button('Từ chối','reject','','danger')}<button class="button primary" data-action="approve" ${approvable?'':'disabled'}>${icon('shield')} Phê duyệt</button>`:'<span class="muted">'+(isFinal(d)?'Đã ghi nhận quyết định.':'Tài khoản không có quyền kiểm duyệt.')+'</span>'}</div></div></section>`;
}
function historyPanel(d) {
  return `<section class="panel">${panelHeading(live?'Lịch sử quyết định':'Lịch sử hồ sơ',live?'Quyết định theo người duyệt, thời gian và phiên bản':'Tiếp nhận, điều chỉnh và các quyết định được ghi nhận rõ ràng',live&&can('audit:read')?button('Xem nhật ký hồ sơ','dossier-audit','history'):'')}<div class="timeline">${(d.history||[]).toReversed().map(h=>`<div class="timeline-item"><span class="timeline-dot"></span><span class="timeline-action">${e(h.action)}</span><strong>${e(h.description)}</strong><p>${e(h.actor)} <span>·</span> ${dateTime(h.at)}</p></div>`).join('')||empty('Chưa có hoạt động','Các thay đổi sẽ xuất hiện tại đây.','history')}</div>${d.decisions?.length?`<div class="panel-bottom">${d.decisions.length} quyết định được lưu theo lượt xử lý.</div>`:''}</section>`;
}

function reviewQueue() {
  const rows=demo.listDossiers({status:'VALID_DOCUMENT',type:state.type});
  return `${heading('HÀNG ĐỢI KIỂM DUYỆT','Kiểm tra kỹ. Quyết định rõ.','Những hồ sơ đã đủ tài liệu và sẵn sàng để chuyên viên thẩm định.',`<span class="date-chip">${icon('shield')}${live?demo.pagination.total:rows.length} hồ sơ đang chờ</span>`)}<div class="queue-intro"><span class="large-icon">${icon('shield')}</span><p>Đối chiếu tài liệu gốc, xác minh cảnh báo và ghi nhận quyết định.<br/><strong>Mọi quyết định đều có người thực hiện, thời gian và lý do.</strong></p></div><div class="legal-grid">${rows.map(d=>`<article class="panel legal-card"><div class="legal-card-top"><span class="file-icon">${icon('folder')}</span>${badge(d.status)}</div><small>${e(d.reference)}</small><h2>${e(d.name)}</h2><p>${e(d.typeName)} · Cấu hình v${d.configVersion}</p><div class="legal-readiness"><span>${icon('check')} ${live?'Mở hồ sơ để xem checklist':d.checklist.filter(c=>c.status==='EXTRACTED').length+' giấy tờ đã trích xuất'}</span><span>${icon('warning')} ${live?'Ưu tiên '+d.priority:d.issues.filter(i=>i.status==='OPEN').length+' vấn đề cần xác minh'}</span></div><div class="legal-card-bottom"><span class="assignee">${avatar(assigneeName(d.assigneeId),1)} ${e(assigneeShort(d.assigneeId))}</span><button class="button primary" data-review="${d.id}">Kiểm tra ${icon('arrow')}</button></div></article>`).join('')||empty('Hàng đợi đã trống','Không có hồ sơ chờ duyệt trong phạm vi truy cập.','check')}</div>${pagination()}`;
}
function memberPage() {
  const list=members().filter(m=>(m.name+' '+m.email).toLowerCase().includes(state.search.toLowerCase()));
  return `${heading('ĐỘI NGŨ DOANH NGHIỆP','Đúng người, đúng công việc.','Quản lý tài khoản, vai trò và quyền truy cập trong công ty.',button('Thêm thành viên','invite','plus','primary'))}<section class="panel">${panelHeading('Thành viên công ty',`${members().filter(m=>m.status==='active').length} tài khoản đang hoạt động`)}<div class="table-wrap"><table><thead><tr><th>THÀNH VIÊN</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>HỒ SƠ PHỤ TRÁCH</th><th>THAO TÁC</th></tr></thead><tbody>${list.map((m,i)=>`<tr><td><span class="assignee">${avatar(m.name,i)}<span><strong data-user-content>${e(m.name)}</strong><small>${e(m.email)}</small></span></span></td><td>${e(roles[m.role])}</td><td>${badge(m.status)}</td><td>${live?'—':demo.listDossiers().filter(d=>d.assigneeId===m.id).length+' hồ sơ'}</td><td><button class="button small" data-member="${m.id}">Cập nhật quyền</button></td></tr>`).join('')}</tbody></table></div></section><div class="notice">${icon('shield')} Tài khoản thuộc một công ty. Chỉ quản trị công ty được thêm thành viên và thay đổi quyền.</div>`;
}

function catalogPage() {
  const isDoc=state.catalog==='documents';
  const list=isDoc?demo.listDocumentTypes():demo.listDossierTypes();
  const selected=list.find(t=>t.code===state.catalogCode)||list[0];
  state.catalogCode=selected?.code||null;
  const aiHint=!live?'Đăng nhập tài khoản công ty để dùng gợi ý AI.':session().role!=='company_admin'?'Chỉ quản trị công ty được dùng gợi ý AI.':'';
  const aiButton=(label,action,hint=aiHint)=>`<button class="button ai-suggest-button" data-action="${action}" ${hint?'disabled':''} title="${e(hint)}">${icon('sparkles')}${e(label)}</button>`;
  return `${heading('CẤU HÌNH THEO DOANH NGHIỆP','Quy trình của công ty bạn.','Bộ hồ sơ → giấy tờ → trường trích xuất. Thay đổi cấu hình tạo phiên bản mới.',button(isDoc?'Thêm loại giấy tờ':'Thêm loại bộ hồ sơ','create-catalog','plus','primary')+aiButton('Gợi ý bằng AI','suggest-catalog')+(isDoc?'':aiButton('Gợi ý quy tắc bằng AI','suggest-rules',aiHint||(!selected?'Lưu loại hồ sơ trước khi gợi ý quy tắc đối soát.':''))))}<div class="tab-bar catalog-tabs"><button class="${!isDoc?'selected':''}" data-catalog="dossiers">${icon('folder')} Loại bộ hồ sơ <span>${demo.listDossierTypes().length}</span></button><button class="${isDoc?'selected':''}" data-catalog="documents">${icon('file')} Loại giấy tờ <span>${demo.listDocumentTypes().length}</span></button></div><div class="catalog-layout"><aside class="panel catalog-tree"><div class="nav-label">${isDoc?'DANH MỤC GIẤY TỜ':'DANH MỤC BỘ HỒ SƠ'}</div>${list.map(t=>`<button class="catalog-node ${t.code===selected?.code?'selected':''}" data-catalog-code="${e(t.code)}">${icon(isDoc?'file':'folder')}<span><strong>${e(t.name)}</strong><small>v${t.version} · ${isDoc?t.fields.length+' trường':t.documents.length+' loại giấy tờ'}</small></span>${icon('arrow')}</button>`).join('')||empty('Chưa có cấu hình','Thêm một loại mới để bắt đầu.','settings')}</aside><section class="panel">${selected?`${panelHeading(`<span data-user-content>${e(selected.name)}</span>`,selected.description?`<span data-user-content>${e(selected.description)}</span>`:'Cấu hình nghiệp vụ của doanh nghiệp',`<span class="version-badge">Phiên bản ${selected.version}</span>${button('Chỉnh sửa','edit-catalog','settings','small')}${live?button('Ngừng sử dụng','archive-catalog','','small'):''}`)}<div class="config-code">Mã cấu hình <code>${e(selected.code)}</code><span>Do hệ thống sinh · không thay đổi khi đổi tên</span></div>${isDoc?`<div class="table-wrap"><table class="field-table"><thead><tr><th>TRƯỜNG TRÍCH XUẤT</th><th>KIỂU DỮ LIỆU</th><th>BẮT BUỘC</th><th>PII</th></tr></thead><tbody>${selected.fields.map(f=>`<tr><td><strong>${e(f.label)}</strong><small>${e(f.key)}</small></td><td>${e(f.type)}</td><td>${f.required?'Có':'Không'}</td><td>${f.pii?'<span class="pii-tag">Nhạy cảm</span>':'—'}</td></tr>`).join('')}</tbody></table></div><div class="config-section"><h3>Yêu cầu kiểm tra đặc biệt</h3>${selected.specialRequirements?.map(r=>`<p>${icon('shield')} ${e(typeof r==='string'?r:r.description||r.name)}</p>`).join('')||'<p class="muted">Chưa cấu hình yêu cầu đặc biệt.</p>'}</div>`:`<div class="config-section"><h3>Giấy tờ trong bộ hồ sơ</h3>${selected.documents.map(doc=>{const type=demo.listDocumentTypes().find(t=>t.code===doc.code);return `<div class="config-row"><span class="file-icon">${icon('file')}</span><div><strong>${e(type?.name||doc.code)}</strong><small>${doc.conditional?'Điều kiện: '+e(doc.triggerReason||'Cần xác định'):doc.required?'Bắt buộc':'Không bắt buộc'}</small></div><span class="badge ${doc.conditional?'PENDING_CONDITION':'EXTRACTED'}"><i></i>${doc.conditional?'Có điều kiện':doc.required?'Bắt buộc':'Tùy chọn'}</span></div>`;}).join('')}</div><div class="config-section"><h3>Luật đối soát <span class="count-label">${selected.rules.length}</span></h3>${selected.rules.map(r=>`<div class="catalog-rule"><span>${icon('shield')}</span><div><strong>${e(r.name)}</strong><small>${e(r.operator)} · ${e(r.severity)}</small><p>${e(r.leftType)}.${e(r.leftField)} ↔ ${e(r.rightType)}.${e(r.rightField)}</p></div></div>`).join('')||'<p class="muted">Chưa có luật đối soát.</p>'}</div>`}<div class="panel-bottom">${icon('history')} Hồ sơ hiện có giữ snapshot cấu hình khi được tạo.</div>`:empty('Chưa có loại cấu hình','Tạo cấu hình đầu tiên cho doanh nghiệp.','settings')}</section></div><div class="notice">${icon('help')} ${aiHint||'Gợi ý AI là bản nháp. Rà soát và lưu phiên bản để áp dụng.'}</div>`;
}
function auditPage() {
  const rows=demo.audit({action:state.auditAction,search:state.search});
  const actions=[...new Set([...(live?['LOGIN','COMPANY_REGISTERED','USER_CREATED','USER_ACCESS_UPDATED','DOSSIER_CREATED','DOSSIER_ASSIGNED','FILES_UPLOADED','FIELD_CORRECTED','VIEW_PII','VIEW_FILE','DOSSIER_REVIEWED','DOSSIER_REOPENED']:[]),state.auditAction,...demo.audit().map(r=>r.action)])].filter(Boolean);
  return `${heading('NHẬT KÝ HOẠT ĐỘNG','Mỗi thay đổi đều có dấu vết.','Theo dõi thao tác, quyết định và lượt xem dữ liệu nhạy cảm trong công ty.',live?button('Lọc nhật ký','audit-filters','settings'):'' )}<section class="panel"><div class="toolbar"><label class="search-box">${icon('search')}<input id="audit-search" value="${e(state.search)}" placeholder="${live?'Tìm trong trang nhật ký hiện tại…':'Tìm hồ sơ, người thực hiện, nội dung…'}" aria-label="Tìm nhật ký"/></label><select id="audit-action" class="filter-select" aria-label="Lọc hành động"><option value="">Tất cả hành động</option>${actions.map(a=>`<option ${state.auditAction===a?'selected':''}>${e(a)}</option>`).join('')}</select><span class="muted">${rows.length} hoạt động</span></div><div id="audit-results">${auditRows(rows)}</div><div class="panel-bottom">${icon('shield')} ${live?'Nhật ký chỉ đọc, được lưu theo doanh nghiệp.':'Nhật ký chỉ đọc trong bản demo.'}</div>${pagination()}</section>`;
}
function auditRows(rows) { return rows.map(row=>`<div class="audit-row"><span class="audit-icon">${icon(row.action.includes('PII')?'eye':row.action.includes('REVIEW')?'shield':'history')}</span><div class="audit-description"><span class="audit-action">${e(row.action)}</span><strong>${e(row.description)}</strong><small>${e(row.actor)} ${row.reference?' · '+e(row.reference):''}</small></div><time>${dateTime(row.at)}</time>${row.dossierId?`<button class="icon-button" data-open="${row.dossierId}" aria-label="Mở hồ sơ">${icon('arrow')}</button>`:''}</div>`).join('')||empty('Chưa có hoạt động phù hợp','Các thao tác trong công ty sẽ được ghi nhận tại đây.','history'); }
function connectionPage() {
  return `${heading('TÍCH HỢP BACKEND','Kết nối rõ ràng, đúng hiện trạng.','Đối chiếu source Go và OpenAPI trước khi kết nối tính năng.',`<button class="button primary ${state.healthLoading?'is-loading':''}" data-action="health" aria-busy="${state.healthLoading}" ${state.healthLoading?'disabled':''}>${state.healthLoading?'<span class="loading-indicator" aria-hidden="true"></span>':icon('refresh')}${state.healthLoading?'Đang kiểm tra…':'Kiểm tra kết nối'}</button>`)}<div class="connection-grid"><section class="panel">${panelHeading('Dịch vụ Go backend','Kiểm tra liveness của tiến trình HTTP')}<div class="health-state ${state.health?'success':state.healthError?'error':''}"><span class="large-icon">${icon(state.health?'check':state.healthError?'warning':'link')}</span><h2>${state.health?'Backend đang hoạt động':state.healthError?'Chưa kết nối được':'Chưa kiểm tra kết nối'}</h2><p>${state.health?'GET /health trả dữ liệu đúng OpenAPI.':state.healthError?e(state.healthError):'Bấm kiểm tra để gọi endpoint thật qua proxy cùng origin.'}</p>${state.health?`<code>${e(JSON.stringify({code:state.health.code,message:state.health.message,data:state.health.data}))}</code><small>Request ID: ${e(state.health.requestId||'Không có')}<br/>${dateTime(state.health.checkedAt)}</small>`:''}</div><div class="panel-bottom">Liveness không xác nhận PostgreSQL hay OCR đã sẵn sàng.</div></section><section class="panel">${panelHeading('Phạm vi API đã kiểm chứng','Theo docs/api/api_spec.json của backend')}<div class="endpoint-row"><span class="method">GET</span><code>/health</code><span class="badge EXTRACTED"><i></i>Đã triển khai</span></div>${[['Auth & thành viên','Đăng ký, đăng nhập, tài khoản'],['Hồ sơ & tài liệu','Catalog, upload, phân loại, OCR'],['Kiểm duyệt & audit','Đối soát, PII, quyết định, nhật ký'],['Dashboard','Thống kê trạng thái theo thời gian']].map(([title,sub])=>`<div class="capability-row"><div><strong>${title}</strong><small>${sub}</small></div><span class="badge EXTRACTED"><i></i>Đã triển khai</span></div>`).join('')}<div class="panel-bottom">API nghiệp vụ theo commit 1a3ee15. Worker/OCR cần cấu hình AI trên backend.</div></section></div>`;
}

function authPage() {
  document.title = (state.page === 'signup' ? 'Đăng ký' : 'Đăng nhập') + ' · DocSense AI';
  return renderAuthPage({page:state.page,mode,companies,roles});
}

function closeMobileMenu() {
  if(!state.mobile)return;
  clearTimeout(mobileCloseTimer);
  const drawer=document.querySelector('.sidebar');drawer?.classList.add('closing');drawer?.classList.remove('open');
  document.querySelector('.mobile-backdrop')?.classList.add('closing');
  const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:220;
  mobileCloseTimer=setTimeout(()=>{state.mobile=false;render();document.querySelector('.mobile-toggle')?.focus({preventScroll:true});},delay);
}
function focusEvidence(key) {
  const file=getDossier()?.files.find(item=>item.id===state.doc);const field=file?.fields.find(item=>item.key===key);if(!field)return;
  const page=field.source?.page||1;state.evidenceField=key;
  if(state.evidencePage!==page||live){state.evidencePage=page;render();}
  document.querySelectorAll('[data-source-field]').forEach(el=>el.classList.toggle('source-highlight',el.dataset.sourceField===key));
  document.querySelectorAll('[data-evidence-field]').forEach(el=>el.classList.toggle('is-focused',el.dataset.evidenceField===key));
  const target=[...document.querySelectorAll('[data-source-field]')].find(el=>el.dataset.sourceField===key);
  target?.focus({preventScroll:true});target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
}
function route() {
  const [path,query='']=location.hash.replace(/^#\/?/,'').split('?');const [page,id]=path.split('/');
  state.page=page||(session()&&!can('dashboard:read')?'dossiers':'dashboard');state.id=id||null;state.tab=new URLSearchParams(query).get('tab')||'overview';state.doc=null;state.evidencePage=1;state.evidenceField=null;state.mobile=false;clearTimeout(mobileCloseTimer);state.revealed.clear();state.original.clear();clearPreview();
  if(!session()&&!['login','signup'].includes(state.page))state.page='login';
  if(session()&&['login','signup'].includes(state.page))state.page=can('dashboard:read')?'dashboard':'dossiers';
  reload();window.scrollTo(0,0);
}
function navigate(page,id=null,tab=null) { const next=`#/${page}${id?'/'+encodeURIComponent(id):''}${tab?'?tab='+tab:''}`;if(location.hash!==next)history.pushState(null,'',next);route(); }
function resetFilters() {state.search='';state.status='';state.type='';state.assignee='';state.from='';state.to='';state.metric='current';state.offset=0;state.auditAction='';state.auditActor='';state.auditResource='';state.auditDossier='';state.auditFrom='';state.auditTo='';}
function clearPreview() { if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;state.previewMime=null; }
async function reload({background=false}={}) {
  clearTimeout(pollTimer);clearTimeout(searchTimer);loadController?.abort();
  const sequence=++loadSequence;state.error=null;
  if(!live||!session()||state.page==='connection'){state.loading=false;render();return;}
  const permission=navItems.find(([page])=>page===state.page)?.[3];
  if(permission&&!can(permission)){state.loading=false;render();return;}
  loadController=new AbortController();
  if(!background){state.loading=true;render();}
  try {
    const loaded=await demo.load({...state},{signal:loadController.signal,background,accept:()=>!background||!document.querySelector('.modal')});
    if(sequence!==loadSequence||!session())return;
    if(!loaded){schedulePoll();return;}
    state.loading=false;state.revealed.clear();render();schedulePoll();
  } catch(error) {
    if(sequence!==loadSequence||!session())return;
    state.loading=false;state.error=error.message+(error.requestId?' · Request ID: '+error.requestId:'');clearPreview();state.revealed.clear();render();
  }
}
function schedulePoll() {
  if(!live||!session()||state.page!=='detail'||!getDossier()?.files.some(file=>['UPLOADED','PROCESSING'].includes(file.status)))return;
  pollTimer=setTimeout(()=>{if(document.hidden||document.querySelector('.modal')){schedulePoll();return;}reload({background:true});},3000);
}
async function refresh(message) {state.revealed.clear();clearPreview();await reload();if(message)notify(message);}
function guarded(fn) {try{return fn();}catch(error){notify(error.message);}}
const formLabel=(label,name,value='',extra='')=>`<label>${label}<input name="${name}" value="${e(value)}" ${extra}/></label>`;
const roleOptions=role=>Object.entries(roles).filter(([r])=>r!=='platform_admin').map(([r,l])=>`<option value="${r}" ${role===r?'selected':''}>${e(l)}</option>`).join('');
const localInputTime = value => {if(!value)return '';const date=new Date(value);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16);};
function editCatalog(create=false,startWithAi=false) {
  const kind=state.catalog;
  const list=kind==='documents'?demo.listDocumentTypes():demo.listDossierTypes();
  const selected=create?null:list.find(t=>t.code===state.catalogCode);
  openCatalogEditor({demo,kind,selected,startWithAi,onSaved:async saved=>{state.catalogCode=saved.code;await refresh('Đã lưu phiên bản cấu hình. Hồ sơ hiện có giữ nguyên snapshot.');}});
}
function suggestCatalog(rulesOnly=false) {
  if(!live||session().role!=='company_admin')throw new Error('Đăng nhập tài khoản công ty để dùng gợi ý AI.');
  const kind=state.catalog;
  if(kind==='documents')return editCatalog(true,true);
  if(rulesOnly)return editCatalog(false,true);
  modal('Gợi ý cấu hình bằng AI','Gợi ý là bản nháp. Rà soát trước khi lưu phiên bản.','<label>Mô tả nhu cầu<textarea name="description" required maxlength="4000"></textarea></label>','Tạo bản nháp',async input=>{
    const draft=await demo.suggestCatalog(kind,input.get('description').trim());
    if(!draft?.draft)throw new Error('Backend không trả bản nháp hợp lệ.');
    const item=catalogView({current_version:0,definition:draft.definition},kind);
    closeModal();
    openCatalogEditor({demo,kind,selected:item,onSaved:async saved=>{state.catalogCode=saved.code;await refresh('Đã lưu phiên bản cấu hình.');}});
  });
}

function uploadDialog() {
  if(live)return liveUploadDialog();
  const d=getDossier();if(!d||isFinal(d))return;
  let completed=false;
  const progressRow=(file,index)=>`<div class="upload-progress-item" data-upload-index="${index}"><div class="upload-progress-header">${icon('file')}<strong>${e(file.name)}</strong><span class="upload-progress-count">0%</span></div><div class="upload-progress-track" role="progressbar" aria-label="Tiến trình cục bộ ${e(file.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div><small class="upload-stage">Chờ tiếp nhận · ${(file.size/1024/1024).toFixed(2)} MiB</small></div>`;
  const form=modal('Tiếp nhận tài liệu',`${d.reference} · Thêm đợt tiếp nhận vào cùng hồ sơ`,`<label class="dropzone" id="dropzone">${icon('upload')}<strong>Kéo thả hoặc chọn tệp</strong><span>PDF, JPG, PNG · tối đa 20 MiB/tệp · 10 tệp/đợt</span><input type="file" name="files" id="upload-files" accept="application/pdf,image/jpeg,image/png" multiple required/></label><div id="upload-file-list" class="upload-progress-list" aria-live="polite"></div><label id="upload-type-label">Loại giấy tờ<select name="documentTypeCode"><option value="">Chờ chuyên viên phân loại</option>${optionList(d.checklist.map(c=>({code:c.code,name:c.name})),'','name','code')}</select></label><div class="notice">${icon('help')} Tiến trình xử lý cục bộ: đọc tệp, kiểm tra định dạng và nội dung trùng. Đây là bản mô phỏng, không gửi tệp lên server hoặc thực hiện OCR.</div>`,'Tiếp nhận mô phỏng',async data=>{
    if(completed)return;
    const files=data.getAll('files').filter(file=>file.size);
    if(!files.length)throw new Error('Chọn ít nhất một tệp không rỗng.');
    if(files.length>10)throw new Error('Tối đa 10 tệp trong một đợt tiếp nhận.');
    form.querySelector('#upload-file-list').innerHTML=files.map(progressRow).join('');
    const result=await demo.upload(d.id,files,data.get('documentTypeCode'),{onProgress:async progress=>{
      if(!form.isConnected)return;
      const row=form.querySelector(`[data-upload-index="${progress.index}"]`);if(!row)return;
      row.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(progress.percent));
      row.querySelector('.upload-progress-track > i').style.width=progress.percent+'%';
      row.querySelector('.upload-progress-count').textContent=progress.percent+'%';
      row.querySelector('.upload-stage').textContent=progress.error||progress.stage;
      row.classList.toggle('progress-error',Boolean(progress.error));row.classList.toggle('progress-complete',progress.percent===100&&!progress.error);
      // Let the browser paint completed work; percentages are local milestones,
      // never network transfer or OCR progress.
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }});
    completed=true;const errors=result.filter(item=>item.error);
    state.tab='documents';state.doc=result.find(item=>item.success)?.id||null;render();
    form.querySelector('#dropzone').hidden=true;form.querySelector('#upload-type-label').hidden=true;
    form.querySelector('.modal-footer').innerHTML='<button class="button primary" type="button" data-action="close-modal">Hoàn tất</button>';
    const summary=document.createElement('p');summary.className='upload-result-summary';summary.setAttribute('role','status');summary.textContent=`Đã hoàn tất mô phỏng: ${result.length-errors.length}/${result.length} tệp được tiếp nhận${errors.length?', '+errors.length+' tệp cần kiểm tra lại':''}.`;
    form.querySelector('#upload-file-list').append(summary);
    form.querySelector('[data-action="close-modal"]').focus();
    notify(errors.length?'Một số tệp chưa được tiếp nhận. Xem chi tiết trong tiến trình.':'Đã tiếp nhận đợt tài liệu mô phỏng.');
  });
  const input=form.querySelector('#upload-files');const zone=form.querySelector('#dropzone');
  const preview=()=>{form.querySelector('#upload-file-list').innerHTML=[...input.files].map(progressRow).join('');};
  input.onchange=preview;zone.ondragover=event=>{if(input.disabled)return;event.preventDefault();zone.classList.add('dragging');};zone.ondragleave=()=>zone.classList.remove('dragging');zone.ondrop=event=>{event.preventDefault();zone.classList.remove('dragging');if(input.disabled)return;input.files=event.dataTransfer.files;preview();};
}
function liveUploadDialog() {
  const d=getDossier();if(!d||isFinal(d))return;
  let complete=false;
  const form=modal('Tiếp nhận tài liệu',d.name,`<label class="dropzone">${icon('upload')}<strong>Chọn tài liệu</strong><span>PDF, JPG, PNG · giới hạn theo cấu hình máy chủ</span><input type="file" name="files" multiple required accept="application/pdf,image/jpeg,image/png"/></label><label>Loại giấy tờ<select name="type"><option value="">Tự động phân loại</option>${optionList(d.checklist,'','name','code')}</select></label><label>Vai trò chủ thể<input name="role" maxlength="80" placeholder="Vai trò theo cấu hình hồ sơ"/></label><label>Thay thế tệp lỗi<select name="replacement"><option value="">Thêm tài liệu mới</option>${optionList(d.files.filter(file=>file.status==='FAILED'),'')}</select></label><p class="muted">Kết quả tiếp nhận được trả riêng từng tệp. Trích xuất tiếp tục ở máy chủ.</p><div id="upload-results" aria-live="polite"></div>`,'Tải tài liệu lên',async data=>{
    if(complete)return;
    const files=data.getAll('files').filter(file=>file.size);
    if(!files.length)throw new Error('Chọn ít nhất một tệp không rỗng.');
    if(data.get('replacement')&&files.length!==1)throw new Error('Chọn một tệp khi thay thế tài liệu lỗi.');
    const results=await demo.upload(d.id,files,data.get('type'),{role:data.get('role').trim(),replacesFileId:data.get('replacement')});
    complete=true;
    form.querySelector('#upload-results').innerHTML=results.map(result=>`<div class="upload-progress-item ${result.error?'progress-error':'progress-complete'}"><strong>${e(result.name)}</strong>${badge(result.status)}${result.error?`<p>${e(result.error)}</p>`:''}</div>`).join('');
    form.querySelectorAll('label').forEach(label=>label.hidden=true);
    form.querySelector('.modal-footer').innerHTML='<button class="button primary" type="button" data-action="close-modal">Hoàn tất</button>';
    state.tab='documents';await refresh('Đã nhận kết quả tải tài liệu.');
  });
}
function decisionDialog(decision) {
  const d=getDossier();const labels={APPROVE:'Phê duyệt hồ sơ',REJECT:'Từ chối hồ sơ',SUPPLEMENT:'Yêu cầu bổ sung'};
  modal(labels[decision],`${d.reference} · ${d.name}`,`<p>Ghi nhận người thực hiện, thời gian, quyết định và lý do trong lượt xử lý ${d.version}.</p><label>${decision==='APPROVE'?'Kết luận kiểm duyệt':'Lý do / nội dung cần bổ sung'}<textarea name="reason" required maxlength="1000" placeholder="Nhập nội dung rõ ràng để đội ngũ theo dõi…"></textarea></label><div class="notice">${icon('help')} ${live?'Quyết định được lưu theo người duyệt và phiên bản hồ sơ.':'Quyết định trong bản demo không có giá trị xác thực pháp lý.'}</div>`,'Xác nhận quyết định',async data=>{await demo.review(d.id,decision,data.get('reason').trim());closeModal();refresh(live?'Đã lưu quyết định kiểm duyệt.':'Đã lưu quyết định kiểm duyệt mô phỏng.');});
}
const actions={
  'close-modal':requestCloseModal,
  reload:()=>reload(),
  'enter-demo':()=>{const url=new URL(location.href);url.searchParams.set('mode','demo');url.hash='/dashboard';location.assign(url);},
  mobile:()=>{if(state.mobile){closeMobileMenu();return;}state.mobile=true;render();requestAnimationFrame(()=>document.querySelector('.sidebar nav button')?.focus());},
  account:()=>modal('Tài khoản hiện tại',`${session().name} · ${company()?.name}`,`<div class="account-role">${avatar(session().name,1)}<div><strong>${e(roles[session().role])}</strong><p>Tài khoản thuộc duy nhất công ty hiện tại.</p></div></div><div class="notice">${live?'Đăng xuất xóa phiên trên trình duyệt. Backend chưa có API thu hồi token.':'Để trải nghiệm công ty hoặc vai trò khác, đăng xuất và chọn tài khoản demo khác.'}</div>`,'Đăng xuất',()=>{apiClient.clearSession();demo.logout();closeModal();state.revealed.clear();state.original.clear();resetFilters();navigate('login');}),
  guide:()=>modal('Một quy trình, rõ từng bước','Từ tài liệu đầu tiên đến quyết định cuối cùng.','<ol class="help-list"><li>Tạo hồ sơ từ loại bộ hồ sơ của công ty.</li><li>Tiếp nhận tài liệu theo nhiều đợt; xem trạng thái riêng từng tệp.</li><li>Chuyên viên phân loại, kiểm tra trích xuất và sửa có lý do.</li><li>Xử lý sai lệch và xác nhận cảnh báo.</li><li>Ghi quyết định duyệt, từ chối hoặc yêu cầu bổ sung.</li><li>Theo dõi nhật ký, lịch sử trạng thái và lượt xem PII.</li></ol><div class="notice">Hồ sơ theo phiên bản cấu hình; xử lý tệp và kiểm duyệt có nhật ký theo dõi.</div>','Đã hiểu',closeModal),
  notifications:()=>modal('Công việc trong không gian',company()?.name,live?'<p>Mở danh sách để xem hồ sơ trong phạm vi được cấp quyền.</p>':`<p>${count('VALID_DOCUMENT')} hồ sơ chờ kiểm duyệt.</p><p>${count('MISSING_DOCUMENT')} hồ sơ thiếu giấy tờ.</p><p>${count('INVALID_DOCUMENT')} hồ sơ có sai lệch.</p>`,'Xem hồ sơ',()=>{closeModal();resetFilters();navigate('dossiers');}),
  create:()=>modal('Tạo hồ sơ mới','Checklist được tạo từ phiên bản cấu hình hiện tại.',`${formLabel('Tên gợi nhớ của hồ sơ','name','','required maxlength="100" placeholder="Ví dụ: Căn hộ Thảo Điền – Nguyễn Văn An"')}<label>Loại bộ hồ sơ<select name="typeCode" required>${optionList(demo.listDossierTypes().filter(t=>t.active!==false),'','name','code')}</select></label>${can('dossier:assign')?`<label>Chuyên viên phụ trách<select name="assigneeId"><option value="">Chưa phân công</option>${optionList(members().filter(m=>m.status==='active'&&['legal_specialist','company_admin'].includes(m.role)),'')}</select></label>`:''}${live?'<label>Độ ưu tiên<input name="priority" type="number" min="0" max="5" value="0" required/></label>':''}`,'Tạo hồ sơ',async data=>{const d=await demo.createDossier({name:data.get('name').trim(),typeCode:data.get('typeCode'),assigneeId:data.get('assigneeId')||null,priority:data.get('priority')||0});closeModal();navigate('detail',d.id);notify(d.assignmentError||'Đã tạo hồ sơ mới.');}),
  upload:uploadDialog,
  assign:()=>{const d=getDossier();modal('Phân công hồ sơ',d.reference,`${live&&session().role!=='company_admin'?formLabel('Người phụ trách (ID)','assigneeId',d.assigneeId||'','placeholder="UUID; để trống để bỏ phân công"'):`<label>Người phụ trách<select name="assigneeId"><option value="">Chưa phân công</option>${optionList(members().filter(m=>m.status==='active'&&m.role!=='broker'),d.assigneeId)}</select></label>`}${live?formLabel('Độ ưu tiên','priority',d.priority,'type="number" min="0" max="5" required'):''}`,'Lưu phân công',async data=>{await demo.assign(d.id,data.get('assigneeId'),live?data.get('priority'):undefined);closeModal();refresh('Đã cập nhật người phụ trách.');});},
  classify:async()=>{const d=getDossier();const groupId=document.querySelector('#classify-group')?.value||null;if(live&&d.files.find(file=>file.id===state.doc)?.groups.length>1&&!groupId)throw new Error('Chọn nhóm tài liệu trước khi xác nhận phân loại.');const typeCode=document.querySelector('#classify-select').value;if(!typeCode)throw new Error('Chọn loại giấy tờ trước khi xác nhận.');await demo.classifyFile(d.id,state.doc,typeCode,document.querySelector('#classify-role')?.value||'',groupId);await refresh(live?'Đã gửi yêu cầu phân loại và trích xuất lại.':'Đã phân loại và trích xuất lại bằng dữ liệu mô phỏng.');},
  retry:async()=>{await demo.retryFile(state.id,state.doc);await refresh(live?'Đã đưa tệp vào hàng đợi xử lý lại.':'Đã thử xử lý lại tệp bằng dữ liệu mô phỏng.');},
  'view-original':async()=>{const id=state.id,doc=state.doc;const blob=await demo.viewOriginal(id,doc);if(state.id!==id||state.doc!==doc||!session())return;if(live){clearPreview();state.previewUrl=URL.createObjectURL(blob);state.previewMime=blob.type;}state.original.add(id+doc);render();notify(live?'Đã mở tài liệu và ghi nhật ký lượt xem.':'Đã ghi audit lượt xem. Khung tài liệu vẫn là bản minh họa.');},
  approve:()=>decisionDialog('APPROVE'),reject:()=>decisionDialog('REJECT'),supplement:()=>decisionDialog('SUPPLEMENT'),
  reopen:()=>modal('Mở lại hồ sơ đã duyệt',getDossier().reference,'<label>Lý do mở lại<textarea name="reason" required maxlength="1000"></textarea></label><div class="notice">Hồ sơ cần được kiểm tra và phê duyệt lại. Quyết định cũ vẫn nằm trong lịch sử.</div>','Xác nhận mở lại',async data=>{await demo.reopen(state.id,data.get('reason').trim());closeModal();refresh('Đã mở lượt xử lý mới.');}),
  requirement:()=>{const d=getDossier();modal('Thêm yêu cầu phát sinh','Kích hoạt giấy tờ điều kiện thuộc snapshot cấu hình của hồ sơ.',`<label>Loại giấy tờ<select name="typeCode">${optionList(d.checklist.filter(c=>c.conditional&&c.status!=='EXTRACTED').map(c=>({code:live?c.id:c.code,name:c.name})),'','name','code')}</select></label><label>Lý do phát sinh<textarea name="reason" required></textarea></label>`,'Thêm yêu cầu',async data=>{await demo.addRequirement(d.id,live?d.checklist.find(c=>c.id===data.get('typeCode')).code:data.get('typeCode'),data.get('reason').trim(),live?d.checklist.find(c=>c.id===data.get('typeCode')).role:'');closeModal();refresh('Đã thêm giấy tờ vào checklist.');});},
  invite:()=>modal('Thêm thành viên công ty',live?'Tạo tài khoản đăng nhập cho thành viên công ty.':'Tạo tài khoản thành viên trong bản demo, không gửi email.',`${live?formLabel('Tên đăng nhập','username','','required minlength="3" maxlength="64" pattern="[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}"')+formLabel('Mật khẩu ban đầu','password','','required type="password" minlength="12" maxlength="72" autocomplete="new-password"'):''}${formLabel('Họ tên','name','','required maxlength="80"')}${formLabel('Email','email','','required type="email"')}<label>Vai trò<select name="role">${roleOptions('broker')}</select></label>`,'Tạo thành viên',async data=>{await demo.createMember({name:data.get('name').trim(),email:data.get('email').trim(),role:data.get('role'),username:data.get('username'),password:data.get('password')});closeModal();refresh(live?'Đã tạo tài khoản thành viên.':'Đã thêm thành viên mô phỏng.');}),
  'create-catalog':()=>editCatalog(true),'edit-catalog':()=>editCatalog(false),
  'suggest-catalog':()=>suggestCatalog(),'suggest-rules':()=>suggestCatalog(true),
  'archive-catalog':()=>modal('Ngừng sử dụng cấu hình',state.catalogCode,'<p>Hồ sơ hiện có giữ nguyên snapshot cấu hình.</p>','Ngừng sử dụng',async()=>{await demo.archiveCatalog(state.catalog,state.catalogCode);closeModal();state.catalogCode=null;await refresh('Đã ngừng sử dụng cấu hình.');}),
  'dossier-audit':()=>{const id=state.id;resetFilters();state.auditDossier=id;navigate('audit');},
  'audit-filters':()=>modal('Lọc nhật ký','Lọc theo người thực hiện, tài nguyên, hồ sơ và thời gian.',`${formLabel('ID người thực hiện','actor',state.auditActor||'')}${formLabel('ID tài nguyên','resource',state.auditResource||'')}${formLabel('ID hồ sơ','dossier',state.auditDossier||'')}${formLabel('Từ thời điểm','from',localInputTime(state.auditFrom),'type="datetime-local"')}${formLabel('Đến thời điểm','to',localInputTime(state.auditTo),'type="datetime-local"')}`,'Áp dụng',input=>{state.auditActor=input.get('actor').trim();state.auditResource=input.get('resource').trim();state.auditDossier=input.get('dossier').trim();state.auditFrom=input.get('from')?new Date(input.get('from')).toISOString():'';state.auditTo=input.get('to')?new Date(input.get('to')).toISOString():'';state.offset=0;closeModal();reload();}),
  'reset-filters':()=>{resetFilters();reload();},
  'list-dates':()=>dateFilters(false),'dashboard-filters':()=>dateFilters(true),
  health:async()=>{state.healthLoading=true;state.healthError=null;render();try{state.health=await checkHealth();}catch(error){state.health=null;state.healthError=error.message;}finally{state.healthLoading=false;render();}},
};
function dateFilters(dashboardMode) {
  modal(dashboardMode?'Bộ lọc thống kê':live?'Khoảng ngày chuyển trạng thái':'Khoảng ngày tạo hồ sơ',dashboardMode?'Khoảng ngày áp dụng cho lịch sử trạng thái; snapshot hiện tại không lọc theo ngày.':'Lọc trong múi giờ Việt Nam. Chế độ API dùng ngày chuyển trạng thái.',`<div class="form-grid"><label>Từ ngày<input type="date" name="from" value="${e(state.from)}"/></label><label>Đến ngày<input type="date" name="to" value="${e(state.to)}"/></label></div>${dashboardMode?`<label>Cách thống kê<select name="metric"><option value="current" ${state.metric==='current'?'selected':''}>Trạng thái hiện tại của hồ sơ</option><option value="transitions" ${state.metric==='transitions'?'selected':''}>Lượt chuyển vào trạng thái</option>${live?`<option value="unique" ${state.metric==='unique'?'selected':''}>Hồ sơ duy nhất theo trạng thái</option>`:''}</select></label><label>Loại bộ hồ sơ<select name="type"><option value="">Tất cả loại hồ sơ</option>${optionList(demo.listDossierTypes(),state.type,'name','code')}</select></label>`:''}`,'Áp dụng',data=>{if(data.get('from')&&data.get('to')&&data.get('from')>data.get('to'))throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');state.from=data.get('from');state.to=data.get('to');if(dashboardMode){state.metric=data.get('metric');state.type=data.get('type');}state.offset=0;closeModal();reload();});
}
function memberDialog(id) {
  const m=member(id);if(!m)return;
  const extras=live?m.permissions.filter(p=>!roleDefaults[m.role]?.includes(p)):m.permissions;
  const knownPermissions=['pii:view','dashboard:read','dossier:read',...(live?['dossier:read_all']:[]),'dossier:create','dossier:upload','dossier:assign','dossier:correct',...(live?[]:['dossier:classify']),'dossier:review','dossier:reopen','dossier:image_view','audit:read','catalog:manage',live?'user:manage':'users:manage'];
  modal('Cập nhật quyền truy cập',m.name,`<label>Vai trò<select name="role">${roleOptions(m.role)}</select></label><label>Trạng thái<select name="status">${[['active','Hoạt động'],['suspended','Tạm ngưng']].map(([v,l])=>`<option value="${v}" ${m.status===v?'selected':''}>${l}</option>`).join('')}</select></label>${live?'':`<label>Chuyển giao hồ sơ khi thu hồi quyền<select name="transferId"><option value="">Chọn người nhận nếu cần</option>${optionList(members().filter(x=>x.id!==m.id&&x.status==='active'&&['company_admin','legal_specialist'].includes(x.role)),'')}</select></label>`}<fieldset><legend>Quyền bổ sung (ngoài vai trò)</legend><div class="permissions-grid">${knownPermissions.map(p=>`<label class="checkbox-label"><input type="checkbox" name="permissions" value="${p}" ${extras?.includes(p)?'checked':''}/> ${p}</label>`).join('')}</div></fieldset><div class="notice">${live?'Quyền bổ sung cộng với quyền mặc định của vai trò. Chỉ bỏ chọn các quyền bổ sung không còn cần thiết.':'Quản trị công ty luôn có pii:view và dashboard:read. Quyền khác ở đây là cấu hình mô phỏng.'}</div>`,'Xác nhận thay đổi',async data=>{await demo.updateMember(id,{role:data.get('role'),status:data.get('status'),permissions:data.getAll('permissions'),transferId:data.get('transferId')||null});closeModal();refresh('Đã cập nhật thành viên.');});
}
document.addEventListener('click',async event=>{
  const el=event.target.closest('button');if(!el||el.disabled)return;
  try {
    if(el.dataset.action==='toggle-password'){const input=document.getElementById(el.dataset.target);if(input){input.type=input.type==='password'?'text':'password';el.setAttribute('aria-pressed',String(input.type==='text'));el.setAttribute('aria-label',(input.type==='text'?'Ẩn':'Hiện')+' mật khẩu');}return;}
    if(el.dataset.action){const result=actions[el.dataset.action]?.();if(result instanceof Promise){setButtonLoading(el,true);try{await result;}finally{if(el.isConnected)setButtonLoading(el,false);}}return;}
    if(el.dataset.auth){if(live&&!session())demo.logout();navigate(el.dataset.auth);return;}
    if(el.dataset.page){resetFilters();navigate(el.dataset.page);return;}
    if(el.dataset.open){navigate('detail',el.dataset.open);return;}
    if(el.dataset.review){navigate('detail',el.dataset.review,'issues');return;}
    if(el.dataset.tab){clearPreview();state.tab=el.dataset.tab;history.replaceState(null,'',`#/detail/${state.id}?tab=${state.tab}`);state.revealed.clear();render();return;}
    if(el.dataset.doc){clearPreview();state.doc=el.dataset.doc;state.evidencePage=1;state.evidenceField=null;state.revealed.clear();render();return;}
    if(el.hasAttribute('data-status')){state.status=el.dataset.status;state.offset=0;reload();return;}
    if(el.hasAttribute('data-stat')){state.status=el.dataset.stat;state.search='';state.offset=0;if(live&&state.metric==='current'){state.from='';state.to='';}navigate('dossiers');return;}
    if(el.dataset.chartStatus){state.status=el.dataset.chartStatus;state.from=el.dataset.chartDate;state.to=el.dataset.chartDate;state.metric=state.metric==='unique'?'unique':'transitions';state.offset=0;navigate('dossiers');return;}
    if(el.dataset.catalog){state.catalog=el.dataset.catalog;state.catalogCode=null;render();return;}
    if(el.dataset.catalogCode){state.catalogCode=el.dataset.catalogCode;render();return;}
    if(el.hasAttribute('data-offset')){state.offset=Number(el.dataset.offset);reload();return;}
    if(el.dataset.member){memberDialog(el.dataset.member);return;}
    if(el.dataset.reveal){const id=state.id,doc=state.doc;const value=await demo.reveal(state.id,state.doc,el.dataset.reveal);if(state.id!==id||state.doc!==doc||!session())return;state.revealed.set(state.id+state.doc+el.dataset.reveal,value);render();notify('Đã ghi nhật ký xem dữ liệu nhạy cảm.');return;}
    if(el.dataset.source){focusEvidence(el.dataset.source);return;}
    if(el.dataset.correct){const d=getDossier(),file=d.files.find(f=>f.id===state.doc),field=file.fields.find(f=>f.key===el.dataset.correct);modal('Điều chỉnh dữ liệu',`${file.name} · ${field.label}`,`${formLabel('Giá trị mới','value',field.pii?'':field.value,'required')}<label>Mã lý do<select name="reasonCode"><option value="OCR_ERROR">Lỗi OCR</option><option value="SOURCE_ERROR">Lỗi dữ liệu nguồn</option><option value="ADMIN_UNIT_CHANGE">Thay đổi đơn vị hành chính</option><option value="OTHER">Lý do khác</option></select></label><label>Ghi chú<textarea name="note" required></textarea></label>`,'Lưu và đối soát lại',async data=>{await demo.correctField(d.id,file.id,field.key,data.get('value').trim(),data.get('reasonCode'),data.get('note').trim());closeModal();refresh('Đã lưu điều chỉnh và đối soát lại.');});return;}
    if(el.dataset.ack){modal('Xác nhận cảnh báo','Chỉ cảnh báo WARNING mới có thể xác nhận.','<label>Căn cứ / lý do chấp nhận<textarea name="reason" required></textarea></label>','Xác nhận',async data=>{await demo.acknowledgeIssue(state.id,el.dataset.ack,data.get('reason').trim());closeModal();refresh('Đã xác nhận cảnh báo.');});return;}
    if(el.dataset.requirement){modal('Đánh dấu giấy tờ không áp dụng',getDossier().reference,'<label>Lý do không áp dụng<textarea name="reason" required></textarea></label>','Xác nhận',async data=>{await demo.removeRequirement(state.id,el.dataset.requirement,data.get('reason').trim());closeModal();refresh('Đã cập nhật yêu cầu điều kiện.');});}
  } catch(error) {notify(error.message);}
});
document.addEventListener('change',event=>{
  const {id,value}=event.target;
  if(live&&id==='classify-group') {
    const group=getDossier()?.files.find(file=>file.id===state.doc)?.groups.find(group=>group.id===value);
    if(group){document.querySelector('#classify-select').value=group.document_type;document.querySelector('#classify-role').value=group.role||'';}
  }
  if(id==='type-filter'){state.type=value;state.offset=0;reload();}
  if(id==='assignee-filter'){state.assignee=value;state.offset=0;reload();}
  if(id==='audit-action'){state.auditAction=value;state.offset=0;reload();}
});
document.addEventListener('input',event=>{
  if(live&&['dossier-search','audit-search'].includes(event.target.id)) {
    state.search=event.target.value;state.offset=0;clearTimeout(searchTimer);
    if(event.target.id==='audit-search') {document.querySelector('#audit-results').innerHTML=auditRows(demo.audit().filter(row=>(row.description+' '+row.actor+' '+row.action).toLowerCase().includes(state.search.toLowerCase())));return;}
    searchTimer=setTimeout(async()=>{const position=document.querySelector('#dossier-search')?.selectionStart;await reload();const input=document.querySelector('#dossier-search');input?.focus();input?.setSelectionRange(position,position);},350);return;
  }
  if(event.target.id==='dossier-search'){state.search=event.target.value;guarded(()=>{const rows=demo.listDossiers(currentFilters());document.querySelector('#dossier-results').innerHTML=dossierTable(rows);document.querySelector('#result-count').textContent=rows.length+' hồ sơ';});}
  if(event.target.id==='audit-search'){state.search=event.target.value;guarded(()=>{document.querySelector('#audit-results').innerHTML=auditRows(demo.audit({action:state.auditAction,search:state.search}));});}
});
document.addEventListener('submit',async event=>{
  if(event.target.id==='live-auth-form') {
    event.preventDefault();const form=event.target;
    if(form.dataset.submitting||!form.reportValidity())return;
    const data=new FormData(form),signup=state.page==='signup',submit=form.querySelector('[type="submit"]');
    try {
      if(signup&&data.get('password')!==data.get('confirmPassword')){setFieldError(form.elements.confirmPassword,'Mật khẩu xác nhận không khớp.');form.elements.confirmPassword.focus();return;}
      if(new TextEncoder().encode(data.get('password')).length>72)throw new Error('Mật khẩu tối đa 72 byte.');
      form.dataset.submitting='true';setButtonLoading(submit,true);form.querySelector('#auth-error').textContent='';
      if(signup) {
        await demo.signup({company:{name:data.get('name').trim(),legal_name:data.get('legal_name').trim(),business_registration_number:data.get('business_registration_number').trim(),address:data.get('address').trim(),email:data.get('email').trim(),phone:data.get('phone').trim()},username:data.get('username').trim(),email:data.get('admin_email').trim(),password:data.get('password'),full_name:data.get('admin_name').trim()});
        if(!form.isConnected)return;form.reset();navigate('login');notify('Đã tạo doanh nghiệp. Đăng nhập bằng tài khoản vừa đăng ký.');
      } else {
        await demo.login(data.get('username_or_email'),data.get('password'));form.reset();resetFilters();navigate(can('dashboard:read')?'dashboard':'dossiers');notify('Đăng nhập thành công.');
      }
    } catch(error) { if(form.isConnected)form.querySelector('#auth-error').textContent=error.message+(error.requestId?' · Request ID: '+error.requestId:''); }
    finally {delete form.dataset.submitting;if(submit.isConnected)setButtonLoading(submit,false);}
    return;
  }
  if(event.target.id!=='auth-form')return;event.preventDefault();if(!event.target.checkValidity()){event.target.querySelector(':invalid')?.focus();return;}const data=new FormData(event.target);
  try {if(state.page==='signup'){if(data.get('password')!==data.get('confirmPassword')){setFieldError(event.target.elements.confirmPassword,'Mật khẩu xác nhận không khớp.');event.target.elements.confirmPassword.focus();throw new Error('Mật khẩu xác nhận không khớp.');}demo.registerCompany(Object.fromEntries(data));}else demo.login(data.get('companyId'),data.get('role'));resetFilters();navigate(can('dashboard:read')?'dashboard':'dossiers');notify('Đã vào không gian demo.');}catch(error){document.querySelector('#auth-error').textContent=error.message;}
});
document.addEventListener('keydown',event=>{
  if(trapModal(event))return;
  if(!state.mobile)return;
  if(event.key==='Escape'){event.preventDefault();closeMobileMenu();return;}
  if(event.key==='Tab'){const items=[...document.querySelectorAll('.sidebar a[href],.sidebar button:not(:disabled)')].filter(el=>el.getClientRects().length);if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}}
});
initI18n();
bindRequestLoading();
window.addEventListener('hashchange',()=>{if(!location.hash||location.hash.startsWith('#/'))route();});
window.addEventListener('docsense:conflict',()=>{state.revealed.clear();clearPreview();if(state.page==='catalog')reload();else render();});
window.addEventListener('folio:unauthenticated',()=>{demo.logout();state.revealed.clear();state.original.clear();clearPreview();closeModal();navigate('login');notify('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');});
route();
