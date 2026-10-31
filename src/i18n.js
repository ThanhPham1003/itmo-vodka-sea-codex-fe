// Vietnamese is the source language. Keep translations at the presentation edge;
// API enum values, form values, user content and document evidence stay untouched.
const english = new Map(`
Tổng quan|Overview
Hồ sơ|Dossiers
Kiểm duyệt|Review
Thành viên|Members
Cấu hình hồ sơ|Dossier settings
Nhật ký hoạt động|Activity log
Hệ thống|System
Thành viên không còn khả dụng|Unavailable member
Kết nối backend|Backend connection
Chi tiết hồ sơ|Dossier details
KHÔNG GIAN LÀM VIỆC|WORKSPACE
QUẢN LÝ|MANAGEMENT
Không gian doanh nghiệp|Company workspace
Không gian xử lý hồ sơ|Document processing workspace
Doanh nghiệp|Company
Rõ dữ liệu.|Clear data.
Chắc quyết định.|Confident decisions.
Một không gian cho mọi bước xử lý hồ sơ.|One workspace for every step of document processing.
Khám phá quy trình|Explore the workflow
Bản demo|Demo
Tài khoản|Account
Thông báo|Notifications
Đến nội dung chính|Skip to main content
Mở menu|Open menu
Đóng menu|Close menu
Menu không gian làm việc|Workspace menu
Điều hướng chính|Main navigation
TỔNG QUAN DOANH NGHIỆP|COMPANY OVERVIEW
Cùng bắt đầu một ngày làm việc rõ ràng và hiệu quả.|Start the day with clarity and focus.
MỌI HỒ SƠ, MỘT KHÔNG GIAN|EVERY DOSSIER, ONE WORKSPACE
Quản lý gọn gàng.|Stay organized.
Kiểm duyệt vững vàng.|Review with confidence.
Từ tiếp nhận đến phê duyệt, theo dõi từng bước|Track every step, from intake to approval,
và để mọi quyết định có cơ sở.|and support every decision with evidence.
Đến hàng đợi kiểm duyệt|Go to review queue
Khám phá hồ sơ|Explore dossiers
Cấu hình theo doanh nghiệp|Company-specific settings
Lịch sử rõ ràng|Clear history
Kiểm duyệt có kiểm soát|Controlled review
Nhịp làm việc hôm nay|Today's activity
Số hồ sơ theo trạng thái hiện tại · không áp dụng khoảng ngày|Current status counts · date range does not apply
Hồ sơ duy nhất đã vào từng trạng thái trong kỳ|Unique dossiers entering each status in the period
Số lượt chuyển vào từng trạng thái trong kỳ|Status transitions in the period
Bộ lọc thống kê|Statistics filters
Tổng hồ sơ|Total dossiers
Tổng hồ sơ/trạng thái|Total dossier/status pairs
Tổng lượt chuyển|Total transitions
Không thể tải nội dung tệp.|Unable to load file content.
Chờ kiểm duyệt|Awaiting review
Thiếu giấy tờ|Missing documents
Đã phê duyệt|Approved
Hồ sơ trong không gian|Dossiers in this workspace
Đã đủ điều kiện tiếp nhận duyệt|Ready for review
Cần bổ sung để tiếp tục xử lý|Additional documents needed
Hoàn tất kiểm tra pháp lý|Legal review complete
Hoạt động xử lý|Processing activity
Hồ sơ duy nhất chuyển trạng thái theo ngày|Daily unique dossiers by status
Lượt chuyển trạng thái theo ngày|Daily status transitions
7 ngày gần nhất|Last 7 days
Đã duyệt|Approved
Chờ duyệt|Awaiting review
Sai lệch|Discrepancies
Đang xử lý|Processing
Từ chối|Reject
Cần bạn chú ý|Needs your attention
Ưu tiên những việc quan trọng|Focus on what matters
Đã hoàn tất công việc|All caught up
Không có hồ sơ cần chú ý.|No dossiers need your attention.
Hồ sơ gần đây|Recent dossiers
Tiếp tục công việc từ nơi bạn đã dừng lại|Pick up where you left off
Xem tất cả|View all
Tạo hồ sơ|Create dossier
QUẢN LÝ HỒ SƠ|DOSSIER MANAGEMENT
Mỗi hồ sơ, một hành trình.|Every dossier has a journey.
Tập trung tài liệu, theo dõi tiến độ và phối hợp cùng đội ngũ.|Keep documents together, track progress and collaborate with your team.
Tất cả|All
Đã từ chối|Rejected
Có sai lệch|Discrepancies
Tìm tên hoặc mã hồ sơ…|Search by dossier name or ID…
Tìm hồ sơ|Search dossiers
Loại bộ hồ sơ|Dossier type
Tất cả loại hồ sơ|All dossier types
Người phụ trách|Assignee
Tất cả người phụ trách|All assignees
Người phụ trách (ID)|Assignee (ID)
UUID người phụ trách|Assignee UUID
Ngày chuyển trạng thái|Status transition date
Ngày tạo|Created date
Xóa bộ lọc|Clear filters
HỒ SƠ|DOSSIER
LOẠI BỘ HỒ SƠ|DOSSIER TYPE
TRẠNG THÁI|STATUS
PHỤ TRÁCH|ASSIGNEE
NGÀY TẠO|CREATED
Chưa phân công|Unassigned
Đã phân công|Assigned
Chưa có hồ sơ phù hợp|No matching dossiers
Thử thay đổi bộ lọc hoặc tạo một hồ sơ mới.|Try adjusting the filters or creating a dossier.
Trang trước|Previous
Trang sau|Next
← Danh sách hồ sơ|← Dossier list
Thêm tài liệu|Add documents
Thay đổi|Change
Tổng quan|Overview
Tài liệu|Documents
Đối soát & kiểm duyệt|Reconciliation & review
Lịch sử|History
Hồ sơ đã phê duyệt. Nội dung được khóa cho đến khi mở lại.|This dossier is approved. Its content is locked until reopened.
Hồ sơ đã bị từ chối. Xem lý do trong lịch sử kiểm duyệt.|This dossier was rejected. See the review history for the reason.
Mở lại hồ sơ|Reopen dossier
Danh mục giấy tờ|Document checklist
Checklist theo phiên bản cấu hình của hồ sơ|Checklist pinned to the dossier's configuration version
Có điều kiện|Conditional
Bắt buộc|Required
Không bắt buộc|Optional
Thêm yêu cầu phát sinh|Add conditional requirement
Checklist được cập nhật từ tài liệu trong hồ sơ.|The checklist updates from the dossier's documents.
Bước tiếp theo|Next step
Tiến độ của hồ sơ|Dossier progress
Sẵn sàng kiểm duyệt|Ready for review
Đã hoàn tất|Completed
Xử lý vấn đề đối soát|Resolve discrepancies
Hoàn thiện tài liệu|Complete the documents
Đối chiếu nguồn, xử lý cảnh báo và ghi nhận quyết định cuối cùng.|Check sources, resolve warnings and record the final decision.
Đội ngũ tiếp tục quy trình nghiệp vụ nội bộ.|The team can continue its internal workflow.
Kiểm tra giấy tờ còn thiếu và các vấn đề cần xác minh.|Check missing documents and issues that need verification.
Xem kết quả đối soát|View reconciliation
Xem tài liệu|View documents
Các đợt tiếp nhận|Intake batches
Bổ sung nhiều lần trên cùng một hồ sơ|Add multiple batches to the same dossier
Giữ nguyên tệp gốc và nguồn trang|Original files and source pages are retained
Chưa có đợt tiếp nhận|No intake batches yet
Thêm tài liệu để bắt đầu xử lý.|Add documents to start processing.
Chưa có tài liệu|No documents yet
Thêm ảnh hoặc PDF.|Add images or PDFs.
Tải lên ảnh hoặc PDF để bắt đầu.|Upload images or PDFs to get started.
Chưa phân loại|Unclassified
TÀI LIỆU CHƯA PHÂN LOẠI|UNCLASSIFIED DOCUMENT
Bản minh họa · Không phải tệp gốc hoặc kết quả OCR thực tế|Illustration · Not an original document or actual OCR result
MẪU DEMO|DEMO SAMPLE
Chỉ dùng minh họa giao diện|For interface demonstration only
Tệp gốc · lưu liên kết nguồn|Original file · source link retained
Xem bản gốc (demo)|View original (demo)
Đã ghi nhận lượt xem|View recorded
Dữ liệu trích xuất|Extracted data
Giá trị mẫu theo schema của doanh nghiệp|Sample values based on the company schema
Kết quả trích xuất theo schema của doanh nghiệp|Extraction results based on the company schema
Chưa xử lý|Not processed yet
Không đọc được tài liệu.|Unable to read the document.
Thử xử lý lại|Retry processing
Phân loại giấy tờ|Document classification
Chọn loại giấy tờ|Select document type
Nhóm tài liệu|Document group
Nhiều nhóm tài liệu|Multiple document groups
Chọn nhóm tài liệu|Select document group
Chọn nhóm tài liệu trước khi xác nhận phân loại.|Select a document group before confirming classification.
Chọn trạng thái thành viên hợp lệ.|Select a valid member status.
Toàn bộ tệp|Entire file
Vai trò chủ thể|Subject role
Xác nhận phân loại|Confirm classification
Sửa|Edit
Nguồn mô phỏng|Simulated source
Giá trị nhạy cảm được che mặc định. Thao tác hiện dữ liệu và xem bản gốc được ghi nhật ký.|Sensitive values are masked by default. Reveals and original document views are logged.
Kết quả đối soát|Reconciliation results
So sánh đúng nguồn, đúng đối tượng|Compare the correct sources and subjects
So sánh đúng nguồn, đúng đối tượng · Kết quả mô phỏng|Compare the correct sources and subjects · Simulated results
Nguồn thứ nhất|First source
Nguồn thứ hai|Second source
Chưa có dữ liệu|No data yet
Xác nhận cảnh báo|Acknowledge warning
Chưa có kết quả đối soát|No reconciliation results yet
Quy tắc chỉ chạy khi đủ dữ liệu nguồn.|Rules run when enough source data is available.
Quyết định kiểm duyệt|Review decision
Hồ sơ đã đủ điều kiện ghi nhận quyết định.|This dossier is ready for a decision.
Cần đủ tài liệu, không còn blocker, cảnh báo chưa xử lý hoặc quy tắc chờ dữ liệu.|Complete the documents and resolve blockers, open warnings and rules awaiting data.
Yêu cầu bổ sung|Request changes
Phê duyệt|Approve
Đã ghi nhận quyết định.|Decision recorded.
Tài khoản không có quyền kiểm duyệt.|This account does not have review permission.
Lịch sử hồ sơ|Dossier history
Lịch sử quyết định|Decision history
Quyết định theo người duyệt, thời gian và phiên bản|Decisions by reviewer, time and version
Xem nhật ký hồ sơ|View dossier activity
Tiếp nhận, điều chỉnh và các quyết định được ghi nhận rõ ràng|Intake, corrections and decisions are recorded clearly
Chưa có hoạt động|No activity yet
Các thay đổi sẽ xuất hiện tại đây.|Changes will appear here.
HÀNG ĐỢI KIỂM DUYỆT|REVIEW QUEUE
Kiểm tra kỹ. Quyết định rõ.|Review carefully. Decide clearly.
Những hồ sơ đã đủ tài liệu và sẵn sàng để chuyên viên thẩm định.|Dossiers with complete documents, ready for specialist review.
Đối chiếu tài liệu gốc, xác minh cảnh báo và ghi nhận quyết định.|Check original documents, verify warnings and record decisions.
Mọi quyết định đều có người thực hiện, thời gian và lý do.|Every decision records its author, time and reason.
Mở hồ sơ để xem checklist|Open the dossier to view its checklist
Kiểm tra|Review
Hàng đợi đã trống|The review queue is empty
Không có hồ sơ chờ duyệt trong phạm vi truy cập.|No dossiers are awaiting review within your access scope.
ĐỘI NGŨ DOANH NGHIỆP|COMPANY TEAM
Đúng người, đúng công việc.|The right people for the right work.
Quản lý tài khoản, vai trò và quyền truy cập trong công ty.|Manage company accounts, roles and permissions.
Thêm thành viên|Add member
Thành viên công ty|Company members
THÀNH VIÊN|MEMBER
VAI TRÒ|ROLE
HỒ SƠ PHỤ TRÁCH|ASSIGNED DOSSIERS
THAO TÁC|ACTIONS
Cập nhật quyền|Update access
Tài khoản thuộc một công ty. Chỉ quản trị công ty được thêm thành viên và thay đổi quyền.|Each account belongs to one company. Only company administrators can add members and change access.
Quản trị công ty|Company administrator
Chuyên viên pháp lý|Legal specialist
Nhân viên tiếp nhận|Intake officer
Quản lý công ty|Company manager
Công chứng viên|Notary
Quản trị nền tảng|Platform administrator
CẤU HÌNH THEO DOANH NGHIỆP|COMPANY CONFIGURATION
Quy trình của công ty bạn.|Your company's workflow.
Bộ hồ sơ → giấy tờ → trường trích xuất. Thay đổi cấu hình tạo phiên bản mới.|Dossier types → document types → extraction fields. Configuration changes create a new version.
Thêm loại giấy tờ|Add document type
Thêm loại bộ hồ sơ|Add dossier type
Gợi ý bằng AI|AI suggestions
Gợi ý quy tắc bằng AI|Suggest rules with AI
AI gợi ý trường trích xuất|AI extraction field suggestions
AI gợi ý quy tắc đối soát|AI comparison rule suggestions
Đăng nhập tài khoản công ty để dùng gợi ý AI.|Sign in with a company account to use AI suggestions.
Chỉ quản trị công ty được dùng gợi ý AI.|Only company administrators can use AI suggestions.
Lưu loại hồ sơ trước khi gợi ý quy tắc đối soát.|Save the dossier type before requesting comparison rules.
Mô tả giấy tờ để AI đề xuất các trường và yêu cầu kiểm tra.|Describe the document so AI can suggest extraction fields and checks.
AI dùng cấu hình đã lưu để đề xuất quy tắc. Gợi ý được thêm vào các quy tắc đang soạn.|AI uses the saved configuration to suggest rules. Suggestions are added to your draft rules.
Mô tả cho AI|Description for AI
Chỉ tạo bản nháp. Rà soát rồi bấm Lưu phiên bản để áp dụng.|Creates a draft only. Review it and save a version to apply.
Mô tả quá dài. Hãy rút gọn để AI tạo gợi ý.|The description is too long. Shorten it to generate AI suggestions.
Chế độ tối|Dark mode
Nhập mô tả để AI tạo gợi ý.|Enter a description to generate AI suggestions.
AI đang tạo gợi ý…|AI is preparing suggestions…
AI đang tạo gợi ý|AI is preparing suggestions
Đang phân tích mô tả và đề xuất cấu hình. Gợi ý sẽ xuất hiện để bạn rà soát.|Analyzing your description and preparing suggestions for you to review.
AI chưa trả trường trích xuất phù hợp. Hãy bổ sung mô tả rồi thử lại.|AI did not return suitable fields. Add more detail and try again.
Đã nhận gợi ý trường. Kiểm tra nội dung bên dưới trước khi lưu phiên bản.|Field suggestions received. Review them below before saving a version.
AI chưa tìm thấy quy tắc phù hợp. Hãy bổ sung mô tả rồi thử lại.|AI found no suitable rules. Add more detail and try again.
Gợi ý không khớp giấy tờ hoặc trường đang chọn. Lưu cấu hình mới rồi thử lại.|The suggestions do not match the selected documents or fields. Save the new configuration and try again.
Đã thêm gợi ý quy tắc vào bản nháp. Rà soát trước khi lưu phiên bản.|Suggested rules were added to your draft. Review them before saving a version.
Ví dụ: CCCD cần lấy họ tên, số định danh, ngày sinh và ngày hết hạn.|Example: Extract the full name, ID number, birth date and expiry date from an identity card.
Ví dụ: Đối chiếu họ tên và số định danh chủ sở hữu giữa các giấy tờ.|Example: Compare the owner's full name and ID number across documents.
Gợi ý luật|Suggest rules
Loại giấy tờ|Document type
DANH MỤC BỘ HỒ SƠ|DOSSIER TYPES
DANH MỤC GIẤY TỜ|DOCUMENT TYPES
Chưa có cấu hình|No configuration yet
Thêm một loại mới để bắt đầu.|Add a type to get started.
Cấu hình nghiệp vụ của doanh nghiệp|Company workflow configuration
Chỉnh sửa|Edit
Ngừng sử dụng|Archive
Mã cấu hình|Configuration code
Do hệ thống sinh · không thay đổi khi đổi tên|Generated by the system · retained when renamed
TRƯỜNG TRÍCH XUẤT|EXTRACTION FIELD
KIỂU DỮ LIỆU|DATA TYPE
BẮT BUỘC|REQUIRED
Có|Yes
Không|No
Nhạy cảm|Sensitive
Yêu cầu kiểm tra đặc biệt|Special checks
Chưa cấu hình yêu cầu đặc biệt.|No special checks configured.
Giấy tờ trong bộ hồ sơ|Documents in this dossier type
Cần xác định|To be determined
Tùy chọn|Optional
Luật đối soát|Comparison rules
Chưa có luật đối soát.|No comparison rules yet.
Hồ sơ hiện có giữ snapshot cấu hình khi được tạo.|Existing dossiers retain their configuration snapshot.
Chưa có loại cấu hình|No configuration types yet
Tạo cấu hình đầu tiên cho doanh nghiệp.|Create the company's first configuration.
Gợi ý AI là bản nháp. Rà soát và lưu phiên bản để áp dụng.|AI suggestions are drafts. Review and save a version to apply them.
Cấu hình ở đây được quản lý thủ công trong bản demo.|Configuration is managed manually in the demo.
NHẬT KÝ HOẠT ĐỘNG|ACTIVITY LOG
Mỗi thay đổi đều có dấu vết.|Every change leaves a record.
Theo dõi thao tác, quyết định và lượt xem dữ liệu nhạy cảm trong công ty.|Track company actions, decisions and sensitive data access.
Lọc nhật ký|Filter activity
Tìm trong trang nhật ký hiện tại…|Search this activity page…
Tìm hồ sơ, người thực hiện, nội dung…|Search dossiers, actors or descriptions…
Tìm nhật ký|Search activity
Lọc hành động|Filter by action
Tất cả hành động|All actions
Nhật ký chỉ đọc, được lưu theo doanh nghiệp.|Read-only activity log, scoped to the company.
Nhật ký chỉ đọc trong bản demo.|Read-only activity log in the demo.
Chưa có hoạt động phù hợp|No matching activity
Các thao tác trong công ty sẽ được ghi nhận tại đây.|Company actions will be recorded here.
TÍCH HỢP BACKEND|BACKEND INTEGRATION
Kết nối rõ ràng, đúng hiện trạng.|A clear view of your connection.
Đối chiếu source Go và OpenAPI trước khi kết nối tính năng.|Integration follows the Go implementation and OpenAPI contract.
Đang kiểm tra…|Checking…
Kiểm tra kết nối|Check connection
Dịch vụ Go backend|Go backend service
Kiểm tra liveness của tiến trình HTTP|HTTP process liveness check
Backend đang hoạt động|Backend is running
Chưa kết nối được|Unable to connect
Chưa kiểm tra kết nối|Connection not checked
GET /health trả dữ liệu đúng OpenAPI.|GET /health returned a valid OpenAPI response.
Bấm kiểm tra để gọi endpoint thật qua proxy cùng origin.|Check the live endpoint through the same-origin proxy.
Không có|None
Liveness không xác nhận PostgreSQL hay OCR đã sẵn sàng.|Liveness does not confirm PostgreSQL or OCR readiness.
Phạm vi API đã kiểm chứng|Verified API scope
Theo docs/api/api_spec.json của backend|Based on the backend's docs/api/api_spec.json
Đã triển khai|Implemented
Auth & thành viên|Authentication & members
Đăng ký, đăng nhập, tài khoản|Signup, login, accounts
Hồ sơ & tài liệu|Dossiers & documents
Catalog, upload, phân loại, OCR|Catalog, upload, classification, OCR
Kiểm duyệt & audit|Review & audit
Đối soát, PII, quyết định, nhật ký|Reconciliation, PII, decisions, activity
Thống kê trạng thái theo thời gian|Status metrics over time
API nghiệp vụ theo commit 1a3ee15. Worker/OCR cần cấu hình AI trên backend.|Business APIs match commit 1a3ee15. Worker/OCR requires backend AI configuration.
Dữ liệu và kết quả nghiệp vụ mô phỏng.|Simulated data and workflow results.
Dữ liệu được lưu trong không gian doanh nghiệp.|Data is stored in your company workspace.
KHÔNG GIAN HỒ SƠ DOANH NGHIỆP|COMPANY DOCUMENT WORKSPACE
Từ tài liệu đầu tiên đến quyết định cuối cùng.|From the first document to the final decision.
Cùng đội ngũ làm việc trong một không gian.|One workspace for your whole team.
Hồ sơ tập trung|Centralized dossiers
Quyền truy cập rõ ràng|Clear access control
Lịch sử minh bạch|Transparent history
Đồng hành cùng doanh nghiệp|Built for your business
KHÔNG GIAN DEMO|DEMO WORKSPACE
TÀI KHOẢN DOANH NGHIỆP|COMPANY ACCOUNT
Chào mừng trở lại|Welcome back
Tạo không gian doanh nghiệp|Create your company workspace
Bắt đầu với công ty của bạn và tài khoản quản trị đầu tiên.|Set up your company and its first administrator account.
Chọn công ty và tài khoản mẫu để khám phá quy trình.|Choose a company and sample account to explore the workflow.
Đăng nhập để tiếp tục công việc trong không gian của bạn.|Sign in to continue working in your workspace.
Dữ liệu chỉ tồn tại trong phiên demo. Không dùng thông tin hoặc mật khẩu thật.|Data only exists in this demo session. Do not use real personal information or passwords.
Tên đăng nhập hoặc email|Username or email
ten.dang.nhap hoặc ban@congty.vn|username or you@company.com
Mật khẩu|Password
Nhập mật khẩu|Enter your password
Hiện mật khẩu|Show password
Ẩn mật khẩu|Hide password
Đăng nhập|Sign in
Đăng ký|Sign up
Đăng ký doanh nghiệp|Register company
Phiên được giữ trong bộ nhớ. Tải lại trang sẽ yêu cầu đăng nhập lại.|Your session is kept in memory. Reloading the page requires signing in again.
Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte. Đăng nhập sau khi tạo doanh nghiệp.|Use at least 12 characters and at most 72 bytes. Sign in after creating your company.
Chưa có không gian doanh nghiệp?|New to DocSense AI?
Đã có không gian doanh nghiệp?|Already have a company workspace?
Tạo không gian mới|Create a workspace
Khám phá DocSense AI ngay hôm nay|Explore DocSense AI today
Trải nghiệm quản lý hồ sơ với dữ liệu mẫu.|Try document management with sample data.
Dùng bản demo|Try the demo
Tài khoản được giới hạn trong doanh nghiệp của mình.|Accounts can only access their own company.
Thông tin doanh nghiệp|Company information
Tên công ty|Company name
Ví dụ: An Phát Land|Example: Acme Realty
Mã số thuế|Tax registration number
Mã đăng ký doanh nghiệp|Business registration number
Tên pháp lý công ty|Legal company name
Tên đầy đủ trên đăng ký doanh nghiệp|Full registered company name
Địa chỉ công ty|Company address
Số nhà, đường, phường/xã, tỉnh/thành phố|Street address, ward, city or province
Email công ty|Company email
Số điện thoại công ty|Company phone
Số điện thoại liên hệ|Contact phone number
Quản trị viên đầu tiên|First administrator
Tên người đại diện|Administrator name
Họ và tên đầy đủ|Full name
Email quản trị|Administrator email
Tên đăng nhập|Username
Xác nhận mật khẩu|Confirm password
Hiện xác nhận mật khẩu|Show password confirmation
Quản trị viên đầu tiên quản lý thành viên và cấu hình trong công ty vừa tạo.|The first administrator manages members and settings for the new company.
Công ty của tài khoản|Account company
Tài khoản mẫu|Sample account
Mật khẩu minh họa|Demo password
Xác nhận mật khẩu minh họa|Confirm demo password
Tạo công ty mô phỏng|Create demo company
Vào không gian demo|Enter demo workspace
Đăng nhập demo|Demo sign in
Mọi thao tác, tài khoản và kết quả trong không gian này đều là mô phỏng.|All actions, accounts and results in this workspace are simulated.
Tài khoản hiện tại|Current account
Tài khoản thuộc duy nhất công ty hiện tại.|This account belongs to the current company only.
Đăng xuất|Sign out
Đăng xuất xóa phiên trên trình duyệt. Backend chưa có API thu hồi token.|Signing out clears the browser session. The backend does not yet provide token revocation.
Để trải nghiệm công ty hoặc vai trò khác, đăng xuất và chọn tài khoản demo khác.|Sign out and choose another demo account to try a different company or role.
Một quy trình, rõ từng bước|A clear workflow, step by step
Tạo hồ sơ từ loại bộ hồ sơ của công ty.|Create a dossier from a company dossier type.
Tiếp nhận tài liệu theo nhiều đợt; xem trạng thái riêng từng tệp.|Receive documents in multiple batches and track each file separately.
Chuyên viên phân loại, kiểm tra trích xuất và sửa có lý do.|Specialists classify, verify extraction and record reasoned corrections.
Xử lý sai lệch và xác nhận cảnh báo.|Resolve discrepancies and acknowledge warnings.
Ghi quyết định duyệt, từ chối hoặc yêu cầu bổ sung.|Record an approval, rejection or request for changes.
Theo dõi nhật ký, lịch sử trạng thái và lượt xem PII.|Track activity, status history and sensitive data access.
Hồ sơ theo phiên bản cấu hình; xử lý tệp và kiểm duyệt có nhật ký theo dõi.|Dossiers retain versioned configuration, with logged processing and reviews.
Đã hiểu|Got it
Công việc trong không gian|Workspace activity
Mở danh sách để xem hồ sơ trong phạm vi được cấp quyền.|Open the list to view dossiers within your access scope.
Xem hồ sơ|View dossiers
Mở hồ sơ|Open dossier
Tạo hồ sơ mới|Create a dossier
Checklist được tạo từ phiên bản cấu hình hiện tại.|The checklist uses the current configuration version.
Tên gợi nhớ của hồ sơ|Dossier title
Ví dụ: Căn hộ Thảo Điền – Nguyễn Văn An|Example: Riverside apartment – Jane Smith
Chuyên viên phụ trách|Assigned specialist
Độ ưu tiên|Priority
Phân công hồ sơ|Assign dossier
UUID; để trống để bỏ phân công|UUID; leave blank to unassign
Lưu phân công|Save assignment
Tiếp nhận tài liệu|Document intake
Kéo thả hoặc chọn tệp|Drop files here or browse
PDF, JPG, PNG · tối đa 20 MiB/tệp · 10 tệp/đợt|PDF, JPG, PNG · up to 20 MiB/file · 10 files/batch
Chờ chuyên viên phân loại|Await specialist classification
Tiếp nhận mô phỏng|Simulate intake
Tiến trình xử lý cục bộ: đọc tệp, kiểm tra định dạng và nội dung trùng. Đây là bản mô phỏng, không gửi tệp lên server hoặc thực hiện OCR.|Local progress: reading files, validating formats and detecting duplicates. This simulation does not upload files or run OCR.
Hoàn tất|Done
Chọn tài liệu|Choose documents
PDF, JPG, PNG · giới hạn theo cấu hình máy chủ|PDF, JPG, PNG · limits follow server configuration
Tự động phân loại|Automatic classification
Vai trò theo cấu hình hồ sơ|Role from dossier configuration
Thay thế tệp lỗi|Replace failed file
Thêm tài liệu mới|Add new documents
Kết quả tiếp nhận được trả riêng từng tệp. Trích xuất tiếp tục ở máy chủ.|Intake results are returned per file. Extraction continues on the server.
Tải tài liệu lên|Upload documents
Mở tài liệu để đối chiếu nguồn. Lượt xem được ghi nhật ký.|Open the document to check its source. Views are logged.
Tài khoản chưa được cấp quyền xem ảnh gốc.|This account does not have permission to view original documents.
Tài liệu gốc|Original document
Xem bản gốc|View original
Tải lại bản gốc|Reload original
Điều chỉnh dữ liệu|Correct extracted data
Giá trị mới|New value
Mã lý do|Reason code
Lỗi OCR|OCR error
Lỗi dữ liệu nguồn|Source data error
Thay đổi đơn vị hành chính|Administrative boundary change
Lý do khác|Other reason
Ghi chú|Notes
Lưu và đối soát lại|Save and reconcile
Chỉ cảnh báo WARNING mới có thể xác nhận.|Only WARNING issues can be acknowledged.
Căn cứ / lý do chấp nhận|Evidence or reason for acceptance
Xác nhận|Confirm
Phê duyệt hồ sơ|Approve dossier
Từ chối hồ sơ|Reject dossier
Kết luận kiểm duyệt|Review conclusion
Lý do / nội dung cần bổ sung|Reason or requested changes
Nhập nội dung rõ ràng để đội ngũ theo dõi…|Describe clearly so your team can follow up…
Quyết định được lưu theo người duyệt và phiên bản hồ sơ.|The decision records the reviewer and dossier version.
Quyết định trong bản demo không có giá trị xác thực pháp lý.|Demo decisions do not constitute legal verification.
Xác nhận quyết định|Confirm decision
Mở lại hồ sơ đã duyệt|Reopen approved dossier
Lý do mở lại|Reason for reopening
Hồ sơ cần được kiểm tra và phê duyệt lại. Quyết định cũ vẫn nằm trong lịch sử.|The dossier must be reviewed and approved again. Previous decisions remain in its history.
Xác nhận mở lại|Confirm reopening
Kích hoạt giấy tờ điều kiện thuộc snapshot cấu hình của hồ sơ.|Activate a conditional document from the dossier's configuration snapshot.
Lý do phát sinh|Reason for requirement
Thêm yêu cầu|Add requirement
Đánh dấu giấy tờ không áp dụng|Mark document as not applicable
Lý do không áp dụng|Reason it does not apply
Thêm thành viên công ty|Add company member
Tạo tài khoản đăng nhập cho thành viên công ty.|Create a sign-in account for a company member.
Tạo tài khoản thành viên trong bản demo, không gửi email.|Create a demo member account. No email is sent.
Mật khẩu ban đầu|Initial password
Họ tên|Full name
Vai trò|Role
Tạo thành viên|Create member
Cập nhật quyền truy cập|Update access
Trạng thái|Status
Hoạt động|Active
Tạm ngưng|Suspended
Chuyển giao hồ sơ khi thu hồi quyền|Transfer dossiers when revoking access
Chọn người nhận nếu cần|Choose a recipient if needed
Quyền bổ sung (ngoài vai trò)|Additional permissions beyond the role
Quyền bổ sung cộng với quyền mặc định của vai trò. Chỉ bỏ chọn các quyền bổ sung không còn cần thiết.|Additional permissions extend the role defaults. Uncheck any extras that are no longer needed.
Quản trị công ty luôn có pii:view và dashboard:read. Quyền khác ở đây là cấu hình mô phỏng.|Company admins always have pii:view and dashboard:read. Other permissions here are simulated.
Xác nhận thay đổi|Confirm changes
Khoảng ngày tạo hồ sơ|Dossier creation date range
Khoảng ngày chuyển trạng thái|Status transition date range
Khoảng ngày áp dụng cho lịch sử trạng thái; snapshot hiện tại không lọc theo ngày.|The date range applies to status history. Current snapshots are not filtered by date.
Lọc trong múi giờ Việt Nam. Chế độ API dùng ngày chuyển trạng thái.|Filter in Vietnam time. API mode uses status transition dates.
Từ ngày|From date
Đến ngày|To date
Cách thống kê|Metric
Trạng thái hiện tại của hồ sơ|Current dossier status
Lượt chuyển vào trạng thái|Status transitions
Hồ sơ duy nhất theo trạng thái|Unique dossiers per status
Áp dụng|Apply
Lọc theo người thực hiện, tài nguyên, hồ sơ và thời gian.|Filter by actor, resource, dossier and time.
ID người thực hiện|Actor ID
ID tài nguyên|Resource ID
ID hồ sơ|Dossier ID
Từ thời điểm|From time
Đến thời điểm|To time
Gợi ý cấu hình bằng AI|Suggest configuration with AI
Gợi ý luật đối soát|Suggest comparison rules
Gợi ý là bản nháp. Rà soát trước khi lưu phiên bản.|Suggestions are drafts. Review them before saving a version.
Mô tả nhu cầu|Describe your requirements
Tạo bản nháp|Generate draft
Ngừng sử dụng cấu hình|Archive configuration
Hồ sơ hiện có giữ nguyên snapshot cấu hình.|Existing dossiers retain their configuration snapshot.
Tên hiển thị|Display name
Ví dụ: Căn cước công dân|Example: Identity card
Ví dụ: Mua bán nhà đất|Example: Property sale
Mô tả nhận diện giấy tờ|Document identification description
Mô tả nghiệp vụ|Workflow description
Mô tả mục đích và thông tin cần lưu ý…|Describe the purpose and any important details…
Mã được hệ thống tạo tự động khi lưu.|The system generates a code when saved.
Mã hiện tại:|Current code:
· Do hệ thống tạo, được giữ nguyên khi đổi tên.|· System generated and retained when renamed.
Vai trò bên thứ nhất|First subject role
Vai trò bên thứ hai|Second subject role
Trường ghép chủ thể bên thứ nhất|First subject matching field
Trường ghép chủ thể bên thứ hai|Second subject matching field
Không ghép nhiều chủ thể|No multi-subject matching
Vai trò chủ thể (phân cách bằng dấu phẩy)|Subject roles (comma separated)
Số lượng tối thiểu|Minimum count
Trường cần trích xuất|Extraction fields
Thêm trường|Add field
Tên trường|Field label
Ví dụ: Họ và tên|Example: Full name
Kiểu dữ liệu|Data type
Văn bản|Text
Số|Number
Ngày tháng|Date
Có / Không|Boolean
Mã định danh|Identifier
Tiền tệ|Money
Diện tích|Area
Dữ liệu nhạy cảm|Sensitive data
Xóa|Remove
Chưa có trường trích xuất. Thêm ít nhất một trường để lưu loại giấy tờ.|No extraction fields yet. Add at least one to save this document type.
Mỗi dòng là một yêu cầu|One requirement per line
Ví dụ: Kiểm tra giấy tờ còn thời hạn sử dụng|Example: Check the document's expiry date
Chọn giấy tờ và xác định loại bắt buộc, tùy chọn hoặc phát sinh theo điều kiện.|Choose documents and mark them as required, optional or conditional.
Yêu cầu tiếp nhận|Intake requirement
Điều kiện áp dụng|When it applies
Ví dụ: Chủ sở hữu đã kết hôn|Example: The owner is married
Chưa có loại giấy tờ. Tạo loại giấy tờ trước khi cấu hình bộ hồ sơ.|Create document types before configuring a dossier type.
Quy tắc đối soát|Comparison rules
Thêm quy tắc|Add rule
Tên quy tắc|Rule name
Ví dụ: Đối chiếu họ tên chủ sở hữu|Example: Compare the owner's full name
Giấy tờ thứ nhất|First document
Trường cần so sánh|Field to compare
Giấy tờ thứ hai|Second document
Trường đối chiếu|Comparison field
Cách so sánh|Comparison method
Khi có sai lệch|When values differ
Lỗi chặn phê duyệt|Block approval
Cảnh báo cần xác minh|Warning requiring verification
Thông tin tham khảo|Informational
Chỉ so sánh các trường có cùng kiểu dữ liệu.|Only fields with the same data type can be compared.
Chọn giấy tờ trong bộ hồ sơ trước|Select documents for this dossier type first
Chưa có trường phù hợp|No compatible fields
Chưa có giấy tờ phù hợp|No compatible documents
Chọn nguồn so sánh trước|Select comparison sources first
Văn bản giống nhau|Matching text
Dãy chữ số giống nhau|Matching digits
Giá trị số bằng nhau|Equal numeric values
Cùng ngày tháng|Same date
Chưa có quy tắc. Thêm quy tắc để đối chiếu dữ liệu giữa các giấy tờ.|Add rules to compare data across documents.
Đặt tên và chọn nội dung phù hợp với quy trình của doanh nghiệp.|Choose a name and content that fits your company's workflow.
Lưu tạo phiên bản mới trên máy chủ. Hồ sơ hiện có giữ nguyên snapshot.|Saving creates a new server version. Existing dossiers retain their snapshot.
Cấu hình trong bản demo chỉ được lưu trong phiên làm việc hiện tại.|Demo configuration is only saved for the current session.
Lưu phiên bản|Save version
Đã tiếp nhận|Received
Đã trích xuất|Extracted
Xử lý lỗi|Failed
Chờ phân loại|Awaiting classification
Chờ xác định|Pending condition
Không áp dụng|Not applicable
Khớp|Matched
Cần xử lý|Action required
Chờ dữ liệu|Awaiting data
Đã xác nhận|Acknowledged
Đã mời|Invited
Trùng nội dung|Duplicate content
Không thể tải dữ liệu|Unable to load data
Không thể mở nội dung|Unable to open content
Tải lại|Reload
Bạn không có quyền truy cập|Access denied
Chọn một chức năng trong menu của bạn.|Choose an available item from your menu.
Không tìm thấy hồ sơ|Dossier not found
Hồ sơ không thuộc công ty hoặc phạm vi của tài khoản.|The dossier is outside your company or account access scope.
Đang tải dữ liệu…|Loading data…
Đang xử lý…|Processing…
Đang chờ phản hồi từ máy chủ|Waiting for the server
Đang kết nối với máy chủ|Connecting to the server
Vui lòng chờ trong giây lát…|Please wait a moment…
Vui lòng nhập thông tin này.|Please fill out this field.
Nhập địa chỉ email hợp lệ.|Enter a valid email address.
Kiểm tra lại giá trị đã nhập.|Check the value you entered.
Mật khẩu xác nhận không khớp.|The passwords do not match.
Mật khẩu tối đa 72 byte.|Passwords must not exceed 72 bytes.
Đã tạo doanh nghiệp. Đăng nhập bằng tài khoản vừa đăng ký.|Company created. Sign in with your new account.
Đăng nhập thành công.|Signed in successfully.
Đã vào không gian demo.|Entered the demo workspace.
Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.|Your session is no longer valid. Please sign in again.
Đã tạo hồ sơ mới.|Dossier created.
Đã cập nhật người phụ trách.|Assignment updated.
Đã gửi yêu cầu phân loại và trích xuất lại.|Classification and re-extraction requested.
Đã đưa tệp vào hàng đợi xử lý lại.|File queued for retry.
Đã mở tài liệu và ghi nhật ký lượt xem.|Document opened and access logged.
Đã ghi audit lượt xem. Khung tài liệu vẫn là bản minh họa.|View logged. The document preview is still an illustration.
Đã ghi nhật ký xem dữ liệu nhạy cảm.|Sensitive data access logged.
Đã lưu điều chỉnh và đối soát lại.|Correction saved and reconciliation refreshed.
Đã xác nhận cảnh báo.|Warning acknowledged.
Đã cập nhật yêu cầu điều kiện.|Conditional requirement updated.
Đã lưu quyết định kiểm duyệt.|Review decision saved.
Đã lưu quyết định kiểm duyệt mô phỏng.|Simulated review decision saved.
Đã mở lượt xử lý mới.|Dossier reopened for processing.
Đã thêm giấy tờ vào checklist.|Document requirement added to the checklist.
Đã tạo tài khoản thành viên.|Member account created.
Đã thêm thành viên mô phỏng.|Demo member added.
Đã cập nhật thành viên.|Member updated.
Đã lưu phiên bản cấu hình.|Configuration version saved.
Đã lưu phiên bản cấu hình. Hồ sơ hiện có giữ nguyên snapshot.|Configuration version saved. Existing dossiers retain their snapshot.
Đã ngừng sử dụng cấu hình.|Configuration archived.
Đã nhận kết quả tải tài liệu.|Upload results received.
Đã tiếp nhận đợt tài liệu mô phỏng.|Simulated document batch received.
Một số tệp chưa được tiếp nhận. Xem chi tiết trong tiến trình.|Some files were not accepted. Check their progress details.
Đã phân loại và trích xuất lại bằng dữ liệu mô phỏng.|Classification and extraction updated using sample data.
Đã thử xử lý lại tệp bằng dữ liệu mô phỏng.|File retried using sample data.
Chọn ít nhất một tệp không rỗng.|Choose at least one non-empty file.
Tối đa 10 tệp trong một đợt tiếp nhận.|Select at most 10 files per batch.
Chọn một tệp khi thay thế tài liệu lỗi.|Select one file when replacing a failed document.
Chọn loại giấy tờ trước khi xác nhận.|Select a document type before confirming.
Chọn loại bộ hồ sơ trước khi gợi ý luật.|Choose a dossier type before requesting rule suggestions.
Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.|The start date must be on or before the end date.
Thêm ít nhất một trường cần trích xuất.|Add at least one extraction field.
Backend không trả bản nháp hợp lệ.|The backend did not return a valid draft.
Cấu hình đã thay đổi. Tải lại trước khi gợi ý.|The configuration has changed. Reload before requesting suggestions.
Hồ sơ đã thay đổi hoặc không cho phép thao tác. Đã tải phiên bản mới; hãy kiểm tra lại trước khi gửi.|The dossier changed or does not allow this action. The latest version was loaded; review it before submitting again.
Không thể kết nối backend.|Unable to connect to the backend.
Không thể kết nối backend. Kiểm tra BACKEND_ORIGIN và tiến trình Go.|Unable to connect to the backend. Check BACKEND_ORIGIN and the Go process.
Backend phản hồi quá thời gian chờ.|The backend request timed out.
Backend không trả JSON đúng hợp đồng.|The backend did not return valid contract JSON.
Phản hồi backend không đúng hợp đồng.|The backend response does not match the contract.
Dịch vụ chưa sẵn sàng.|The service is unavailable.
Phản hồi health không đúng OpenAPI.|The health response does not match OpenAPI.
Token không hợp lệ.|Invalid token.
Đường dẫn API không hợp lệ.|Invalid API path.
Yêu cầu đã được hủy.|Request cancelled.
Định dạng tệp backend không được hỗ trợ.|Unsupported backend file format.
Danh sách backend không đúng hợp đồng.|The backend list does not match the contract.
Phân trang backend không nhất quán.|Backend pagination is inconsistent.
Tải lại hồ sơ trước khi thay đổi.|Reload the dossier before making changes.
Phản hồi đăng nhập không hợp lệ.|Invalid sign-in response.
Backend không trả trường được yêu cầu.|The backend did not return the requested field.
Đóng|Close
Hủy|Cancel
Đang chờ tiếp nhận|Awaiting intake
Chờ tiếp nhận|Awaiting intake
Kiểm tra định dạng và dung lượng|Checking format and size
Đọc tệp trên thiết bị|Reading the local file
Kiểm tra nội dung trùng lặp|Checking for duplicate content
Hoàn tất tiếp nhận mô phỏng|Simulated intake complete
Tiếp nhận thất bại|Intake failed
Tệp rỗng.|The file is empty.
Tệp vượt quá 20 MiB.|The file exceeds 20 MiB.
Chỉ nhận PDF, JPEG hoặc PNG.|Only PDF, JPEG and PNG files are accepted.
Tệp trùng nội dung với tài liệu đã tiếp nhận.|This file duplicates an existing document.
Phiên làm việc đã thay đổi; vui lòng thử tải lại.|The session has changed. Please upload again.
Vui lòng đăng nhập phiên mô phỏng.|Please sign in to the demo.
Bạn không có quyền thực hiện thao tác này.|You do not have permission to perform this action.
Không tìm thấy hồ sơ trong phạm vi được cấp quyền.|Dossier not found within your access scope.
Hồ sơ đã khóa. Cần mở lại với lý do trước khi thay đổi.|The dossier is locked. Reopen it with a reason before making changes.
Không tìm thấy tệp trong hồ sơ.|File not found in this dossier.
Email quản trị viên không hợp lệ.|Invalid administrator email.
Email quản trị viên đã được sử dụng.|The administrator email is already in use.
Tên đăng nhập đã được sử dụng.|The username is already in use.
Mật khẩu mẫu cần ít nhất 8 ký tự.|The demo password needs at least 8 characters.
Mã số doanh nghiệp đã tồn tại.|The business registration number already exists.
Công ty hoặc vai trò không hợp lệ.|Invalid company or role.
Không có tài khoản đang hoạt động với vai trò này.|No active account has this role.
Loại hồ sơ không thuộc catalog công ty.|This dossier type is not in the company catalog.
Người phụ trách không hợp lệ.|Invalid assignee.
Người được phân công phải đang hoạt động trong công ty.|The assignee must be an active company member.
Chọn ít nhất một tệp.|Select at least one file.
Loại giấy tờ không thuộc cấu hình hồ sơ.|This document type is not in the dossier configuration.
Chỉ tệp xử lý lỗi mới được thử lại.|Only failed files can be retried.
Loại giấy tờ không thuộc phiên bản cấu hình hồ sơ.|This document type is not in the dossier's configuration version.
Chọn mã lý do điều chỉnh hợp lệ.|Choose a valid correction reason.
Lý do khác cần ghi chú.|Other reasons require a note.
Không tìm thấy trường dữ liệu.|Field not found.
Giá trị đã được chuyên viên xác minh.|Value verified by a specialist.
Chỉ cảnh báo đang mở mới được xác nhận.|Only open warnings can be acknowledged.
Quyết định không hợp lệ.|Invalid decision.
Chỉ duyệt khi đủ tài liệu, không còn quy tắc chờ, sai lệch hoặc cảnh báo chưa xử lý.|Complete the documents and resolve pending rules, discrepancies and open warnings before approving.
Chỉ được mở lại hồ sơ đã phê duyệt; hồ sơ từ chối là trạng thái cuối.|Only approved dossiers can be reopened. Rejected dossiers are final.
Không tìm thấy trường PII.|Sensitive field not found.
Địa chỉ email không hợp lệ.|Invalid email address.
Vai trò không thể cấp trong công ty.|This role cannot be assigned within a company.
Email đã tồn tại trong hệ thống.|This email is already in use.
Không tìm thấy thành viên.|Member not found.
Trạng thái thành viên không hợp lệ.|Invalid member status.
Không thể vô hiệu hóa quản trị viên hoạt động cuối cùng.|The last active administrator cannot be deactivated.
Cần chọn thành viên hoạt động nhận chuyển giao hồ sơ.|Choose an active member to receive the dossiers.
Không tìm thấy loại giấy tờ.|Document type not found.
Cần ít nhất một trường trích xuất.|At least one extraction field is required.
Kiểu trường không hợp lệ.|Invalid field type.
Mã trường không được trùng trong schema.|Field keys must be unique within the schema.
Không tìm thấy loại hồ sơ.|Dossier type not found.
Chọn ít nhất một loại giấy tờ.|Select at least one document type.
Loại giấy tờ không hợp lệ hoặc bị trùng.|Invalid or duplicate document type.
Giấy tờ điều kiện cần mô tả điều kiện áp dụng.|Conditional documents require an explanation.
Nguồn luật phải thuộc danh sách giấy tờ của loại hồ sơ.|Rule sources must be documents in the dossier type.
Trường nguồn đối soát không tồn tại.|The comparison source field does not exist.
Phép so sánh không tương thích với kiểu trường.|The comparison operator is incompatible with the field type.
Mức độ quy tắc không hợp lệ.|Invalid rule severity.
Chỉ thêm yêu cầu điều kiện đã có trong snapshot hồ sơ.|Only conditional requirements in the dossier snapshot can be added.
Không thể loại bỏ giấy tờ bắt buộc.|Required documents cannot be removed.
Thông tin yêu cầu không hợp lệ.|Invalid request
Vui lòng đăng nhập để tiếp tục.|Authentication required
Bạn không được cấp quyền thực hiện thao tác này.|Permission denied
Không tìm thấy tài nguyên.|Resource not found
Dữ liệu đã thay đổi hoặc thao tác không phù hợp trạng thái hiện tại.|Resource has changed or operation conflicts with its state
Dịch vụ tạm thời chưa sẵn sàng.|Service temporarily unavailable
Máy chủ gặp lỗi nội bộ.|Internal server error
`.trim().split('\n').map(line=>line.split('|')));

const vietnamese = new Map([...english].map(([vi,en])=>[en,vi]));

const patterns = [
  [/^(.+): (.+) — (\d+)$/u,(_m,date,status,count)=>`${date}: ${translateText(status)} — ${count}`],
  [/^(.+) không được để trống\.$/u,(_m,label)=>`${translateText(label)} is required.`],
  [/^Xin chào, (.+)$/u,(_m,name)=>`Hello, ${name}`],
  [/^Trang (\d+)( \/ \d+)?$/u,(_m,n,rest)=>`Page ${n}${rest||''}`],
  [/^(\d+) hồ sơ$/u,(_m,n)=>`${n} dossiers`],
  [/^(\d+) hồ sơ đang chờ$/u,(_m,n)=>`${n} dossiers awaiting review`],
  [/^(\d+) hồ sơ sẵn sàng kiểm duyệt$/u,(_m,n)=>`${n} dossiers ready for review`],
  [/^(\d+) hồ sơ chờ kiểm duyệt\.$/u,(_m,n)=>`${n} dossiers awaiting review.`],
  [/^(\d+) hồ sơ thiếu giấy tờ\.$/u,(_m,n)=>`${n} dossiers need documents.`],
  [/^(\d+) hồ sơ có sai lệch\.$/u,(_m,n)=>`${n} dossiers have discrepancies.`],
  [/^(\d+) tệp trong hồ sơ$/u,(_m,n)=>`${n} files in this dossier`],
  [/^(\d+) tài liệu$/u,(_m,n)=>`${n} documents`],
  [/^(\d+) đã trích xuất$/u,(_m,n)=>`${n} extracted`],
  [/^(\d+) giấy tờ đã trích xuất$/u,(_m,n)=>`${n} documents extracted`],
  [/^(\d+) vấn đề cần xác minh$/u,(_m,n)=>`${n} issues to verify`],
  [/^(\d+) cần xử lý$/u,(_m,n)=>`${n} need attention`],
  [/^(\d+) hoạt động$/u,(_m,n)=>`${n} events`],
  [/^(\d+) tài khoản đang hoạt động$/u,(_m,n)=>`${n} active accounts`],
  [/^(\d+) quyết định được lưu theo lượt xử lý\.$/u,(_m,n)=>`${n} decisions recorded by processing version.`],
  [/^(\d+) yêu cầu đang được xử lý$/u,(_m,n)=>`${n} requests in progress`],
  [/^Đợt (\d+)$/u,(_m,n)=>`Batch ${n}`],
  [/^Cấu hình v(\d+)$/u,(_m,n)=>`Configuration v${n}`],
  [/^Lượt xử lý (\d+)$/u,(_m,n)=>`Revision ${n}`],
  [/^Phiên bản (\d+)$/u,(_m,n)=>`Version ${n}`],
  [/^Ưu tiên (\d+)$/u,(_m,n)=>`Priority ${n}`],
  [/^Tạo ngày (.+)$/u,(_m,date)=>`Created ${date}`],
  [/^Trường (\d+)$/u,(_m,n)=>`Field ${n}`],
  [/^Quy tắc (\d+)$/u,(_m,n)=>`Rule ${n}`],
  [/^(\d+) trường$/u,(_m,n)=>`${n} fields`],
  [/^(\d+) loại giấy tờ$/u,(_m,n)=>`${n} document types`],
  [/^Nhập ít nhất (\d+) ký tự\.$/u,(_m,n)=>`Enter at least ${n} characters.`],
  [/^Tối thiểu (\d+) ký tự$/u,(_m,n)=>`At least ${n} characters`],
  [/^Chỉnh sửa (loại giấy tờ|loại bộ hồ sơ)$/u,(_m,kind)=>`Edit ${kind==='loại giấy tờ'?'document':'dossier'} type`],
  [/^Xóa (trường|quy tắc) (\d+)$/u,(_m,kind,n)=>`Remove ${kind==='trường'?'field':'rule'} ${n}`],
  [/^Đánh dấu không áp dụng cho (.+)$/u,(_m,name)=>`Mark ${name} as not applicable`],
  [/^Mở (.+)$/u,(_m,name)=>`Open ${name}`],
  [/^Hiện (.+)$/u,(_m,label)=>`Show ${translateText(label)}`],
  [/^Ẩn (.+)$/u,(_m,label)=>`Hide ${translateText(label)}`],
  [/^Điều kiện: (.+)$/u,(_m,condition)=>`Condition: ${condition}`],
  [/^Tệp dẫn xuất · nguồn trang (.+)$/u,(_m,pages)=>`Derived file · source pages ${pages}`],
  [/^Tiến trình cục bộ (.+)$/u,(_m,name)=>`Local progress for ${name}`],
  [/^Bằng chứng (.+) · Trang (\d+)$/u,(_m,label,page)=>`Evidence for ${label} · Page ${page}`],
  [/^Thay đổi được lưu thành phiên bản (\d+)\. Hồ sơ đang xử lý giữ nguyên cấu hình\.$/u,(_m,n)=>`Changes will be saved as version ${n}. Existing dossiers keep their configuration.`],
  [/^Ghi nhận người thực hiện, thời gian, quyết định và lý do trong lượt xử lý (\d+)\.$/u,(_m,n)=>`Record the reviewer, time, decision and reason for revision ${n}.`],
  [/^Đã hoàn tất mô phỏng: (\d+)\/(\d+) tệp được tiếp nhận(, (\d+) tệp cần kiểm tra lại)?\.$/u,(_m,accepted,total,_rest,failed)=>`Simulation complete: ${accepted}/${total} files accepted${failed?`, ${failed} files need attention`:''}.`]
];

let locale='vi';
try { if(globalThis.localStorage?.getItem('docsense:locale')==='en')locale='en'; } catch { /* Storage may be disabled. */ }
export const getLocale = () => locale;
export function translateText(value) {
  if(english.has(value))return english.get(value);
  for(const [pattern,replace] of patterns)if(pattern.test(value))return value.replace(pattern,replace);
  if(value.includes(' · '))return value.split(' · ').map(translateText).join(' · ');
  return value;
}
export function languageSwitcher(className='') {
  return `<label class="language-switch ${className}"><span class="sr-only">Ngôn ngữ / Language</span><select data-locale-picker aria-label="Ngôn ngữ / Language"><option value="vi" ${locale==='vi'?'selected':''}>Tiếng Việt</option><option value="en" ${locale==='en'?'selected':''}>English</option></select></label>`;
}

const originals=new WeakMap();
const protectedContent='[data-user-content],code,script,style,textarea,svg,.avatar,.record-link strong,.record-link small,.tenant-card strong,.user-button strong,.breadcrumbs>span:first-of-type,.task-content>span,.document-item strong,.field-value>span,.field-row>small,.field-label .text-link,.paper-fields,.source-evidence,.catalog-node strong,.catalog-rule strong,.field-table tbody td:first-child,.config-row strong,.rule-values,.audit-description strong,.timeline-item strong,.timeline-item p,.checklist-content strong,.legal-card h2';
const attributes=['placeholder','aria-label','title','alt'];
function localizeValue(node,name,current,write) {
  let fields=originals.get(node);if(!fields){fields=new Map();originals.set(node,fields);}
  let saved=fields.get(name);
  if(!saved||current!==saved.rendered) {
    // Buttons restore their saved HTML after loading. That markup may already
    // be English; recover its source so switching back still works.
    const text=current.trim();
    saved={source:vietnamese.has(text)?current.replace(text,vietnamese.get(text)):current,rendered:current};
  }
  const text=saved.source.trim();
  const next=locale==='en'?saved.source.replace(text,translateText(text)):saved.source;
  if(current!==next)write(next);
  saved.rendered=next;fields.set(name,saved);
}
export function localizeDocument() {
  document.documentElement.lang=locale;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()) {
    if(!node.parentElement?.closest(protectedContent)&&node.textContent.trim())localizeValue(node,'text',node.textContent,value=>node.textContent=value);
  }
  for(const element of document.body.querySelectorAll(attributes.map(name=>`[${name}]`).join(','))) {
    if(element.closest('[data-user-content]'))continue;
    for(const name of attributes)if(element.hasAttribute(name))localizeValue(element,name,element.getAttribute(name),value=>element.setAttribute(name,value));
  }
  const title=document.querySelector('title');if(title)localizeValue(title,'text',title.textContent,value=>title.textContent=value);
  document.querySelectorAll('[data-locale-picker]').forEach(select=>{select.value=locale;});
}
export function setLocale(value) {
  if(!['vi','en'].includes(value))return;
  locale=value;try { localStorage.setItem('docsense:locale',locale); } catch { /* Keep the selection for this page. */ }
  localizeDocument();
  window.dispatchEvent(new CustomEvent('docsense:locale-change',{detail:{locale}}));
}
export function initI18n() {
  const observer=new MutationObserver(()=>{observer.disconnect();localizeDocument();observe();});
  const observe=()=>observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes});
  document.addEventListener('change',event=>{if(event.target.matches('[data-locale-picker]'))setLocale(event.target.value);});
  localizeDocument();observe();
}
