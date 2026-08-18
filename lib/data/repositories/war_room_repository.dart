import '../../core/network/api_client.dart';
import '../models/war_room_models.dart';

class WarRoomRepository {
  final ApiClient _client;
  WarRoomRepository(this._client);

  Future<List<Mission>> missions() async {
    final data = await _client.get('/warroom/missions');
    return (data as List).map((e) => Mission.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<FeedAlert>> feed() async {
    final data = await _client.get('/warroom/feed');
    return (data as List).map((e) => FeedAlert.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<WarRoomSummary> summary() async {
    final data = await _client.get('/warroom/summary');
    return WarRoomSummary.fromJson(data as Map<String, dynamic>);
  }
}
