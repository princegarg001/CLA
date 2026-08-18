import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/auth_theme.dart';
import '../../providers/voice_auth_controller.dart';
import '../../widgets/auth_widgets.dart';
import '../../widgets/voice_orb.dart';
import 'voice_login_screen.dart';
import 'voice_setup_screen.dart';

/// Root traffic controller: shows the loading splash while the voice
/// service initializes, then the setup flow (first run) or the login gate
/// (returning user), and finally [child] — the real app — once
/// [VoiceAuthController.isAuthenticated] flips.
class AuthGate extends StatefulWidget {
  final Widget child;
  const AuthGate({super.key, required this.child});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VoiceAuthController>().init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<VoiceAuthController>();

    if (auth.isAuthenticated) return widget.child;

    Widget screen;
    switch (auth.status) {
      case VoiceAuthStatus.initializing:
        screen = const _SplashScreen();
        break;
      case VoiceAuthStatus.needsSetup:
        screen = const VoiceSetupScreen();
        break;
      default:
        screen = const VoiceLoginScreen();
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 320),
      child: KeyedSubtree(key: ValueKey(screen.runtimeType), child: screen),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AuthColors.bgDark,
      body: AuthBackground(
        child: Center(
          child: VoiceOrb(status: VoiceAuthStatus.initializing, soundLevel: 0),
        ),
      ),
    );
  }
}
