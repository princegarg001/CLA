import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/misc_models.dart';
import '../data/repositories/settings_repository.dart';

class SettingsProvider extends ChangeNotifier with ViewStateMixin {
  final SettingsRepository _repo;
  SettingsProvider(this._repo);

  List<IntegrationStatus> integrations = [];

  Future<void> load() => runLoad(() async {
        integrations = await _repo.integrations();
      });

  int get connectedCount => integrations.where((i) => i.connected).length;
}
