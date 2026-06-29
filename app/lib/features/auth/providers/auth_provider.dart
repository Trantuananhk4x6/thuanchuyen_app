import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../../data/api/api_client.dart';
import '../../../data/models/user.dart';
import '../../../data/repositories/auth_repository.dart';

// ── Providers ────────────────────────────────────────────────────────────────

final apiClientProvider = Provider<ApiClient>((_) => ApiClient.instance);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.read(apiClientProvider)),
);

// ── Auth state ───────────────────────────────────────────────────────────────

sealed class AuthState { const AuthState(); }

class AuthInitial       extends AuthState { const AuthInitial(); }
class AuthLoading       extends AuthState { const AuthLoading(); }
class AuthOtpSent       extends AuthState {
  const AuthOtpSent(this.email);
  final String email;
}
class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final UserProfile user;
}
class AuthError extends AuthState {
  const AuthError(this.message);
  final String message;
}

// ── Notifier ─────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo, this._api) : super(const AuthLoading()) {
    _checkLogin();
  }

  final AuthRepository _repo;
  final ApiClient      _api;

  Future<void> _checkLogin() async {
    final loggedIn = await _api.isLoggedIn;
    if (!loggedIn) { state = const AuthInitial(); return; }
    try {
      final profile = await _repo.getProfile();
      state = AuthAuthenticated(profile);
    } catch (_) {
      await _api.clearTokens();
      state = const AuthInitial();
    }
  }

  Future<void> requestOtp({required String email}) async {
    state = const AuthLoading();
    try {
      await _repo.requestOtp(email: email);
      state = AuthOtpSent(email);
    } on ApiException catch (e) {
      state = AuthError(e.message);
    } catch (_) {
      state = const AuthError('Không gửi được OTP. Kiểm tra lại email.');
    }
  }

  Future<void> verifyOtp({required String email, required String otp}) async {
    state = const AuthLoading();
    try {
      final tokens = await _repo.verifyOtp(email: email, otp: otp);
      await _api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
      state = AuthAuthenticated(tokens.user);
    } on ApiException catch (e) {
      state = AuthOtpSent(email);
      state = AuthError(e.message);
    } catch (_) {
      state = const AuthError('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
  }

  Future<void> loginPassword({required String email, required String password}) async {
    state = const AuthLoading();
    try {
      final tokens = await _repo.loginPassword(email: email, password: password);
      await _api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
      state = AuthAuthenticated(tokens.user);
    } on ApiException catch (e) {
      state = AuthError(e.message);
    } catch (_) {
      state = const AuthError('Email hoặc mật khẩu không đúng.');
    }
  }

  Future<void> loginGoogle({String role = 'CUSTOMER'}) async {
    state = const AuthLoading();
    try {
      final gsi = GoogleSignIn(scopes: ['email', 'profile']);
      final account = await gsi.signIn();
      if (account == null) { state = const AuthInitial(); return; }
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) throw Exception('Không lấy được Google ID token');

      final tokens = await _repo.loginGoogle(idToken: idToken, role: role);
      await _api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
      state = AuthAuthenticated(tokens.user);
    } on ApiException catch (e) {
      state = AuthError(e.message);
    } catch (e) {
      state = const AuthError('Đăng nhập Google thất bại. Thử lại sau.');
    }
  }

  Future<void> loginApple({String role = 'CUSTOMER'}) async {
    state = const AuthLoading();
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      final identityToken = credential.identityToken;
      if (identityToken == null) throw Exception('Không lấy được Apple identity token');

      final fullName = [
        credential.givenName,
        credential.familyName,
      ].where((s) => s != null && s.isNotEmpty).join(' ');

      final tokens = await _repo.loginApple(
        identityToken: identityToken,
        fullName: fullName.isEmpty ? null : fullName,
        role: role,
      );
      await _api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
      state = AuthAuthenticated(tokens.user);
    } on ApiException catch (e) {
      state = AuthError(e.message);
    } catch (e) {
      state = const AuthError('Đăng nhập Apple thất bại. Thử lại sau.');
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required String role,
  }) async {
    state = const AuthLoading();
    try {
      final tokens = await _repo.register(
        email: email, password: password, fullName: fullName, role: role,
      );
      await _api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken);
      state = AuthAuthenticated(tokens.user);
    } on ApiException catch (e) {
      state = AuthError(e.message);
    } catch (_) {
      state = const AuthError('Đăng ký thất bại. Vui lòng thử lại.');
    }
  }

  Future<void> logout() async {
    try { await _repo.logout(); } catch (_) {}
    await _api.clearTokens();
    state = const AuthInitial();
  }

  void backToEmail() => state = const AuthInitial();
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(
    ref.read(authRepositoryProvider),
    ref.read(apiClientProvider),
  ),
);
