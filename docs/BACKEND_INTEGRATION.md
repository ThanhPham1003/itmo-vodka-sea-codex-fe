# Tích hợp backend vào frontend

Đối chiếu ngày **31/10/2026**, backend `../itmo-vodka-sea-codex-be`, commit **1a3ee15**. Commit `2265fce` triển khai auth, catalog, hồ sơ, worker, review, dashboard và audit; `1a3ee15` sửa migration trạng thái active, cập nhật nullability của OpenAPI và bổ sung kiểm thử PDF/PostgreSQL.

Nguồn chuẩn: `internal/{auth,dossier,audit}/routes/v1/routes.go`, DTO/models/logic thực tế, `docs/api/api_spec.json`, `docs/backend-api-guide.md`. Kế hoạch cũ trong `PRODUCT_PLAN.md` và prototype không thay thế contract Go.

## Thay đổi từ 2265fce đến 1a3ee15

- Không thêm/bỏ path hoặc method. OpenAPI làm rõ nullable cho collections/maps và non-null cho request bắt buộc; `PATCH /auth/users/{id}/access` luôn gửi boolean `active`, giữ nguyên `false`, không dùng null hoặc suy ra trạng thái khi đầu vào bị thiếu.
- Dashboard `totals:null` và `daily[].counts:null`, detail/catalog collections null và permissions null được xử lý thành dữ liệu rỗng phù hợp từng view. Không sửa DTO hoặc giả lập API mới để bù thay đổi.
- Test mới `internal/bootstrap/pdf_processing_test.go` xác nhận `group.file_id` trỏ PDF dẫn xuất, trong khi field giữ `file_id` và `page` của PDF gốc. Frontend liên kết nhóm từ tệp gốc qua `source_file_id`, ghép field cho PDF dẫn xuất bằng `document_group_id`, không đoán theo trang trùng nhau. PDF nhiều nhóm phải chọn nhóm trước khi gửi classification; view dẫn xuất tự chọn đúng trang nguồn và ánh xạ sang số trang trong PDF dẫn xuất.
- Migration active giữ true/false hiện có; chỉ backfill hàng null từ `is_active` boolean, nếu chưa biết thì false. Frontend hiển thị tài khoản inactive, không tự kích hoạt hoặc sửa dữ liệu DB. Lỗi migration xảy ra trước khi HTTP server chạy; hướng dẫn khôi phục nằm ở `docs/auth-active-migration.md` trong repo backend.
- Provider mặc định là `openai-compatible`, base URL `https://api.openai.com`; worker vẫn mặc định tắt. Model/key và migration là cấu hình máy chủ, không chuyển vào frontend. Các thay đổi CI/Docker/PostgreSQL không tạo thêm API trạng thái sẵn sàng cho frontend.

## Luồng đã nối

| Giao diện | API `/api/v1` | Hành vi |
| --- | --- | --- |
| Đăng ký | `POST /auth/signup` | Company lồng trong body; tạo admin đầu tiên, sau đó đăng nhập riêng |
| Đăng nhập/phiên | `POST /auth/login`, `GET /auth/me` | Token trong bộ nhớ; tenant, quyền và tên công ty từ API |
| Thành viên | `GET/POST /auth/users`, `PATCH /auth/users/{id}/access` | Admin công ty; username/mật khẩu ban đầu; role, active và quyền bổ sung |
| Loại giấy tờ | `GET/POST /document-types`, `PUT/DELETE /document-types/{code}` | Schema trường, yêu cầu đặc biệt, version và archive |
| Loại hồ sơ | `GET/POST /dossier-types`, `PUT/DELETE /dossier-types/{code}` | Checklist, min_count, vai trò chủ thể, rule references và version |
| Gợi ý AI | `POST /document-types/suggestions`, `/dossier-types/suggestions`, `/dossier-types/{code}/comparison-rules/suggestions` | Giữ nháp trong editor; chỉ lưu khi người dùng xác nhận |
| Danh sách/tạo | `GET/POST /dossiers` | Lọc search/status/dossier_type/assignee_id/from/to/timezone và limit/offset trên server |
| Chi tiết | `GET /dossiers/{id}` | DTO gồm dossier, checklist, files, document_groups, fields, issues, decisions |
| Upload | `POST /dossiers/{id}/files` | Multipart lặp files/document_types/roles; hỗ trợ thay file lỗi; giữ kết quả UPLOADED/DUPLICATE/REJECTED riêng từng tệp |
| Phân công | `PATCH /dossiers/{id}/assignment` | assignee_id hoặc null, priority 0..5 |
| Phân loại/thử lại | `PATCH .../files/{id}/classification`, `POST .../files/{id}/retry` | Có chọn group và role; tiếp tục trích xuất bất đồng bộ |
| Checklist phát sinh | `POST .../requirements`, `DELETE .../requirements/{id}` | Theo snapshot, yêu cầu lý do; waive dùng UUID của requirement |
| Sửa trường | `PATCH .../fields/{id}` | Dùng UUID trường, không dùng schema key; value/reason/note |
| Xác nhận cảnh báo | `POST .../issues/{id}/acknowledge` | Chỉ WARNING, có lý do |
| Quyết định/mở lại | `POST .../decisions`, `POST .../reopen` | APPROVE/REJECT/REQUEST_CHANGES; kiểm tra người được giao và version |
| PII/tài liệu gốc | `POST .../pii/reveal`, `GET .../files/{id}/content` | Reveal rõ ràng; file tải bằng Bearer, hiển thị blob ảnh/PDF và nguồn trang |
| Dashboard | `GET /dashboard/statuses` | current/transitions/unique; chart, timezone Việt Nam và drill-down giữ bộ lọc |
| Audit | `GET /audit-logs` | Phân trang và lọc action/actor_id/resource_id/dossier_id/from/to; tìm nội dung chỉ trong trang hiện tại |

## Ranh giới dữ liệu và quyền

- `src/api.js` chịu trách nhiệm transport, envelope `{code,message,data}`, request ID, timeout và phiên. Auth công khai không gửi token. 401 ở route được bảo vệ xóa phiên; 403 giữ phiên và trả lỗi. Không tự retry mutation.
- `src/backend-service.js` ánh xạ snake_case DTO và lưu dữ liệu của trang hiện tại. Load bị hủy hoặc phản hồi sau logout không được cập nhật view. Không fallback sang demo khi lỗi API.
- Tenant lấy từ `/auth/me`, không có company selector trong luồng thật. API thành viên chỉ gọi cho `company_admin`; quyền backend là `user:manage`. Màn hình phân công của manager dùng ID người phụ trách vì backend chưa có directory thành viên dành cho manager.
- Backend trả effective permissions. Editor quyền chỉ đánh dấu phần ngoài quyền mặc định của role; resolver backend vẫn là nơi thực thi quyền. `dossier:classify` trong demo ánh xạ sang `dossier:correct` ở API.
- PII trong detail do backend mask. Reveal chỉ giữ trong view, xóa khi đổi tab/tài liệu, reload hoặc logout. File content không gắn token vào URL; blob bị revoke khi rời view. Trang nguồn của PDF dẫn xuất ánh xạ qua `source_pages`.
- PDF nhiều nhóm có thể lặp schema key; các thao tác sửa/reveal dùng field UUID. Catalog giữ key/code, rule role/subject_field, schema version và typed condition cũ khi chỉnh sửa. Giao diện hỗ trợ thêm điều kiện thủ công bằng mô tả; điều kiện máy đọc được có sẵn từ API/AI được giữ lại.
- Mutation hồ sơ gửi `expected_version` của detail. 409 tải detail mới, chặn gửi lại biểu mẫu cũ; đóng và mở lại để rà soát. Upload tự tăng version trên server. Catalog PUT dùng `expected_version=current_version`.
- Poll 3 giây khi tệp UPLOADED/PROCESSING. Poll không hiện màn chờ toàn trang, không cập nhật revision trong lúc modal đang mở. Không trình bày phần trăm upload/OCR giả.
- Tab lịch sử thật hiển thị quyết định từ detail. Người có audit:read có thể mở audit của hồ sơ; không suy diễn một API status-history riêng.

## Dashboard và thời gian

Sáu trạng thái: PROCESSING, MISSING_DOCUMENT, INVALID_DOCUMENT, VALID_DOCUMENT, APPROVED_DOCUMENT, REJECTED. Backend quyết định trạng thái và điều kiện approve.

`current` là snapshot không áp dụng khoảng ngày; drill-down từ snapshot bỏ ngày để giữ đúng semantics. `transitions` đếm mọi lượt chuyển; `unique` đếm dossier/status duy nhất. Tổng ở hai chế độ lịch sử là tổng lượt hoặc tổng cặp dossier/status, không phải số dossier phân biệt toàn kỳ. Query from/to của danh sách lọc lịch sử trạng thái, không lọc ngày tạo hoặc ép trạng thái hiện tại. Tất cả query dùng `Asia/Ho_Chi_Minh`; ngày kết thúc bao gồm cả ngày.

## Proxy, chạy và giới hạn kiểm chứng

```bash
BACKEND_ORIGIN=http://127.0.0.1:8080 npm run dev
```

Node proxy `/backend/health` → `/health`, `/api/v1/*` giữ method/query/body/status/header cần thiết và stream nội dung. Không chuyển cookie hoặc tenant header tùy ý. Không follow redirect có credential. Static host thuần phải cấu hình hai đường proxy; Docker frontend đã có server này.

Test đơn vị/HTTP và Playwright dùng response fixtures bám DTO/routes của commit 1a3ee15: auth, quyền, filter/pagination, multipart, conflict, PII/file, locale và luồng demo. Tại thời điểm tích hợp không có backend chạy ở `127.0.0.1:8080`, nên chưa xác minh một phiên thực với PostgreSQL, worker, Poppler và AI provider. Health thành công cũng không chứng minh OCR hoạt động.

Không có API logout/revocation, refresh token, directory manager, status-history riêng, export/webhook hoặc platform admin. Lựa chọn ngôn ngữ lưu riêng trong `localStorage` (`docsense:locale`); token không lưu ở đó. Văn bản và bằng chứng do doanh nghiệp cung cấp giữ nguyên ngôn ngữ nguồn.

## Vị trí sử dụng hai API gợi ý

- `POST /document-types/suggestions`: nút **Gợi ý bằng AI** ngay dưới **Mô tả nhận diện giấy tờ** trong form thêm/sửa. Ghép tên hiển thị và mô tả thành `description` (tối đa 4000 byte theo logic BE), không cần nhập mô tả AI riêng. Đề xuất trường và kiểm tra đặc biệt vào bản nháp, giữ severity/PII/type từ phản hồi.
- `POST /dossier-types/{code}/comparison-rules/suggestions`: nút **Gợi ý quy tắc bằng AI** ngay dưới **Mô tả nghiệp vụ** trong form loại hồ sơ đã lưu, dùng chung tên và mô tả để gửi `description`. Kiểm tra `configuration_version`, thêm đề xuất vào các quy tắc đang soạn và kiểm tra tham chiếu hiện tại trước khi hiển thị. Chưa có code thì hướng dẫn lưu loại hồ sơ trước.
- Hai luồng chỉ gọi API gợi ý khi bấm nút; không tự POST/PUT lưu catalog. Chỉ **Lưu phiên bản** mới ghi cấu hình. Nút không bị giấu ở demo; hiển thị disabled và lý do cần tài khoản admin công ty.
- Màn chờ AI bám request thật, không có phần trăm hoặc tiến độ giả; kết thúc khi trả về, lỗi hoặc timeout. AI có deadline proxy 120s/client 125s; các request khác giữ 30s/10s.
