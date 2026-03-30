# Báo Cáo Module Authentication, Authorization & Quản Lý User
**Cấu trúc dự án theo chuẩn đã thống nhất:** Node.js + Express, Mongoose, JWT

---

## 1. Dữ Liệu Mẫu (Seed & Database)
Chạy docker conainer MongoDB (theo yêu cầu):
```bash
docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo
```

File cấu hình chung tại `configs/index.js` và `.env`
Để sinh dữ liệu cho bài làm, chạy lệnh:
```bash
node scripts/seed.js
```
Kết quả Seed:
- **Tài khoản Admin:** `admin` / Password: `admin`
- **Tài khoản Staff:** `staff01` / Password: `staff`
- **Tài khoản Customer:** `customer01` / Password: `pass`

---

## 2. API Mô Tả Chung

**Chuẩn hóa Response thành công:**
```json
{
  "success": true,
  "message": "Nội dung phản hồi",
  "data": { ... }
}
```

**Chuẩn hóa Error/Thất bại:**
```json
{
  "success": false,
  "message": "Lỗi gì đó",
  "errors": [
     { "field": "email", "message": "Email is required" }
  ]
}
```

---

## 3. Các API đã thực hiện (8 Models)
Tất cả đều nằm ở thư mục `modules/` (Thay cho các file Controller gộp lộn xộn cũ).
Các Schema nằm ở thư mục `schemas/`.

### 3.1 Authentication & Authorization (`auth`)
- **Đăng ký:** `POST /api/v1/auth/register`
- **Đăng nhập:** `POST /api/v1/auth/login` (Trả về AcessToken và RefreshToken, log lại vào Audit)
- **Refresh Token:** `POST /api/v1/auth/refresh-token` (Quay vòng chuỗi token theo chuẩn Oauth nhỏ)
- **Thông tin mình:** `GET /api/v1/auth/me`
- **Đổi mật khẩu:** `POST /api/v1/auth/change-password`

### 3.2 Users Management (`users` - Admin only)
- `GET /api/v1/users` (List user vs phân trang, lọc bằng keyword)
- `POST /api/v1/users` 
- `PUT /api/v1/users/:id`
- `PATCH /api/v1/users/:id/toggle-status` (Khóa/Mở tài khoản - có ghi Log)
- `DELETE /api/v1/users/:id` (Xóa mềm - isDeleted = true)

### 3.3 UserAddress (`user-addresses` - Personal)
- `GET /api/v1/user-addresses` (Lấy danh sách địa chỉ. Sắp xếp `isDefault` lên đầu)
- `POST /api/v1/user-addresses` (Setup isDefault tự động nếu là địa chỉ đầu)
- `PUT /api/v1/user-addresses/:id`
- `DELETE /api/v1/user-addresses/:id` 

### 3.4 UploadFiles (`uploads` - Authenticated)
- `POST /api/v1/uploads/single` (Upload ảnh đơn)
- `POST /api/v1/uploads/multiple` (Upload nhiều ảnh, lưu vào DB và trả về path URL cấu hình chuẩn)

### 3.5 Roles & Permissions (`roles`)
- `GET /api/v1/roles` (Lấy quyền)
- `POST /api/v1/roles` (Tạo role)

### 3.6 AuditLog (`audit-logs` - Admin only)
- `GET /api/v1/audit-logs` (Ghi log login, tạo xóa thông tin quan trọng. Nơi duy nhất lưu Lịch sử)

### 3.7 Notification (`notifications`)
- `GET /api/v1/notifications` (Lấy thông báo của user với unread count)
- `PATCH /api/v1/notifications/read-all` (Đánh dấu đã đọc tất cả)
- `POST /api/v1/notifications/system` (Push realtime DB cho Toàn bộ Customer hoặc 1 User)

---

## 4. Các Case Thành Công / Thất Bại
1. **Đăng nhập sai 5 lần**: Tài khoản bị khóa 24 tiếng (`status` nguyên, nhưng set `lockTime`). Ghi lịch sử `LOGIN_FAILED`. Cố đăng nhập lúc khóa bị trả 403 Forbidden.
2. **Quên truyền AccessToken**: Trả mã lỗi `401 Unauthorized`.
3. **Staff gọi API Xóa User**: Bị Middleware Role chặn trả mã `403 Forbidden ("Requires ADMIN mode")`.
4. **Tạo tài khoản trùng username**: Catch tại controller. Gọi Helper Response chuẩn `409 Conflict`.
5. **Dung lượng file upload lớn hơn 5MB**: Bắt qua Multer Error handler. Trả `400 Bad Request`.
