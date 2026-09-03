import '../../core/network/api_client.dart';
import '../models/reddit_models.dart';
import '../models/social_models.dart';

class RedditRepository {
  final ApiClient _client;
  RedditRepository(this._client);

  Future<List<RedditPost>> opportunities({List<String>? subreddits, List<String>? keywords}) async {
    final data = await _client.get('/reddit/opportunities', query: {
      if (subreddits != null && subreddits.isNotEmpty) 'subreddits': subreddits.join(','),
      if (keywords != null && keywords.isNotEmpty) 'keywords': keywords.join(','),
    });
    return (data as List).map((e) => RedditPost.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RedditPost>> feed({List<String>? subreddits}) async {
    final data = await _client.get('/reddit/feed', query: {
      if (subreddits != null && subreddits.isNotEmpty) 'subreddits': subreddits.join(','),
    });
    return (data as List).map((e) => RedditPost.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RedditPost>> search(String query, {String? subreddit}) async {
    final data = await _client.get('/reddit/search', query: {'q': query, if (subreddit != null) 'subreddit': subreddit});
    return (data as List).map((e) => RedditPost.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> draftReply(RedditPost post) async {
    final data = await _client.post('/reddit/draft-reply', body: {
      'post': {'title': post.title, 'subreddit': post.subreddit, 'body': post.body},
    });
    return (data as Map)['draft']?.toString() ?? '';
  }

  Future<PublishResult> reply({required RedditPost post, required String text}) async {
    final data = await _client.post('/reddit/reply', body: {
      'parentFullname': post.fullname,
      'text': text,
      'postId': post.id,
      'subreddit': post.subreddit,
      'postTitle': post.title,
    });
    final map = (data as Map).cast<String, dynamic>();
    return PublishResult.fromJson({'platform': 'reddit', ...map});
  }

  Future<RedditKarma> analytics() async {
    final data = await _client.get('/reddit/analytics');
    return RedditKarma.fromJson(data as Map<String, dynamic>);
  }
}
