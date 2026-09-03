import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/calendar_models.dart';
import '../data/repositories/calendar_repository.dart';

class CalendarProvider extends ChangeNotifier with ViewStateMixin {
  final CalendarRepository _repo;
  CalendarProvider(this._repo);

  List<CalendarEntry> entries = [];
  bool isFillingWeek = false;

  Future<void> load() => runLoad(() async {
        entries = await _repo.list();
      });

  List<CalendarEntry> forDay(DateTime day) => entries
      .where((e) => e.scheduledFor.year == day.year && e.scheduledFor.month == day.month && e.scheduledFor.day == day.day)
      .toList();

  Future<bool> create({required String content, List<String>? mediaUrls, required List<String> platforms, String? postType, required DateTime scheduledFor}) =>
      runAction(() async {
        final entry = await _repo.create(content: content, mediaUrls: mediaUrls, platforms: platforms, postType: postType, scheduledFor: scheduledFor);
        entries = [...entries, entry]..sort((a, b) => a.scheduledFor.compareTo(b.scheduledFor));
        notifyListeners();
      });

  Future<bool> reschedule(String id, DateTime scheduledFor) => runAction(() async {
        final updated = await _repo.reschedule(id, scheduledFor);
        _replace(updated);
      });

  Future<bool> approve(String id) => runAction(() async {
        final updated = await _repo.approve(id);
        _replace(updated);
      });

  Future<bool> publishNow(String id) => runAction(() async {
        final updated = await _repo.publishNow(id);
        _replace(updated);
      });

  Future<bool> cancel(String id) => runAction(() async {
        await _repo.cancel(id);
        entries = entries.where((e) => e.id != id).toList();
        notifyListeners();
      });

  Future<int> fillWeek() async {
    isFillingWeek = true;
    notifyListeners();
    int created = 0;
    try {
      created = await _repo.fillWeek();
      await load();
    } catch (e) {
      error = 'Fill Week failed: $e';
    } finally {
      isFillingWeek = false;
      notifyListeners();
    }
    return created;
  }

  void _replace(CalendarEntry updated) {
    entries = entries.map((e) => e.id == updated.id ? updated : e).toList();
    notifyListeners();
  }
}
