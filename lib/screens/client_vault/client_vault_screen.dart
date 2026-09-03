import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/client_models.dart';
import '../../providers/client_provider.dart';
import '../../widgets/shared_components.dart';
import 'client_detail_screen.dart';

class ClientVaultScreen extends StatefulWidget {
  const ClientVaultScreen({super.key});

  @override
  State<ClientVaultScreen> createState() => _ClientVaultScreenState();
}

class _ClientVaultScreenState extends State<ClientVaultScreen> {
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ClientProvider>().load());
  }

  List<Client> _filtered(List<Client> clients) {
    switch (_selectedTab) {
      case 0:
        return clients.where((c) => c.status == 'active').toList();
      case 1:
        return clients.where((c) => c.status == 'completed' || c.status == 'churned').toList();
      default:
        return clients;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ClientProvider>();
    final clients = _filtered(provider.clients);

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(provider),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Active', 'Completed', 'All'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: provider.isLoading && provider.clients.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => context.read<ClientProvider>().load(),
                    child: clients.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(vertical: 80),
                            children: [
                              Center(child: Text('No clients here yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: clients.length,
                            itemBuilder: (context, i) => _buildClientCard(context, clients[i]),
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(ClientProvider provider) {
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
                    child: const Icon(Icons.shield_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Client Vault', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  GestureDetector(
                    onTap: () => context.read<ClientProvider>().rescoreHealth(),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => context.read<ClientProvider>().load(),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.refresh_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                '${provider.activeCount} Active · \$${provider.activeValue.round()} active value',
                style: GoogleFonts.inter(fontSize: 14, color: Colors.white.withValues(alpha: 0.85), fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClientCard(BuildContext context, Client client) {
    final activeProject = client.projects.where((p) => p.status == 'active').isNotEmpty
        ? client.projects.firstWhere((p) => p.status == 'active')
        : null;
    final progress = activeProject?.budget != null && activeProject!.budget! > 0
        ? (client.totalRevenue / activeProject.budget!).clamp(0.0, 1.0)
        : null;
    final healthColor = client.healthScore >= 8
        ? AppColors.success
        : client.healthScore >= 6
        ? AppColors.warning
        : AppColors.error;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClientDetailScreen(clientId: client.id))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: healthColor, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Expanded(child: Text(client.name, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary))),
              Text('${client.healthScore}/10', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: healthColor)),
            ],
          ),
          if (client.company != null || client.region != null) ...[
            const SizedBox(height: 3),
            Text(
              [if (client.company != null) client.company!, if (client.region != null) client.region!].join(' · '),
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
            ),
          ],
          if (activeProject != null) ...[
            const SizedBox(height: 10),
            Text(activeProject.title, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
            if (progress != null) ...[
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(value: progress, minHeight: 6, backgroundColor: AppColors.surfaceBg, valueColor: const AlwaysStoppedAnimation(AppColors.accent)),
              ),
              const SizedBox(height: 4),
              Text(
                '\$${client.totalRevenue.round()} / \$${activeProject.budget!.round()}${activeProject.dueDate != null ? ' · Due ${_formatDate(activeProject.dueDate!)}' : ''}',
                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
              ),
            ],
          ],
          if (client.healthReason != null && client.healthScore < 7) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, size: 13, color: healthColor),
                const SizedBox(width: 4),
                Expanded(child: Text(client.healthReason!, style: GoogleFonts.inter(fontSize: 11, color: healthColor), maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.month}/${d.day}';
}
