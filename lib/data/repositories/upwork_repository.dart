import '../../core/network/api_client.dart';
import '../models/upwork_models.dart';

class UpworkRepository {
  final ApiClient _client;
  UpworkRepository(this._client);

  Future<List<UpworkJob>> jobs({String? status, num? minScore}) async {
    final data = await _client.get('/upwork/jobs', query: {
      if (status != null) 'status': status,
      if (minScore != null) 'minScore': minScore,
    });
    return (data as List).map((e) => UpworkJob.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<UpworkJob> addJob(Map<String, dynamic> job) async {
    final data = await _client.post('/upwork/jobs', body: job);
    return UpworkJob.fromJson(data as Map<String, dynamic>);
  }

  Future<String> regenerateProposal(String jobId) async {
    final data = await _client.post('/upwork/proposal', body: {'jobId': jobId});
    return (data as Map)['proposal']?.toString() ?? '';
  }

  Future<UpworkJob> updateStatus(String jobId, {required String status, num? outcomeValue, String? proposalText}) async {
    final data = await _client.patch('/upwork/jobs/$jobId', body: {
      'status': status,
      if (outcomeValue != null) 'outcomeValue': outcomeValue,
      if (proposalText != null) 'proposalText': proposalText,
    });
    return UpworkJob.fromJson(data as Map<String, dynamic>);
  }

  Future<UpworkStats> stats() async {
    final data = await _client.get('/upwork/stats');
    return UpworkStats.fromJson(data as Map<String, dynamic>);
  }
}
