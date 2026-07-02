import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  // Override khi build/run (ưu tiên cao nhất, mọi môi trường):
  //   flutter run  --dart-define=API_BASE_URL=http://192.168.x.x:3000/api/v1  (máy thật cùng LAN)
  //   flutter build ... --dart-define=API_BASE_URL=https://api.thuanchuyen.vn/api/v1  (production)
  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// Base URL của API.
  /// - Có --dart-define=API_BASE_URL → dùng giá trị đó.
  /// - Mặc định DEV: Android emulator KHÔNG tới được `localhost` của máy tính
  ///   (localhost = chính emulator) → phải dùng alias host loopback `10.0.2.2`.
  ///   iOS simulator / desktop / web thì dùng `localhost`.
  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api/v1';
    }
    return 'http://localhost:3000/api/v1';
  }
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Auth
  static const String requestOtp    = '/auth/email-otp/request';
  static const String verifyOtp     = '/auth/email-otp/verify';
  static const String loginPassword = '/auth/login';
  static const String register      = '/auth/register';
  static const String refreshToken  = '/auth/refresh';
  static const String logout        = '/auth/logout';
  static const String profile       = '/auth/profile';
  static const String oauthGoogle   = '/auth/oauth/google';
  static const String oauthApple    = '/auth/oauth/apple';
  static const String oauthFacebook = '/auth/oauth/facebook';

  // Customer
  static const String customerTrips          = '/customer/trips';
  static const String customerBooking        = '/customer/trips';   // POST
  static const String customerTripDetail     = '/customer/trips/{id}';
  static const String customerDriverLocation = '/customer/trips/{id}/driver-location';
  static const String customerTripCancel     = '/customer/trips/{id}/cancel';
  static const String customerRating         = '/customer/trips/{id}/rating';
  static const String customerReports        = '/customer/reports';

  // Driver
  static const String driverLocation    = '/driver/location';
  static const String driverProfile     = '/driver/profile';
  static const String driverRoutes      = '/driver/routes';
  static const String driverTrips       = '/driver/trips';
  static const String driverAvailability = '/driver/availability';
  static const String driverMatches     = '/driver/matches';
  static const String driverWallet      = '/driver/wallet';
  static const String driverWithdraw    = '/driver/wallet/withdraw';
  static const String driverStreak      = '/driver/streak';
  static const String driverKyc         = '/driver/kyc';
  static const String driverBackhaul    = '/driver/backhaul';
  static const String driverCargo       = '/driver/cargo';

  // Shared
  static const String tripById          = '/trips/{id}';
  static const String payments          = '/payments';

  static String path(String template, Map<String, String> params) {
    var result = template;
    params.forEach((k, v) => result = result.replaceAll('{$k}', v));
    return result;
  }
}
