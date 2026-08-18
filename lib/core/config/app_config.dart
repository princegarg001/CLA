import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Holds where the CLA backend lives and how to authenticate with it.
/// Editable from the Settings screen so the same build can point at
/// localhost during development or a deployed backend in production —
/// without a rebuild. Android emulators can't reach the host's "localhost"
/// directly (they need 10.0.2.2) — the Settings screen documents this.
class AppConfig extends ChangeNotifier {
  static const _baseUrlKey = 'cla_base_url';
  static const _apiKeyKey = 'cla_api_key';
  static const defaultBaseUrl = 'http://localhost:8080';

  String _baseUrl = defaultBaseUrl;
  String _apiKey = '';
  bool _loaded = false;

  String get baseUrl => _baseUrl;
  String get apiKey => _apiKey;
  bool get loaded => _loaded;
  String get apiBaseUrl => '$_baseUrl/api';

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
    _apiKey = prefs.getString(_apiKeyKey) ?? '';
    _loaded = true;
    notifyListeners();
  }

  Future<void> update({String? baseUrl, String? apiKey}) async {
    final prefs = await SharedPreferences.getInstance();
    if (baseUrl != null) {
      _baseUrl = baseUrl.trim().isEmpty ? defaultBaseUrl : baseUrl.trim();
      await prefs.setString(_baseUrlKey, _baseUrl);
    }
    if (apiKey != null) {
      _apiKey = apiKey.trim();
      await prefs.setString(_apiKeyKey, _apiKey);
    }
    notifyListeners();
  }
}
