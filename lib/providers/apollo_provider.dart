import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/apollo_models.dart';
import '../data/models/lead.dart';
import '../data/repositories/apollo_repository.dart';
import '../data/repositories/leads_repository.dart';

class ApolloProvider extends ChangeNotifier with ViewStateMixin {
  final ApolloRepository _apollo;
  final LeadsRepository _leads;
  ApolloProvider(this._apollo, this._leads);

  List<Lead> searchResults = [];
  List<Lead> pipelineLeads = [];
  List<ApolloSequence> sequences = [];
  List<IcpProfile> icpProfiles = [];

  Future<void> load() => runLoad(() async {
        final results = await Future.wait([
          _leads.list(source: 'apollo'),
          _apollo.sequences(),
          _apollo.icpProfiles(),
        ]);
        pipelineLeads = results[0] as List<Lead>;
        sequences = results[1] as List<ApolloSequence>;
        icpProfiles = results[2] as List<IcpProfile>;
      });

  Future<bool> search({List<String>? titles, List<String>? regions, List<String>? techStack}) => runAction(() async {
        searchResults = await _apollo.search(titles: titles, regions: regions, techStack: techStack);
        notifyListeners();
      });

  /// Swipe-right on a search result — imports it into the pipeline as a lead.
  Future<bool> importLead(Lead candidate) => runAction(() async {
        final imported = await _apollo.import(candidate.toCreateJson());
        pipelineLeads = [imported, ...pipelineLeads];
        searchResults = searchResults.where((l) => l != candidate).toList();
        notifyListeners();
      });

  Future<bool> saveIcp(Map<String, dynamic> profile) => runAction(() async {
        final saved = await _apollo.saveIcp(profile);
        icpProfiles = [saved, ...icpProfiles];
        notifyListeners();
      });

  /// Locking marks a lead as actively-being-worked: the hourly rescoring cron
  /// skips it and War Room stops resurfacing it as a "new" mission.
  Future<bool> toggleLock(Lead lead) => runAction(() async {
        final updated = await _leads.update(lead.id, {'locked': !lead.locked});
        pipelineLeads = [for (final l in pipelineLeads) if (l.id == lead.id) updated else l];
        notifyListeners();
      });
}
