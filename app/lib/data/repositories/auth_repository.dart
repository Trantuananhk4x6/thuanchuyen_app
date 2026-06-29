import '../api/api_client.dart';
import '../models/user.dart';
import '../../core/constants/api.dart';

class AuthRepository {
  AuthRepository(this._api);
  final ApiClient _api;

  Future<void> requestOtp({required String email}) {
    return _api.post(ApiConstants.requestOtp, data: {'email': email});
  }

  Future<AuthTokens> verifyOtp({required String email, required String otp}) {
    return _api.post(
      ApiConstants.verifyOtp,
      data: {'email': email, 'otp': otp},
      fromJson: (d) => AuthTokens.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<AuthTokens> loginPassword({required String email, required String password}) {
    return _api.post(
      ApiConstants.loginPassword,
      data: {'email': email, 'password': password},
      fromJson: (d) => AuthTokens.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<AuthTokens> register({
    required String email,
    required String password,
    required String fullName,
    required String role,
  }) {
    return _api.post(
      ApiConstants.register,
      data: {'email': email, 'password': password, 'fullName': fullName, 'role': role},
      fromJson: (d) => AuthTokens.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<AuthTokens> loginGoogle({required String idToken, String role = 'CUSTOMER'}) {
    return _api.post(
      ApiConstants.oauthGoogle,
      data: {'idToken': idToken, 'role': role},
      fromJson: (d) => AuthTokens.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<AuthTokens> loginApple({
    required String identityToken,
    String? fullName,
    String role = 'CUSTOMER',
  }) {
    return _api.post(
      ApiConstants.oauthApple,
      data: {'identityToken': identityToken, 'fullName': fullName, 'role': role},
      fromJson: (d) => AuthTokens.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<UserProfile> getProfile() {
    return _api.get(
      ApiConstants.profile,
      fromJson: (d) => UserProfile.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<void> logout() => _api.post(ApiConstants.logout, data: {});
}
