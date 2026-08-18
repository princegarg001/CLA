/// Thrown by [ApiClient] for any failed request — network error, non-2xx
/// response, or `{ ok: false, error }` payload from the CLA backend.
/// Screens catch this and show [message] directly; it's already human-readable.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}
