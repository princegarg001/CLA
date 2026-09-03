import '../../core/network/api_client.dart';
import '../models/calendar_models.dart';

class CalendarRepository {
  final ApiClient _client;
  CalendarRepository(this._client);

  Future<List<CalendarEntry>> list({String? status}) async {
    final data = await _client.get('/calendar', query: {if (status != null) 'status': status});
    return (data as List).map((e) => CalendarEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CalendarEntry> create({
    required String content,
    List<String>? mediaUrls,
    required List<String> platforms,
    String? postType,
    required DateTime scheduledFor,
  }) async {
    final data = await _client.post('/calendar', body: {
      'content': content,
      'mediaUrls': mediaUrls,
      'platforms': platforms,
      'postType': postType,
      'scheduledFor': scheduledFor.toIso8601String(),
    });
    return CalendarEntry.fromJson(data as Map<String, dynamic>);
  }

  Future<CalendarEntry> reschedule(String id, DateTime scheduledFor) async {
    final data = await _client.patch('/calendar/$id', body: {'scheduledFor': scheduledFor.toIso8601String()});
    return CalendarEntry.fromJson(data as Map<String, dynamic>);
  }

  Future<CalendarEntry> update(String id, {String? content, List<String>? platforms}) async {
    final data = await _client.patch('/calendar/$id', body: {
      if (content != null) 'content': content,
      if (platforms != null) 'platforms': platforms,
    });
    return CalendarEntry.fromJson(data as Map<String, dynamic>);
  }

  Future<CalendarEntry> approve(String id) async {
    final data = await _client.post('/calendar/$id/approve');
    return CalendarEntry.fromJson(data as Map<String, dynamic>);
  }

  Future<CalendarEntry> publishNow(String id) async {
    final data = await _client.post('/calendar/$id/publish');
    return CalendarEntry.fromJson(data as Map<String, dynamic>);
  }

  Future<void> cancel(String id) => _client.delete('/calendar/$id');

  Future<int> fillWeek() async {
    final data = await _client.post('/calendar/fill-week');
    return ((data as Map)['created'] as num?)?.toInt() ?? 0;
  }
}
