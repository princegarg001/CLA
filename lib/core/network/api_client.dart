import 'package:dio/dio.dart';
import '../config/app_config.dart';
import 'api_exception.dart';

/// Thin wrapper around the CLA backend's `{ ok, data, error }` envelope.
/// Every screen provider goes through this instead of touching Dio directly,
/// so base URL changes (Settings screen) and auth headers apply everywhere
/// without each call site knowing about them.
class ApiClient {
  final AppConfig config;
  late final Dio _dio;

  ApiClient(this.config) {
    _dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        options.baseUrl = config.apiBaseUrl;
        if (config.apiKey.isNotEmpty) {
          options.headers['X-API-Key'] = config.apiKey;
        }
        handler.next(options);
      },
    ));
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _unwrap(_dio.get(path, queryParameters: _clean(query)));

  Future<dynamic> post(String path, {Object? body}) =>
      _unwrap(_dio.post(path, data: body));

  Future<dynamic> patch(String path, {Object? body}) =>
      _unwrap(_dio.patch(path, data: body));

  Future<dynamic> delete(String path) => _unwrap(_dio.delete(path));

  Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    final cleaned = <String, dynamic>{};
    for (final entry in query.entries) {
      if (entry.value != null) cleaned[entry.key] = entry.value;
    }
    return cleaned;
  }

  Future<dynamic> _unwrap(Future<Response> request) async {
    try {
      final response = await request;
      final body = response.data;
      if (body is Map && body['ok'] == false) {
        throw ApiException(body['error']?.toString() ?? 'Request failed', statusCode: response.statusCode);
      }
      if (body is Map && body.containsKey('data')) return body['data'];
      return body;
    } on DioException catch (e) {
      final data = e.response?.data;
      final message = (data is Map && data['error'] != null)
          ? data['error'].toString()
          : e.message ?? 'Network error — is the CLA backend running?';
      throw ApiException(message, statusCode: e.response?.statusCode);
    }
  }
}
