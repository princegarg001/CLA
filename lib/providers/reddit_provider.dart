import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/reddit_models.dart';
import '../data/models/social_models.dart';
import '../data/repositories/reddit_repository.dart';

class RedditProvider extends ChangeNotifier with ViewStateMixin {
  final RedditRepository _repo;
  RedditProvider(this._repo);

  List<RedditPost> opportunities = [];
  RedditKarma? karma;

  /// Draft text keyed by post id, so multiple cards can hold in-progress
  /// drafts at once without stepping on each other.
  final Map<String, String> drafts = {};
  final Set<String> draftingIds = {};
  PublishResult? lastReplyResult;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([_repo.opportunities(), _repo.analytics()]);
        opportunities = results[0] as List<RedditPost>;
        karma = results[1] as RedditKarma;
      });

  Future<void> generateDraft(RedditPost post) async {
    draftingIds.add(post.id);
    notifyListeners();
    try {
      drafts[post.id] = await _repo.draftReply(post);
    } catch (e) {
      error = 'Draft generation failed: $e';
    } finally {
      draftingIds.remove(post.id);
      notifyListeners();
    }
  }

  Future<bool> sendReply(RedditPost post, String text) => runAction(() async {
        lastReplyResult = await _repo.reply(post: post, text: text);
        if (lastReplyResult!.succeeded) {
          drafts.remove(post.id);
          opportunities = opportunities.where((p) => p.id != post.id).toList();
        }
        notifyListeners();
      });
}
