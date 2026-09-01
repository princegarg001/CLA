import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Holds where the CLA backend lives and how to authenticate with it.
/// Defaults point at the live Render deployment so the app works out of the
/// box on a phone (which can't reach a laptop's "localhost" anyway); still
/// editable from the Settings screen for local dev or a future redeploy.
///
/// Note: CLA_API_KEY is a single shared secret, not per-user auth — fine for
/// a solo-founder tool, but anyone with the compiled app (or this source)
/// can extract it. Rotate it (here + the Render env var) if that ever stops
/// being an acceptable trade-off.
class AppConfig extends ChangeNotifier {
  static const _baseUrlKey = 'cla_base_url';
  static const _apiKeyKey = 'cla_api_key';
  static const defaultBaseUrl = 'https://cla-v2-backend.onrender.com';
  static const defaultApiKey = 'fertgghtdrtsrtsers';

  String _baseUrl = defaultBaseUrl;
  String _apiKey = defaultApiKey;
  bool _loaded = false;

  String get baseUrl => _baseUrl;
  String get apiKey => _apiKey;
  bool get loaded => _loaded;
  String get apiBaseUrl => '$_baseUrl/api';

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
    _apiKey = prefs.getString(_apiKeyKey) ?? defaultApiKey;
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
