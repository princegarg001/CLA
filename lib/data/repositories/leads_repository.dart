import '../../core/network/api_client.dart';
import '../models/lead.dart';

class LeadsRepository {
  final ApiClient _client;
  LeadsRepository(this._client);

  Future<List<Lead>> list({String? status, String? source, int? minScore}) async {
    final data = await _client.get('/leads', query: {'status': status, 'source': source, 'minScore': minScore});
    return (data as List).map((e) => Lead.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PipelineCounts> pipeline() async {
    final data = await _client.get('/leads/pipeline');
    return PipelineCounts.fromJson(data as Map<String, dynamic>);
  }

  Future<Lead> create(Map<String, dynamic> body) async {
    final data = await _client.post('/leads', body: body);
    return Lead.fromJson(data as Map<String, dynamic>);
  }

  Future<Lead> update(String id, Map<String, dynamic> patch) async {
    final data = await _client.patch('/leads/$id', body: patch);
    return Lead.fromJson(data as Map<String, dynamic>);
  }

  Future<void> delete(String id) => _client.delete('/leads/$id');

  Future<Lead> rescore(String id) async {
    final data = await _client.post('/leads/$id/score');
    return Lead.fromJson(data as Map<String, dynamic>);
  }
}
