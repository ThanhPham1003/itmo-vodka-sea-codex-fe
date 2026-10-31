# Kế hoạch nền tảng quản lý nhân viên và hồ sơ đa doanh nghiệp

> **Kế hoạch frontend ban đầu, không còn là nguồn chuẩn.** Frontend hiện ưu tiên source và OpenAPI của backend Go. Xem [đối chiếu backend](docs/BACKEND_INTEGRATION.md) cho hiện trạng API và nghiệp vụ được dùng. Các giả định về tài khoản nhiều công ty, bàn giao/export và bộ trạng thái trong tài liệu này không được áp dụng khi mâu thuẫn với backend.

## 1. Mục tiêu và phạm vi

Xây dựng nền tảng dùng chung cho nhiều doanh nghiệp. Mỗi doanh nghiệp có không gian riêng để quản lý nhân viên, phân quyền, cấu hình và xử lý hồ sơ của công ty mình.

Nghiệp vụ đầu tiên là tiếp nhận và kiểm tra hồ sơ bất động sản phục vụ giao dịch nhà đất. Nền tảng hỗ trợ nhận tài liệu qua nhiều đợt, phân loại, trích xuất dữ liệu theo cấu hình, đối soát chéo và phê duyệt pháp lý trước khi bàn giao sang hệ thống nghiệp vụ của doanh nghiệp.

Quản lý nhân viên trong phạm vi này gồm tài khoản, tư cách thành viên, vai trò, trạng thái và phân công công việc. Chấm công, tính lương và nghiệp vụ nhân sự chuyên sâu nằm ngoài MVP.

## 2. Mô hình nhiều doanh nghiệp

- Mỗi doanh nghiệp là một tenant, có nhân viên, hồ sơ, tài liệu và cấu hình riêng.
- Một tài khoản có thể thuộc nhiều doanh nghiệp qua các tư cách thành viên độc lập. Giao diện luôn hiển thị doanh nghiệp đang làm việc và cho phép chuyển giữa các doanh nghiệp được cấp quyền.
- Vai trò và quyền của tài khoản được xác định trong từng doanh nghiệp.
- Backend kiểm tra quyền và tenant cho mọi truy cập, bao gồm tải tệp, tìm kiếm, xuất báo cáo và tác vụ nền; ẩn thành phần trên frontend chỉ phục vụ trải nghiệm.
- Quản trị nền tảng quản lý vòng đời doanh nghiệp và dịch vụ. Quyền này không mặc nhiên cấp quyền đọc nội dung hồ sơ của doanh nghiệp.

## 3. Vai trò và phân quyền

| Vai trò | Phạm vi trách nhiệm |
| --- | --- |
| Quản trị nền tảng | Tạo, kích hoạt hoặc tạm ngưng doanh nghiệp; quản lý tài khoản quản trị doanh nghiệp |
| Quản trị doanh nghiệp | Quản lý thành viên, vai trò, cấu hình và phân công hồ sơ trong công ty |
| Nhân viên tiếp nhận | Tạo hồ sơ, tải tài liệu, xác nhận phân loại và bổ sung thông tin trong phạm vi được giao |
| Chuyên viên pháp lý | Kiểm tra dữ liệu, xử lý sai lệch, yêu cầu bổ sung và phê duyệt hồ sơ được giao |
| Người xem | Xem hồ sơ và kết quả trong phạm vi được cấp quyền |

MVP dùng các vai trò có sẵn. Chỉ tài khoản được cấp quyền phê duyệt mới được duyệt; quyền quản trị doanh nghiệp không tự động thay thế quyền phê duyệt.

## 4. Quản lý nhân viên

- Danh sách thành viên: họ tên, email, vai trò, trạng thái và số hồ sơ đang phụ trách.
- Mời thành viên bằng email; theo dõi lời mời chờ chấp nhận, thu hồi và gửi lại.
- Thay đổi vai trò, tạm ngưng hoặc chấm dứt tư cách thành viên trong doanh nghiệp.
- Phân công và chuyển giao hồ sơ; giữ lịch sử người thực hiện khi nhân viên ngừng hoạt động.
- Ngăn xóa hoặc vô hiệu hóa quản trị viên cuối cùng khi chưa có người thay thế.
- Khi thu hồi quyền, backend chặn truy cập doanh nghiệp; giao diện xử lý phiên hoặc yêu cầu đang mở bằng thông báo phù hợp.

## 5. Cấu hình hồ sơ theo doanh nghiệp

### Loại giấy tờ và trường trích xuất

Doanh nghiệp định nghĩa danh mục giấy tờ, ví dụ CCCD, giấy chứng nhận, hợp đồng và giấy kết hôn. Mỗi loại có các trường cần trích xuất, kiểu dữ liệu, trường bắt buộc và hướng dẫn kiểm tra.

Các trường minh họa: họ tên, số định danh, số giấy chứng nhận, địa chỉ, số thửa và diện tích. Đây là ví dụ cấu hình, không phải danh mục pháp lý bắt buộc cho mọi giao dịch.

### Loại bộ hồ sơ

Mỗi loại bộ hồ sơ xác định:

- Danh mục giấy tờ, giấy tờ bắt buộc hoặc tùy chọn và số lượng cần nhận.
- Bên cung cấp hoặc chủ thể liên quan để phân biệt nhiều giấy tờ cùng loại.
- Các quy tắc đối soát và điều kiện đủ dữ liệu để chạy từng quy tắc.

### Phiên bản cấu hình

Cấu hình có trạng thái nháp và đã phát hành. Hồ sơ sử dụng một phiên bản đã phát hành; thay đổi cấu hình mới không âm thầm thay đổi hồ sơ đang xử lý. Việc áp dụng phiên bản khác phải là thao tác rõ ràng và được ghi lịch sử.

## 6. Quy trình xử lý hồ sơ

1. **Tạo hồ sơ:** chọn loại, nhập mã tham chiếu, thông tin giao dịch và người phụ trách.
2. **Tiếp nhận theo đợt:** tải nhiều tệp, ghi nhận người gửi và thời điểm; mỗi đợt gắn với cùng một hồ sơ.
3. **Phân loại:** hệ thống đề xuất loại giấy tờ; nhân viên xác nhận hoặc điều chỉnh. Tệp chưa xác định loại được đưa vào hàng chờ xử lý.
4. **Trích xuất:** đọc các trường theo cấu hình; hiển thị dữ liệu và độ tin cậy nếu dịch vụ xử lý cung cấp. Người dùng có thể sửa và ghi lý do.
5. **Theo dõi đầy đủ:** hiển thị tài liệu đã nhận, còn thiếu, không sử dụng được hoặc cần thay thế.
6. **Đối soát chéo:** chỉ chạy quy tắc khi đủ tài liệu và dữ liệu liên quan. Thiếu dữ liệu phải hiển thị trạng thái chờ, không kết luận là khớp.
7. **Kiểm tra pháp lý:** chuyên viên xem bản gốc cạnh dữ liệu, xử lý sai lệch, yêu cầu bổ sung hoặc phê duyệt.
8. **Bàn giao:** xuất hoặc gửi bản kết quả đã duyệt sang hệ thống nghiệp vụ; ghi nhận thành công, thất bại và lần thử lại.

Tài liệu thay thế được lưu thành phiên bản mới. Thay đổi dữ liệu đầu vào phải làm mất hiệu lực kết quả đối soát liên quan để chạy lại. Sau phê duyệt, nội dung đã duyệt được giữ nguyên; sửa đổi mở một lượt xử lý mới và cần phê duyệt lại.

## 7. Trạng thái cần thể hiện trên giao diện

| Đối tượng | Trạng thái chính |
| --- | --- |
| Thành viên | Được mời, đang hoạt động, tạm ngưng, đã rời công ty |
| Hồ sơ | Nháp, đang tiếp nhận, đang xử lý, chờ kiểm tra pháp lý, cần bổ sung, đã phê duyệt, đã hủy |
| Tệp tải lên | Đang tải, thành công, thất bại |
| Tài liệu | Chờ phân loại, chờ trích xuất, đang trích xuất, cần xác nhận, đã xác nhận, xử lý lỗi, đã thay thế |
| Quy tắc đối soát | Chờ dữ liệu, khớp, sai lệch, không đánh giá được, cần chạy lại |
| Bàn giao | Chưa gửi, đang gửi, thành công, thất bại |

Trạng thái bàn giao tách khỏi trạng thái phê duyệt: gửi thất bại không làm mất quyết định duyệt. Hồ sơ chỉ chuyển sang chờ kiểm tra pháp lý khi tài liệu bắt buộc và dữ liệu cần thiết đã được xác nhận, đồng thời các quy tắc liên quan đã chạy xong. Chuyên viên phải ghi nhận cách xử lý các sai lệch trước khi duyệt.

## 8. Các màn hình frontend

| Màn hình | Chức năng |
| --- | --- |
| Đăng nhập và chọn doanh nghiệp | Xác thực, chọn không gian làm việc được cấp quyền |
| Tổng quan doanh nghiệp | Thống kê hồ sơ, công việc chờ xử lý và hồ sơ cần bổ sung |
| Nhân viên | Mời, tìm kiếm, phân quyền, tạm ngưng và chuyển giao công việc |
| Danh sách hồ sơ | Tìm theo mã; lọc loại, trạng thái, người phụ trách và ngày tạo |
| Chi tiết hồ sơ | Tổng quan, danh mục giấy tờ, các đợt tiếp nhận, phân công và lịch sử |
| Không gian kiểm tra tài liệu | Xem tệp gốc cạnh trường trích xuất, xác nhận hoặc sửa dữ liệu |
| Kết quả đối soát | Hiển thị giá trị ở từng nguồn, sai lệch và ghi nhận xử lý |
| Hàng đợi pháp lý | Danh sách được giao, yêu cầu bổ sung, ghi ý kiến và phê duyệt |
| Cấu hình doanh nghiệp | Loại hồ sơ, giấy tờ, trường trích xuất, quy tắc và phiên bản |
| Bàn giao | Xuất kết quả, theo dõi lần gửi và thử lại khi có lỗi |
| Quản trị nền tảng | Quản lý doanh nghiệp và tài khoản quản trị |

Giao diện cần có trạng thái đang tải, trống, lỗi và không có quyền; xác nhận trước thao tác ảnh hưởng quyền truy cập hoặc quyết định phê duyệt.

## 9. Phạm vi MVP và phần mở rộng

### MVP

- Quản lý doanh nghiệp cơ bản, thành viên và vai trò có sẵn.
- Cấu hình loại hồ sơ, danh mục giấy tờ, trường và quy tắc so sánh bằng nhau giữa hai trường.
- Tạo, phân công và tiếp nhận hồ sơ qua nhiều đợt.
- Xác nhận phân loại, chỉnh sửa dữ liệu trích xuất và đối soát.
- Yêu cầu bổ sung, duyệt một cấp, lưu lịch sử và xuất báo cáo.
- Frontend dùng API giả lập trước; ghi rõ dữ liệu và kết quả mô phỏng. Sau đó kết nối backend phân loại, OCR và lưu trữ.

### Sau MVP

- Cổng khách hàng tự gửi tài liệu; phòng ban và vai trò tùy chỉnh.
- Quy tắc có điều kiện, duyệt nhiều cấp, SLA và thông báo tự động.
- API/webhook bàn giao, quản lý lỗi tích hợp và chống tạo bản ghi trùng khi thử lại.
- Báo cáo hiệu suất, SSO, gói dịch vụ và thanh toán.

## 10. Kế hoạch triển khai frontend

1. **Chốt đặc tả:** thuật ngữ, ma trận quyền, trạng thái, mô hình dữ liệu và hợp đồng API.
2. **Thiết kế luồng:** wireframe cho quản trị doanh nghiệp, tiếp nhận và pháp lý; thống nhất giao diện tiếng Việt.
3. **Xây nền tảng:** đăng nhập giả lập, chuyển doanh nghiệp, điều hướng theo quyền và quản lý nhân viên.
4. **Xây luồng hồ sơ:** cấu hình, tạo hồ sơ, nhiều đợt tài liệu, kiểm tra dữ liệu và đối soát.
5. **Hoàn thiện duyệt:** yêu cầu bổ sung, phê duyệt, lịch sử và xuất kết quả.
6. **Tích hợp và kiểm thử:** thay API giả lập, kiểm tra quyền, tách tenant, xử lý lỗi và nghiệm thu luồng đầu cuối.

## 11. Tiêu chí nghiệm thu chính

- Thành viên công ty A không truy cập được hồ sơ, tệp hoặc cấu hình công ty B, kể cả qua API hay liên kết trực tiếp.
- Bổ sung đợt tiếp nhận thứ hai cập nhật cùng hồ sơ và giữ được lịch sử đợt đầu.
- Phân loại sai có thể sửa và trích xuất lại theo loại đúng; lỗi xử lý có thể thử lại.
- Quy tắc thiếu một tài liệu ở trạng thái chờ; khi đủ dữ liệu thì được đánh giá lại.
- Thay tài liệu làm mất hiệu lực kết quả liên quan; bản được duyệt trước đó vẫn có thể tra cứu.
- Nhân viên không có quyền duyệt không thể phê duyệt; quyết định duyệt lưu người thực hiện, thời gian, ý kiến và phiên bản hồ sơ.
- Thay đổi cấu hình không tự động tác động lên hồ sơ đã tạo.
- Bản frontend mô phỏng không trình bày kết quả OCR hoặc kiểm tra giả lập như kết quả xác thực thực tế.

## 12. Các quyết định cần chốt tiếp

- MVP chỉ tiếp nhận nội bộ hay cho khách hàng gửi qua cổng riêng?
- Nhân viên xem toàn bộ hồ sơ công ty hay chỉ hồ sơ được giao?
- Người tiếp nhận có được tự duyệt cùng hồ sơ khi được cấp cả hai vai trò?
- Dịch vụ phân loại/OCR và hệ thống nghiệp vụ đích cung cấp API nào?
- Giới hạn tệp, thời gian lưu trữ và quy trình xóa dữ liệu của từng doanh nghiệp là gì?

Các mục trên là quyết định còn mở, cần xác nhận trước khi chốt hành vi tương ứng trong sản phẩm.
