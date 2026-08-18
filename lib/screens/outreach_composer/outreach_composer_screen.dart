import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/outreach_models.dart';
import '../../providers/leads_provider.dart';
import '../../providers/outreach_provider.dart';
import '../../widgets/shared_components.dart';

class OutreachComposerScreen extends StatefulWidget {
  const OutreachComposerScreen({super.key});

  @override
  State<OutreachComposerScreen> createState() => _OutreachComposerScreenState();
}

class _OutreachComposerScreenState extends State<OutreachComposerScreen> {
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OutreachProvider>().load();
      context.read<LeadsProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OutreachProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(provider),
          const SizedBox(height: 4),
          AppTabBar(tabs: const ['Inbox', 'Compose', 'Templates'], selectedIndex: _selectedTab, onTap: (i) => setState(() => _selectedTab = i)),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildInboxTab(provider),
                const _ComposeTab(),
                _buildTemplatesTab(provider),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(OutreachProvider provider) {
    final sent = provider.inbox.where((m) => m.status == 'sent' || m.status == 'replied').length;
    final replied = provider.inbox.where((m) => m.status == 'replied').length;
    final drafts = provider.inbox.where((m) => m.status == 'draft').length;
    final rate = sent == 0 ? 0 : (replied / sent * 100).round();

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
                    child: const Icon(Icons.edit_note_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Outreach Composer', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  GestureDetector(onTap: () => context.read<OutreachProvider>().load(), child: _headerAction(Icons.refresh_rounded)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Drafts', '$drafts'),
                  _quickStat('Sent', '$sent'),
                  _quickStat('Replies', '$replied'),
                  _quickStat('Rate', '$rate%'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerAction(IconData icon) => Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: Colors.white, size: 20),
      );

  Widget _quickStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildInboxTab(OutreachProvider provider) {
    if (provider.isLoading && provider.inbox.isEmpty) return const Center(child: CircularProgressIndicator());
    if (provider.inbox.isEmpty) {
      return Center(child: Text('No messages yet — compose one to get started.', style: GoogleFonts.inter(color: AppColors.textTertiary)));
    }
    return RefreshIndicator(
      onRefresh: () => context.read<OutreachProvider>().load(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: provider.inbox.length,
        itemBuilder: (context, index) => _messageCard(provider.inbox[index]),
      ),
    );
  }

  Widget _messageCard(OutreachMessage m) {
    final visual = _channelVisual(m.channel);
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: visual.$2.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(visual.$1, color: visual.$2, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: visual.$2.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                      child: Text(_channelLabel(m.channel), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: visual.$2)),
                    ),
                    const Spacer(),
                    if (m.createdAt != null) Text(_relativeTime(m.createdAt!), style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(m.body, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary), maxLines: 2, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StatusBadge(
            label: m.status[0].toUpperCase() + m.status.substring(1),
            bgColor: m.status == 'replied' ? AppColors.successLight : m.status == 'sent' ? AppColors.infoLight : AppColors.surfaceBg,
            textColor: m.status == 'replied' ? AppColors.success : m.status == 'sent' ? AppColors.info : AppColors.textTertiary,
          ),
        ],
      ),
    );
  }

  (IconData, Color) _channelVisual(String channel) {
    switch (channel) {
      case 'twitter_dm':
        return (Icons.alternate_email_rounded, const Color(0xFF1DA1F2));
      case 'contra':
        return (Icons.work_rounded, AppColors.accent);
      case 'solidgigs':
        return (Icons.send_rounded, const Color(0xFF7C4DFF));
      case 'contact_form':
        return (Icons.contact_mail_rounded, AppColors.warning);
      case 'whatsapp':
        return (Icons.chat_rounded, AppColors.success);
      default:
        return (Icons.email_rounded, AppColors.primary);
    }
  }

  String _channelLabel(String channel) => channel.split('_').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');

  String _relativeTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  Widget _buildTemplatesTab(OutreachProvider provider) {
    if (provider.templates.isEmpty) {
      return Center(child: Text('No templates saved yet.', style: GoogleFonts.inter(color: AppColors.textTertiary)));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: provider.templates.length,
      itemBuilder: (context, index) {
        final t = provider.templates[index];
        return AppCard(
          margin: const EdgeInsets.only(bottom: 10),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.description_rounded, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text('${t.market ?? 'All markets'} • ${t.tone ?? 'Any tone'}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ComposeTab extends StatefulWidget {
  const _ComposeTab();

  @override
  State<_ComposeTab> createState() => _ComposeTabState();
}

class _ComposeTabState extends State<_ComposeTab> {
  String _selectedTone = 'founder_to_founder';
  String _selectedMarket = 'US';
  String _selectedChannel = 'apollo_email';
  String? _selectedLeadId;
  final _bodyController = TextEditingController();

  static const _tones = {'Technical': 'technical', 'Casual': 'casual', 'Formal': 'formal', 'Founder-to-founder': 'founder_to_founder'};
  static const _channels = {'Apollo Email': 'apollo_email', 'Twitter DM': 'twitter_dm', 'Contra': 'contra', 'SolidGigs': 'solidgigs'};

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    if (_selectedLeadId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick a lead first')));
      return;
    }
    final provider = context.read<OutreachProvider>();
    final ok = await provider.generate(leadId: _selectedLeadId!, tone: _selectedTone, market: _selectedMarket, channel: _selectedChannel);
    if (ok && provider.draft != null) {
      _bodyController.text = provider.draft!.body;
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(provider.error ?? 'Could not generate a draft')));
    }
  }

  Future<void> _send() async {
    final provider = context.read<OutreachProvider>();
    if (provider.draft == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Generate a draft first')));
      return;
    }
    final ok = await provider.send(provider.draft!.id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ok ? 'Sent' : (provider.error ?? 'Failed to send'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final leads = context.watch<LeadsProvider>().leads;
    final outreach = context.watch<OutreachProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('New Message', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                Text('To', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                Container(
                  decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedLeadId,
                      hint: Text('Select a lead…', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textTertiary)),
                      items: leads
                          .map((l) => DropdownMenuItem(value: l.id, child: Text(l.displayName, style: GoogleFonts.inter(fontSize: 13))))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedLeadId = v),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Channel', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _channels.entries.map((e) {
                    final isSelected = e.value == _selectedChannel;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedChannel = e.value),
                      child: _chip(e.key, isSelected, AppColors.accent),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                Text('Tone', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _tones.entries.map((e) {
                    final isSelected = e.value == _selectedTone;
                    return GestureDetector(onTap: () => setState(() => _selectedTone = e.value), child: _chip(e.key, isSelected, AppColors.primary));
                  }).toList(),
                ),
                const SizedBox(height: 16),
                Text('Target Market', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Row(
                  children: ['US', 'UK', 'EU'].map((market) {
                    final isSelected = market == _selectedMarket;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(onTap: () => setState(() => _selectedMarket = market), child: _chip(market, isSelected, AppColors.accent)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 160,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                  child: TextField(
                    controller: _bodyController,
                    maxLines: null,
                    expands: true,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                    decoration: InputDecoration.collapsed(
                      hintText: 'Write your message or tap AI Generate…',
                      hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: outreach.isLoading ? null : _generate,
                          icon: const Icon(Icons.auto_awesome_rounded, size: 18),
                          label: Text('AI Generate', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      height: 46,
                      child: ElevatedButton.icon(
                        onPressed: _send,
                        icon: const Icon(Icons.send_rounded, size: 18),
                        label: Text('Send', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _chip(String label, bool isSelected, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected ? color.withValues(alpha: 0.1) : AppColors.surfaceBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isSelected ? color : AppColors.border, width: isSelected ? 1.5 : 1),
      ),
      child: Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400, color: isSelected ? color : AppColors.textSecondary)),
    );
  }
}
