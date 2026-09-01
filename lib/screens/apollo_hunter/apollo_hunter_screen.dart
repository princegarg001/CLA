import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/apollo_models.dart';
import '../../data/models/lead.dart';
import '../../providers/apollo_provider.dart';
import '../../widgets/shared_components.dart';

class ApolloHunterScreen extends StatefulWidget {
  const ApolloHunterScreen({super.key});

  @override
  State<ApolloHunterScreen> createState() => _ApolloHunterScreenState();
}

class _ApolloHunterScreenState extends State<ApolloHunterScreen> {
  int _selectedTab = 0;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ApolloProvider>().load();
      context.read<ApolloProvider>().search();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      final titles = query.trim().isEmpty ? null : query.trim().split(RegExp(r'\s+'));
      context.read<ApolloProvider>().search(titles: titles);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ApolloProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(provider),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Leads', 'Sequences', 'ICP Builder'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildLeadsList(provider),
                _buildSequencesList(provider),
                _buildICPBuilder(provider),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(ApolloProvider provider) {
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
                    child: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Apollo Hunter', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                  _headerAction(Icons.refresh_rounded, onTap: () {
                    context.read<ApolloProvider>().load();
                    context.read<ApolloProvider>().search();
                  }),
                ],
              ),
              const SizedBox(height: 16),
              HeaderSearchBar(hint: 'Search 230M+ contacts by title...', onChanged: _onSearchChanged),
              const SizedBox(height: 14),
              Row(
                children: [
                  _quickStat('Found', '${provider.searchResults.length}'),
                  _quickStat('In Pipeline', '${provider.pipelineLeads.length}'),
                  _quickStat('Sequences', '${provider.sequences.length}'),
                  _quickStat('ICPs Saved', '${provider.icpProfiles.length}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerAction(IconData icon, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _quickStat(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
        ],
      ),
    );
  }

  Widget _buildLeadsList(ApolloProvider provider) {
    if (provider.isLoading && provider.searchResults.isEmpty && provider.pipelineLeads.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    final items = [...provider.searchResults, ...provider.pipelineLeads];
    if (items.isEmpty) {
      return Center(child: Text('No leads yet — try a search above.', style: GoogleFonts.inter(color: AppColors.textTertiary)));
    }
    return RefreshIndicator(
      onRefresh: () => context.read<ApolloProvider>().load(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final lead = items[index];
          final inPipeline = index >= provider.searchResults.length;
          return _leadCard(lead, inPipeline, provider);
        },
      ),
    );
  }

  Widget _leadCard(Lead lead, bool inPipeline, ApolloProvider provider) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      color: lead.locked ? AppColors.warning.withValues(alpha: 0.06) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              InitialsAvatar(name: lead.displayName),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(lead.displayName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
                        if (inPipeline) ...[
                          GestureDetector(
                            onTap: () => provider.toggleLock(lead),
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              margin: const EdgeInsets.only(right: 6),
                              decoration: BoxDecoration(
                                color: lead.locked ? AppColors.warning.withValues(alpha: 0.15) : AppColors.surfaceBg,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                lead.locked ? Icons.lock_rounded : Icons.lock_open_rounded,
                                size: 14,
                                color: lead.locked ? AppColors.warning : AppColors.textTertiary,
                              ),
                            ),
                          ),
                        ],
                        StatusBadge.score(lead.score),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(lead.displayTitle, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (lead.region != null) _leadTag(Icons.flag_rounded, lead.region!),
              if (lead.region != null) const SizedBox(width: 8),
              _leadTag(Icons.star_rounded, '${lead.score}/10'),
              const SizedBox(width: 8),
              if (lead.techStack.isNotEmpty)
                Expanded(
                  child: Text(lead.techStack.join(', '), style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary), overflow: TextOverflow.ellipsis),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (!inPipeline)
                GestureDetector(
                  onTap: () => provider.importLead(lead),
                  child: _actionChip(Icons.add_circle_outline_rounded, 'Add to Pipeline', AppColors.success),
                )
              else
                _actionChip(Icons.check_circle_rounded, 'In Pipeline', AppColors.success),
              const SizedBox(width: 8),
              if (lead.linkedinUrl != null) _actionChip(Icons.open_in_new_rounded, 'LinkedIn', const Color(0xFF0077B5)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _leadTag(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(6), border: Border.all(color: AppColors.border)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.textTertiary),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _actionChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _buildSequencesList(ApolloProvider provider) {
    if (provider.isLoading && provider.sequences.isEmpty) return const Center(child: CircularProgressIndicator());
    if (provider.sequences.isEmpty) {
      return Center(child: Text('No sequences yet.', style: GoogleFonts.inter(color: AppColors.textTertiary)));
    }
    return RefreshIndicator(
      onRefresh: () => context.read<ApolloProvider>().load(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: provider.sequences.length,
        itemBuilder: (context, index) {
          final ApolloSequence s = provider.sequences[index];
          return AppCard(
            margin: const EdgeInsets.only(bottom: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.send_rounded, color: AppColors.primary, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(s.name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _seqStat('Open Rate', s.openRate != null ? '${(s.openRate! * 100).toStringAsFixed(0)}%' : '—', AppColors.info),
                    const SizedBox(width: 16),
                    _seqStat('Reply Rate', s.replyRate != null ? '${(s.replyRate! * 100).toStringAsFixed(0)}%' : '—', AppColors.success),
                    const SizedBox(width: 16),
                    _seqStat('Booked Calls', '${s.bookedCalls}', AppColors.primary),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _seqStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: color)),
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
      ],
    );
  }

  Widget _buildICPBuilder(ApolloProvider provider) {
    return _IcpBuilderForm(provider: provider);
  }
}

class _IcpBuilderForm extends StatefulWidget {
  final ApolloProvider provider;
  const _IcpBuilderForm({required this.provider});

  @override
  State<_IcpBuilderForm> createState() => _IcpBuilderFormState();
}

class _IcpBuilderFormState extends State<_IcpBuilderForm> {
  final _name = TextEditingController(text: 'Fintech CTOs — US/UK/EU');
  final _industries = TextEditingController(text: 'Fintech, SaaS, HealthTech');
  final _regions = TextEditingController(text: 'US, UK, EU');
  final _techStack = TextEditingController(text: 'Python, Node.js, AWS, Microservices');
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _industries.dispose();
    _regions.dispose();
    _techStack.dispose();
    super.dispose();
  }

  List<String> _split(String v) => v.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();

  Future<void> _save() async {
    setState(() => _saving = true);
    final ok = await widget.provider.saveIcp({
      'name': _name.text.trim().isEmpty ? 'Untitled ICP' : _name.text.trim(),
      'industries': _split(_industries.text),
      'regions': _split(_regions.text),
      'tech_stack': _split(_techStack.text),
    });
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) {
      await widget.provider.search(titles: _split(_industries.text));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('ICP saved — Apollo will remember it.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ideal Client Profile', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('Define who you\'re targeting. Apollo will remember it.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                const SizedBox(height: 16),
                _icpField('Profile name', _name),
                _icpField('Industry', _industries),
                _icpField('Region', _regions),
                _icpField('Tech Stack', _techStack),
                const SizedBox(height: 16),
                AccentButton(label: 'Save ICP & Search', onPressed: _save, icon: Icons.search_rounded, isLoading: _saving),
              ],
            ),
          ),
          if (widget.provider.icpProfiles.isNotEmpty) ...[
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Saved ICPs', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  ...widget.provider.icpProfiles.map((icp) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text('• ${icp.name}', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
                      )),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _icpField(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
          const SizedBox(height: 6),
          Container(
            decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
            child: TextField(
              controller: controller,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
              decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
