# DocSense AI frontend

Giao diện tiếng Việt cho nền tảng xử lý hồ sơ bất động sản đa tenant. Nghiệp vụ dựa trên backend Go tại `../itmo-vodka-sea-codex-be`; giao diện áp dụng hướng xanh lá, nền trắng/xám nhạt và typography tối giản từ [theme Figma được cung cấp](https://www.figma.com/design/BD8sjYpsgePgzMuO1Yliww/?node-id=211-1738).

Frontend đã nối API nghiệp vụ của backend và đối chiếu đến commit **`1a3ee15` (31/10/2026)**: đăng ký/đăng nhập, thành viên, catalog, hồ sơ, upload, xử lý tài liệu, kiểm duyệt, dashboard và audit. Chế độ mặc định dùng dữ liệu backend; `?mode=demo` dùng dữ liệu mẫu riêng trong bộ nhớ.

Giao diện có **Tiếng Việt / English** trên trang xác thực và thanh công cụ workspace. Lựa chọn lưu trong `localStorage` (`docsense:locale`), áp dụng ngay cho menu, biểu mẫu, modal, trạng thái, validation và thông báo; giữ nguyên dữ liệu đang nhập, nội dung doanh nghiệp, bằng chứng tài liệu và mã API.

## Chạy local

Cần Node.js 22 trở lên và npm. Frontend dùng ES modules/HTML/CSS, không cần framework hoặc dependency runtime.

```bash
npm install
npm run dev
```

Mở **http://127.0.0.1:5173**. Có thể đổi cổng bằng `PORT=4173 npm run dev`.

Trang mặc định là **đăng nhập**; `#/signup` mở đăng ký doanh nghiệp và admin đầu tiên. Server cũng redirect `/login` và `/signup` về hash route tương ứng để link trực tiếp hoạt động. Đăng ký xong đăng nhập bằng tài khoản vừa tạo. Mật khẩu mới tối thiểu 12 ký tự, tối đa 72 byte. Bearer token chỉ giữ trong bộ nhớ; tải lại trang cần đăng nhập lại. Đăng xuất xóa token và dữ liệu phiên trong frontend; backend chưa có API thu hồi token.

Chọn **Dùng bản demo** hoặc mở `/?mode=demo` để dùng màn hình mẫu. Demo không upload hoặc gọi OCR/AI và không tự thay thế dữ liệu khi API thật lỗi.

Để kiểm tra kết nối Go đang chạy:

```bash
BACKEND_ORIGIN=http://127.0.0.1:8080 npm run dev
```

Frontend proxy `/backend/health` tới `/health` của Go và chuyển tiếp `/api/v1/*` nguyên method/query/body/status tới backend, tránh cần CORS cho local. Proxy hỗ trợ JSON, multipart và stream file, giữ request ID và chỉ chuyển tiếp các header cần thiết. Route chưa có ở backend vẫn trả lỗi thật; không được thay bằng dữ liệu mẫu. `BACKEND_ORIGIN` là cấu hình server; không nhập credential hoặc PASETO key vào frontend. Dev server không tự đọc `.env`.

`src/api.js` cung cấp transport JSON/FormData/nội dung file, timeout, request ID, kiểm tra envelope và xử lý 401/403. `src/backend-service.js` ánh xạ DTO Go sang view, lọc/phân trang trên server, giữ version và loại bỏ phản hồi của phiên đã kết thúc. Thao tác có version nhận 409 sẽ tải lại hồ sơ và yêu cầu người dùng mở lại biểu mẫu để kiểm tra trước khi gửi; không tự retry mutation.

Chi tiết tự poll mỗi 3 giây khi còn tệp chờ/xử lý, tạm dừng khi có modal hoặc tab bị ẩn. File gốc chỉ tải qua Bearer request khi người dùng mở; URL blob được thu hồi khi đổi tài liệu, rời trang hoặc đăng xuất. Giá trị PII vẫn che mặc định; reveal gọi API và ghi audit. OCR/AI cần worker và provider được cấu hình trong backend; lỗi phụ thuộc được hiển thị từ máy chủ.

Nếu Go chưa chạy, frontend hiển thị lỗi kết nối. Health chỉ xác nhận liveness HTTP, không xác nhận DB, worker hoặc OCR đã sẵn sàng.

Backend `1a3ee15` sửa migration `companies.active` / `users.active`; trạng thái không xác định được giữ inactive, frontend không tự kích hoạt tài khoản. Nếu backend không khởi động vì dữ liệu cũ, xem `docs/auth-active-migration.md` trong repo backend. Cấu hình AI mặc định chuyển sang `openai-compatible`; worker vẫn mặc định tắt và model/key được cấu hình ở máy chủ. Không đưa API key vào frontend.

OpenAPI mới cho phép một số danh sách/map trả `null`; frontend chuẩn hóa về trạng thái rỗng. PDF nhiều tài liệu liên kết nhóm tới tệp dẫn xuất, còn trường trích xuất giữ file/trang gốc: chọn nhóm cụ thể khi phân loại và đổi đúng trang nguồn khi xem từng PDF dẫn xuất.

## Kiểm tra và build

```bash
npm run check
npm test
npm run test:e2e
npm run build
```

Browser test dùng Playwright với Google Chrome đã cài trên máy (`channel: chrome`), kiểm tra cả desktop 1440px và mobile 390px. Test tự mở server riêng ở cổng 41873 và dừng khi kết thúc. Ảnh chụp được lưu trong `test-results/`. Build tạo website static trong `dist/`; host production cần proxy `/backend/health` tới `/health` và `/api/v1/*` tới Go. Docker image đã có proxy Node.

## CI và container

GitHub Actions chạy kiểm tra source, unit/HTTP/API client, browser test, build và smoke-test container trên PR/push `main`. Có thể bật publish Docker Hub sau khi kiểm tra đạt; xem [hướng dẫn CI và Docker](docs/CI.md). Docker image phục vụ frontend và proxy API tại cổng 80, chạy non-root. Compose dùng `PORT=80`, `HOST=0.0.0.0`, `BACKEND_ORIGIN=http://api:8080`; Caddy cùng network proxy gọi `sea-codex-frontend:80`. Không cần Docker Hub secret để chạy job kiểm tra.

Image publish được đặt cố định là `duongtruong0409/sea-codex-frontend`, với tag `latest`, `sha-<commit>` và release `v*`. Để publish, cấu hình `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` và bật variable `PUBLISH_DOCKERHUB=true` trên GitHub.

## Gợi ý AI trong cấu hình

Trong **Cấu hình hồ sơ → Loại giấy tờ → Thêm loại giấy tờ**, panel **AI gợi ý trường trích xuất** có nút **Gợi ý bằng AI**, gọi `POST /api/v1/document-types/suggestions`. Kết quả điền vào bản nháp trường và yêu cầu kiểm tra; chỉ tạo cấu hình khi bấm **Lưu phiên bản**.

Với loại hồ sơ đã lưu, mở **Chỉnh sửa** hoặc **Gợi ý quy tắc bằng AI**. Panel này gọi `POST /api/v1/dossier-types/{code}/comparison-rules/suggestions`, giữ các quy tắc đang soạn và thêm đề xuất vào bản nháp. Loại hồ sơ mới cần lưu trước để có mã cấu hình. Gợi ý lệch version hoặc không còn khớp trường/giấy tờ đang chọn được báo lỗi để rà soát lại.

Nút AI vẫn hiện trong demo kèm giải thích cần đăng nhập tài khoản công ty; API AI chỉ dành cho admin công ty. Khi chờ phản hồi, giao diện có animation AI, khóa thao tác gửi trùng và trở lại biểu mẫu khi thành công/lỗi. Bản nháp đang nhập được giữ khi AI lỗi. Proxy chờ tối đa 120 giây riêng cho gợi ý AI; client 125 giây, request thường giữ timeout hiện hành. Các chuyển động tắt theo `prefers-reduced-motion`.

## Hiệu ứng và phản hồi

Trang đăng nhập/đăng ký có nền gradient và minh họa chuyển động chậm. Chuyển trang chạy trong 360ms; card nâng 2px khi hover; sidebar giữ highlight/vạch chỉ báo. Menu mobile trượt kèm backdrop mờ, giữ focus và đóng bằng Escape. Modal, toast, loading button và lỗi validation có phản hồi rõ ràng.

API client theo dõi số request đang chạy. Màn chờ xuất hiện sau 150ms để tránh nhấp nháy với phản hồi nhanh, giữ đến khi request cuối hoàn tất, rồi đóng cả khi lỗi/timeout. Các bước đọc tệp và kiểm tra trùng trong demo có tiến trình từng tệp; không trình bày thành tiến trình gửi mạng/OCR. Bấm field trong màn review sẽ chọn trang nguồn, focus và tô sáng bằng chứng mà vẫn giữ PII đã che. Các chuyển động tôn trọng `prefers-reduced-motion`.

## Cấu trúc

```text
index.html                    Entry frontend mới
src/                          Giao diện, dữ liệu/logic demo, tích hợp backend, i18n và CSS
assets/                       Logo và minh họa SVG local
scripts/                      Dev server, static build, kiểm tra source
tests/                        Kiểm tra logic và browser
docs/BACKEND_INTEGRATION.md    Contract đã tích hợp, quyền và giới hạn kiểm chứng
prototype/                    Prototype WIP cũ, không dùng cho giao diện mới
PRODUCT_PLAN.md               Kế hoạch frontend cũ; backend được ưu tiên khi mâu thuẫn
```

Xem [đối chiếu backend và kế hoạch tích hợp](docs/BACKEND_INTEGRATION.md) để phân biệt endpoint chạy thật với API chỉ có trong thiết kế. Nghiệp vụ dùng đúng sáu mã trạng thái hồ sơ của backend, tenant theo `company_id`, phân quyền theo permission, audit và PII. Không đưa bàn giao/export hay tài khoản nhiều công ty của kế hoạch cũ vào luồng sản phẩm.
