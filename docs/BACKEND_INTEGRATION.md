# Backend và hợp đồng tích hợp frontend

Ngày đối chiếu: **31/10/2026**. Backend: `../itmo-vodka-sea-codex-be`.

Frontend lấy backend làm nguồn chuẩn. `PRODUCT_PLAN.md` là kế hoạch frontend cũ; không dùng các giả định trong đó để thay đổi nghiệp vụ backend.

## 1. Kết luận kiểm tra source

**Backend hiện chỉ có một endpoint chạy thật: `GET /health`.** Các màn hình nghiệp vụ của frontend dùng dữ liệu và thao tác mô phỏng trong bộ nhớ. Không gọi API giả rồi hiển thị như dữ liệu được backend xác thực.

Bằng chứng trong backend:

- `docs/api/api_spec.json` chỉ có một path `/health`.
- `internal/health/routes/v1/routes.go` đăng ký `router.GET("/health", handlers.Check)`.
- `internal/bootstrap/router_test.go` kiểm tra router có đúng một route và kiểm tra `/api/v1/auth/signup`, `/api/v1/dossiers`, `/api/v1/audit-logs` trả `404`.
- `internal/auth/server.go`, `internal/dossier/server.go`, `internal/audit/server.go` chỉ có hàm wiring rỗng. Các package nghiệp vụ mới chứa `doc.go`.
- `README.md`, `docs/source-code-architecture.md` và `docs/scaffold-verification.md` xác nhận phạm vi scaffold này.

`docs/backend-system-design.md` có blueprint và bảng ghi “đã triển khai” của **hệ thống tham khảo** ở mục 10. Những bảng đó không chứng minh tính năng đã tồn tại trong source backend hiện tại.

Khi nguồn mâu thuẫn, thứ tự ưu tiên là:

1. Route/DTO/logic/test thực tế và OpenAPI đã kiểm chứng của backend.
2. README, kiến trúc và kết quả kiểm chứng backend.
3. Thiết kế nghiệp vụ và blueprint backend, dùng để dựng demo và lập backlog.
4. `PRODUCT_PLAN.md` và prototype frontend cũ.

Nếu source và OpenAPI lệch nhau sau này, dừng tích hợp endpoint liên quan để sửa hợp đồng; không đoán response.

## 2. Những gì backend đã có

| Thành phần | Hiện trạng |
| --- | --- |
| HTTP | Go 1.26, Gin, router dùng chung, `404`/`405` theo JSON envelope, graceful shutdown |
| Cấu hình | YAML + biến môi trường Viper, validation, không tự đọc `.env` |
| Database | GORM/PostgreSQL, ping lúc startup, connection pool; chưa tạo bảng nghiệp vụ |
| Token | PASETO v4.public, key pair cấu hình ổn định, identity/expiry/signature; có công cụ `cmd/keygen` |
| Mật khẩu | bcrypt hash và verify; chưa có API đăng nhập |
| Identity | Actor trong request context, có `user_id`, `company_id`, email, role, permissions |
| Middleware | Request ID, structured logger, recovery, auth, permission |
| Model dùng chung | UUID, timestamps, soft delete; không áp dụng soft delete cho audit theo thiết kế |
| Health | Luồng service → logic → handler → route hoàn chỉnh, không đọc DB mỗi request |
| Auth / Dossier / Audit | Mới có ranh giới package; chưa có route, entity, migration hoặc persistence nghiệp vụ |

`IdentityResolver` thật đọc user/company từ DB chưa được triển khai. Middleware bảo vệ route từ chối khi thiếu resolver; không có cơ chế cho phép truy cập vì đang ở scaffold. Các test middleware dùng resolver giả, chưa chứng minh cách ly tenant toàn hệ thống.

## 3. API thật và kết nối frontend

| Thuộc tính | Hợp đồng đã xác minh |
| --- | --- |
| Method/path | `GET /health`, ngoài prefix `/api/v1` |
| Quyền | Public, không cần Bearer token |
| Request body | Không có |
| Header tùy chọn | `X-Request-ID`: UUID hợp lệ; thiếu/sai thì server tạo mới |
| Thành công | HTTP `200`, `{ "code": 200, "message": "Service is running", "data": { "status": "ok" } }` |
| Không sẵn sàng | HTTP `503`, JSON error envelope có `data: null` |
| Header phản hồi | `X-Request-ID`, dùng đối chiếu log |
| Method không hỗ trợ | `POST /health` trả `405` |
| Route chưa triển khai | Trả `404`, không chuyển sang frontend HTML |

Health chỉ chứng minh process HTTP còn hoạt động. Nó **không** kiểm tra khả năng OCR, bảng dữ liệu hoặc worker. Startup backend vẫn cần PostgreSQL và PASETO key pair hợp lệ.

Frontend gọi `GET /backend/health`. Dev server Node chuyển request tới `${BACKEND_ORIGIN}/health`, mặc định `http://127.0.0.1:8080/health`. Đây là route proxy của **frontend**, không phải endpoint mới của Go. Proxy không tạo hoặc mô phỏng kết quả thành công khi Go chưa chạy; lỗi kết nối trả `503`.

Server frontend cũng chuyển tiếp `/api/v1/*` tới cùng backend, giữ method, query, body JSON/multipart, response status, request ID và nội dung file. Không chuyển cookie hoặc `X-Company-ID` tùy ý; tenant vẫn do backend resolve. Redirect upstream không được đi theo kèm credential. Route nghiệp vụ chưa triển khai vẫn trả `404` từ Go, hoặc `503` khi Go không chạy. Việc có proxy không có nghĩa endpoint nghiệp vụ đã được triển khai.

`src/api.js` xác minh HTTP status/envelope và `data.status` của health, giữ request ID, xử lý timeout/JSON không hợp lệ. API client giữ Bearer token trong bộ nhớ, xóa credential và thông báo khi gặp `401`; `403` giữ phiên và trả lỗi quyền. Không tự retry mutation. Chưa có auth DTO nên frontend không tự dựng lời gọi đăng nhập/đăng ký từ ví dụ blueprint. Khi triển khai bằng static host thuần, reverse proxy cần cấu hình `/backend/health` và `/api/v1/*` tương ứng; Docker image frontend đã chứa proxy Node.

Trang đăng nhập và đăng ký mặc định hiển thị trạng thái **đang chờ API xác thực**, không gửi credential. `?mode=demo` là lựa chọn rõ ràng để dùng dữ liệu mẫu. Đăng xuất demo xóa trạng thái trong bộ nhớ; backend chưa công bố API thu hồi phiên/token. Không gọi một endpoint logout tự đặt tên.

Envelope chung đã có trong Go:

```json
{ "code": 200, "message": "...", "data": {} }
```

Lỗi luôn có `data: null`. Bộ ánh xạ dùng chung có `400` input không hợp lệ, `401` chưa xác thực, `403` thiếu quyền, `404` không tìm thấy, `409` xung đột version/trạng thái, `503` dependency chưa sẵn sàng và `500` lỗi nội bộ. Đây là nền tảng xử lý lỗi, không chứng minh các endpoint nghiệp vụ đã hoạt động.

## 4. API trong blueprint, chưa tồn tại ở runtime

Các path dưới đây được trích từ thiết kế backend. Chúng **chưa được khai báo như API hoạt động trong frontend**. Prefix nghiệp vụ dự kiến là `/api/v1`.

| Nhóm | Method/path có nêu trong tài liệu | Trạng thái |
| --- | --- | --- |
| Đăng ký công ty | `POST /api/v1/auth/signup` | Chưa triển khai |
| Đăng nhập | `POST /api/v1/auth/login` | Chưa triển khai |
| Phiên hiện tại | `GET /api/v1/auth/me` | Chưa triển khai |
| Thành viên | `GET /api/v1/auth/users`, `POST /api/v1/auth/users` | Chưa triển khai |
| Quyền thành viên | `PATCH /api/v1/auth/users/{id}/access` | Chưa triển khai |
| Loại giấy tờ | `GET /api/v1/document-types`, `POST /api/v1/document-types` | Chưa triển khai |
| Một loại giấy tờ | `GET`, `PUT`, `DELETE /api/v1/document-types/{code}` | Chưa triển khai |
| Gợi ý giấy tờ | `POST /api/v1/document-types/suggestions` | Chưa triển khai |
| Loại bộ hồ sơ | `GET /api/v1/dossier-types`, `POST /api/v1/dossier-types` | Chưa triển khai |
| Một loại bộ hồ sơ | `GET`, `PUT`, `DELETE /api/v1/dossier-types/{code}` | Chưa triển khai |
| Gợi ý luật | `POST /api/v1/dossier-types/{code}/comparison-rules/suggestions` | Chưa triển khai |
| Danh sách / tạo hồ sơ | `GET /api/v1/dossiers`, `POST /api/v1/dossiers` | Chưa triển khai |
| Chi tiết hồ sơ | `GET /api/v1/dossiers/{id}` | Chưa triển khai |
| Upload nhiều tệp | `POST /api/v1/dossiers/{id}/files` | Chưa triển khai |
| Hàng đợi duyệt | `GET /api/v1/dossiers/review-queue` | Chưa triển khai |
| Xem PII | `POST /api/v1/dossiers/{id}/pii/reveal` | Chưa triển khai |
| Audit | `GET /api/v1/audit-logs` | Chưa triển khai |
| Dashboard | `GET /api/v1/dashboard/statuses` | Chưa triển khai |

Tài liệu còn mô tả phân công, thêm/bỏ yêu cầu có điều kiện, retry file lỗi, stream nội dung file, phân loại trang, sửa trường, xác nhận cảnh báo, quyết định duyệt và mở lại. **Không tự đặt method/path** cho các thao tác này vì OpenAPI/DTO hiện chưa định nghĩa contract.

Trước khi nối bất kỳ API nghiệp vụ nào, backend cần cung cấp route + DTO + OpenAPI + test tương ứng, gồm tên field, UUID/code, pagination/filter/sort, response shape, quyền, tenant/assignment scope, validation/error, version/concurrency và trạng thái bất đồng bộ. Các object demo frontend không phải DTO chính thức.

## 5. Nghiệp vụ chuẩn frontend phải theo

### Tenant và quyền

- Tenant là công ty; mỗi user thuộc **một** `company_id` theo thiết kế backend hiện tại.
- Signup tạo company và `company_admin` đầu tiên nguyên tử. Thành viên tiếp theo do admin công ty tạo; không tự tham gia bằng cách nhập company ID.
- `company_id` và quyền của phiên thật phải lấy từ actor do server resolve, không dùng tenant/role tùy chọn trên frontend để quyết định quyền.
- Token chỉ chứa identity và thời gian. Backend đọc lại user/company/quyền hiện hành mỗi request.
- Role trong blueprint: `broker`, `legal_specialist`, `notary`, `manager`, `company_admin`, `platform_admin`. Không gán platform admin qua quản trị công ty.
- Source hiện chỉ bảo đảm hai quyền mặc định của `company_admin`: `pii:view` và `dashboard:read`. Các quyền khác phải do resolver/permissions thực tế trả về; admin không có blanket bypass tenant hoặc permission.
- Bảng quyền chi tiết trong blueprint dùng cho phiên demo và cần xác nhận khi auth được triển khai. Môi giới không sửa trường trích xuất hoặc duyệt hồ sơ.
- Đổi tài khoản/company trong demo chỉ để xem dữ liệu mẫu riêng biệt; không thể hiện tính năng một tài khoản đổi qua nhiều công ty ở production.

### Trạng thái hồ sơ

| Mã backend | Hiển thị frontend | Ý nghĩa |
| --- | --- | --- |
| `PROCESSING` | Đang xử lý | Còn file hoặc kiểm tra đang chạy |
| `MISSING_DOCUMENT` | Thiếu giấy tờ | Đã xử lý đợt hiện tại, checklist còn thiếu |
| `INVALID_DOCUMENT` | Có sai lệch | Có tài liệu lỗi hoặc blocker; vẫn hiển thị giấy tờ còn thiếu |
| `VALID_DOCUMENT` | Chờ kiểm duyệt | Đủ nguồn và không còn blocker; chưa được phê duyệt |
| `APPROVED_DOCUMENT` | Đã phê duyệt | Khóa sửa; phải mở lại có lý do để thay đổi |
| `REJECTED` | Đã từ chối | Có lý do và lịch sử quyết định |

Không dùng enum trạng thái của prototype cũ thay cho các mã trên. Khi đã xử lý xong và vừa có lỗi vừa thiếu giấy tờ, `INVALID_DOCUMENT` được ưu tiên; khi còn tiến trình thì giữ `PROCESSING`.

### Tệp, checklist và tài liệu

- Trạng thái file: `UPLOADED → PROCESSING → EXTRACTED / FAILED`; mỗi file độc lập.
- Checklist theo loại giấy tờ có `MISSING_DOCUMENT`, `UPLOADED`, `PROCESSING`, `EXTRACTED`, `FAILED`, `PENDING_CONDITION`, `NOT_REQUIRED`. “Thiếu giấy tờ” không phải trạng thái của một file chưa tồn tại.
- Mỗi đợt bổ sung cập nhật cùng hồ sơ. File `FAILED` không đáp ứng checklist; retry chỉ tác động file được chọn.
- Blueprint dùng JPEG/PNG/PDF, mặc định 20 MiB mỗi file, 10 file/request và 100 trang PDF. Đây là giới hạn dự kiến; file policy thật phải lấy từ backend khi triển khai.
- PDF nhiều tài liệu giữ file gốc, document groups và mapping trang nguồn. Bản demo không được tuyên bố đã OCR hoặc tách PDF thật.

### Đối soát, duyệt và PII

- Kết quả rule: `PENDING_DOCUMENTS`, `OPEN`, `RESOLVED`, `ACKNOWLEDGED`; severity `BLOCKER`, `WARNING`, `INFO`.
- Thiếu nguồn không kết luận khớp. Confidence thấp, ngày/số không parse được hoặc ghép chủ thể không rõ phải cần người kiểm tra; không tự kết luận blocker.
- Operator theo blueprint: `TEXT_EQUALS`, `DIGITS_EQUAL`, `DATE_EQUAL`, `NUMBER_EQUAL`. So đúng loại giấy tờ, trường và chủ thể.
- Chỉ `WARNING` được acknowledge và phải có lý do. Không acknowledge blocker để bỏ qua lỗi.
- Phê duyệt chỉ từ `VALID_DOCUMENT`, đủ checklist, không còn blocker/warning mở hoặc rule chờ dữ liệu. Quyết định có actor, thời gian, lý do và version.
- Sửa trường yêu cầu mã lý do `OCR_ERROR`, `SOURCE_ERROR`, `ADMIN_UNIT_CHANGE`, `OTHER`; chạy lại đối soát và ghi audit. Mở lại hồ sơ đã duyệt yêu cầu lý do và duyệt lại.
- API thật phải trả PII đã che mặc định. Reveal yêu cầu `pii:view`, tenant/assignment và audit `VIEW_PII`. Không coi việc che bằng CSS là kiểm soát quyền.
- Ảnh gốc cần quyền riêng `dossier:image_view` và audit. Khi chưa có ảnh đã làm mờ, không đưa ảnh gốc cho môi giới.
- Audit append-only theo tenant. Không lưu password, token, raw PII hoặc nội dung ảnh trong audit.

### Catalog và dashboard

- Catalog theo ba tầng: loại bộ hồ sơ → yêu cầu loại giấy tờ → schema trường. Không hardcode Mua bán/Cho thuê làm enum đóng.
- Code/key do server sinh, bất biến khi đổi tên. Bản demo sinh mã để minh họa, không thay thế uniqueness constraint phía backend.
- Hồ sơ giữ snapshot phiên bản; đổi catalog không thay đổi hồ sơ cũ.
- Gợi ý AI chỉ dùng mô tả/schema cấu hình, là nháp; admin chọn lưu mới áp dụng. Không gửi dữ liệu hồ sơ hoặc PII để gợi ý luật.
- Thiết kế dashboard có mâu thuẫn giữa “lượt chuyển trạng thái” và “hồ sơ duy nhất theo lịch sử”. Frontend phải ghi rõ metric; khi tích hợp cần backend chốt semantics và response. Không dùng `updated_at` để suy ra lịch sử trạng thái.

## 6. Màn hình và phụ thuộc backend

| Màn hình frontend | Dữ liệu / hành động cần backend | Cách chạy hiện tại |
| --- | --- | --- |
| Đăng nhập / đăng ký công ty | Signup, login, me, resolver user/company/permissions | Demo, không tạo token hoặc tài khoản thật |
| Dashboard | Tổng hợp status history theo ngày/tenant/loại, drill-down cùng bộ lọc | Dữ liệu mô phỏng, metric được ghi rõ |
| Danh sách hồ sơ | List/filter/search/pagination, tạo hồ sơ theo catalog | Demo theo company của tài khoản mẫu |
| Chi tiết / tiếp nhận | Snapshot checklist, nhiều đợt, file/group/page, assignment | Demo, không upload lên Go |
| Kiểm tra tài liệu | Protected file content, source/confidence, sửa/phân loại/retry | Minh họa OCR, không xác thực tài liệu thật |
| Đối soát / hàng đợi duyệt | Rules/issues, acknowledge warning, approve/reject/reopen | State machine và quyết định mô phỏng |
| Thành viên | List/create/update access trong company | Demo, không gửi email |
| Cấu hình catalog | CRUD document/dossier types, schema/rule versions, gợi ý | Demo, không gọi AI |
| Nhật ký hoạt động | Query audit theo tenant, actor, action, thời gian | Audit bộ nhớ của demo |
| Kết nối backend | Liveness `/health`, HTTP/envelope/request ID | Request thật qua proxy Node |

Không dựng số liệu chất lượng AI như kết quả đánh giá thật khi backend chưa có evaluation dataset/API.

## 7. Những giả định frontend cũ đã loại khỏi thiết kế mới

- Bàn giao hệ thống ngoài, gửi lại, webhook, CRM, API key và xuất JSON/CSV: ngoài phạm vi backend.
- Một tài khoản có nhiều tư cách thành viên công ty: chưa phù hợp mô hình `users.company_id` hiện tại.
- Màn hình quản trị nền tảng tạo/tạm ngưng doanh nghiệp: chưa có route/luồng hỗ trợ trong backend này.
- Quyền suy ra chỉ từ việc là admin: thay bằng permission + tenant/assignment.
- Các trạng thái “nháp”, “đang tiếp nhận”, “cần bổ sung”, “chờ pháp lý” dạng enum riêng: thay bằng mã backend; tiếng Việt chỉ là nhãn.
- Kết quả OCR, đối soát, PDF đã tách hoặc email đã gửi giả: phải ghi rõ mô phỏng, không trình bày như kết quả backend.

`prototype/` là bản WIP lịch sử, không phải entrypoint của frontend mới. `npm run dev` dùng `index.html` và `src/`.

## 8. Thứ tự tích hợp cần làm tiếp

1. **Auth và tenant:** company/user schema, signup nguyên tử, login/me, DB identity resolver, quyền thực tế, trạng thái tài khoản; test 401/403 và tenant isolation. Chốt cơ chế hết hạn/đăng xuất token và policy lưu phiên.
2. **Audit và PII:** audit transaction cùng mutation, che/reveal, protected file content, quyền theo đối tượng; test không lộ raw PII.
3. **Catalog:** CRUD, auto code/key, typed fields, required/conditional, rule validation, version snapshot; cập nhật OpenAPI.
4. **Hồ sơ và tiếp nhận:** list/detail/create/assignment/checklist, multipart upload, hash trùng, giới hạn file, per-file retry, nguồn trang/file dẫn xuất; chốt async polling contract.
5. **Xử lý và kiểm duyệt:** worker/OCR/grouping, field corrections + data version, rule engine, acknowledge, approve/reject/reopen, concurrency và audit; test end-to-end các điều kiện không được duyệt.
6. **Dashboard và audit query:** chốt metric, múi giờ, khoảng ngày bao hàm, drill-down và pagination; phân biệt snapshot với history.
7. **Thay adapter demo:** chỉ đổi từng nhóm sau khi route/DTO/OpenAPI và test backend đạt. Giữ test frontend cho loading/empty/error/permission/session expiry/conflict, không fallback sang demo khi API thật lỗi.

Backend repository không bị sửa bởi công việc dựng frontend này.
