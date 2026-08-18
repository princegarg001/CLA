import '../../core/network/api_client.dart';
import '../models/outreach_models.dart';

class OutreachRepository {
  final ApiClient _client;
  OutreachRepository(this._client);

  Future<List<OutreachMessage>> inbox({String? channel, String? status}) async {
    final data = await _client.get('/outreach/inbox', query: {'channel': channel, 'status': status});
    return (data as List).map((e) => OutreachMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<OutreachMessage> generate({required String leadId, String? tone, String? market, required String channel}) async {
    final data = await _client.post('/outreach/generate', body: {
      'leadId': leadId,
      'tone': tone,
      'market': market,
      'channel': channel,
    });
    return OutreachMessage.fromJson(data as Map<String, dynamic>);
  }

  Future<OutreachMessage> createDraft(Map<String, dynamic> body) async {
    final data = await _client.post('/outreach/messages', body: body);
    return OutreachMessage.fromJson(data as Map<String, dynamic>);
  }

  Future<OutreachMessage> updateMessage(String id, Map<String, dynamic> patch) async {
    final data = await _client.patch('/outreach/messages/$id', body: patch);
    return OutreachMessage.fromJson(data as Map<String, dynamic>);
  }

  Future<List<MessageTemplate>> templates() async {
    final data = await _client.get('/outreach/templates');
    return (data as List).map((e) => MessageTemplate.fromJson(e as Map<String, dynamic>)).toList();
  }
}
