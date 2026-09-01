import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/lead.dart';
import '../data/repositories/leads_repository.dart';

/// Shared across Apollo Hunter, Outreach Composer ("To" search) and anywhere
/// else that needs the persisted lead list, not just War Room's aggregate view.
class LeadsProvider extends ChangeNotifier with ViewStateMixin {
  final LeadsRepository _repo;
  LeadsProvider(this._repo);

  List<Lead> leads = [];
  PipelineCounts pipeline = PipelineCounts();

  Future<void> load({String? source}) => runLoad(() async {
        leads = await _repo.list(source: source);
        pipeline = await _repo.pipeline();
      });

  Future<bool> addLead(Map<String, dynamic> body) => runAction(() async {
        final lead = await _repo.create(body);
        leads = [lead, ...leads];
        notifyListeners();
      });

  Future<bool> updateStatus(String id, String status) => runAction(() async {
        final updated = await _repo.update(id, {'status': status});
        leads = [for (final l in leads) if (l.id == id) updated else l];
        notifyListeners();
      });

  Future<bool> rescore(String id) => runAction(() async {
        final updated = await _repo.rescore(id);
        leads = [for (final l in leads) if (l.id == id) updated else l];
        notifyListeners();
      });

  /// Locking marks a lead as actively-being-worked: the hourly rescoring cron
  /// skips it and War Room stops resurfacing it as a "new" mission.
  Future<bool> toggleLock(Lead lead) => runAction(() async {
        final updated = await _repo.update(lead.id, {'locked': !lead.locked});
        leads = [for (final l in leads) if (l.id == lead.id) updated else l];
        notifyListeners();
      });
}
