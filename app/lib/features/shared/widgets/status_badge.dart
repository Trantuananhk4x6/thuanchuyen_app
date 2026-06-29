import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class StatusConfig {
  const StatusConfig({required this.label, required this.color, required this.bg});
  final String label;
  final Color  color;
  final Color  bg;
}

final _tripStatus = <String, StatusConfig>{
  'PENDING':   const StatusConfig(label: 'Chờ xác nhận', color: AppColors.warning,  bg: Color(0x1FFBBF24)),
  'ACTIVE':    const StatusConfig(label: 'Đã xác nhận',  color: AppColors.info,     bg: Color(0x1F22D3EE)),
  'ONGOING':   const StatusConfig(label: 'Đang chạy',    color: AppColors.primary,  bg: Color(0x1F6366F1)),
  'COMPLETED': const StatusConfig(label: 'Hoàn thành',   color: AppColors.success,  bg: Color(0x1F34D399)),
  'CANCELLED': const StatusConfig(label: 'Đã huỷ',       color: Color(0xFF94A3B8),  bg: Color(0x1F94A3B8)),
};

StatusConfig tripStatusConfig(String status) =>
    _tripStatus[status] ?? _tripStatus['CANCELLED']!;

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    final cfg = tripStatusConfig(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: cfg.bg,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: cfg.color.withValues(alpha: 0.3)),
      ),
      child: Text(
        cfg.label,
        style: TextStyle(color: cfg.color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.onTap, this.padding});
  final Widget    child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: AppColors.primary.withValues(alpha: 0.05),
        child: Container(
          padding: padding ?? const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: child,
        ),
      ),
    );
  }
}

class GradientButton extends StatelessWidget {
  const GradientButton({super.key, required this.label, required this.onPressed, this.icon, this.loading = false});
  final String    label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool      loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity, height: 50,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: onPressed == null ? null : AppColors.gradPrimary,
          color: onPressed == null ? AppColors.bgOverlay : null,
          borderRadius: BorderRadius.circular(14),
        ),
        child: MaterialButton(
          onPressed: loading ? null : onPressed,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Row(mainAxisSize: MainAxisSize.min, children: [
                  if (icon != null) ...[Icon(icon, size: 18, color: Colors.white), const SizedBox(width: 8)],
                  Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                ]),
        ),
      ),
    );
  }
}
