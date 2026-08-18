import '../../core/network/api_client.dart';
import '../models/lead.dart';
import '../models/misc_models.dart';

class FreelanceRepository {
  final ApiClient _client;
  FreelanceRepository(this._client);

  Future<List<Lead>> solidGigs() async {
    final data = await _client.get('/freelance/solidgigs');
    return (data as List).map((e) => Lead.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Lead>> contra() async {
    final data = await _client.get('/freelance/contra');
    return (data as List).map((e) => Lead.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RssItem>> startupsRip() async {
    final data = await _client.get('/freelance/startupsrip');
    return (data as List).map((e) => RssItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Also covers BetaList recent signups (leads with source='betalist')
  /// via the generic leads endpoint — no dedicated route needed.
  Future<String> generatePitch(String leadId, String platform) async {
    final data = await _client.post('/freelance/pitch', body: {'leadId': leadId, 'platform': platform});
    return (data as Map)['pitch']?.toString() ?? '';
  }
}
