import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/growth_models.dart';
import '../data/models/analytics_models.dart';
import '../data/models/war_room_models.dart';
import '../data/repositories/analytics_repository.dart';
import '../data/repositories/growth_repository.dart';
import '../data/repositories/war_room_repository.dart';

/// War Room is the one screen the master plan says should aggregate every
/// platform ("Pipeline snapshot", "Twitter Impressions", "Site Visitors"),
/// so this provider pulls from Analytics and Growth too, not just /warroom/*.
class WarRoomProvider extends ChangeNotifier with ViewStateMixin {
  final WarRoomRepository _warRoom;
  final AnalyticsRepository _analytics;
  final GrowthRepository _growth;
  WarRoomProvider(this._warRoom, this._analytics, this._growth);

  List<Mission> missions = [];
  List<FeedAlert> feed = [];
  WarRoomSummary? summary;
  int followers = 0;
  int followersDelta7d = 0;
  int siteVisitors = 0;
  int liveVisitors = 0;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([
          _warRoom.missions(),
          _warRoom.feed(),
          _warRoom.summary(),
          _growth.twitterAnalytics(),
          _analytics.umamiStats(),
          _analytics.umamiActiveVisitors(),
        ]);
        missions = results[0] as List<Mission>;
        feed = results[1] as List<FeedAlert>;
        summary = results[2] as WarRoomSummary;
        final twitter = results[3] as TwitterAnalytics;
        followers = twitter.followers;
        followersDelta7d = twitter.followersDelta7d;
        final umami = results[4] as UmamiStats;
        siteVisitors = umami.visitors;
        liveVisitors = results[5] as int;
      });
}
