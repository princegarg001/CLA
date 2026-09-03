import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../models/social_models.dart';

class SocialRepository {
  final ApiClient _client;
  SocialRepository(this._client);

  Future<SocialStatus> status() async {
    final data = await _client.get('/social/status');
    return SocialStatus.fromJson(data as Map<String, dynamic>);
  }

  Future<String> authUrl(String platform) async {
    final data = await _client.get('/social/$platform/auth-url');
    return (data as Map)['url']?.toString() ?? '';
  }

  Future<void> disconnect(String platform) => _client.post('/social/$platform/disconnect');

  /// Hosts a locally-picked image on the backend (Supabase Storage) and
  /// returns a public URL — required before Instagram can be included in a
  /// publish call, since Instagram's API fetches image_url itself.
  Future<String> uploadImage(String filePath) async {
    final form = FormData.fromMap({
      'image': await MultipartFile.fromFile(filePath),
    });
    final data = await _client.post('/social/upload-image', body: form);
    return (data as Map)['url']?.toString() ?? '';
  }

  Future<List<PublishResult>> publish({required String text, String? imageUrl, required List<String> platforms}) async {
    final data = await _client.post('/social/publish', body: {
      'text': text,
      'imageUrl': imageUrl,
      'platforms': platforms,
    });
    final results = (data as Map)['results'] as List? ?? [];
    return results.map((e) => PublishResult.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<InstagramInsights> instagramInsights() async {
    final data = await _client.get('/social/instagram/insights');
    return InstagramInsights.fromJson(data as Map<String, dynamic>);
  }

  Future<List<InstagramMedia>> instagramMedia() async {
    final data = await _client.get('/social/instagram/media');
    return (data as List).map((e) => InstagramMedia.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PublishResult> publishCarousel({required List<String> imageUrls, required String caption}) async {
    final data = await _client.post('/social/publish-carousel', body: {'imageUrls': imageUrls, 'caption': caption});
    final map = (data as Map).cast<String, dynamic>();
    return PublishResult.fromJson({'platform': 'instagram', ...map});
  }

  Future<PublishResult> publishReel({required String videoUrl, required String caption}) async {
    final data = await _client.post('/social/publish-reel', body: {'videoUrl': videoUrl, 'caption': caption});
    final map = (data as Map).cast<String, dynamic>();
    return PublishResult.fromJson({'platform': 'instagram', ...map});
  }
}
