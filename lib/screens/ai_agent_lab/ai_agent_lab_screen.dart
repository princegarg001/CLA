import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../data/models/agent_models.dart';
import '../../providers/agent_lab_provider.dart';
import '../../widgets/shared_components.dart';

class AIAgentLabScreen extends StatefulWidget {
  const AIAgentLabScreen({super.key});

  @override
  State<AIAgentLabScreen> createState() => _AIAgentLabScreenState();
}

class _AIAgentLabScreenState extends State<AIAgentLabScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AgentLabProvider>().load());
  }

  static const _agentMeta = {
    'prospector': (
      title: 'The Prospector',
      description: 'Monitors Apollo sequences, flags replies, scores new leads, triggers follow-ups.',
      icon: Icons.person_search_rounded,
      color: AppColors.primary,
      schedule: '24/7',
    ),
    'publisher': (
      title: 'The Publisher',
      description: 'Drafts next week\'s Twitter threads, pulls trending topics, generates post options.',
      icon: Icons.create_rounded,
      color: AppColors.accent,
      schedule: 'Sundays',
    ),
    'researcher': (
      title: 'The Researcher',
      description: 'Researches new leads: funding, tech stack, news, job openings. Full brief before calls.',
      icon: Icons.biotech_rounded,
      color: Color(0xFF7C4DFF),
      schedule: 'On Trigger',
    ),
  };

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AgentLabProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: RefreshIndicator(
        onRefresh: () => context.read<AgentLabProvider>().load(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(provider),
              const SizedBox(height: 8),
              if (provider.isLoading && provider.status.agents.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: CircularProgressIndicator()))
              else ...[
                _buildAgentCards(provider),
                const SizedBox(height: 4),
                _buildVerdentSection(provider),
                const SizedBox(height: 4),
                _buildHeadAISection(provider),
                const SizedBox(height: 4),
                _buildGroSection(provider),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(AgentLabProvider provider) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('AI Agent Lab', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: AppColors.accentLight.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Text('${provider.status.running} Running', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Three AI agents working autonomously.\nYou check results, not tasks.', style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.8))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAgentCards(AgentLabProvider provider) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: _agentMeta.entries.map((entry) {
          final agentName = entry.key;
          final meta = entry.value;
          final matches = provider.status.agents.where((a) => a.name == agentName);
          final info = matches.isEmpty ? null : matches.first;
          final isRunning = info?.status == 'running';
          final isTriggering = provider.triggeringAgent == agentName;

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppShadows.cardShadow,
              border: isRunning ? Border.all(color: meta.color.withValues(alpha: 0.3), width: 1.5) : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(color: meta.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                      child: Icon(meta.icon, color: meta.color, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(meta.title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                          const SizedBox(height: 2),
                          Text('Schedule: ${meta.schedule}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: isRunning ? AppColors.successLight : AppColors.surfaceBg, borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isRunning) ...[
                            Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                            const SizedBox(width: 4),
                          ],
                          Text(isRunning ? 'Running' : 'Idle', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: isRunning ? AppColors.success : AppColors.textTertiary)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(meta.description, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                if (info?.lastRun != null) ...[
                  const SizedBox(height: 6),
                  Text('Last run: ${_relativeTime(info!.lastRun!)}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 36,
                        child: ElevatedButton(
                          onPressed: isTriggering ? null : () => context.read<AgentLabProvider>().trigger(agentName),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: meta.color.withValues(alpha: 0.1),
                            foregroundColor: meta.color,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: isTriggering
                              ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: meta.color))
                              : Text('Run Now', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  String _relativeTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  Widget _buildVerdentSection(AgentLabProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Verdent.ai Insights'),
        if (provider.verdentInsights.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('No insights yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
        ...provider.verdentInsights.map((r) => AppCard(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.lightbulb_rounded, color: AppColors.warning, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Text(r.text, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary, height: 1.4))),
                ],
              ),
            )),
      ],
    );
  }

  Widget _buildHeadAISection(AgentLabProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'HeadAI Signals'),
        if (provider.headaiSignals.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('No hiring signals yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
        ...provider.headaiSignals.map((h) => AppCard(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: AppListTile(
                icon: Icons.trending_up_rounded,
                iconBgColor: AppColors.success.withValues(alpha: 0.12),
                iconColor: AppColors.success,
                title: '${h.company} — ${h.hires} eng roles',
                subtitle: h.roles.isNotEmpty ? h.roles.join(', ') : (h.region ?? ''),
                trailing: h.hires >= 5
                    ? const StatusBadge(label: 'High Priority', bgColor: AppColors.errorLight, textColor: AppColors.error)
                    : const StatusBadge(label: 'Add to Apollo', bgColor: AppColors.infoLight, textColor: AppColors.info),
              ),
            )),
      ],
    );
  }

  Widget _buildGroSection(AgentLabProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Gro.app Automations'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Recent Flow Runs', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              const SizedBox(height: 12),
              if (provider.groFlows.isEmpty)
                Text('No Gro.app flow runs yet — trigger one via a webhook.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary))
              else
                ...provider.groFlows.take(5).map((f) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _buildFlowItem(f),
                    )),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFlowItem(AgentRun f) {
    final ok = f.status == 'success';
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
          child: const Icon(Icons.account_tree_rounded, color: AppColors.primary, size: 16),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(f.startedAt != null ? _relativeTime(f.startedAt!) : f.id, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              Text(ok ? 'Succeeded' : (f.error ?? f.status), style: GoogleFonts.inter(fontSize: 11, color: ok ? AppColors.success : AppColors.error)),
            ],
          ),
        ),
      ],
    );
  }
}
