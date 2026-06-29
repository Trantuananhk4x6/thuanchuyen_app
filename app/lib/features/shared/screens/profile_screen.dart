import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../widgets/status_badge.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth is AuthAuthenticated ? (auth).user : null;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(title: const Text('Cá nhân')),
      body: user == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Avatar + name
                Center(
                  child: Column(children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                      child: Text(
                        (user.fullName ?? user.phone)[0].toUpperCase(),
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 32),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      user.fullName ?? 'Chưa có tên',
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 20),
                    ),
                    const SizedBox(height: 4),
                    Text(user.phone, style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
                    const SizedBox(height: 8),
                    _RoleBadge(role: user.role),
                  ]),
                ),
                const SizedBox(height: 28),

                // Info card
                AppCard(
                  child: Column(children: [
                    _InfoRow(Icons.phone_outlined, 'Số điện thoại', user.phone),
                    if (user.email != null) ...[
                      const Divider(color: AppColors.borderSubtle, height: 20),
                      _InfoRow(Icons.email_outlined, 'Email', user.email!),
                    ],
                    const Divider(color: AppColors.borderSubtle, height: 20),
                    _InfoRow(Icons.verified_user_outlined, 'Vai trò', _roleLabel(user.role)),
                  ]),
                ),
                const SizedBox(height: 16),

                // Switch role (only show if can switch)
                if (user.isCustomer || user.isDriver)
                  AppCard(
                    onTap: () => _switchRole(context, ref, user.role),
                    child: Row(children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.accent.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.swap_horiz_rounded, color: AppColors.accent, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Chuyển vai trò',
                          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
                        Text(
                          user.isCustomer ? 'Chuyển sang: Tài xế' : 'Chuyển sang: Khách hàng',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ])),
                      const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                    ]),
                  ),
                const SizedBox(height: 10),

                // Logout
                AppCard(
                  onTap: () => _logout(context, ref),
                  child: Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 20),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(child: Text('Đăng xuất',
                      style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600))),
                  ]),
                ),
              ],
            ),
    );
  }

  String _roleLabel(String role) {
    return switch (role) {
      'DRIVER' => 'Tài xế',
      'ADMIN'  => 'Quản trị viên',
      _        => 'Khách hàng',
    };
  }

  Future<void> _switchRole(BuildContext context, WidgetRef ref, String current) async {
    final confirm = await showAdaptiveDialog<bool>(
      context: context,
      builder: (_) => AlertDialog.adaptive(
        title: const Text('Chuyển vai trò?'),
        content: Text(current == 'CUSTOMER'
            ? 'Bạn sẽ chuyển sang chế độ Tài xế.'
            : 'Bạn sẽ chuyển sang chế độ Khách hàng.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/me/switch-role', data: {});
      await ref.read(authProvider.notifier).logout();
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Không thể chuyển vai trò. Thử lại sau.'),
          backgroundColor: AppColors.danger,
        ));
      }
    }
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirm = await showAdaptiveDialog<bool>(
      context: context,
      builder: (_) => AlertDialog.adaptive(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ cần đăng nhập lại để sử dụng ứng dụng.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Đăng xuất', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirm == true) ref.read(authProvider.notifier).logout();
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});
  final String role;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (role) {
      'DRIVER' => ('Tài xế', AppColors.primary),
      'ADMIN'  => ('Admin', AppColors.danger),
      _        => ('Khách hàng', AppColors.accent),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.label, this.value);
  final IconData icon;
  final String   label;
  final String   value;

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, color: AppColors.textMuted, size: 18),
    const SizedBox(width: 12),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
      const SizedBox(height: 2),
      Text(value, style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
    ])),
  ]);
}
