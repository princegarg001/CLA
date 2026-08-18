import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/auth_theme.dart';

/// Full-bleed dark gradient backdrop with soft amber glow blobs, shared by
/// every auth/onboarding screen so they read as one flow.
class AuthBackground extends StatelessWidget {
  final Widget child;
  const AuthBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AuthColors.backgroundGradient),
      child: Stack(
        children: [
          Positioned(
            top: -80,
            right: -60,
            child: _glowBlob(220),
          ),
          Positioned(
            bottom: -100,
            left: -80,
            child: _glowBlob(260),
          ),
          SafeArea(child: child),
        ],
      ),
    );
  }

  Widget _glowBlob(double size) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AuthColors.orbGlow),
    );
  }
}

class AuthPrimaryButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;

  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
  });

  @override
  State<AuthPrimaryButton> createState() => _AuthPrimaryButtonState();
}

class _AuthPrimaryButtonState extends State<AuthPrimaryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.isLoading;
    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          width: double.infinity,
          height: 54,
          decoration: BoxDecoration(
            gradient: enabled ? AuthColors.amberGradient : null,
            color: enabled ? null : AuthColors.cardNavyLight,
            borderRadius: BorderRadius.circular(16),
            boxShadow: enabled
                ? [BoxShadow(color: AuthColors.amber.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 8))]
                : null,
          ),
          child: Center(
            child: widget.isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: AuthColors.bgDarker),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (widget.icon != null) ...[
                        Icon(widget.icon, size: 20, color: AuthColors.bgDarker),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        widget.label,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AuthColors.bgDarker,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class AuthGhostButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  const AuthGhostButton({super.key, required this.label, this.onPressed, this.icon});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: AuthColors.textMutedOnDark,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 16), const SizedBox(width: 6)],
          Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class AuthTextField extends StatelessWidget {
  final String hint;
  final TextEditingController controller;
  final bool obscure;
  final ValueChanged<String>? onSubmitted;

  const AuthTextField({
    super.key,
    required this.hint,
    required this.controller,
    this.obscure = false,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AuthColors.cardNavy,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        onSubmitted: onSubmitted,
        style: GoogleFonts.inter(color: AuthColors.textOnDark, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(color: AuthColors.textFaintOnDark, fontSize: 14),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }
}

/// Animated status caption under the orb — fades/slides between messages
/// instead of snapping, so rapid state changes (listening → denied → locked)
/// don't feel jarring.
class AuthStatusText extends StatelessWidget {
  final String text;
  final Color color;

  const AuthStatusText({super.key, required this.text, this.color = AuthColors.textMutedOnDark});

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      transitionBuilder: (child, anim) => FadeTransition(
        opacity: anim,
        child: SlideTransition(
          position: Tween(begin: const Offset(0, 0.15), end: Offset.zero).animate(anim),
          child: child,
        ),
      ),
      child: Text(
        text,
        key: ValueKey(text),
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: color),
      ),
    );
  }
}
