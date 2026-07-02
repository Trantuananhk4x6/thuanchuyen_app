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
  }) =>
      _request(() => _dio.get(path, queryParameters: queryParameters), fromJson);

  Future<T> post<T>(
    String path, {
    dynamic data,
    Options? options,
    T Function(dynamic)? fromJson,
  }) =>
      _request(() => _dio.post(path, data: data, options: options), fromJson);

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) =>
      _request(() => _dio.put(path, data: data), fromJson);

  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) =>
      _request(() => _dio.delete(path), fromJson);

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) =>
      _request(() => _dio.patch(path, data: data), fromJson);

  /// Chạy request và chuyển MỌI lỗi (kể cả mất mạng / timeout / 5xx) thành
  /// [ApiException] để mọi provider chỉ cần `on ApiException catch` là đủ.
  Future<T> _request<T>(
    Future<Response> Function() run,
    T Function(dynamic)? fromJson,
  ) async {
    try {
      final res = await run();
      return _parse(res, fromJson);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  T _parse<T>(Response res, T Function(dynamic)? fromJson) {
    final body = res.data;
    if (body is Map && body['success'] == false) {
      throw ApiException(
        code: body['error']?['code'] ?? 'UNKNOWN',
        message: body['error']?['message'] ?? 'Lỗi không xác định',
      );
    }
    final data = body is Map ? (body['data'] ?? body) : body;
    return fromJson != null ? fromJson(data) : data as T;
  }

  ApiException _mapDioError(DioException e) {
    // Server đã trả lỗi đúng định dạng {success:false, error:{code,message}}
    final data = e.response?.data;
    if (data is Map && data['success'] == false && data['error'] is Map) {
      return ApiException(
        code: data['error']['code'] ?? 'UNKNOWN',
        message: data['error']['message'] ?? 'Lỗi không xác định',
      );
    }
    // Lỗi tầng vận chuyển (không có body chuẩn) → thông điệp tiếng Việt rõ ràng
    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        const ApiException(code: 'TIMEOUT', message: 'Máy chủ phản hồi quá chậm. Vui lòng thử lại.'),
      DioExceptionType.connectionError =>
        const ApiException(code: 'NETWORK', message: 'Mất kết nối mạng. Kiểm tra Internet và thử lại.'),
      DioExceptionType.badCertificate =>
        const ApiException(code: 'NETWORK', message: 'Lỗi chứng chỉ bảo mật của máy chủ.'),
      DioExceptionType.cancel =>
        const ApiException(code: 'CANCELLED', message: 'Yêu cầu đã bị huỷ.'),
      DioExceptionType.badResponse => (e.response?.statusCode ?? 0) >= 500
          ? const ApiException(code: 'SERVER', message: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.')
          : ApiException(
              code: 'HTTP_${e.response?.statusCode}',
              message: 'Yêu cầu không thành công (${e.response?.statusCode}).',
            ),
      DioExceptionType.unknown =>
        const ApiException(code: 'NETWORK', message: 'Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.'),
    };
  }
}

class ApiException implements Exception {
  const ApiException({required this.code, required this.message});
  final String code;
  final String message;

  @override
  String toString() => 'ApiException($code): $message';

  bool get isUnauthorized  => code == 'UNAUTHORIZED';
  bool get isForbidden     => code == 'FORBIDDEN';
  bool get isNotFound      => code == 'NOT_FOUND';
  bool get isRateLimit     => code == 'RATE_LIMITED';
  bool get isValidation    => code == 'VALIDATION';
  bool get isNetwork       => code == 'NETWORK' || code == 'TIMEOUT';
}
