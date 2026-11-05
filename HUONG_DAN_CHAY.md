# HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY HỆ THỐNG HEALTHY CHECK

> **Đồ án môn học:** Lập trình cho thiết bị di động  
> **Trường:** Đại học Công nghiệp TP. Hồ Chí Minh (IUH) - Khoa Công nghệ Thông tin  
> **Lớp học phần:** DHKTPM19B - **Nhóm:** 7  
> **Giảng viên hướng dẫn:** ThS. Nguyễn Minh Hải  
> **Thành viên nhóm:**  
> - Nguyễn Đào Hoài Thuận (MSSV: 23681691)  
> - Nguyễn Đức Trí (MSSV: 23689511)  
> - Trần Thiên Bảo (MSSV: 23690781)  

---

## 1. YÊU CẦU MÔI TRƯỜNG TIÊN QUYẾT (PREREQUISITES)

Để cài đặt và khởi chạy hệ thống một cách trơn tru, máy tính của bạn cần được cài đặt sẵn:

1. **Node.js**: Phiên bản **v18.x** trở lên (Khuyến nghị Node.js LTS v20.x).
   - Kiểm tra bằng lệnh: `node -v`
2. **Trình quản lý gói npm**: Phiên bản **v9.x** trở lên (đi kèm Node.js).
   - Kiểm tra bằng lệnh: `npm -v`
3. **Git**: Dùng để quản lý mã nguồn và sao chép kho repository.
   - Kiểm tra bằng lệnh: `git --version`
4. **Trình duyệt Web hiện đại**: Google Chrome, Microsoft Edge hoặc Safari (hỗ trợ ES6+ và WebAssembly).
5. **(Tùy chọn cho Di động) Ứng dụng Expo Go**:
   - Tải từ [Apple App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779) hoặc [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent).

---

## 2. HƯỚNG DẪN LẤY MÃ NGUỒN VÀ CÀI ĐẶT THƯ VIỆN

### Bước 2.1: Sao chép kho mã nguồn (Clone Repository)
Mở cửa sổ dòng lệnh (Terminal / PowerShell / Command Prompt) và thực thi:

```bash
git clone https://github.com/KbRockzz/healthy_check_G7.git
cd healthy_check_G7
```

Đảm bảo đang ở nhánh chính thức `main` mới nhất:
```bash
git checkout main
git pull origin main
```

### Bước 2.2: Cài đặt các gói phụ thuộc (Dependencies)
Cài đặt toàn bộ các thư viện React Native, Expo, Supabase và Jest:

```bash
npm install
```
*(Quá trình tải và cài đặt thường mất khoảng 1 - 2 phút tùy theo tốc độ mạng).*

---

## 3. CẤU HÌNH BIẾN MÔI TRƯỜNG (.ENV)

Hệ thống kết nối trực tiếp với backend đám mây Supabase PostgreSQL và Serverless Edge Function qua các khóa API công khai an toàn.

Tạo hoặc kiểm tra tệp `.env` tại thư mục gốc của dự án (`d:\healthy_check_G7\.env`):

```env
# Supabase Backend Configuration
EXPO_PUBLIC_SUPABASE_URL=https://pmaxtdfevzncqpbamwcq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtYXh0ZGZldnpuY3FwYmFtd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5ODY5NDEsImV4cCI6MjEwODU2Mjk0MX0.LoBewo64m-Bf98GTSniPO4CNw93FxWiq3nj1xmm_JZQ
```

> **Lưu ý:** Biến môi trường trên đã được cấu hình trỏ sẵn đến cơ sở dữ liệu Supabase đang vận hành của dự án, người dùng không cần phải thiết lập thêm gì thêm.

---

## 4. HƯỚNG DẪN KHỞI CHẠY ỨNG DỤNG (RUN CLIENT)

### Cách 1: Khởi chạy trên Trình duyệt Web (Khuyến nghị)
Thực thi lệnh sau tại thư mục gốc dự án:

```bash
npx expo start --web -p 8081 -c
```

- Tham số `--web`: Khởi chạy giao diện người dùng trên nền tảng Web.
- Tham số `-p 8081`: Cố định cổng chạy tại `8081`.
- Tham số `-c`: Xóa bộ nhớ đệm (Clean cache) để bảo đảm nạp mã nguồn mới nhất.

Sau khi khởi chạy thành công:
1. Mở trình duyệt Web tại địa chỉ: **`http://localhost:8081`**
2. Ứng dụng sẽ hiển thị ngay màn hình **Launch Screen** với giao diện đồ họa hoàn chỉnh.

### Cách 2: Khởi chạy trên Điện thoại qua Expo Go
1. Khởi chạy máy chủ phát triển Expo:
   ```bash
   npx expo start -c
   ```
2. Terminal sẽ hiển thị một mã **QR Code**.
3. **Trên thiết bị Android:** Mở ứng dụng **Expo Go**, chọn *Scan QR Code* và quét mã.
4. **Trên thiết bị iOS:** Mở ứng dụng **Camera** mặc định, hướng vào mã QR Code và nhấn vào biểu tượng mở trong Expo Go.

---

## 5. TÀI KHOẢN TRẢI NGHIỆM VÀ ĐĂNG NHẬP THỬ NGHIỆM

Hệ thống đã được nạp sẵn dữ liệu kiểm thử (Seed Data) với các tài khoản thử nghiệm sau:

| Loại tài khoản | Địa chỉ Email | Mật khẩu | Mục đích kiểm tra |
| :--- | :--- | :--- | :--- |
| **Tài khoản chính (Demo Owner)** | `demo.owner@healthy-check.app` | `demo_pass_1` | Đầy đủ dữ liệu bước chân, giấc ngủ, dinh dưỡng, chu kỳ và chỉ số thực tế để tương tác với AI |
| **Tài khoản người nhận (Demo Receiver)** | `demo.receiver@healthy-check.app` | `demo_pass_2` | Kiểm tra tính năng chia sẻ dữ liệu y tế và nhận hồ sơ lâm sàng |

> **Gợi ý:** Bạn cũng có thể bấm vào nút **"Sign Up"** để đăng ký một tài khoản hoàn toàn mới với Email bất kỳ để kiểm tra luồng xác thực đăng ký người dùng mới.

---

## 6. HƯỚNG DẪN CHẠY BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TESTING)

Dự án tích hợp bộ kiểm thử tự động với framework **Jest**, bao gồm cả Unit Tests (kiểm thử thuật toán đơn vị) và Integration Tests (kiểm thử tích hợp luồng nghiệp vụ).

### Lệnh thực thi kiểm thử:
Tại thư mục gốc dự án, thực thi lệnh:

```bash
npm test
```

### Kết quả kỳ vọng:
```text
> healthy_check_g7@0.1.0 test
> jest src/__tests__

PASS src/__tests__/unit.test.ts
PASS src/__tests__/integration.test.ts

Test Suites: 2 passed, 2 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        0.571 s, estimated 1 s
Ran all test suites matching src/__tests__.
```
- **100% các bài test đều Passed** (36/36 tests).
- **Test Suite 1 (`unit.test.ts`):** 24 bài test kiểm tra thuật toán tính điểm Health Score, tỷ lệ dinh dưỡng, ngày rụng trứng chu kỳ, regex cấp cứu 115, và xử lý phím Enter Web.
- **Test Suite 2 (`integration.test.ts`):** 12 bài test kiểm tra luồng điều hướng, phiên xác thực JWT, bộ lọc bài viết Explore, vòng đời chia sẻ dữ liệu y tế và xóa lịch sử hội thoại Chatbot.

---

## 7. CÁC TÍNH NĂNG CHÍNH ĐỂ TRẢI NGHIỆM TRÊN ỨNG DỤNG

Sau khi đăng nhập bằng tài khoản `demo.owner@healthy-check.app`:

1. **Bảng tin tổng quan (Home Dashboard):**
   - Xem điểm sức khỏe **Health Score 88/100** phân khúc Xuất sắc.
   - Bấm vào các thẻ tóm tắt: **Steps** (6,432 bước), **Sleep** (7h 30m), **Nutrition** (1,850 kcal), **Cycle** (Day 14).
2. **Theo dõi chi tiết các chỉ số (Trackers):**
   - **Step Tracker:** Xem đồ thị cột vận động theo tuần, quãng đường 4.8 km và 320 kcal.
   - **Sleep Tracker:** Xem cấu trúc pha ngủ Deep, Light, REM.
   - **Nutrition Tracker:** Xem tỷ lệ đa lượng chất Carbs, Protein, Fat.
   - **Cycle Tracker:** Xem vòng tròn chu kỳ sinh học và cửa sổ thụ thai (Ovulation Window).
3. **Khám phá bài viết y tế (Explore Screen):**
   - Dùng thanh Search tìm kiếm theo từ khóa (ví dụ: *dinh dưỡng*, *giấc ngủ*).
   - Lọc bài viết theo các tag chuyên đề: *Nutrition, Mental, Lifestyle*.
4. **Chia sẻ dữ liệu y tế & Xuất PDF (Share Health Screen):**
   - Xem danh sách người được cấp quyền xem dữ liệu sức khỏe.
   - Bấm nút **"Preview Clinical Summary PDF"** để mở modal xem trước bản tóm tắt lâm sàng chuẩn y khoa.
   - Bấm nút **"Revoke"** để thu hồi quyền chia sẻ tức thì.
5. **Trợ lý AI Health Coach & Lưới an toàn Cấp cứu 115:**
   - Bấm vào nút tròn nổi **ChatFAB** hoặc banner AI trên Dashboard để mở phân hệ Chat.
   - Chấp thuận điều khoản quyền riêng tư y tế (**Consent Sheet**).
   - Bấm vào các **Chip câu hỏi gợi ý** (ví dụ: *"Đánh giá số bước hôm nay của tôi"*).
   - Quan sát AI phản hồi streaming theo thời gian thực và phân tích chính xác số liệu **6,432 bước chân thực tế** từ database.
   - **Thử nghiệm Lưới an toàn 115:** Nhập câu hỏi có triệu chứng nguy kịch (ví dụ: *"Tôi bị đau thắt ngực dữ dội và khó thở"*). Hệ thống sẽ tự động ngắt tư vấn và hiển thị ngay banner đỏ cảnh báo gọi **Cấp cứu 115**.
   - Bấm vào icon lịch sử góc trên bên phải để mở **History Drawer**, xem và xóa các phiên trò chuyện cũ.

---

## 8. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING / FAQ)

### Lỗi 1: Cổng 8081 đã bị chiếm dụng (Port 8081 is already in use)
- **Cách khắc phục:** Chạy trên một cổng khác hoặc tắt tiến trình đang chiếm cổng:
  ```bash
  npx expo start --web -p 8082 -c
  ```
  Sau đó mở trình duyệt tại `http://localhost:8082`.

### Lỗi 2: Trình duyệt hiển thị màn hình trắng hoặc lỗi cache cũ
- **Cách khắc phục:** 
  1. Thêm cờ `-c` để xóa sạch cache: `npx expo start --web -p 8081 -c`.
  2. Trên trình duyệt, nhấn tổ hợp phím **Ctrl + Shift + R** (hoặc Cmd + Shift + R trên Mac) để Hard Refresh.

### Lỗi 3: Lệnh `npm test` báo lỗi module không tìm thấy
- **Cách khắc phục:** Thực thi cài đặt lại các gói:
  ```bash
  npm install
  npm test
  ```

---

*Tài liệu được cập nhật chính thức vào tháng 11 năm 2026 bởi Nhóm 7 - DHKTPM19B.*

