import '../../core/network/api_client.dart';
import '../models/growth_models.dart';
import '../models/lead.dart';

class GrowthRepository {
  final ApiClient _client;
  GrowthRepository(this._client);

  Future<Map<String, dynamic>> twitterFeatures() async {
    final data = await _client.get('/twitter/features');
    return (data as Map).cast<String, dynamic>();
  }

  Future<TwitterAnalytics> twitterAnalytics() async {
    final data = await _client.get('/twitter/analytics');
    return TwitterAnalytics.fromJson(data as Map<String, dynamic>);
  }

  Future<List<TwitterDm>> twitterDms() async {
    final data = await _client.get('/twitter/dms');
    final list = (data as Map)['data'] as List? ?? [];
    return list.map((e) => TwitterDm.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ScheduledPost>> scheduledPosts() async {
    final data = await _client.get('/twitter/scheduled');
    return (data as List).map((e) => ScheduledPost.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ScheduledPost> schedulePost({required String content, List<String>? thread, required DateTime scheduledFor}) async {
    final data = await _client.post('/twitter/scheduled', body: {
      'content': content,
      'thread': thread,
      'scheduled_for': scheduledFor.toIso8601String(),
    });
    return ScheduledPost.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteScheduledPost(String id) => _client.delete('/twitter/scheduled/$id');

  Future<Map<String, dynamic>> postTweet(String text) async {
    final data = await _client.post('/twitter/post', body: {'text': text});
    return (data as Map).cast<String, dynamic>();
  }

  Future<List<String>> generateThread(String topic) async {
    final data = await _client.post('/twitter/thread/generate', body: {'topic': topic});
    return ((data as Map)['tweets'] as List?)?.map((e) => e.toString()).toList() ?? [];
  }

  Future<GumroadStats> gumroadStats() async {
    final data = await _client.get('/gumroad/stats');
    return GumroadStats.fromJson(data as Map<String, dynamic>);
  }

  /// BetaList recent signups — leads with source='betalist' via the generic leads endpoint.
  Future<List<Lead>> betalistSignups() async {
    final data = await _client.get('/leads', query: {'source': 'betalist'});
    return (data as List).map((e) => Lead.fromJson(e as Map<String, dynamic>)).toList();
  }
}
