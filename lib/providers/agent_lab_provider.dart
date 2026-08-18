import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/agent_models.dart';
import '../data/repositories/agents_repository.dart';

class AgentLabProvider extends ChangeNotifier with ViewStateMixin {
  final AgentsRepository _repo;
  AgentLabProvider(this._repo);

  AgentStatusSummary status = AgentStatusSummary();
  List<VerdentInsight> verdentInsights = [];
  List<HiringSignal> headaiSignals = [];
  List<AgentRun> groFlows = [];
  String? triggeringAgent;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([
          _repo.status(),
          _repo.verdentInsights(),
          _repo.headaiSignals(),
          _repo.groFlows(),
        ]);
        status = results[0] as AgentStatusSummary;
        verdentInsights = results[1] as List<VerdentInsight>;
        headaiSignals = results[2] as List<HiringSignal>;
        groFlows = results[3] as List<AgentRun>;
      });

  Future<bool> trigger(String agent) async {
    triggeringAgent = agent;
    notifyListeners();
    final ok = await runAction(() async {
      await _repo.trigger(agent);
      status = await _repo.status();
      notifyListeners();
    });
    triggeringAgent = null;
    notifyListeners();
    return ok;
  }
}
