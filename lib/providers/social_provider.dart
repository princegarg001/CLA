import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/network/view_state.dart';
import '../data/models/social_models.dart';
import '../data/repositories/social_repository.dart';

class SocialProvider extends ChangeNotifier with ViewStateMixin {
  final SocialRepository _repo;
  SocialProvider(this._repo);

  SocialStatus status = SocialStatus(twitter: PlatformStatus.empty, linkedin: PlatformStatus.empty, instagram: PlatformStatus.empty);
  List<PublishResult> lastResults = [];
  bool isPublishing = false;

  Future<void> load() => runLoad(() async {
        status = await _repo.status();
      });

  /// Opens the platform's OAuth consent page in the phone's browser. The
  /// backend's callback stores the token server-side; the user comes back to
  /// the app and pulls to refresh (or reopens Settings) to see it connected.
  Future<bool> connect(String platform) => runAction(() async {
        final url = await _repo.authUrl(platform);
        if (url.isEmpty) throw Exception('No auth URL returned for $platform');
        final launched = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
        if (!launched) throw Exception('Could not open browser for $platform sign-in');
      });

  /// Returns null (and surfaces the error via [error]) on failure, so callers
  /// can decide whether a failed image upload should block the whole publish.
  Future<String?> uploadImage(String filePath) async {
    try {
      return await _repo.uploadImage(filePath);
    } catch (e) {
      error = 'Image upload failed: $e';
      notifyListeners();
      return null;
    }
  }

  Future<bool> disconnect(String platform) => runAction(() async {
        await _repo.disconnect(platform);
        await _repo.status().then((s) => status = s);
        notifyListeners();
      });

  Future<bool> publish({required String text, String? imageUrl, required List<String> platforms}) async {
    isPublishing = true;
    lastResults = [];
    notifyListeners();
    final ok = await runAction(() async {
      lastResults = await _repo.publish(text: text, imageUrl: imageUrl, platforms: platforms);
      notifyListeners();
    });
    isPublishing = false;
    notifyListeners();
    return ok;
  }
}
