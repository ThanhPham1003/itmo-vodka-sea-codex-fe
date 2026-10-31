# CI và Docker frontend

Workflow [Frontend CI and Docker Hub](../.github/workflows/ci.yml) chạy khi pull request vào `main`, push `main`, push tag `v*` hoặc chạy thủ công.

## Các bước kiểm tra

1. Node.js 24, cài đúng dependency trong lockfile bằng `npm ci`.
2. `npm run check`, unit/HTTP tests và Playwright trên Chrome cho desktop/mobile.
3. Build website static trong `dist/`, lưu artifact build, ảnh chụp và báo cáo trình duyệt trong 7 ngày.
4. Build image `linux/amd64`, kiểm tra user runtime `10001`, file static và HTTP root/CSS.
5. Kiểm tra proxy health trong container bằng một backend HTTP mẫu trên mạng Docker riêng. Đây là kiểm tra kết nối proxy, không phải nghiệm thu nghiệp vụ Go/PostgreSQL/OCR.

Pull request không đăng nhập hoặc publish image. Các job kiểm tra không cần secret. Workflow dùng `contents: read` và checkout không giữ credential trong Git.

## Chạy image

Image dùng đúng repository **`duongtruong0409/sea-codex-frontend`**. Sau khi publish thành công, chạy bản mới nhất:

```bash
docker pull duongtruong0409/sea-codex-frontend:latest
docker run --rm --name folio-frontend \
  --publish 127.0.0.1:4173:8080 \
  --env BACKEND_ORIGIN=http://host.docker.internal:8080 \
  duongtruong0409/sea-codex-frontend:latest
```

Để build riêng từ source local:

```bash
docker build -t duongtruong0409/sea-codex-frontend:local .
```

Mở `http://127.0.0.1:4173`. `host.docker.internal` dùng cho Docker Desktop; trên Linux có thể thêm `--add-host=host.docker.internal:host-gateway`, hoặc dùng tên service backend trong mạng Docker chung. Mặc định image gọi `http://backend:8080`.

Image multi-stage chỉ chứa Node runtime, website đã build và server proxy; không chứa Playwright, `node_modules`, Git history, tài liệu nội bộ hoặc `.env`. Server bind `0.0.0.0:8080` trong container, chạy dưới UID/GID `10001:10001`. Healthcheck container chỉ kiểm tra frontend HTTP; backend mất kết nối không làm website static ngừng hoạt động.

Các cấu hình runtime: `HOST`, `PORT`, `STATIC_ROOT`, `BACKEND_ORIGIN`. Địa chỉ backend nằm ở server, không đưa credential hoặc private key vào source trình duyệt/build args. Đường `/backend/health` là proxy tới endpoint Go `/health` thật; `/api/v1/*` giữ method/query/body/status từ backend. API nghiệp vụ còn thiếu vẫn trả lỗi, không dùng fallback demo.

## Publish Docker Hub tùy chọn

CI vẫn chạy đầy đủ khi chưa cấu hình Docker Hub. Để bật publish sau khi cả kiểm tra source và container đều đạt:

| Loại | Tên | Giá trị |
| --- | --- | --- |
| Repository secret | `DOCKERHUB_USERNAME` | Tài khoản có quyền ghi vào namespace `duongtruong0409` |
| Repository secret | `DOCKERHUB_TOKEN` | Access token có quyền push `duongtruong0409/sea-codex-frontend` |
| Repository variable | `PUBLISH_DOCKERHUB` | `true` để bật publish |

Đặt các mục trên tại GitHub **Settings → Secrets and variables → Actions**. Khi đã bật publish nhưng thiếu secret, job báo lỗi rõ ràng. Không cần secret database, PASETO hoặc OCR để build image frontend.

- Push `main` hoặc chạy thủ công trên `main`: `duongtruong0409/sea-codex-frontend:latest` và `duongtruong0409/sea-codex-frontend:sha-<full-commit-sha>`.
- Push tag `v1.0.0`: `duongtruong0409/sea-codex-frontend:v1.0.0` và tag SHA, không cập nhật `latest`.
- Pull request và chạy thủ công trên nhánh khác: chỉ kiểm tra, không publish.

Workflow publish image, chưa tự deploy lên VM/Kubernetes. Chưa thay đổi repository secrets hoặc kích hoạt workflow từ máy local.

## Giới hạn kiểm chứng local

Máy hiện tại không có Docker CLI/daemon và actionlint, nên chưa build/run container hoặc chạy workflow GitHub thật tại local. CI có bước build/smoke-test image trước khi cho publish. YAML được parse kiểm tra cú pháp tại local; các lệnh source/test/build được thực hiện riêng trong quá trình triển khai.

Tham khảo chính thức: [GitHub setup-node](https://github.com/actions/setup-node), [Playwright CI](https://playwright.dev/docs/ci-intro), [Docker Build GitHub Actions](https://docs.docker.com/build/ci/github-actions/).
