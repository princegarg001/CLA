import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/lead.dart';
import '../data/models/misc_models.dart';
import '../data/repositories/freelance_repository.dart';

class FreelanceProvider extends ChangeNotifier with ViewStateMixin {
  final FreelanceRepository _repo;
  FreelanceProvider(this._repo);

  List<Lead> solidGigs = [];
  List<Lead> contra = [];
  List<RssItem> startupsRip = [];
  String? lastPitch;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait([_repo.solidGigs(), _repo.contra(), _repo.startupsRip()]);
        solidGigs = results[0] as List<Lead>;
        contra = results[1] as List<Lead>;
        startupsRip = results[2] as List<RssItem>;
      });

  Future<bool> generatePitch(String leadId, String platform) => runAction(() async {
        lastPitch = await _repo.generatePitch(leadId, platform);
        notifyListeners();
      });
}
