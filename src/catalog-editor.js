import { modal, closeModal, escape as e, icon } from './ui.js';

const fieldTypes = [['text','Văn bản'], ['number','Số'], ['date','Ngày tháng'], ['boolean','Có / Không'], ['identifier','Mã định danh'], ['money','Tiền tệ'], ['area','Diện tích']];
const operators = {
  text: [['TEXT_EQUALS','Văn bản giống nhau'], ['DIGITS_EQUAL','Dãy chữ số giống nhau']],
  number: [['NUMBER_EQUAL','Giá trị số bằng nhau']],
  date: [['DATE_EQUAL','Cùng ngày tháng']],
  identifier:[['DIGITS_EQUAL','Dãy chữ số giống nhau'],['TEXT_EQUALS','Văn bản giống nhau']],
  money:[['NUMBER_EQUAL','Giá trị số bằng nhau']], area:[['NUMBER_EQUAL','Giá trị số bằng nhau']]
};
const option = (value, label, selected) => `<option value="${e(value)}" ${value === selected ? 'selected' : ''}>${e(label)}</option>`;
const textInput = (name, value, placeholder = '', required = true) => `<input name="${name}" value="${e(value || '')}" placeholder="${e(placeholder)}" maxlength="120" ${required ? 'required' : ''}/>`;
const removeButton = (kind, index, label) => `<button class="button small" type="button" data-editor-remove="${kind}" data-editor-index="${index}" aria-label="${e(label)}">${icon('close')} Xóa</button>`;

/** Shared editor. The service controls persistence and DTO conversion. */
export function openCatalogEditor({ demo, kind, selected = null, onSaved = () => {} }) {
  const isDocument = kind === 'documents';
  const availableFieldTypes=demo.live?fieldTypes:fieldTypes.slice(0,4);
  const documentTypes = demo.listDocumentTypes().filter(type=>type.active!==false);
  let fields = selected?.fields?.map(field => ({ ...field })) || [{ label:'Họ và tên', type:'text', required:true, pii:true }];
  let rules = selected?.rules?.map(rule => ({ ...rule })) || [];

  const selectedSources = () => {
    const checked = [...document.querySelectorAll('#catalog-editor input[name="documents"]:checked')].map(input => input.value);
    return documentTypes.filter(type => checked.includes(type.code));
  };

  const sourceOptions = (types, value) => types.map(type => option(type.code, type.name, value)).join('');
  const comparableFields = type => (type?.fields || []).filter(field => operators[field.type]);
  const fieldOptions = (type, value, expectedType) => comparableFields(type).filter(field => !expectedType || field.type === expectedType).map(field => option(field.key, field.label, value)).join('');

  function fieldRows() {
    return fields.map((field, index) => `<fieldset class="editor-card" data-editor-field="${index}">
      <legend>Trường ${index + 1}</legend>
      <div class="form-grid">
        <label>Tên trường${textInput(`field-label-${index}`, field.label, 'Ví dụ: Họ và tên')}</label>
        <label>Kiểu dữ liệu<select name="field-type-${index}">${availableFieldTypes.map(([value,label]) => option(value,label,field.type)).join('')}</select></label>
      </div>
      <div class="editor-row-actions"><div class="editor-checks">
        <label class="checkbox-label"><input name="field-required-${index}" type="checkbox" ${field.required ? 'checked' : ''}/> Bắt buộc</label>
        <label class="checkbox-label"><input name="field-pii-${index}" type="checkbox" ${field.pii ? 'checked' : ''}/> Dữ liệu nhạy cảm</label>
      </div>${removeButton('field',index,`Xóa trường ${index + 1}`)}</div>
    </fieldset>`).join('') || '<p class="editor-empty muted">Chưa có trường trích xuất. Thêm ít nhất một trường để lưu loại giấy tờ.</p>';
  }

  function readFields() {
    const form = document.querySelector('#modal-form');
    return fields.map((field,index) => ({ ...field,
      label:form.elements.namedItem(`field-label-${index}`).value.trim(),
      type:form.elements.namedItem(`field-type-${index}`).value,
      required:form.elements.namedItem(`field-required-${index}`).checked,
      pii:form.elements.namedItem(`field-pii-${index}`).checked
    }));
  }

  function ruleRows() {
    const sources = selectedSources().filter(type => comparableFields(type).length);
    return rules.map((rule,index) => {
      const leftType = sources.find(type => type.code === rule.leftType) || sources[0];
      const leftField = comparableFields(leftType).find(field => field.key === rule.leftField) || comparableFields(leftType)[0];
      const matchingSources = sources.filter(type => comparableFields(type).some(field => field.type === leftField?.type));
      const rightType = matchingSources.find(type => type.code === rule.rightType) || matchingSources[0];
      const rightFields = comparableFields(rightType).filter(field => field.type === leftField?.type);
      const rightField = rightFields.find(field => field.key === rule.rightField) || rightFields[0];
      const allowedOperators = operators[leftField?.type] || [];
      rule.leftType = leftType?.code || ''; rule.leftField = leftField?.key || '';
      rule.rightType = rightType?.code || ''; rule.rightField = rightField?.key || '';
      rule.operator = allowedOperators.some(([value]) => value === rule.operator) ? rule.operator : allowedOperators[0]?.[0] || '';
      return `<fieldset class="editor-card" data-editor-rule="${index}">
        <legend>Quy tắc ${index + 1}</legend>
        <label>Tên quy tắc${textInput(`rule-name-${index}`, rule.name, 'Ví dụ: Đối chiếu họ tên chủ sở hữu')}</label>
        <div class="editor-rule-sources form-grid">
          <label>Giấy tờ thứ nhất<select name="rule-leftType-${index}" data-editor-rule-source="${index}" required>${sources.length ? sourceOptions(sources,rule.leftType) : '<option value="">Chọn giấy tờ trong bộ hồ sơ trước</option>'}</select></label>
          <label>Trường cần so sánh<select name="rule-leftField-${index}" data-editor-rule-source="${index}" required>${fieldOptions(leftType,rule.leftField) || '<option value="">Chưa có trường phù hợp</option>'}</select></label>
          <label>Giấy tờ thứ hai<select name="rule-rightType-${index}" data-editor-rule-source="${index}" required>${sourceOptions(matchingSources,rule.rightType) || '<option value="">Chưa có giấy tờ phù hợp</option>'}</select></label>
          <label>Trường đối chiếu<select name="rule-rightField-${index}" data-editor-rule-source="${index}" required>${fieldOptions(rightType,rule.rightField,leftField?.type) || '<option value="">Chưa có trường phù hợp</option>'}</select></label>
          <label>Cách so sánh<select name="rule-operator-${index}" required>${allowedOperators.map(([value,label]) => option(value,label,rule.operator)).join('') || '<option value="">Chọn nguồn so sánh trước</option>'}</select></label>
          <label>Khi có sai lệch<select name="rule-severity-${index}">${[['BLOCKER','Lỗi chặn phê duyệt'],['WARNING','Cảnh báo cần xác minh'],['INFO','Thông tin tham khảo']].map(([value,label]) => option(value,label,rule.severity || 'BLOCKER')).join('')}</select></label>
          ${demo.live?`<label>Vai trò bên thứ nhất${textInput(`rule-leftRole-${index}`,rule.left?.role,'',false)}</label><label>Vai trò bên thứ hai${textInput(`rule-rightRole-${index}`,rule.right?.role,'',false)}</label><label>Trường ghép chủ thể bên thứ nhất<select name="rule-leftSubject-${index}"><option value="">Không ghép nhiều chủ thể</option>${(leftType?.fields||[]).filter(field=>['text','identifier'].includes(field.type)).map(field=>option(field.key,field.label,rule.left?.subject_field)).join('')}</select></label><label>Trường ghép chủ thể bên thứ hai<select name="rule-rightSubject-${index}"><option value="">Không ghép nhiều chủ thể</option>${(rightType?.fields||[]).filter(field=>['text','identifier'].includes(field.type)).map(field=>option(field.key,field.label,rule.right?.subject_field)).join('')}</select></label>`:''}
        </div><div class="editor-row-actions"><small class="editor-hint muted">Chỉ so sánh các trường có cùng kiểu dữ liệu.</small>${removeButton('rule',index,`Xóa quy tắc ${index + 1}`)}</div>
      </fieldset>`;
    }).join('') || '<p class="editor-empty muted">Chưa có quy tắc. Thêm quy tắc để đối chiếu dữ liệu giữa các giấy tờ.</p>';
  }

  function readRules() {
    const form = document.querySelector('#modal-form');
    return rules.map((rule,index) => {
      const value = { ...rule };
      for (const key of ['name','leftType','leftField','rightType','rightField','operator','severity']) value[key] = form.elements.namedItem(`rule-${key}-${index}`).value.trim();
      if(demo.live) {
        value.left={...rule.left,role:form.elements.namedItem(`rule-leftRole-${index}`).value.trim(),subject_field:form.elements.namedItem(`rule-leftSubject-${index}`).value};
        value.right={...rule.right,role:form.elements.namedItem(`rule-rightRole-${index}`).value.trim(),subject_field:form.elements.namedItem(`rule-rightSubject-${index}`).value};
      }
      return value;
    });
  }

  const documentChoices = () => documentTypes.map(type => {
    const item = selected?.documents?.find(doc => doc.code === type.code);
    const mode = item?.conditional ? 'conditional' : item && !item.required ? 'optional' : 'required';
    return `<fieldset class="editor-card editor-document-options" data-editor-document="${e(type.code)}">
      <label class="checkbox-label"><input type="checkbox" name="documents" value="${e(type.code)}" ${item ? 'checked' : ''}/> ${e(type.name)}</label>
      <div class="form-grid" data-editor-document-controls ${item ? '' : 'hidden'}>
        <label>Yêu cầu tiếp nhận<select name="mode-${e(type.code)}" ${item ? '' : 'disabled'}>${[['required','Bắt buộc'],['optional','Tùy chọn'],['conditional','Có điều kiện']].map(([value,label]) => option(value,label,mode)).join('')}</select></label>
        <label data-editor-condition ${mode === 'conditional' ? '' : 'hidden'}>Điều kiện áp dụng<input name="condition-${e(type.code)}" value="${e(item?.triggerReason || '')}" placeholder="Ví dụ: Chủ sở hữu đã kết hôn" maxlength="300" ${item && mode === 'conditional' ? 'required' : 'disabled'}/></label>
        ${demo.live?`<label>Vai trò chủ thể (phân cách bằng dấu phẩy)<input name="roles-${e(type.code)}" value="${e((selected?.documents?.filter(doc=>doc.code===type.code)||[]).map(doc=>doc.role||'').join(', '))}" maxlength="1000" ${item?'':'disabled'}/></label><label>Số lượng tối thiểu<input name="count-${e(type.code)}" type="number" min="1" max="100" value="${item?.min_count||1}" ${item?'required':'disabled'}/></label>`:''}
      </div>
    </fieldset>`;
  }).join('') || '<p class="editor-empty muted">Chưa có loại giấy tờ. Tạo loại giấy tờ trước khi cấu hình bộ hồ sơ.</p>';

  const title = selected ? `Chỉnh sửa ${isDocument ? 'loại giấy tờ' : 'loại bộ hồ sơ'}` : `Thêm ${isDocument ? 'loại giấy tờ' : 'loại bộ hồ sơ'}`;
  const description = selected ? `Thay đổi được lưu thành phiên bản ${selected.version + 1}. Hồ sơ đang xử lý giữ nguyên cấu hình.` : 'Đặt tên và chọn nội dung phù hợp với quy trình của doanh nghiệp.';
  const context = selected ? `<p class="editor-hint muted">Mã hiện tại: <span>${e(selected.code)}</span> · Do hệ thống tạo, được giữ nguyên khi đổi tên.</p>` : '<p class="editor-hint muted">Mã được hệ thống tạo tự động khi lưu.</p>';
  const body = `<div id="catalog-editor">
    <div class="editor-section"><label>Tên hiển thị${textInput('name',selected?.name,isDocument ? 'Ví dụ: Căn cước công dân' : 'Ví dụ: Mua bán nhà đất')}</label>
    <label>${isDocument ? 'Mô tả nhận diện giấy tờ' : 'Mô tả nghiệp vụ'}<textarea name="description" rows="3" maxlength="1200" placeholder="Mô tả mục đích và thông tin cần lưu ý…">${e(selected?.description || '')}</textarea></label>${context}</div>
    ${isDocument ? `<section class="editor-section"><div class="editor-heading"><h3>Trường cần trích xuất</h3><button class="button small" type="button" data-editor-add="field">${icon('plus')} Thêm trường</button></div><div id="editor-fields">${fieldRows()}</div></section><section class="editor-section"><h3>Yêu cầu kiểm tra đặc biệt</h3><label>Mỗi dòng là một yêu cầu<textarea name="special" rows="3" maxlength="3000" placeholder="Ví dụ: Kiểm tra giấy tờ còn thời hạn sử dụng">${e((selected?.specialRequirements || []).map(value => typeof value === 'string' ? value : value.description || value.name || '').join('\n'))}</textarea></label></section>` : `<section class="editor-section"><div class="editor-heading"><h3>Giấy tờ trong bộ hồ sơ</h3></div><p class="editor-hint muted">Chọn giấy tờ và xác định loại bắt buộc, tùy chọn hoặc phát sinh theo điều kiện.</p>${documentChoices()}</section><section class="editor-section"><div class="editor-heading"><h3>Quy tắc đối soát</h3><button class="button small" type="button" data-editor-add="rule">${icon('plus')} Thêm quy tắc</button></div><div id="editor-rules"></div></section>`}
    <div class="notice">${icon('history')} ${demo.live?'Lưu tạo phiên bản mới trên máy chủ. Hồ sơ hiện có giữ nguyên snapshot.':'Cấu hình trong bản demo chỉ được lưu trong phiên làm việc hiện tại.'}</div>
  </div>`;

  modal(title,description,body,'Lưu phiên bản',async data => {
    const base = { code:selected?.code, name:String(data.get('name') || '').trim(), description:String(data.get('description') || '').trim() };
    let saved;
    if (isDocument) {
      const nextFields = readFields();
      if (!nextFields.length) throw new Error('Thêm ít nhất một trường cần trích xuất.');
      saved = await demo.saveDocumentType({ ...base, fields:nextFields, specialRequirements:String(data.get('special') || '').split('\n').map(line => line.trim()).filter(Boolean) });
    } else {
      const documents = data.getAll('documents').flatMap(code => {
        const mode = data.get(`mode-${code}`);
        const base={code,required:mode==='required',conditional:mode==='conditional',triggerReason:mode==='conditional'?String(data.get(`condition-${code}`)||'').trim():''};
        if(!demo.live)return [base];
        const originals=selected?.documents?.filter(doc=>doc.code===code)||[];
        const roles=[...new Set(String(data.get(`roles-${code}`)||'').split(',').map(role=>role.trim()))];
        return roles.map(role=>{
          const original=originals.find(doc=>(doc.role||'')===role);
          const minCount=Number(data.get(`count-${code}`));
          return {...original,...base,role,min_count:originals.length>1&&minCount===originals[0].min_count?original?.min_count||minCount:minCount};
        });
      });
      saved = await demo.saveDossierType({ ...base, documents, rules:readRules() });
    }
    closeModal(); await onSaved(saved);
  });

  const container = document.querySelector('#catalog-editor');
  container.closest('.modal').classList.add('catalog-editor-modal');
  if (!isDocument) container.querySelector('#editor-rules').innerHTML = ruleRows();

  container.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.editorAdd === 'field') {
      fields = readFields(); fields.push({ label:'',type:'text',required:false,pii:false });
      container.querySelector('#editor-fields').innerHTML = fieldRows();
      container.querySelector(`[name="field-label-${fields.length - 1}"]`)?.focus();
    } else if (target.dataset.editorRemove === 'field') {
      fields = readFields(); fields.splice(Number(target.dataset.editorIndex),1);
      container.querySelector('#editor-fields').innerHTML = fieldRows();
    } else if (target.dataset.editorAdd === 'rule') {
      rules = readRules(); rules.push({ name:'',severity:'BLOCKER' });
      container.querySelector('#editor-rules').innerHTML = ruleRows();
      container.querySelector(`[name="rule-name-${rules.length - 1}"]`)?.focus();
    } else if (target.dataset.editorRemove === 'rule') {
      rules = readRules(); rules.splice(Number(target.dataset.editorIndex),1);
      container.querySelector('#editor-rules').innerHTML = ruleRows();
    }
  });

  container.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'documents') {
      rules = readRules();
      const row = input.closest('[data-editor-document]');
      row.querySelector('[data-editor-document-controls]').hidden = !input.checked;
      const mode = row.querySelector('select'); mode.disabled = !input.checked;
      row.querySelectorAll('input[name^="roles-"],input[name^="count-"]').forEach(field=>field.disabled=!input.checked);
      const condition = row.querySelector('[data-editor-condition]');
      condition.hidden = mode.value !== 'conditional';
      const reason = condition.querySelector('input'); reason.disabled = !input.checked || mode.value !== 'conditional'; reason.required = !reason.disabled;
      container.querySelector('#editor-rules').innerHTML = ruleRows();
    } else if (input.name?.startsWith('mode-')) {
      const row = input.closest('[data-editor-document]');
      const condition = row.querySelector('[data-editor-condition]'); condition.hidden = input.value !== 'conditional';
      const reason = condition.querySelector('input'); reason.disabled = input.value !== 'conditional'; reason.required = !reason.disabled;
    } else if (input.hasAttribute('data-editor-rule-source')) {
      const focusName = input.name;
      rules = readRules(); container.querySelector('#editor-rules').innerHTML = ruleRows();
      container.querySelector(`[name="${focusName}"]`)?.focus();
    }
  });
}
