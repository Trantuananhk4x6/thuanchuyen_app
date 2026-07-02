# Thuận Chuyến — Flutter App

Ứng dụng di động cho nền tảng ghép chuyến xe liên tỉnh **Thuận Chuyến**.

## Setup

1. Cài Flutter SDK: https://docs.flutter.dev/get-started/install
2. Cập nhật `baseUrl` trong `lib/core/constants/api.dart`
3. Chạy:

```bash
cd thuanduong_app
flutter create . --project-name thuanduong_app --org vn.thuanduong
flutter pub get
flutter run
```

> Lưu ý: `flutter create .` sẽ tạo các file boilerplate (android/, ios/, web/) mà không ghi đè `lib/` hay `pubspec.yaml`.

## Cấu trúc project

```
lib/
├── main.dart
├── core/
│   ├── constants/api.dart        # API endpoints
│   ├── theme/app_theme.dart      # Dark theme, colors, typography
│   └── router/app_router.dart    # GoRouter + auth redirect
├── data/
│   ├── api/api_client.dart       # Dio + JWT interceptor + auto-refresh
│   ├── models/                   # user.dart, trip.dart
│   └── repositories/             # auth_repository.dart, trip_repository.dart
└── features/
    ├── auth/
    │   ├── providers/auth_provider.dart   # OTP flow state machine
    │   └── screens/login_screen.dart      # Phone + OTP PIN UI
    ├── customer/trips/
    │   ├── providers/trips_provider.dart
    │   └── screens/
    │       ├── customer_trips_screen.dart  # List + filter chips
    │       └── trip_detail_screen.dart     # Detail + cancel + rating
    ├── driver/
    │   ├── trips/screens/driver_trips_screen.dart
    │   └── routes/screens/driver_routes_screen.dart  # Nominatim PlaceSearch
    └── shared/
        ├── screens/splash_screen.dart
        └── widgets/status_badge.dart       # StatusBadge, AppCard, GradientButton
```

## Tech stack

| Layer       | Package                  |
|-------------|--------------------------|
| HTTP        | `dio` + JWT interceptor  |
| Auth store  | `flutter_secure_storage` |
| State       | `flutter_riverpod`       |
| Navigation  | `go_router`              |
| UI          | `google_fonts` (Inter)   |
| OTP input   | `pinput`                 |
| Maps        | `flutter_map` (OSM)      |
| Realtime    | `supabase_flutter`       |
