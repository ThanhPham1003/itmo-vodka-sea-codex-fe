export const fieldTypeLabels={text:'Văn bản',identifier:'Mã định danh',date:'Ngày tháng',number:'Số',money:'Tiền tệ',area:'Diện tích',boolean:'Có / Không'};
export const operatorLabels={TEXT_EQUALS:'Văn bản giống nhau',DIGITS_EQUAL:'Dãy chữ số giống nhau',DATE_EQUAL:'Cùng ngày tháng',NUMBER_EQUAL:'Giá trị số bằng nhau'};
export const severityLabels={WARNING:'Cảnh báo',BLOCKER:'Lỗi chặn phê duyệt',INFO:'Thông tin tham khảo'};
export const resourceLabels={dossier:'Hồ sơ',file:'Tài liệu',document_type:'Loại giấy tờ',dossier_type:'Loại bộ hồ sơ',user:'Thành viên',company:'Công ty',catalog:'Cấu hình hồ sơ',assistant_request:'Yêu cầu trợ lý'};

export function catalogDocument(catalog,code,documents=[]) {
  const req=catalog.documents?.find(doc=>(doc.code||doc.document_type)===code);
  const pinned=catalog.documentSchemas?.find(doc=>doc.code===code&&(!req?.schema_version||doc.version===req.schema_version));
  if(pinned)return {...pinned.definition,code,version:pinned.version};
  return documents.find(doc=>doc.code===code&&(!req?.schema_version||doc.version===req.schema_version));
}

export function catalogReferenceLabel(catalog,reference,documents=[]) {
  const doc=catalogDocument(catalog,reference.document_type,documents);
  const field=doc?.fields?.find(field=>field.key===reference.field_key);
  return [doc?.name||'Loại giấy tờ không còn khả dụng',field?.label||'Trường dữ liệu không còn khả dụng',reference.role].filter(Boolean).join(' · ');
}
