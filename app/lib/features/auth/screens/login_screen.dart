import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pinput/pinput.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

enum _Tab { otp, password, registerCustomer, registerDriver }
enum _OtpStep { email, code }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  _Tab     _tab     = _Tab.otp;
  _OtpStep _otpStep = _OtpStep.email;

  final _emailCtrl    = TextEditingController();
  final _otpCtrl      = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nameCtrl     = TextEditingController();

  late final AnimationController _pulseCtrl;
  late final Animation<double>    _pulse;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 4))
      ..repeat(reverse: true);
    _pulse = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    _passwordCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  bool get _isRegister =>
      _tab == _Tab.registerCustomer || _tab == _Tab.registerDriver;

  void _switchTab(_Tab t) {
    setState(() { _tab = t; _otpStep = _OtpStep.email; });
    ref.read(authProvider.notifier).backToEmail();
  }

  void _sendOtp() {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) return;
    ref.read(authProvider.notifier).requestOtp(email: email);
  }

  void _verifyOtp() {
    final auth = ref.read(authProvider);
    if (auth is! AuthOtpSent) return;
    ref.read(authProvider.notifier).verifyOtp(
      email: auth.email, otp: _otpCtrl.text.trim(),
    );
  }

  void _loginPassword() {
    ref.read(authProvider.notifier).loginPassword(
      email: _emailCtrl.text.trim(),
      password: _passwordCtrl.text,
    );
  }

  void _register() {
    ref.read(authProvider.notifier).register(
      email: _emailCtrl.text.trim(),
      password: _passwordCtrl.text,
      fullName: _nameCtrl.text.trim(),
      role: _tab == _Tab.registerDriver ? 'DRIVER' : 'CUSTOMER',
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth     = ref.watch(authProvider);
    final isLoading = auth is AuthLoading;
    final errorMsg  = auth is AuthError ? auth.message : null;

    // Auto-advance to OTP code step when OTP is sent
    if (auth is AuthOtpSent && _otpStep == _OtpStep.email) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _otpStep = _OtpStep.code);
      });
    }

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: Stack(children: [
        // ── Ambient glows ───────────────────────────────────────────
        AnimatedBuilder(
          animation: _pulse,
          builder: (_, __) => Stack(children: [
            Positioned(
              top: -60, left: -60,
              child: _GlowCircle(
                size: 380,
                color: const Color(0xFF6366F1),
                opacity: 0.10 + _pulse.value * 0.05,
              ),
            ),
            Positioned(
              bottom: -80, right: -80,
              child: _GlowCircle(
                size: 460,
                color: const Color(0xFF06B6D4),
                opacity: 0.07 + (1 - _pulse.value) * 0.04,
              ),
            ),
          ]),
        ),

        // ── Content ─────────────────────────────────────────────────
        SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: _Card(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header
                    _Header(isRegister: _isRegister, isDriver: _tab == _Tab.registerDriver),
                    const SizedBox(height: 20),

                    // Error banner
                    if (errorMsg != null) ...[
                      _AlertBanner(message: errorMsg, ok: false),
                      const SizedBox(height: 12),
                    ],

                    if (!_isRegister) ...[
                      // ── Social login (Android/iOS only — google_sign_in không hỗ trợ Windows) ──
                      if (Platform.isAndroid || Platform.isIOS || Platform.isMacOS) ...[
                        _SocialButton(
                          label: 'Tiếp tục với Google',
                          loading: isLoading,
                          onTap: () => ref.read(authProvider.notifier).loginGoogle(),
                          icon: _GoogleLogo(),
                        ),
                        if (Platform.isIOS || Platform.isMacOS) ...[
                          const SizedBox(height: 10),
                          _SocialButton(
                            label: 'Tiếp tục với Apple',
                            loading: isLoading,
                            onTap: () => ref.read(authProvider.notifier).loginApple(),
                            icon: const Icon(Icons.apple, color: Colors.white, size: 20),
                            dark: true,
                          ),
                        ],
                        const SizedBox(height: 16),
                        const _Divider(label: 'hoặc đăng nhập bằng'),
                      ],

                      // Method tabs
                      _TabPills(
                        current: _tab,
                        onOtp: () => _switchTab(_Tab.otp),
                        onPassword: () => _switchTab(_Tab.password),
                      ),
                      const SizedBox(height: 16),

                      // OTP — email step
                      if (_tab == _Tab.otp && _otpStep == _OtpStep.email) ...[
                        _NeonInput(
                          controller: _emailCtrl,
                          label: 'Địa chỉ Email',
                          hint: 'your@email.com',
                          keyboardType: TextInputType.emailAddress,
                          autofocus: true,
                        ),
                        const SizedBox(height: 14),
                        _NeonButton(
                          label: 'Gửi mã OTP →',
                          loading: isLoading,
                          onTap: _sendOtp,
                        ),
                      ],

                      // OTP — code step
                      if (_tab == _Tab.otp && _otpStep == _OtpStep.code) ...[
                        _InfoBanner(email: _emailCtrl.text.trim()),
                        const SizedBox(height: 14),
                        Center(
                          child: Pinput(
                            controller: _otpCtrl,
                            length: 6,
                            autofocus: true,
                            defaultPinTheme: _pinTheme(false),
                            focusedPinTheme: _pinTheme(true),
                            onCompleted: (_) => _verifyOtp(),
                          ),
                        ),
                        const SizedBox(height: 14),
                        _NeonButton(
                          label: 'Xác nhận đăng nhập',
                          loading: isLoading,
                          onTap: _verifyOtp,
                          disabled: _otpCtrl.text.length < 6,
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => setState(() {
                            _otpStep = _OtpStep.email;
                            _otpCtrl.clear();
                            ref.read(authProvider.notifier).backToEmail();
                          }),
                          child: const Text(
                            '← Đổi email · Gửi lại',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
                      ],

                      // Password login
                      if (_tab == _Tab.password) ...[
                        _NeonInput(
                          controller: _emailCtrl,
                          label: 'Email',
                          hint: 'your@email.com',
                          keyboardType: TextInputType.emailAddress,
                          autofocus: true,
                        ),
                        const SizedBox(height: 12),
                        _NeonInput(
                          controller: _passwordCtrl,
                          label: 'Mật khẩu',
                          hint: '••••••••',
                          obscure: true,
                        ),
                        const SizedBox(height: 14),
                        _NeonButton(
                          label: 'Đăng nhập',
                          loading: isLoading,
                          onTap: _loginPassword,
                        ),
                      ],

                      // Register CTA
                      const SizedBox(height: 20),
                      const _Divider(label: 'Chưa có tài khoản?'),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(
                          child: _RegisterCard(
                            icon: Icons.person_outline_rounded,
                            label: 'Đặt xe',
                            sub: 'Khách hàng',
                            color: const Color(0xFF22D3EE),
                            onTap: () => _switchTab(_Tab.registerCustomer),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _RegisterCard(
                            icon: Icons.directions_car_rounded,
                            label: 'Chạy xe',
                            sub: 'Tài xế',
                            color: const Color(0xFFF472B6),
                            onTap: () => _switchTab(_Tab.registerDriver),
                          ),
                        ),
                      ]),
                    ] else ...[
                      // ── Register form ───────────────────────────────
                      TextButton.icon(
                        onPressed: () => _switchTab(_Tab.otp),
                        icon: const Icon(Icons.arrow_back_ios_rounded, size: 14,
                            color: AppColors.textMuted),
                        label: const Text('Quay lại đăng nhập',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      ),
                      const SizedBox(height: 4),

                      // Role pills
                      _TabPills(
                        current: _tab,
                        onRegisterCustomer: () => _switchTab(_Tab.registerCustomer),
                        onRegisterDriver: () => _switchTab(_Tab.registerDriver),
                        registerMode: true,
                      ),
                      const SizedBox(height: 16),

                      _NeonInput(controller: _nameCtrl, label: 'Họ và tên',
                          hint: 'Nguyễn Văn A', autofocus: true),
                      const SizedBox(height: 12),
                      _NeonInput(controller: _emailCtrl, label: 'Email',
                          hint: 'your@email.com', keyboardType: TextInputType.emailAddress),
                      const SizedBox(height: 12),
                      _NeonInput(controller: _passwordCtrl, label: 'Mật khẩu',
                          hint: 'Tối thiểu 8 ký tự', obscure: true),
                      const SizedBox(height: 14),
                      _NeonButton(
                        label: _tab == _Tab.registerDriver
                            ? 'Đăng ký làm Tài xế →'
                            : 'Tạo tài khoản →',
                        loading: isLoading,
                        onTap: _register,
                        color: _tab == _Tab.registerDriver
                            ? const Color(0xFFF472B6)
                            : AppColors.primary,
                      ),
                      if (_tab == _Tab.registerDriver) ...[
                        const SizedBox(height: 10),
                        const Text(
                          'Sau đăng ký, hoàn thành KYC để bắt đầu nhận chuyến.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                        ),
                      ],
                    ],

                    const SizedBox(height: 20),
                    Center(
                      child: TextButton(
                        onPressed: () {},
                        child: const Text(
                          '📖 Xem hướng dẫn sử dụng',
                          style: TextStyle(color: AppColors.primary, fontSize: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  PinTheme _pinTheme(bool focused) => PinTheme(
    width: 46, height: 54,
    textStyle: const TextStyle(
      fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
    ),
    decoration: BoxDecoration(
      color: const Color(0xFF12121A),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(
        color: focused ? AppColors.primary : AppColors.borderSubtle,
        width: focused ? 2 : 1,
      ),
      boxShadow: focused
          ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.2), blurRadius: 10)]
          : null,
    ),
  );
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _GlowCircle extends StatelessWidget {
  const _GlowCircle({required this.size, required this.color, required this.opacity});
  final double size;
  final Color color;
  final double opacity;
  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: RadialGradient(colors: [
        color.withValues(alpha: opacity),
        color.withValues(alpha: 0),
      ]),
    ),
  );
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(maxWidth: 400),
    decoration: BoxDecoration(
      color: const Color(0xFF0F172A).withValues(alpha: 0.92),
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.18)),
      boxShadow: [
        BoxShadow(color: Colors.black.withValues(alpha: 0.6), blurRadius: 64, offset: const Offset(0, 24)),
        BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.05), blurRadius: 100),
      ],
    ),
    child: Stack(children: [
      // Top accent line
      Positioned(
        top: 0, left: 60, right: 60,
        child: Container(
          height: 1,
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [
              Colors.transparent, Color(0xFF6366F1), Color(0xFF22D3EE), Colors.transparent,
            ]),
          ),
        ),
      ),
      Padding(padding: const EdgeInsets.fromLTRB(24, 28, 24, 24), child: child),
    ]),
  );
}

class _Header extends StatelessWidget {
  const _Header({required this.isRegister, required this.isDriver});
  final bool isRegister;
  final bool isDriver;
  @override
  Widget build(BuildContext context) => Column(children: [
    // Logo
    Container(
      width: 64, height: 64,
      decoration: BoxDecoration(
        gradient: AppColors.gradPrimary,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.4), blurRadius: 20)],
      ),
      child: const Center(
        child: Text('TC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22)),
      ),
    ),
    const SizedBox(height: 12),
    Text(
      isRegister
          ? (isDriver ? 'Trở thành Tài xế' : 'Tạo tài khoản')
          : 'Thuận Chuyến',
      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 18),
    ),
    const SizedBox(height: 4),
    Text(
      isRegister
          ? (isDriver ? 'Bắt đầu kiếm thêm thu nhập ngay hôm nay' : 'Đặt chuyến nhanh, giá tốt mỗi ngày')
          : 'Chào mừng trở lại',
      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
    ),
  ]);
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({required this.message, required this.ok});
  final String message;
  final bool ok;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: (ok ? Colors.green : Colors.red).withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: (ok ? Colors.green : Colors.red).withValues(alpha: 0.22)),
    ),
    child: Row(children: [
      Icon(ok ? Icons.check_circle_outline : Icons.error_outline,
          color: ok ? const Color(0xFF4ADE80) : const Color(0xFFF87171), size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(message, style: TextStyle(
        color: ok ? const Color(0xFF4ADE80) : const Color(0xFFF87171), fontSize: 13,
      ))),
    ]),
  );
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.email});
  final String email;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: const Color(0xFF06B6D4).withValues(alpha: 0.07),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: const Color(0xFF06B6D4).withValues(alpha: 0.16)),
    ),
    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.email_outlined, color: Color(0xFF67E8F9), size: 14),
      const SizedBox(width: 6),
      const Text('Mã đã gửi tới ', style: TextStyle(color: Color(0xFF67E8F9), fontSize: 13)),
      Text(email, style: const TextStyle(color: Color(0xFF67E8F9), fontWeight: FontWeight.w700, fontSize: 13)),
    ]),
  );
}

class _TabPills extends StatelessWidget {
  const _TabPills({
    required this.current,
    this.onOtp,
    this.onPassword,
    this.onRegisterCustomer,
    this.onRegisterDriver,
    this.registerMode = false,
  });
  final _Tab current;
  final VoidCallback? onOtp;
  final VoidCallback? onPassword;
  final VoidCallback? onRegisterCustomer;
  final VoidCallback? onRegisterDriver;
  final bool registerMode;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: Colors.black.withValues(alpha: 0.3),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(children: registerMode
        ? [
            _Pill(active: current == _Tab.registerCustomer,
                label: 'Đặt xe (Khách)', icon: Icons.person_outline_rounded,
                color: const Color(0xFF22D3EE), onTap: onRegisterCustomer!),
            _Pill(active: current == _Tab.registerDriver,
                label: 'Chạy xe (Tài xế)', icon: Icons.directions_car_rounded,
                color: const Color(0xFFF472B6), onTap: onRegisterDriver!),
          ]
        : [
            _Pill(active: current == _Tab.otp,
                label: 'OTP Email', icon: Icons.email_outlined,
                color: AppColors.primary, onTap: onOtp!),
            _Pill(active: current == _Tab.password,
                label: 'Mật khẩu', icon: Icons.key_outlined,
                color: AppColors.primary, onTap: onPassword!),
          ],
    ),
  );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.active, required this.label, required this.icon,
      required this.color, required this.onTap});
  final bool active;
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(
          gradient: active ? LinearGradient(
            colors: [color.withValues(alpha: 0.8), color.withValues(alpha: 0.5)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ) : null,
          borderRadius: BorderRadius.circular(9),
          boxShadow: active ? [BoxShadow(color: color.withValues(alpha: 0.26), blurRadius: 12)] : null,
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 13, color: active ? Colors.white : AppColors.textMuted),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600,
            color: active ? Colors.white : AppColors.textMuted,
          )),
        ]),
      ),
    ),
  );
}

class _NeonInput extends StatelessWidget {
  const _NeonInput({
    required this.controller,
    required this.label,
    required this.hint,
    this.keyboardType,
    this.obscure = false,
    this.autofocus = false,
  });
  final TextEditingController controller;
  final String label;
  final String hint;
  final TextInputType? keyboardType;
  final bool obscure;
  final bool autofocus;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(
        color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.3,
      )),
      const SizedBox(height: 5),
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscure,
        autofocus: autofocus,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: AppColors.textMuted.withValues(alpha: 0.5)),
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.03),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: AppColors.primary.withValues(alpha: 0.18)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: AppColors.primary.withValues(alpha: 0.18)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
        ),
      ),
    ],
  );
}

class _NeonButton extends StatelessWidget {
  const _NeonButton({
    required this.label,
    required this.loading,
    required this.onTap,
    this.disabled = false,
    this.color,
  });
  final String label;
  final bool loading;
  final VoidCallback onTap;
  final bool disabled;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: (loading || disabled) ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: disabled ? c.withValues(alpha: 0.15) : c,
          padding: const EdgeInsets.symmetric(vertical: 13),
          elevation: 0,
          shadowColor: c.withValues(alpha: 0.4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ).copyWith(
          elevation: WidgetStateProperty.all(disabled ? 0 : 8),
        ),
        child: loading
            ? const SizedBox(width: 18, height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label, style: const TextStyle(
                color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: 0.3)),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Container(height: 1, color: Colors.white.withValues(alpha: 0.06))),
    Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Text(label, style: const TextStyle(color: Color(0xFF334155), fontSize: 11)),
    ),
    Expanded(child: Container(height: 1, color: Colors.white.withValues(alpha: 0.06))),
  ]);
}

class _RegisterCard extends StatefulWidget {
  const _RegisterCard({required this.icon, required this.label, required this.sub,
      required this.color, required this.onTap});
  final IconData icon;
  final String label;
  final String sub;
  final Color color;
  final VoidCallback onTap;
  @override
  State<_RegisterCard> createState() => _RegisterCardState();
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.label,
    required this.loading,
    required this.onTap,
    required this.icon,
    this.dark = false,
  });
  final String label;
  final bool   loading;
  final VoidCallback onTap;
  final Widget icon;
  final bool   dark;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: OutlinedButton(
      onPressed: loading ? null : onTap,
      style: OutlinedButton.styleFrom(
        backgroundColor: dark ? const Color(0xFF1C1C1E) : const Color(0xFF18181B),
        side: BorderSide(
          color: dark
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.white.withValues(alpha: 0.1),
        ),
        padding: const EdgeInsets.symmetric(vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: loading
          ? const SizedBox(
              width: 18, height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              icon,
              const SizedBox(width: 10),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ]),
    ),
  );
}

// Google "G" logo — dùng SVG path inline trên Canvas
class _GoogleLogo extends StatelessWidget {
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 20, height: 20,
    child: CustomPaint(painter: _GoogleLogoPainter()),
  );
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()..style = PaintingStyle.fill;

    // Scale to fit
    canvas.save();
    canvas.scale(w / 24, h / 24);

    // Blue arc (right top)
    paint.color = const Color(0xFF4285F4);
    canvas.drawPath(
      Path()
        ..moveTo(12, 4.8)
        ..cubicTo(14.6, 4.8, 16.5, 5.8, 17.7, 6.9)
        ..lineTo(20.3, 4.3)
        ..cubicTo(18.2, 2.3, 15.3, 1, 12, 1)
        ..cubicTo(7.4, 1, 3.5, 3.6, 1.6, 7.4)
        ..lineTo(4.8, 9.9)
        ..cubicTo(5.7, 7.1, 8.6, 4.8, 12, 4.8)
        ..close(),
      paint,
    );

    // Red arc (left)
    paint.color = const Color(0xFFEA4335);
    canvas.drawPath(
      Path()
        ..moveTo(1.6, 7.4)
        ..cubicTo(1.1, 8.8, 0.8, 10.3, 0.8, 12)
        ..cubicTo(0.8, 13.7, 1.1, 15.2, 1.6, 16.6)
        ..lineTo(4.8, 14.1)
        ..cubicTo(4.5, 13.4, 4.3, 12.7, 4.3, 12)
        ..cubicTo(4.3, 11.3, 4.5, 10.6, 4.8, 9.9)
        ..close(),
      paint,
    );

    // Yellow arc (bottom)
    paint.color = const Color(0xFFFBBC05);
    canvas.drawPath(
      Path()
        ..moveTo(12, 19.2)
        ..cubicTo(8.6, 19.2, 5.7, 16.9, 4.8, 14.1)
        ..lineTo(1.6, 16.6)
        ..cubicTo(3.5, 20.4, 7.4, 23, 12, 23)
        ..close(),
      paint,
    );

    // Blue right + horizontal bar (G cutout area)
    paint.color = const Color(0xFF4285F4);
    canvas.drawPath(
      Path()
        ..moveTo(23.2, 12)
        ..cubicTo(23.2, 11.1, 23.1, 10.3, 22.9, 9.5)
        ..lineTo(12, 9.5)
        ..lineTo(12, 14.5)
        ..lineTo(18.4, 14.5)
        ..cubicTo(18.0, 16.2, 17.0, 17.5, 15.7, 18.4)
        ..lineTo(18.9, 20.9)
        ..cubicTo(21.4, 18.6, 23.2, 15.6, 23.2, 12)
        ..close(),
      paint,
    );

    // Green arc (bottom right)
    paint.color = const Color(0xFF34A853);
    canvas.drawPath(
      Path()
        ..moveTo(15.7, 18.4)
        ..lineTo(18.9, 20.9)
        ..cubicTo(17.4, 22.1, 14.9, 23, 12, 23)
        ..lineTo(12, 19.2)
        ..cubicTo(13.8, 19.2, 14.9, 18.9, 15.7, 18.4)
        ..close(),
      paint,
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(_) => false;
}

class _RegisterCardState extends State<_RegisterCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => _hovered = true),
    onExit:  (_) => setState(() => _hovered = false),
    child: GestureDetector(
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: _hovered ? widget.color.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: widget.color.withValues(alpha: _hovered ? 0.4 : 0.18)),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(
              color: widget.color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(widget.icon, color: widget.color, size: 18),
          ),
          const SizedBox(height: 7),
          Text(widget.label, style: const TextStyle(
            color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w700,
          )),
          const SizedBox(height: 2),
          Text(widget.sub, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ]),
      ),
    ),
  );
}
