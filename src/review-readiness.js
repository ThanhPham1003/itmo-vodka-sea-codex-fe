const array=value=>Array.isArray(value)?value:[];

export function requiredFieldsToReview(dossier) {
  return array(dossier.invalidRequiredFields).filter(field=>!array(dossier.issues).some(issue=>
    issue.rule_code==='field:'+field.id&&issue.code==='FIELD_NEEDS_VERIFICATION'&&issue.severity==='WARNING'&&issue.status==='ACKNOWLEDGED'&&
    issue.acknowledged_by&&issue.acknowledged_by!=='00000000-0000-0000-0000-000000000000'&&issue.acknowledgement?.trim()&&
    array(issue.evidence).some(source=>source.field_id===field.id)
  ));
}

export function reviewOutstandingCount(dossier) {
  const required=requiredFieldsToReview(dossier);
  const fieldIds=new Set(required.map(field=>field.id).filter(Boolean));
  const issues=array(dossier.issues).filter(issue=>issue.status==='PENDING_DOCUMENTS'||issue.status==='OPEN'&&['WARNING','BLOCKER'].includes(issue.severity));
  const separate=issues.filter(issue=>{
    const fieldIssue=issue.code==='FIELD_NEEDS_VERIFICATION'||issue.rule_code?.startsWith('field:');
    return !fieldIssue||!([issue.rule_code?.slice(6),...array(issue.evidence).map(e=>e.field_id)].some(id=>fieldIds.has(id)));
  });
  return required.length+separate.length;
}

export function approvalReadiness(dossier) {
  if(requiredFieldsToReview(dossier).length)return {allowed:false,message:'Cần kiểm tra và xác nhận các thông tin bắt buộc còn cảnh báo, hoặc sửa lại dữ liệu trong tab Tài liệu.'};
  if(array(dossier.issues).some(issue=>issue.status==='PENDING_DOCUMENTS'||issue.status==='OPEN'&&['WARNING','BLOCKER'].includes(issue.severity)))return {allowed:false,message:'Cần xử lý cảnh báo, lỗi chặn và các quy tắc đang chờ tài liệu trước khi phê duyệt.'};
  if(array(dossier.checklist).some(item=>item.status==='PENDING_CONDITION'||item.required&&!['EXTRACTED','NOT_REQUIRED'].includes(item.status)))return {allowed:false,message:'Cần bổ sung đủ tài liệu bắt buộc và xác định các yêu cầu có điều kiện.'};
  if(dossier.status==='PROCESSING')return {allowed:false,message:'Tài liệu đang được xử lý. Chờ xử lý xong trước khi phê duyệt.'};
  if(dossier.status!=='VALID_DOCUMENT')return {allowed:false,message:'Hồ sơ chưa sẵn sàng phê duyệt. Kiểm tra trạng thái và yêu cầu bổ sung.'};
  return {allowed:true,message:array(dossier.invalidRequiredFields).length?'Các thông tin đã được người kiểm tra xác nhận chấp nhận. Bạn có thể phê duyệt hồ sơ.':'Hồ sơ đã đủ điều kiện ghi nhận quyết định.'};
}
