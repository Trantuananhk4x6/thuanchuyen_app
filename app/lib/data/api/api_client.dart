import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/api.dart';

const _accessKey  = 'access_token';
const _refreshKey = 'refresh_token';

class ApiClient {
  ApiClient._() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: _onRequest,
      onError: _onError,
    ));
  }

  static final ApiClient instance = ApiClient._();

  late final Dio _dio;
  bool _refreshing = false;

  // ── Token helpers ────────────────────────────────────────────────────────────

  Future<void> saveTokens({required String access, required String refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessKey, access);
    await prefs.setString(_refreshKey, refresh);
  }

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessKey);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshKey);
  }

  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessKey);
    await prefs.remove(_refreshKey);
  }

  Future<bool> get isLoggedIn async => (await getAccessToken()) != null;

  // ── Interceptors ─────────────────────────────────────────────────────────────

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401 || _refreshing) {
      return handler.next(err);
    }

    _refreshing = true;
    try {
      final refresh = await getRefreshToken();
      if (refresh == null) return handler.next(err);

      final res = await _dio.post(
        ApiConstants.refreshToken,
        data: {'refreshToken': refresh},
        options: Options(headers: {'Authorization': null}),
      );
      final data = res.data['data'] as Map<String, dynamic>;
      await saveTokens(access: data['accessToken'], refresh: data['refreshToken']);

      // Retry original request
      err.requestOptions.headers['Authorization'] = 'Bearer ${data['accessToken']}';
      final retried = await _dio.fetch(err.requestOptions);
      handler.resolve(retried);
    } catch (_) {
      await clearTokens();
      handler.next(err);
    } finally {
      _refreshing = false;
    }
  }

  // ── HTTP methods ─────────────────────────────────────────────────────────────

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.get(path, queryParameters: queryParameters);
    return _parse(res, fromJson);
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.post(path, data: data);
    return _parse(res, fromJson);
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.put(path, data: data);
    return _parse(res, fromJson);
  }

  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.delete(path);
    return _parse(res, fromJson);
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.patch(path, data: data);
    return _parse(res, fromJson);
  }

  T _parse<T>(Response res, T Function(dynamic)? fromJson) {
    final body = res.data;
    if (body is Map && body['success'] == false) {
      throw ApiException(
        code: body['error']?['code'] ?? 'UNKNOWN',
        message: body['error']?['message'] ?? 'Lỗi không xác định',
      );
    }
    final data = body['data'] ?? body;
    return fromJson != null ? fromJson(data) : data as T;
  }
}

class ApiException implements Exception {
  const ApiException({required this.code, required this.message});
  final String code;
  final String message;

  @override
  String toString() => 'ApiException($code): $message';

  bool get isUnauthorized  => code == 'UNAUTHORIZED';
  bool get isNotFound      => code == 'NOT_FOUND';
  bool get isRateLimit     => code == 'RATE_LIMIT';
  bool get isValidation    => code == 'VALIDATION_ERROR';
}
