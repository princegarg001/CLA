import '../../core/network/api_client.dart';
import '../models/apollo_models.dart';
import '../models/lead.dart';

class ApolloRepository {
  final ApiClient _client;
  ApolloRepository(this._client);

  Future<List<Lead>> search({List<String>? titles, List<String>? regions, List<String>? techStack, int? limit}) async {
    final data = await _client.get('/apollo/search', query: {
      'titles': titles?.join(','),
      'regions': regions?.join(','),
      'techStack': techStack?.join(','),
      'limit': limit,
    });
    return (data as List).map((e) => Lead.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Lead> import(Map<String, dynamic> candidate) async {
    final data = await _client.post('/apollo/import', body: candidate);
    return Lead.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> enrich(String email) async {
    final data = await _client.post('/apollo/enrich', body: {'email': email});
    return (data as Map).cast<String, dynamic>();
  }

  Future<List<ApolloSequence>> sequences() async {
    final data = await _client.get('/apollo/sequences');
    return (data as List).map((e) => ApolloSequence.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> launchSequence(String sequenceId, String contactId) =>
      _client.post('/apollo/sequences/$sequenceId/launch', body: {'contactId': contactId});

  Future<List<IcpProfile>> icpProfiles() async {
    final data = await _client.get('/apollo/icp');
    return (data as List).map((e) => IcpProfile.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<IcpProfile> saveIcp(Map<String, dynamic> profile) async {
    final data = await _client.post('/apollo/icp', body: profile);
    return IcpProfile.fromJson(data as Map<String, dynamic>);
  }
}
