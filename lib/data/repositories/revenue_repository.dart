import '../../core/network/api_client.dart';
import '../models/revenue_models.dart';

class RevenueRepository {
  final ApiClient _client;
  RevenueRepository(this._client);

  Future<MrrData> trustmrr() async {
    final data = await _client.get('/revenue/trustmrr');
    return MrrData.fromJson(data as Map<String, dynamic>);
  }

  Future<List<TrendPoint>> trend({int? weeks}) async {
    final data = await _client.get('/revenue/trend', query: {'weeks': weeks});
    return (data as List).map((e) => TrendPoint.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Deal>> deals() async {
    final data = await _client.get('/revenue/deals');
    return (data as List).map((e) => Deal.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Deal> addDeal(Deal deal) async {
    final data = await _client.post('/revenue/deals', body: deal.toCreateJson());
    return Deal.fromJson(data as Map<String, dynamic>);
  }

  Future<RevenueSummary> summary() async {
    final data = await _client.get('/revenue/summary');
    return RevenueSummary.fromJson(data as Map<String, dynamic>);
  }
}
