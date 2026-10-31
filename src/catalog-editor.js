import { modal, closeModal, escape as e, icon, setButtonLoading, setFieldError } from './ui.js';
import { catalogView } from './backend-service.js';

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
export function openCatalogEditor({ demo, kind, selected = null, onSaved = () => {}, startWithAi = false }) {
  const isDocument = kind === 'documents';
  const savedType = Boolean(selected?.code);
  const aiHint = !demo.live ? 'Đăng nhập tài khoản công ty để dùng gợi ý AI.' : demo.session?.role!=='company_admin' ? 'Chỉ quản trị công ty được dùng gợi ý AI.' : !isDocument&&!savedType ? 'Lưu loại hồ sơ trước khi gợi ý quy tắc đối soát.' : '';
  const availableFieldTypes=demo.live?fieldTypes:fieldTypes.slice(0,4);
  const documentTypes = demo.listDocumentTypes().filter(type=>type.active!==false);
  let fields = selected?.fields?.map(field => ({ ...field })) || [{ label:'Họ và tên', type:'text', required:true, pii:true }];
  let rules = selected?.rules?.map(rule => ({ ...rule })) || [];
  let specialRequirements=selected?.specialRequirements||[];
  let aiBusy=false;

  function readSpecial(data) {
    return String(data.get('special')||'').split('\n').map(line=>line.trim()).filter(Boolean).map((description,index)=>{
      if(!demo.live)return description;
      const previous=specialRequirements.find(item=>item.description===description)||specialRequirements[index];
      return {...(typeof previous==='object'?previous:{}),description,severity:previous?.severity||'WARNING'};
    });
  }

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

  const title = savedType ? `Chỉnh sửa ${isDocument ? 'loại giấy tờ' : 'loại bộ hồ sơ'}` : `Thêm ${isDocument ? 'loại giấy tờ' : 'loại bộ hồ sơ'}`;
  const description = savedType ? `Thay đổi được lưu thành phiên bản ${selected.version + 1}. Hồ sơ đang xử lý giữ nguyên cấu hình.` : 'Đặt tên và chọn nội dung phù hợp với quy trình của doanh nghiệp.';
  const context = savedType ? `<p class="editor-hint muted">Mã hiện tại: <span>${e(selected.code)}</span> · Do hệ thống tạo, được giữ nguyên khi đổi tên.</p>` : '<p class="editor-hint muted">Mã được hệ thống tạo tự động khi lưu.</p>';
  const aiPanel=`<section class="catalog-ai-assist" aria-labelledby="catalog-ai-heading"><div class="catalog-ai-heading">${icon('sparkles')}<div><h3 id="catalog-ai-heading">${isDocument?'AI gợi ý trường trích xuất':'AI gợi ý quy tắc đối soát'}</h3><p>${isDocument?'Mô tả giấy tờ để AI đề xuất các trường và yêu cầu kiểm tra.':'AI dùng cấu hình đã lưu để đề xuất quy tắc. Gợi ý được thêm vào các quy tắc đang soạn.'}</p></div></div><label>Mô tả cho AI<textarea name="aiDescription" rows="2" maxlength="4000" placeholder="${isDocument?'Ví dụ: CCCD cần lấy họ tên, số định danh, ngày sinh và ngày hết hạn.':'Ví dụ: Đối chiếu họ tên và số định danh chủ sở hữu giữa các giấy tờ.'}" ${aiHint?'disabled':''}></textarea></label><div class="catalog-ai-actions"><button class="button ai-suggest-button" type="button" data-editor-suggest ${aiHint?'disabled':''}>${icon('sparkles')}${isDocument?'Gợi ý bằng AI':'Gợi ý quy tắc bằng AI'}</button><small>${aiHint||'Chỉ tạo bản nháp. Rà soát rồi bấm Lưu phiên bản để áp dụng.'}</small></div><p class="form-error" id="catalog-ai-error" role="alert"></p><p class="catalog-ai-result" id="catalog-ai-result" role="status" aria-live="polite"></p></section>`;
  const body = `<div id="catalog-editor">
    ${aiPanel}
    <div class="editor-section"><label>Tên hiển thị${textInput('name',selected?.name,isDocument ? 'Ví dụ: Căn cước công dân' : 'Ví dụ: Mua bán nhà đất')}</label>
    <label>${isDocument ? 'Mô tả nhận diện giấy tờ' : 'Mô tả nghiệp vụ'}<textarea name="description" rows="3" maxlength="1200" placeholder="Mô tả mục đích và thông tin cần lưu ý…">${e(selected?.description || '')}</textarea></label>${context}</div>
    ${isDocument ? `<section class="editor-section"><div class="editor-heading"><h3>Trường cần trích xuất</h3><button class="button small" type="button" data-editor-add="field">${icon('plus')} Thêm trường</button></div><div id="editor-fields">${fieldRows()}</div></section><section class="editor-section"><h3>Yêu cầu kiểm tra đặc biệt</h3><label>Mỗi dòng là một yêu cầu<textarea name="special" rows="3" maxlength="3000" placeholder="Ví dụ: Kiểm tra giấy tờ còn thời hạn sử dụng">${e((selected?.specialRequirements || []).map(value => typeof value === 'string' ? value : value.description || value.name || '').join('\n'))}</textarea></label></section>` : `<section class="editor-section"><div class="editor-heading"><h3>Giấy tờ trong bộ hồ sơ</h3></div><p class="editor-hint muted">Chọn giấy tờ và xác định loại bắt buộc, tùy chọn hoặc phát sinh theo điều kiện.</p>${documentChoices()}</section><section class="editor-section"><div class="editor-heading"><h3>Quy tắc đối soát</h3><button class="button small" type="button" data-editor-add="rule">${icon('plus')} Thêm quy tắc</button></div><div id="editor-rules"></div></section>`}
    <div class="notice">${icon('history')} ${demo.live?'Lưu tạo phiên bản mới trên máy chủ. Hồ sơ hiện có giữ nguyên snapshot.':'Cấu hình trong bản demo chỉ được lưu trong phiên làm việc hiện tại.'}</div>
  </div>`;

  const form=modal(title,description,body,'Lưu phiên bản',async data => {
    if(aiBusy)return;
    const base = { code:selected?.code, name:String(data.get('name') || '').trim(), description:String(data.get('description') || '').trim() };
    let saved;
    if (isDocument) {
      const nextFields = readFields();
      if (!nextFields.length) throw new Error('Thêm ít nhất một trường cần trích xuất.');
      saved = await demo.saveDocumentType({ ...base, fields:nextFields, specialRequirements:readSpecial(data) });
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

  async function generateSuggestions(target) {
    if(aiBusy||aiHint||form.dataset.submitting||form.dataset.conflict)return;
    const prompt=form.elements.aiDescription.value.trim()||form.elements.description.value.trim()||form.elements.name.value.trim();
    if(!prompt){setFieldError(form.elements.aiDescription,'Nhập mô tả để AI tạo gợi ý.');form.elements.aiDescription.focus();return;}
    // Capture the draft before disabling controls; failures leave it untouched.
    const previousRules=isDocument?null:readRules();
    const dialog=form.closest('.modal');
    const controls=[...dialog.querySelectorAll('input,select,textarea,button')].filter(el=>el!==target).map(el=>({el,disabled:el.disabled}));
    aiBusy=true;form.dataset.aiPending='true';dialog.setAttribute('aria-busy','true');
    controls.forEach(({el})=>el.disabled=true);setButtonLoading(target,true,'AI đang tạo gợi ý…');
    const error=container.querySelector('#catalog-ai-error'),result=container.querySelector('#catalog-ai-result');error.textContent='';result.textContent='';
    try {
      const draft=isDocument?await demo.suggestDocumentFields(prompt):await demo.suggestComparisonRules(selected.code,prompt);
      if(!form.isConnected)return;
      if(draft?.draft!==true)throw new Error('Backend không trả bản nháp hợp lệ.');
      if(isDocument) {
        if(!draft.definition||!Array.isArray(draft.definition.fields)||!draft.definition.fields.length)throw new Error('AI chưa trả trường trích xuất phù hợp. Hãy bổ sung mô tả rồi thử lại.');
        const proposal=catalogView({definition:draft.definition},'documents');
        fields=proposal.fields;specialRequirements=proposal.specialRequirements;
        if(!form.elements.name.value.trim())form.elements.name.value=proposal.name||'';
        if(!form.elements.description.value.trim())form.elements.description.value=proposal.description||'';
        form.elements.special.value=specialRequirements.map(item=>item.description||'').join('\n');
        container.querySelector('#editor-fields').innerHTML=fieldRows();
        result.textContent='Đã nhận gợi ý trường. Kiểm tra nội dung bên dưới trước khi lưu phiên bản.';
      } else {
        if(draft.configuration_version!==selected.version)throw new Error('Cấu hình đã thay đổi. Tải lại trước khi gợi ý.');
        const suggested=catalogView({definition:{rules:draft.rules}},'dossiers').rules;
        if(!suggested.length){result.textContent='AI chưa tìm thấy quy tắc phù hợp. Hãy bổ sung mô tả rồi thử lại.';return;}
        const sources=selectedSources();
        if(suggested.some(rule=>[rule.left,rule.right].some(ref=>!sources.find(type=>type.code===ref.document_type)?.fields.some(field=>field.key===ref.field_key))))throw new Error('Gợi ý không khớp giấy tờ hoặc trường đang chọn. Lưu cấu hình mới rồi thử lại.');
        rules=[...previousRules,...suggested];
        container.querySelector('#editor-rules').innerHTML=ruleRows();
        result.textContent='Đã thêm gợi ý quy tắc vào bản nháp. Rà soát trước khi lưu phiên bản.';
      }
    } catch(failure) {if(error.isConnected)error.textContent=failure.message+(failure.requestId?' · Request ID: '+failure.requestId:'');}
    finally {
      aiBusy=false;delete form.dataset.aiPending;dialog.removeAttribute('aria-busy');
      if(target.isConnected)setButtonLoading(target,false);
      controls.forEach(({el,disabled})=>{if(el.isConnected)el.disabled=disabled;});
    }
  }

  container.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if(target.hasAttribute('data-editor-suggest')){generateSuggestions(target);return;}
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
  if(startWithAi){form.elements.aiDescription.focus();container.querySelector('.catalog-ai-assist').scrollIntoView({block:'nearest'});}
}
