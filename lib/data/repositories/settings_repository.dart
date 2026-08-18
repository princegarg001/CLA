import '../../core/network/api_client.dart';
import '../models/misc_models.dart';

class SettingsRepository {
  final ApiClient _client;
  SettingsRepository(this._client);

  Future<List<IntegrationStatus>> integrations() async {
    final data = await _client.get('/settings/integrations');
    return (data as List).map((e) => IntegrationStatus.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> appSettings() async {
    final data = await _client.get('/settings');
    return (data as Map).cast<String, dynamic>();
  }

  Future<Map<String, dynamic>> updateAppSettings(Map<String, dynamic> patch) async {
    final data = await _client.post('/settings', body: patch);
    return (data as Map).cast<String, dynamic>();
  }
}
