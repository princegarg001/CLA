import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'screens/war_room/war_room_screen.dart';
import 'screens/apollo_hunter/apollo_hunter_screen.dart';
import 'screens/freelance_radar/freelance_radar_screen.dart';
import 'screens/growth_studio/growth_studio_screen.dart';
import 'screens/ai_agent_lab/ai_agent_lab_screen.dart';
import 'screens/revenue_command/revenue_command_screen.dart';
import 'screens/analytics_tower/analytics_tower_screen.dart';
import 'screens/outreach_composer/outreach_composer_screen.dart';
import 'screens/settings/settings_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const CLAApp());
}

class CLAApp extends StatelessWidget {
  const CLAApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AlphoTech CLA v2',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;
  bool _showMoreMenu = false;

  // All 9 screens
  final List<Widget> _screens = const [
    WarRoomScreen(),           // 0 - War Room (home)
    ApolloHunterScreen(),      // 1 - Apollo Hunter
    FreelanceRadarScreen(),    // 2 - Freelance Radar
    GrowthStudioScreen(),      // 3 - Growth Studio
    AIAgentLabScreen(),        // 4 - AI Agent Lab
    RevenueCommandScreen(),    // 5 - Revenue Command
    AnalyticsTowerScreen(),    // 6 - Analytics Tower
    OutreachComposerScreen(),  // 7 - Outreach Composer
    SettingsScreen(),          // 8 - Settings
  ];

  // Bottom nav shows 5 items (4 primary + More)
  // The "More" menu reveals the remaining screens
  static const List<_NavItem> _primaryNav = [
    _NavItem(Icons.grid_view_rounded, 'War Room', 0),
    _NavItem(Icons.rocket_launch_rounded, 'Apollo', 1),
    _NavItem(Icons.radar_rounded, 'Radar', 2),
    _NavItem(Icons.campaign_rounded, 'Growth', 3),
    _NavItem(Icons.more_horiz_rounded, 'More', -1),
  ];

  static const List<_NavItem> _moreItems = [
    _NavItem(Icons.psychology_rounded, 'AI Agent Lab', 4),
    _NavItem(Icons.account_balance_wallet_rounded, 'Revenue Command', 5),
    _NavItem(Icons.analytics_rounded, 'Analytics Tower', 6),
    _NavItem(Icons.edit_note_rounded, 'Outreach Composer', 7),
    _NavItem(Icons.settings_rounded, 'Settings', 8),
  ];

  void _onNavTap(int navIndex) {
    if (navIndex == 4) {
      // "More" button tapped
      setState(() => _showMoreMenu = !_showMoreMenu);
    } else {
      setState(() {
        _currentIndex = _primaryNav[navIndex].screenIndex;
        _showMoreMenu = false;
      });
    }
  }

  void _onMoreItemTap(int screenIndex) {
    setState(() {
      _currentIndex = screenIndex;
      _showMoreMenu = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Screen content
          IndexedStack(
            index: _currentIndex,
            children: _screens,
          ),
          // More menu overlay
          if (_showMoreMenu) _buildMoreMenu(),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
          child: Row(
            children: List.generate(_primaryNav.length, (index) {
              final item = _primaryNav[index];
              final isMore = item.screenIndex == -1;
              final isSelected = isMore ? _showMoreMenu : (_currentIndex == item.screenIndex);

              // Highlight "More" if current screen is in the more menu
              final isMoreActive = isMore && _currentIndex >= 4;

              return Expanded(
                child: GestureDetector(
                  onTap: () => _onNavTap(index),
                  behavior: HitTestBehavior.opaque,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: (isSelected || isMoreActive)
                              ? AppColors.primary.withValues(alpha: 0.1)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          item.icon,
                          size: 22,
                          color: (isSelected || isMoreActive)
                              ? AppColors.primary
                              : AppColors.navInactive,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.label,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: (isSelected || isMoreActive)
                              ? FontWeight.w600
                              : FontWeight.w500,
                          color: (isSelected || isMoreActive)
                              ? AppColors.primary
                              : AppColors.navInactive,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildMoreMenu() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: GestureDetector(
        onTap: () => setState(() => _showMoreMenu = false),
        child: Container(
          color: Colors.black.withValues(alpha: 0.3),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              // Tap outside to dismiss
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _showMoreMenu = false),
                ),
              ),
              // Menu
              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 24,
                      offset: const Offset(0, -8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                      child: Row(
                        children: [
                          Text('More Screens',
                              style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary)),
                          const Spacer(),
                          GestureDetector(
                            onTap: () => setState(() => _showMoreMenu = false),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceBg,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.close_rounded, size: 18, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(color: AppColors.divider, height: 1),
                    ..._moreItems.map((item) {
                      final isActive = _currentIndex == item.screenIndex;
                      return InkWell(
                        onTap: () => _onMoreItemTap(item.screenIndex),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? AppColors.primary.withValues(alpha: 0.1)
                                      : AppColors.surfaceBg,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(item.icon,
                                    size: 20,
                                    color: isActive ? AppColors.primary : AppColors.textSecondary),
                              ),
                              const SizedBox(width: 14),
                              Text(item.label,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                                    color: isActive ? AppColors.primary : AppColors.textPrimary,
                                  )),
                              const Spacer(),
                              if (isActive)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppColors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              const SizedBox(width: 4),
                              Icon(Icons.chevron_right_rounded,
                                  size: 20, color: AppColors.textTertiary),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  final int screenIndex;

  const _NavItem(this.icon, this.label, this.screenIndex);
}
