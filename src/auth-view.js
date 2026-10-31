import { themeSwitcher } from './theme.js';
import { escape as e, icon } from './ui.js';
import { languageSwitcher } from './i18n.js';

const input = (label, name, options = {}) => {
  const { type='text', required=true, autocomplete='', placeholder='', maxLength=120, id=`auth-${name}` } = options;
  return `<label class="auth-field" for="${e(id)}">${e(label)}<input id="${e(id)}" name="${e(name)}" type="${type}" ${required?'required':''} ${autocomplete?`autocomplete="${autocomplete}"`:''} placeholder="${e(placeholder)}" maxlength="${maxLength}"/></label>`;
};

const passwordInput = (label, name, id, autocomplete = 'current-password', minimum = 1, maximum = 72) => `<div class="auth-field auth-password-field"><label for="${id}">${label}</label><div class="auth-password-wrap"><input id="${id}" name="${name}" type="password" required minlength="${minimum}" maxlength="${maximum}" autocomplete="${autocomplete}" placeholder="${autocomplete==='new-password'?'Tối thiểu '+minimum+' ký tự':'Nhập mật khẩu'}"/><button class="auth-password-toggle" type="button" data-action="toggle-password" data-target="${id}" aria-label="Hiện ${label.toLocaleLowerCase('vi')}" aria-controls="${id}" aria-pressed="false">${icon('eye')}</button></div></div>`;

function loginFields(mode, companies, roles) {
  if (mode === 'demo') return `<label class="auth-field" for="auth-company">Công ty của tài khoản<select id="auth-company" name="companyId">${companies.map(company=>`<option data-user-content value="${e(company.id)}">${e(company.name)}</option>`).join('')}</select></label><label class="auth-field" for="auth-role">Tài khoản mẫu<select id="auth-role" name="role">${Object.entries(roles).filter(([role])=>role!=='platform_admin').map(([role,label])=>`<option value="${e(role)}">${e(label)}</option>`).join('')}</select></label>`;
  return `${input('Tên đăng nhập hoặc email','username_or_email',{autocomplete:'username',placeholder:'ten.dang.nhap hoặc ban@congty.vn'})}${passwordInput('Mật khẩu','password','auth-login-password')}`;
}

function signupFields(mode) {
  const live = mode === 'api';
  return `<fieldset class="auth-fieldset"><legend><span>01</span> Thông tin doanh nghiệp</legend><div class="auth-form-grid">${input('Tên công ty','name',{autocomplete:'organization',placeholder:'Ví dụ: An Phát Land'})}${input('Mã số thuế',live?'business_registration_number':'businessRegistrationNumber',{placeholder:'Mã đăng ký doanh nghiệp',required:!live,maxLength:100})}</div>${input('Tên pháp lý công ty',live?'legal_name':'legalName',{placeholder:'Tên đầy đủ trên đăng ký doanh nghiệp',autocomplete:'organization',required:!live,maxLength:300})}${input('Địa chỉ công ty','address',{autocomplete:'street-address',placeholder:'Số nhà, đường, phường/xã, tỉnh/thành phố',required:false,maxLength:1000})}<div class="auth-form-grid">${input('Email công ty','email',{type:'email',autocomplete:'email',placeholder:'lienhe@congty.vn',required:false})}${input('Số điện thoại công ty','phone',{type:'tel',autocomplete:'tel',placeholder:'Số điện thoại liên hệ',required:false,maxLength:30})}</div></fieldset><fieldset class="auth-fieldset"><legend><span>02</span> Quản trị viên đầu tiên</legend>${input('Tên người đại diện',live?'admin_name':'adminName',{autocomplete:'name',placeholder:'Họ và tên đầy đủ',maxLength:80})}<div class="auth-form-grid">${input('Email quản trị',live?'admin_email':'adminEmail',{type:'email',autocomplete:'email',placeholder:'ban@congty.vn'})}${input('Tên đăng nhập','username',{autocomplete:'username',placeholder:'ten.dang.nhap',maxLength:64})}</div>${passwordInput(live?'Mật khẩu':'Mật khẩu minh họa','password','auth-signup-password','new-password',live?12:8,live?72:128)}${passwordInput(live?'Xác nhận mật khẩu':'Xác nhận mật khẩu minh họa','confirmPassword','auth-signup-confirm','new-password',live?12:8,live?72:128)}</fieldset>`;
}

/** Live forms use the published auth DTO; demo remains a separate memory flow. */
export function renderAuthPage({ page='login', mode='api', companies=[], roles={} } = {}) {
  const signup=page==='signup';
  const demo=mode==='demo';
  const title=signup?'Tạo không gian doanh nghiệp':'Chào mừng trở lại';
  return `<div class="auth-portal ${signup?'auth-signup':''}">
    <a class="skip-link" href="#auth-main">Đến biểu mẫu ${signup?'đăng ký':'đăng nhập'}</a>
    <aside class="auth-story">
      <a class="auth-brand" href="#/login" aria-label="DocSense AI · Đăng nhập"><img src="/assets/logo.svg" alt="" width="34" height="34"/><span>DocSense <span class="auth-brand-dot">AI</span></span></a>
      <div class="auth-story-content"><p class="auth-eyebrow">KHÔNG GIAN HỒ SƠ DOANH NGHIỆP</p><h1>Rõ dữ liệu.<br/><span>Chắc quyết định.</span></h1><p class="auth-story-description">Từ tài liệu đầu tiên đến quyết định cuối cùng.<br/>Cùng đội ngũ làm việc trong một không gian.</p><img class="auth-illustration" src="/assets/workspace.svg" width="400" height="250" alt="Minh họa các lớp tài liệu và xác nhận xử lý"/><div class="auth-story-features"><span>${icon('folder')} Hồ sơ tập trung</span><span>${icon('shield')} Quyền truy cập rõ ràng</span><span>${icon('history')} Lịch sử minh bạch</span></div></div>
      <small class="auth-story-footer">DocSense AI workspace <span>·</span> Đồng hành cùng doanh nghiệp</small>
    </aside>
    <main class="auth-main" id="auth-main" tabindex="-1">${themeSwitcher()}${languageSwitcher('auth-language')}<div class="auth-card">
      <div class="auth-mode-badge ${demo?'demo':''}"><span></span>${demo?'KHÔNG GIAN DEMO':'TÀI KHOẢN DOANH NGHIỆP'}</div>
      <h2>${title}</h2><p class="auth-intro">${signup?'Bắt đầu với công ty của bạn và tài khoản quản trị đầu tiên.':demo?'Chọn công ty và tài khoản mẫu để khám phá quy trình.':'Đăng nhập để tiếp tục công việc trong không gian của bạn.'}</p>
      ${demo?`<div class="auth-demo-note" role="note">${icon('help')} Dữ liệu chỉ tồn tại trong phiên demo. Không dùng thông tin hoặc mật khẩu thật.</div>`:''}
      <form id="${demo?'auth-form':'live-auth-form'}" class="auth-form" aria-describedby="auth-form-note">
        ${signup?signupFields(mode):loginFields(mode,companies,roles)}
        ${signup?`<p class="auth-signup-note">${icon('shield')} Quản trị viên đầu tiên quản lý thành viên và cấu hình trong công ty vừa tạo.</p>`:''}
        <p class="auth-error form-error" id="auth-error" role="alert"></p>
        <button class="button primary full auth-submit" type="submit">${demo?(signup?'Tạo công ty mô phỏng':'Vào không gian demo'):(signup?'Đăng ký doanh nghiệp':'Đăng nhập')}${icon('arrow')}</button>
        <p class="auth-form-note" id="auth-form-note">${demo?'Mọi thao tác, tài khoản và kết quả trong không gian này đều là mô phỏng.':signup?'Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte. Đăng nhập sau khi tạo doanh nghiệp.':'Phiên được giữ trong bộ nhớ. Tải lại trang sẽ yêu cầu đăng nhập lại.'}</p>
      </form>
      <p class="auth-switch">${signup?'Đã có không gian doanh nghiệp?':'Chưa có không gian doanh nghiệp?'} <button class="text-link" type="button" data-auth="${signup?'login':'signup'}">${signup?(demo?'Đăng nhập demo':'Đăng nhập'):'Tạo không gian mới'}</button></p>
      ${!demo?`<div class="auth-demo-entry"><div><strong>Khám phá DocSense AI ngay hôm nay</strong><p>Trải nghiệm quản lý hồ sơ với dữ liệu mẫu.</p></div><button class="button auth-demo-button" type="button" data-action="enter-demo">Dùng bản demo ${icon('arrow')}</button></div>`:''}
      <p class="auth-bottom-note">${icon('shield')} Tài khoản được giới hạn trong doanh nghiệp của mình.</p>
    </div></main>
  </div>`;
}
