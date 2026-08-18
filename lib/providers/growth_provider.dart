import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/growth_models.dart';
import '../data/models/lead.dart';
import '../data/repositories/growth_repository.dart';

class GrowthProvider extends ChangeNotifier with ViewStateMixin {
  final GrowthRepository _repo;
  GrowthProvider(this._repo);

  TwitterAnalytics? analytics;
  List<ScheduledPost> scheduledPosts = [];
  GumroadStats? gumroadStats;
  List<Lead> betalistSignups = [];
  List<String>? generatedThread;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([
          _repo.twitterAnalytics(),
          _repo.scheduledPosts(),
          _repo.gumroadStats(),
          _repo.betalistSignups(),
        ]);
        analytics = results[0] as TwitterAnalytics;
        scheduledPosts = results[1] as List<ScheduledPost>;
        gumroadStats = results[2] as GumroadStats;
        betalistSignups = results[3] as List<Lead>;
      });

  Future<bool> generateThread(String topic) => runAction(() async {
        generatedThread = await _repo.generateThread(topic);
        notifyListeners();
      });

  Future<bool> schedulePost({required String content, required DateTime scheduledFor, List<String>? thread}) => runAction(() async {
        final post = await _repo.schedulePost(content: content, scheduledFor: scheduledFor, thread: thread);
        scheduledPosts = [...scheduledPosts, post];
        notifyListeners();
      });
}
