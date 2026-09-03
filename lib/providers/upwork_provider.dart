import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/upwork_models.dart';
import '../data/repositories/upwork_repository.dart';

class UpworkProvider extends ChangeNotifier with ViewStateMixin {
  final UpworkRepository _repo;
  UpworkProvider(this._repo);

  List<UpworkJob> jobs = [];
  UpworkStats? stats;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([_repo.jobs(), _repo.stats()]);
        jobs = results[0] as List<UpworkJob>;
        stats = results[1] as UpworkStats;
      });

  Future<bool> regenerateProposal(String jobId) => runAction(() async {
        final proposal = await _repo.regenerateProposal(jobId);
        jobs = jobs.map((j) => j.id == jobId ? _withProposal(j, proposal) : j).toList();
        notifyListeners();
      });

  Future<bool> markStatus(String jobId, String status, {num? outcomeValue}) => runAction(() async {
        final updated = await _repo.updateStatus(jobId, status: status, outcomeValue: outcomeValue);
        jobs = jobs.map((j) => j.id == jobId ? updated : j).toList();
        notifyListeners();
        stats = await _repo.stats();
      });

  UpworkJob _withProposal(UpworkJob job, String proposal) => UpworkJob(
        id: job.id,
        title: job.title,
        description: job.description,
        clientName: job.clientName,
        budgetMin: job.budgetMin,
        budgetMax: job.budgetMax,
        budgetType: job.budgetType,
        skills: job.skills,
        country: job.country,
        clientHistory: job.clientHistory,
        upworkUrl: job.upworkUrl,
        aiScore: job.aiScore,
        aiScoreReason: job.aiScoreReason,
        aiProposal: proposal,
        status: job.status,
        appliedAt: job.appliedAt,
        proposalText: job.proposalText,
        outcomeValue: job.outcomeValue,
        source: job.source,
        createdAt: job.createdAt,
        sample: job.sample,
      );
}
