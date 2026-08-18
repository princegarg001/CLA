import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/revenue_models.dart';
import '../data/repositories/revenue_repository.dart';

class RevenueProvider extends ChangeNotifier with ViewStateMixin {
  final RevenueRepository _repo;
  RevenueProvider(this._repo);

  MrrData? mrr;
  List<TrendPoint> trend = [];
  List<Deal> deals = [];
  RevenueSummary? summary;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([
          _repo.trustmrr(),
          _repo.trend(),
          _repo.deals(),
          _repo.summary(),
        ]);
        mrr = results[0] as MrrData;
        trend = results[1] as List<TrendPoint>;
        deals = results[2] as List<Deal>;
        summary = results[3] as RevenueSummary;
      });

  Future<bool> addDeal(Deal deal) => runAction(() async {
        final saved = await _repo.addDeal(deal);
        deals = [saved, ...deals];
        summary = await _repo.summary();
        notifyListeners();
      });
}
