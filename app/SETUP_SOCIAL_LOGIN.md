# Hướng dẫn cấu hình Đăng nhập mạng xã hội (Google · Facebook · Apple)

Code đã được wire sẵn **đầy đủ** (Flutter + backend). Việc còn lại là tạo app trên các
nền tảng và điền credentials vào các chỗ đánh dấu `YOUR_...`. Làm xong provider nào thì
provider đó chạy được — không phụ thuộc nhau.

> Luồng hoạt động: App lấy token từ Google/Facebook/Apple → gửi lên backend
> (`POST /api/v1/auth/oauth/{google|apple|facebook}`) → backend xác minh token, tạo/khớp
> user, trả về `accessToken` + `refreshToken` + `user`. Không có bước nào lưu mật khẩu MXH.

---

## 0. Thông tin dự án

| Mục | Giá trị |
|---|---|
| Android applicationId | `vn.thuanduong.thuanduong_app` |
| iOS bundle id | đặt trong Xcode (mặc định `vn.thuanduong.thuanduongApp`) |
| Backend base URL (dev) | `http://localhost:3000` (Android emulator dùng `http://10.0.2.2:3000`) |

Chạy app trỏ về backend + truyền client id:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=XXXX.apps.googleusercontent.com
```

---

## 1. Google

### 1.1 Tạo OAuth clients (Google Cloud Console)
1. https://console.cloud.google.com → tạo project (hoặc dùng project sẵn có).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**, tạo **3** client:
   - **Web application** → ghi lại **Client ID** + **Client secret**.
     → Đây là giá trị `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` của **backend**
       và cũng là `GOOGLE_SERVER_CLIENT_ID` truyền cho app.
   - **Android** → package name `vn.thuanduong.thuanduong_app` + **SHA-1** (xem 1.2).
   - **iOS** → bundle id của app. Ghi lại **iOS client ID**.

### 1.2 Lấy SHA-1 (Android)
```bash
# Debug keystore (dev)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
# Hoặc dùng gradle:
cd android && ./gradlew signingReport
```
Copy dòng `SHA1:` dán vào Android OAuth client. Khi lên Play Store nhớ thêm SHA-1 của
**release/upload key** nữa.

### 1.3 Điền giá trị
- **Backend** `web/.env.local`:
  ```
  GOOGLE_CLIENT_ID="<WEB client id>.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET="<WEB client secret>"
  ```
- **App khi chạy**: `--dart-define=GOOGLE_SERVER_CLIENT_ID=<WEB client id>` *(phải TRÙNG `GOOGLE_CLIENT_ID` backend — nếu không backend sẽ báo token sai audience)*.
- **iOS** `ios/Runner/Info.plist`:
  - `GIDClientID` = `<iOS client id>.apps.googleusercontent.com`
  - URL scheme `com.googleusercontent.apps.YOUR_GOOGLE_REVERSED_CLIENT_ID`
    = REVERSED_CLIENT_ID trong file `GoogleService-Info.plist` (đảo iOS client id).
- **Android**: tải `google-services.json` (Firebase hoặc tự tạo) đặt vào
  `android/app/google-services.json` *(đã .gitignore — không commit)*. google_sign_in
  hoạt động chỉ với SHA-1 + serverClientId, nhưng có file này thì chuẩn nhất.

---

## 2. Facebook

### 2.1 Tạo app
1. https://developers.facebook.com → **My Apps → Create App** → loại **Consumer**.
2. Thêm sản phẩm **Facebook Login**.
3. **Settings → Basic**: ghi lại **App ID** và **App Secret**.
4. **Settings → Advanced → Security**: ghi lại **Client Token**.

### 2.2 Khai báo nền tảng (trong Settings → Basic → Add Platform)
- **Android**: package `vn.thuanduong.thuanduong_app`, class `vn.thuanduong.thuanduong_app.MainActivity`,
  và **Key Hashes** (base64) — tạo bằng:
  ```bash
  keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android | openssl sha1 -binary | openssl base64
  ```
- **iOS**: bundle id của app.

### 2.3 Điền giá trị
- **Backend** `web/.env.local`:
  ```
  FACEBOOK_APP_ID="<App ID>"
  FACEBOOK_APP_SECRET="<App Secret>"
  ```
- **Android** `android/app/src/main/res/values/strings.xml`:
  ```xml
  <string name="facebook_app_id">123456789</string>
  <string name="facebook_client_token">abc123...</string>
  <string name="fb_login_protocol_scheme">fb123456789</string>   <!-- "fb" + App ID -->
  ```
- **iOS** `ios/Runner/Info.plist`: thay `YOUR_FACEBOOK_APP_ID` (2 chỗ: URL scheme `fb...`
  và key `FacebookAppID`) và `YOUR_FACEBOOK_CLIENT_TOKEN`.

---

## 3. Apple (chỉ iOS/macOS — bắt buộc nếu phát hành lên App Store có social login)
1. https://developer.apple.com → **Certificates, IDs & Profiles**.
2. Tạo **App ID** (bật capability *Sign In with Apple*) và một **Services ID**.
3. Trong **Xcode** → target Runner → **Signing & Capabilities → + Capability → Sign In with Apple**.
4. **Backend** `web/.env.local`: `APPLE_CLIENT_ID` = Bundle ID (app) hoặc Services ID (web)
   — chính là audience để verify `identityToken`.

> Apple chỉ trả tên người dùng ở LẦN đăng nhập đầu tiên — app đã xử lý gửi `fullName` kèm theo.

---

## 4. Checklist nhanh

| Provider | Backend (.env.local) | App / Native |
|---|---|---|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `--dart-define=GOOGLE_SERVER_CLIENT_ID`, SHA-1, `google-services.json`, iOS `GIDClientID`+URL scheme |
| Facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | `strings.xml` (Android), `Info.plist` (iOS), Key Hash |
| Apple | `APPLE_CLIENT_ID` | Capability *Sign In with Apple* trong Xcode |

Sau khi điền xong: `flutter pub get` → `flutter run --dart-define=...`. Nút Google/Facebook
hiện trên Android & iOS; nút Apple chỉ hiện trên iOS/macOS (đúng quy định Apple).

## 5. Lưu ý bảo mật
- `web/.env.local`, `android/app/google-services.json`, `strings.xml` chứa secret → **không commit** (đã có trong .gitignore, riêng `strings.xml` nếu chứa token thật nên cân nhắc tách ra).
- App Secret / App Client Secret chỉ nằm ở **backend**, app KHÔNG chứa secret nào.
