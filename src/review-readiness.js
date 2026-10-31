const array=value=>Array.isArray(value)?value:[];

export function approvalReadiness(dossier) {
  if(array(dossier.invalidRequiredFields).length)return {allowed:false,message:'Cần bổ sung hoặc sửa các trường bắt buộc chưa hợp lệ trong tab Tài liệu.'};
  if(array(dossier.issues).some(issue=>issue.status==='PENDING_DOCUMENTS'||issue.status==='OPEN'&&['WARNING','BLOCKER'].includes(issue.severity)))return {allowed:false,message:'Cần xử lý cảnh báo, lỗi chặn và các quy tắc đang chờ tài liệu trước khi phê duyệt.'};
  if(array(dossier.checklist).some(item=>item.status==='PENDING_CONDITION'||item.required&&!['EXTRACTED','NOT_REQUIRED'].includes(item.status)))return {allowed:false,message:'Cần bổ sung đủ tài liệu bắt buộc và xác định các yêu cầu có điều kiện.'};
  if(dossier.status==='PROCESSING')return {allowed:false,message:'Tài liệu đang được xử lý. Chờ xử lý xong trước khi phê duyệt.'};
  if(dossier.status!=='VALID_DOCUMENT')return {allowed:false,message:'Hồ sơ chưa sẵn sàng phê duyệt. Kiểm tra trạng thái và yêu cầu bổ sung.'};
  return {allowed:true,message:'Hồ sơ đã đủ điều kiện ghi nhận quyết định.'};
}
