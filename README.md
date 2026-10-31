# DocSense AI frontend

Giao diện tiếng Việt cho nền tảng xử lý hồ sơ bất động sản đa tenant. Nghiệp vụ dựa trên backend Go tại `../itmo-vodka-sea-codex-be`; giao diện áp dụng hướng xanh lá, nền trắng/xám nhạt và typography tối giản từ [theme Figma được cung cấp](https://www.figma.com/design/BD8sjYpsgePgzMuO1Yliww/?node-id=211-1738).

**Backend hiện chỉ triển khai `GET /health`.** Các luồng hồ sơ, thành viên, catalog, OCR, đối soát và duyệt trong frontend dùng dữ liệu mô phỏng trong bộ nhớ. Tải lại trang sẽ đặt lại dữ liệu; không gửi email, gọi AI, upload tài liệu hoặc phê duyệt thật.

## Chạy local

Cần Node.js 22 trở lên và npm. Frontend dùng ES modules/HTML/CSS, không cần framework hoặc dependency runtime.

```bash
npm install
npm run dev
```

Mở **http://127.0.0.1:5173**. Có thể đổi cổng bằng `PORT=4173 npm run dev`.

Trang mặc định là **đăng nhập**; `#/signup` mở đăng ký công ty. Backend chưa có API xác thực nên nút gửi được khóa và không gửi credential. Chọn **Dùng bản demo** hoặc mở `/?mode=demo` để dùng các màn hình nghiệp vụ mẫu. Demo có chọn vai trò, đăng ký công ty mô phỏng, xác nhận mật khẩu và đăng xuất; logout xóa phiên trong bộ nhớ. Chưa có API backend để thu hồi token/phiên.

Để kiểm tra kết nối Go đang chạy:

```bash
BACKEND_ORIGIN=http://127.0.0.1:8080 npm run dev
```

Frontend proxy `/backend/health` tới `/health` của Go và chuyển tiếp `/api/v1/*` nguyên method/query/body/status tới backend, tránh cần CORS cho local. Proxy hỗ trợ JSON, multipart và stream file, giữ request ID và chỉ chuyển tiếp các header cần thiết. Route chưa có ở backend vẫn trả lỗi thật; không được thay bằng dữ liệu mẫu. `BACKEND_ORIGIN` là cấu hình server; không nhập credential hoặc PASETO key vào frontend. Dev server không tự đọc `.env`.

`src/api.js` cung cấp API client dùng Bearer token trong bộ nhớ, JSON/FormData, timeout, request ID, kiểm tra envelope và xử lý 401/403. `/health` là lời gọi nghiệp vụ đã nối thật duy nhất; không tạo hàm login/signup với request/response suy đoán. Các màn hình hồ sơ chỉ mở trong demo cho đến khi backend công bố route và DTO.

Nếu Go chưa chạy, màn hình kết nối hiển thị không sẵn sàng; các luồng demo vẫn dùng được. Health thành công chỉ xác nhận liveness HTTP, không xác nhận API nghiệp vụ/OCR đã có.

## Kiểm tra và build

```bash
npm run check
npm test
npm run test:e2e
npm run build
```

Browser test dùng Playwright với Google Chrome đã cài trên máy (`channel: chrome`), kiểm tra cả desktop 1440px và mobile 390px. Test tự mở server riêng ở cổng 41873 và dừng khi kết thúc. Ảnh chụp được lưu trong `test-results/`. Build tạo website static trong `dist/`; host production cần reverse proxy `/backend/health` tới Go nếu muốn dùng chức năng kiểm tra kết nối.

## CI và container

GitHub Actions chạy kiểm tra source, unit/HTTP/API client, browser test, build và smoke-test container trên PR/push `main`. Có thể bật publish Docker Hub sau khi kiểm tra đạt; xem [hướng dẫn CI và Docker](docs/CI.md). Docker image phục vụ cả frontend đã build và proxy API, chạy non-root. Không cần Docker Hub secret để chạy job kiểm tra.

## Cấu trúc

```text
index.html                    Entry frontend mới
src/                          Giao diện, dữ liệu/logic demo, API health và CSS
assets/                       Logo và minh họa SVG local
scripts/                      Dev server, static build, kiểm tra source
tests/                        Kiểm tra logic và browser
docs/BACKEND_INTEGRATION.md    Tính năng/API đã có, blueprint và backlog tích hợp
prototype/                    Prototype WIP cũ, không dùng cho giao diện mới
PRODUCT_PLAN.md               Kế hoạch frontend cũ; backend được ưu tiên khi mâu thuẫn
```

Xem [đối chiếu backend và kế hoạch tích hợp](docs/BACKEND_INTEGRATION.md) để phân biệt endpoint chạy thật với API chỉ có trong thiết kế. Nghiệp vụ dùng đúng sáu mã trạng thái hồ sơ của backend, tenant theo `company_id`, phân quyền theo permission, audit và PII. Không đưa bàn giao/export hay tài khoản nhiều công ty của kế hoạch cũ vào luồng sản phẩm.
