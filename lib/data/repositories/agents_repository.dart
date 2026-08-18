import '../../core/network/api_client.dart';
import '../models/agent_models.dart';

class AgentsRepository {
  final ApiClient _client;
  AgentsRepository(this._client);

  Future<AgentStatusSummary> status() async {
    final data = await _client.get('/agents/status');
    return AgentStatusSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<List<AgentRun>> runs({String? agent}) async {
    final data = await _client.get('/agents/runs', query: {'agent': agent});
    return (data as List).map((e) => AgentRun.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<AgentRun> trigger(String agent, {Map<String, dynamic>? input}) async {
    final data = await _client.post('/agents/$agent/trigger', body: input ?? {});
    return AgentRun.fromJson(data as Map<String, dynamic>);
  }

  Future<List<VerdentInsight>> verdentInsights() async {
    final data = await _client.get('/agents/verdent/insights');
    return (data as List).map((e) => VerdentInsight.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<HiringSignal>> headaiSignals() async {
    final data = await _client.get('/agents/headai/signals');
    return (data as List).map((e) => HiringSignal.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Gro.app flows are logged as agent_runs with agent='gro_flow'.
  Future<List<AgentRun>> groFlows() => runs(agent: 'gro_flow');
}
