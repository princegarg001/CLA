import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/client_models.dart';
import '../data/repositories/client_repository.dart';

class ClientProvider extends ChangeNotifier with ViewStateMixin {
  final ClientRepository _repo;
  ClientProvider(this._repo);

  List<Client> clients = [];
  Client? selected;
  bool isLoadingDetail = false;

  num get activeValue => clients.where((c) => c.status == 'active').fold<num>(0, (sum, c) => sum + c.totalRevenue);
  int get activeCount => clients.where((c) => c.status == 'active').length;

  Future<void> load({String? status}) => runLoad(() async {
        clients = await _repo.list(status: status);
      });

  Future<void> loadDetail(String id) async {
    isLoadingDetail = true;
    notifyListeners();
    try {
      selected = await _repo.get(id);
    } catch (e) {
      error = 'Could not load client: $e';
    } finally {
      isLoadingDetail = false;
      notifyListeners();
    }
  }

  Future<bool> convertLead(String leadId) => runAction(() async {
        final client = await _repo.convertLead(leadId);
        clients = [client, ...clients];
        notifyListeners();
      });

  Future<bool> rescoreHealth() => runAction(() async {
        final updated = await _repo.rescoreHealth();
        final byId = {for (final c in updated) c.id: c};
        clients = clients.map((c) => byId[c.id] ?? c).toList();
        notifyListeners();
      });

  Future<bool> addProject(String clientId, Map<String, dynamic> body) => runAction(() async {
        await _repo.addProject(clientId, body);
        await loadDetail(clientId);
      });

  Future<bool> updateProjectStatus(String clientId, String projectId, String status) => runAction(() async {
        await _repo.updateProject(clientId, projectId, {'status': status});
        await loadDetail(clientId);
      });

  Future<bool> toggleTimer(String clientId, Project project) => runAction(() async {
        if (project.isTimerRunning) {
          await _repo.stopTimer(clientId, project.id);
        } else {
          await _repo.startTimer(clientId, project.id);
        }
        await loadDetail(clientId);
      });

  Future<bool> addMilestone(String clientId, {required String projectId, required String title, num? amount, DateTime? dueDate}) =>
      runAction(() async {
        await _repo.addMilestone(clientId, projectId: projectId, title: title, amount: amount, dueDate: dueDate);
        await loadDetail(clientId);
      });

  Future<bool> addInvoice(String clientId, {required num amount, String? projectId, DateTime? dueDate}) => runAction(() async {
        await _repo.addInvoice(clientId, amount: amount, projectId: projectId, dueDate: dueDate);
        await loadDetail(clientId);
      });

  Future<bool> markInvoicePaid(String clientId, String invoiceId) => runAction(() async {
        await _repo.updateInvoiceStatus(clientId, invoiceId, 'paid');
        await loadDetail(clientId);
      });

  Future<bool> logCommunication(String clientId, {required String channel, String direction = 'outbound', String? fullContent, String? summary}) =>
      runAction(() async {
        await _repo.logCommunication(clientId, channel: channel, direction: direction, fullContent: fullContent, summary: summary);
        await loadDetail(clientId);
      });

  Future<String> reengageDraft(String clientId) => _repo.reengageDraft(clientId);
}
