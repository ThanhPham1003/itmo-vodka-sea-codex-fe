// Throwaway prototype: three layouts, all state is simulated and lives in memory.
export const roles = { admin: 'Quản trị doanh nghiệp', intake: 'Nhân viên tiếp nhận', legal: 'Chuyên viên pháp lý', viewer: 'Người xem', platform: 'Quản trị nền tảng' };
export const statuses = { receiving: 'Đang tiếp nhận', processing: 'Đang xử lý', legal: 'Chờ pháp lý', supplement: 'Cần bổ sung', approved: 'Đã phê duyệt', draft: 'Nháp', cancelled: 'Đã hủy' };
export const tenants = [{ id: 'anphat', name: 'An Phát Land', initials: 'AP', plan: 'Không gian doanh nghiệp', active: true }, { id: 'minhkhang', name: 'Minh Khang Realty', initials: 'MK', plan: 'Không gian doanh nghiệp', active: true }];
const names = ['Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Lê Thảo Nguyên', 'Phạm Gia Huy', 'Vũ Ngọc Linh', 'Đặng Đức Anh'];
export function seed(tenant) {
  const employees = names.map((name, i) => ({ id: i + 1, name, email: ['minhanh', 'hoangnam', 'thaonguyen', 'giahuy', 'ngoclinh', 'ducanh'][i] + '@' + tenant + '.vn', role: ['admin', 'legal', 'intake', 'legal', 'intake', 'viewer'][i], status: 'active' }));
  const customers = tenant === 'anphat' ? ['Nguyễn Văn Thành', 'Trần Thị Thanh Hà', 'Lê Hoàng Phúc', 'Phạm Minh Tuấn', 'Võ Ngọc Mai', 'Đặng Quốc Bảo', 'Bùi Thị Hương', 'Đỗ Anh Khoa', 'Ngô Thanh Tùng', 'Lý Minh Châu', 'Phan Đức Huy', 'Mai Thảo Vy'] : ['Hoàng Minh Đức', 'Dương Thị Lan', 'Nguyễn Hữu Tín', 'Lâm Nhật Hào'];
  const stage = ['legal', 'supplement', 'processing', 'approved', 'receiving', 'legal', 'processing', 'approved', 'receiving', 'supplement', 'approved', 'draft'];
  const dossiers = customers.map((name, i) => {
    const status = stage[i];
    const ready = ['legal', 'approved'].includes(status);
    return {
      id: `${tenant === 'anphat' ? 'AP' : 'MK'}-2026-${String(128 + i).padStart(4, '0')}`, name,
      address: ['Thảo Điền, TP. Thủ Đức', 'Bến Nghé, Quận 1', 'Phường 7, Quận 3', 'An Phú, TP. Thủ Đức'][i % 4],
      type: i % 3 === 1 ? 'Chuyển nhượng căn hộ' : 'Chuyển nhượng nhà đất', status, assignee: i % 2 ? 4 : 2,
      date: `${String(31 - Math.floor(i / 2)).padStart(2, '0')}/10/2026`, version: 1, config: 'v1.2',
      documents: [
        { id: 1, name: 'CCCD_chu_so_huu.pdf', type: 'Căn cước công dân', status: ready ? 'confirmed' : 'review', subject: name, number: '079096001284', area: '', batch: 1 },
        { id: 2, name: 'Giay_chung_nhan.pdf', type: 'Giấy chứng nhận', status: ready ? 'confirmed' : 'review', subject: status === 'supplement' ? name + ' (khác nguồn)' : name, number: 'CS 082914', area: '86,5', batch: 1 },
        ...(ready ? [{ id: 3, name: 'Hop_dong_chuyen_nhuong.pdf', type: 'Hợp đồng', status: 'confirmed', subject: name, number: 'HĐ-0281', area: '86,5', batch: 2 }] : [])
      ],
      resolution: '', handoff: status === 'approved' ? (i === 3 ? 'failed' : 'sent') : 'none', attempts: status === 'approved' ? 1 : 0,
      history: [{ text: 'Tạo hồ sơ, áp dụng cấu hình v1.2', by: names[2], time: '09:15 · ' + `${31 - Math.floor(i / 2)}/10/2026` }], snapshots: [],
      batches: [{ id: 1, sender: name, count: 2, date: '09:20 · 30/10/2026' }, ...(ready ? [{ id: 2, sender: name, count: 1, date: '10:05 · 31/10/2026' }] : [])]
    };
  });
  return { employees, dossiers, config: 'v1.2', draft: false };
}
export const store = Object.fromEntries(tenants.map(t => [t.id, seed(t.id)]));
export function rulesFor(d) {
  const active = d.documents.filter(x => x.status !== 'replaced');
  const identity = active.find(x => x.type === 'Căn cước công dân' && x.status === 'confirmed');
  const certificate = active.find(x => x.type === 'Giấy chứng nhận' && x.status === 'confirmed');
  const contract = active.find(x => x.type === 'Hợp đồng' && x.status === 'confirmed');
  return [
    { name: 'Họ tên chủ sở hữu', left: identity?.subject, right: certificate?.subject, sources: 'CCCD ↔ Giấy chứng nhận' },
    { name: 'Diện tích chuyển nhượng', left: certificate?.area, right: contract?.area, sources: 'Giấy chứng nhận ↔ Hợp đồng' }
  ].map(r => ({ ...r, status: !r.left || !r.right ? 'waiting' : r.left === r.right ? 'match' : 'mismatch' }));
}
export function canSubmit(d) {
  return ['Căn cước công dân', 'Giấy chứng nhận', 'Hợp đồng'].every(type => d.documents.some(x => x.type === type && x.status === 'confirmed')) && rulesFor(d).every(r => r.status !== 'waiting');
}
export function canApprove(d, role) {
  return role === 'legal' && d.status === 'legal' && canSubmit(d) && (rulesFor(d).every(r => r.status === 'match') || Boolean(d.resolution));
}
