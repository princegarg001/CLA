import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/client_models.dart';
import '../../providers/client_provider.dart';
import '../../widgets/shared_components.dart';

class ClientDetailScreen extends StatefulWidget {
  final String clientId;
  const ClientDetailScreen({super.key, required this.clientId});

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ClientProvider>().loadDetail(widget.clientId));
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ClientProvider>();
    final client = provider.selected;

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          GradientHeader(
            title: client?.name ?? 'Client',
            showBackButton: true,
            height: 140,
          ),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Overview', 'Projects', 'Timeline', 'Invoices'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: provider.isLoadingDetail && client == null
                ? const Center(child: CircularProgressIndicator())
                : client == null
                ? Center(child: Text('Client not found', style: GoogleFonts.inter(color: AppColors.textTertiary)))
                : RefreshIndicator(
                    onRefresh: () => context.read<ClientProvider>().loadDetail(widget.clientId),
                    child: IndexedStack(
                      index: _selectedTab,
                      children: [
                        _OverviewTab(client: client),
                        _ProjectsTab(client: client),
                        _TimelineTab(client: client),
                        _InvoicesTab(client: client),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  final Client client;
  const _OverviewTab({required this.client});

  Color get _healthColor => client.healthScore >= 8 ? AppColors.success : client.healthScore >= 6 ? AppColors.warning : AppColors.error;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Health Score', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const Spacer(),
                    Text('${client.healthScore}/10', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: _healthColor)),
                  ],
                ),
                if (client.healthReason != null) ...[
                  const SizedBox(height: 6),
                  Text(client.healthReason!, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: StatCard(icon: Icons.payments_rounded, label: 'Total Revenue', value: '\$${client.totalRevenue.round()}')),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.work_rounded,
                  label: 'Projects',
                  value: '${client.totalProjects}',
                  iconBgColor: AppColors.accent.withValues(alpha: 0.12),
                  iconColor: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Contact'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (client.company != null) _infoRow(Icons.business_rounded, client.company!),
                if (client.email != null) _infoRow(Icons.email_rounded, client.email!),
                if (client.phone != null) _infoRow(Icons.phone_rounded, client.phone!),
                if (client.region != null) _infoRow(Icons.flag_rounded, client.region!),
                if (client.preferredChannel != null) _infoRow(Icons.chat_rounded, 'Prefers ${client.preferredChannel}'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Quick Actions'),
          Row(
            children: [
              Expanded(
                child: OutlinedAccentButton(
                  label: 'Log Call',
                  icon: Icons.call_rounded,
                  onPressed: () => _logDialog(context, 'call'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedAccentButton(
                  label: 'Draft Message',
                  icon: Icons.auto_awesome_rounded,
                  onPressed: () => _draftMessage(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            Icon(icon, size: 15, color: AppColors.textTertiary),
            const SizedBox(width: 8),
            Expanded(child: Text(text, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary))),
          ],
        ),
      );

  Future<void> _logDialog(BuildContext context, String channel) async {
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Log a ${channel[0].toUpperCase()}${channel.substring(1)}', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: TextField(controller: controller, maxLines: 4, decoration: const InputDecoration(hintText: 'What happened?')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    if (text == null || text.isEmpty || !context.mounted) return;
    await context.read<ClientProvider>().logCommunication(client.id, channel: channel, direction: 'outbound', fullContent: text);
  }

  Future<void> _draftMessage(BuildContext context) async {
    final provider = context.read<ClientProvider>();
    final draft = await provider.reengageDraft(client.id);
    if (!context.mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('AI-drafted message', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            Text(draft, style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary, height: 1.5)),
            const SizedBox(height: 16),
            AccentButton(label: 'Close', onPressed: () => Navigator.pop(context)),
          ],
        ),
      ),
    );
  }
}

class _ProjectsTab extends StatelessWidget {
  final Client client;
  const _ProjectsTab({required this.client});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AccentButton(label: 'Add Project', icon: Icons.add_rounded, onPressed: () => _addProjectDialog(context)),
          const SizedBox(height: 12),
          if (client.projects.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Center(child: Text('No projects yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
            )
          else
            ...client.projects.map((p) => _buildProjectCard(context, p)),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildProjectCard(BuildContext context, Project project) {
    final progress = project.budget != null && project.budget! > 0 ? (client.totalRevenue / project.budget!).clamp(0.0, 1.0) : null;
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(project.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary))),
              StatusBadge(label: project.status, bgColor: AppColors.infoLight, textColor: AppColors.info),
            ],
          ),
          if (progress != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(value: progress, minHeight: 6, backgroundColor: AppColors.surfaceBg, valueColor: const AlwaysStoppedAnimation(AppColors.accent)),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.timer_outlined, size: 13, color: AppColors.textTertiary),
              const SizedBox(width: 4),
              Text('${project.hoursLogged}h logged', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              if (project.dueDate != null) ...[
                const SizedBox(width: 12),
                Icon(Icons.event_rounded, size: 13, color: AppColors.textTertiary),
                const SizedBox(width: 4),
                Text('Due ${project.dueDate!.month}/${project.dueDate!.day}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedAccentButton(
                  label: project.isTimerRunning ? 'Stop Timer' : 'Start Timer',
                  icon: project.isTimerRunning ? Icons.stop_rounded : Icons.play_arrow_rounded,
                  color: project.isTimerRunning ? AppColors.error : AppColors.accent,
                  onPressed: () => context.read<ClientProvider>().toggleTimer(client.id, project),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedAccentButton(
                  label: 'Add Milestone',
                  icon: Icons.flag_rounded,
                  onPressed: () => _addMilestoneDialog(context, project),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _addProjectDialog(BuildContext context) async {
    final titleController = TextEditingController();
    final budgetController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('New Project', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleController, decoration: const InputDecoration(hintText: 'Project title')),
            const SizedBox(height: 8),
            TextField(controller: budgetController, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Budget (optional)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Create')),
        ],
      ),
    );
    if (result != true || titleController.text.trim().isEmpty || !context.mounted) return;
    await context.read<ClientProvider>().addProject(client.id, {
      'title': titleController.text.trim(),
      'status': 'active',
      'budget': num.tryParse(budgetController.text),
    });
  }

  Future<void> _addMilestoneDialog(BuildContext context, Project project) async {
    final titleController = TextEditingController();
    final amountController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('New Milestone', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleController, decoration: const InputDecoration(hintText: 'Milestone title')),
            const SizedBox(height: 8),
            TextField(controller: amountController, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Amount (optional)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Create')),
        ],
      ),
    );
    if (result != true || titleController.text.trim().isEmpty || !context.mounted) return;
    await context.read<ClientProvider>().addMilestone(
          client.id,
          projectId: project.id,
          title: titleController.text.trim(),
          amount: num.tryParse(amountController.text),
        );
  }
}

class _TimelineTab extends StatelessWidget {
  final Client client;
  const _TimelineTab({required this.client});

  Color _sentimentColor(String? s) => switch (s) {
        'positive' => AppColors.success,
        'negative' => AppColors.error,
        _ => AppColors.textTertiary,
      };

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (client.recentTimeline.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Center(child: Text('No communication logged yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
            )
          else
            ...client.recentTimeline.map((entry) => AppCard(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(8)),
                        child: Icon(_channelIcon(entry.channel), size: 14, color: AppColors.textSecondary),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(entry.summary, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Text(entry.channel, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                                if (entry.sentiment != null) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(color: _sentimentColor(entry.sentiment), shape: BoxShape.circle),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(entry.sentiment!, style: GoogleFonts.inter(fontSize: 11, color: _sentimentColor(entry.sentiment))),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  IconData _channelIcon(String channel) => switch (channel) {
        'call' => Icons.call_rounded,
        'whatsapp' => Icons.chat_rounded,
        'slack' => Icons.tag_rounded,
        'twitter_dm' => Icons.alternate_email_rounded,
        'meeting' => Icons.video_call_rounded,
        _ => Icons.email_rounded,
      };
}

class _InvoicesTab extends StatelessWidget {
  final Client client;
  const _InvoicesTab({required this.client});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AccentButton(label: 'Create Invoice', icon: Icons.receipt_long_rounded, onPressed: () => _addInvoiceDialog(context)),
          const SizedBox(height: 12),
          if (client.invoices.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Center(child: Text('No invoices yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
            )
          else
            ...client.invoices.map((inv) => _buildInvoiceCard(context, inv)),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildInvoiceCard(BuildContext context, Invoice invoice) {
    final (bg, fg) = switch (invoice.status) {
      'paid' => (AppColors.successLight, AppColors.success),
      'overdue' => (AppColors.errorLight, AppColors.error),
      'sent' => (AppColors.infoLight, AppColors.info),
      _ => (AppColors.warningLight, AppColors.warning),
    };
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('\$${invoice.amount} ${invoice.currency}', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                if (invoice.dueDate != null)
                  Text('Due ${invoice.dueDate!.month}/${invoice.dueDate!.day}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              ],
            ),
          ),
          StatusBadge(label: invoice.status[0].toUpperCase() + invoice.status.substring(1), bgColor: bg, textColor: fg),
          if (invoice.status != 'paid') ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => context.read<ClientProvider>().markInvoicePaid(client.id, invoice.id),
              child: const Icon(Icons.check_circle_outline_rounded, size: 20, color: AppColors.success),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _addInvoiceDialog(BuildContext context) async {
    final amountController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('New Invoice', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: TextField(controller: amountController, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Amount')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Create')),
        ],
      ),
    );
    final amount = num.tryParse(amountController.text);
    if (result != true || amount == null || !context.mounted) return;
    await context.read<ClientProvider>().addInvoice(client.id, amount: amount);
  }
}
