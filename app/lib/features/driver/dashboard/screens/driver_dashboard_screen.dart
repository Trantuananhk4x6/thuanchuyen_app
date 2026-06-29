import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/driver_profile.dart';
import '../../../../data/models/match.dart';
import '../../../../data/repositories/driver_repository.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../shared/widgets/status_badge.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final driverRepositoryProvider = Provider<DriverRepository>(
  (ref) => DriverRepository(ref.read(apiClientProvider)),
);

final driverProfileProvider = FutureProvider.autoDispose<DriverProfileFull>(
  (ref) => ref.read(driverRepositoryProvider).getProfile(),
);

final pendingMatchesProvider = FutureProvider.autoDispose<List<TripMatch>>(
  (ref) async {
    final matches = await ref.read(driverRepositoryProvider).getMatches();
    return matches.where((m) => m.isOffered).toList();
  },
);

// ── Screen ────────────────────────────────────────────────────────────────────

class DriverDashboardScreen extends ConsumerWidget {
  const DriverDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(driverProfileProvider);
    final matchesAsync = ref.watch(pendingMatchesProvider);
    final auth         = ref.watch(authProvider);
    final user = auth is AuthAuthenticated ? (auth).user : null;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Trang chủ'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              ref.invalidate(driverProfileProvider);
              ref.invalidate(pendingMatchesProvider);
            },
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
        error: (e, _) => _ErrorState(
          message: e is ApiException ? e.message : 'Không tải được thông tin',
          onRetry: () => ref.invalidate(driverProfileProvider),
        ),
        data: (profile) => RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.bgSurface,
          onRefresh: () async {
            ref.invalidate(driverProfileProvider);
            ref.invalidate(pendingMatchesProvider);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Greeting
              _GreetingCard(name: user?.fullName, profile: profile),
              const SizedBox(height: 16),

              // KYC status banners
              if (profile.isNone) _KycBanner.notSubmitted(context),
              if (profile.isPending) _KycBanner.pending(),
              if (profile.isRejected) _KycBanner.rejected(profile.rejectReason, context),

              // Online toggle (only approved drivers)
              if (profile.isApproved) ...[
                const SizedBox(height: 4),
                _OnlineToggle(profile: profile, ref: ref),
                const SizedBox(height: 16),

                // Active trip shortcut
                _ActiveTripCard(),
                const SizedBox(height: 16),

                // Pending matches
                _PendingMatchesTile(matchesAsync: matchesAsync),
                const SizedBox(height: 16),

                // Stats row
                _StatsRow(totalTrips: profile.totalTrips, rating: profile.rating),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Greeting card ─────────────────────────────────────────────────────────────

class _GreetingCard extends StatelessWidget {
  const _GreetingCard({required this.name, required this.profile});
  final String? name;
  final DriverProfileFull profile;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
          child: Text(
            (name ?? 'T')[0].toUpperCase(),
            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 20),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Xin chào, ${name ?? 'Tài xế'}!',
            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 2),
          Text(profile.vehiclePlate.isNotEmpty ? profile.vehiclePlate : 'Chưa có biển số',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        ])),
        _KycChip(status: profile.verificationStatus),
      ]),
    );
  }
}

class _KycChip extends StatelessWidget {
  const _KycChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'APPROVED' => ('Đã duyệt', AppColors.success),
      'PENDING'  => ('Chờ duyệt', AppColors.warning),
      'REJECTED' => ('Từ chối', AppColors.danger),
      _          => ('Chưa KYC', AppColors.textMuted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}

// ── KYC banners ───────────────────────────────────────────────────────────────

class _KycBanner extends StatelessWidget {
  const _KycBanner._({required this.icon, required this.color, required this.title, required this.subtitle, this.action});
  final IconData icon;
  final Color    color;
  final String   title;
  final String   subtitle;
  final Widget?  action;

  factory _KycBanner.notSubmitted(BuildContext context) => _KycBanner._(
    icon: Icons.assignment_outlined,
    color: AppColors.warning,
    title: 'Chưa nộp hồ sơ KYC',
    subtitle: 'Nộp hồ sơ để bắt đầu nhận chuyến',
    action: TextButton(
      onPressed: () => context.push('/driver/kyc'),
      child: const Text('Nộp ngay', style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.w700, fontSize: 12)),
    ),
  );

  factory _KycBanner.pending() => const _KycBanner._(
    icon: Icons.hourglass_top_rounded,
    color: AppColors.info,
    title: 'Hồ sơ đang được xét duyệt',
    subtitle: 'Thường mất 1–2 ngày làm việc',
  );

  factory _KycBanner.rejected(String? reason, BuildContext context) => _KycBanner._(
    icon: Icons.error_outline_rounded,
    color: AppColors.danger,
    title: 'Hồ sơ bị từ chối',
    subtitle: reason ?? 'Hồ sơ không hợp lệ',
    action: TextButton(
      onPressed: () => context.push('/driver/kyc'),
      child: const Text('Nộp lại', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700, fontSize: 12)),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        ])),
        if (action != null) action!,
      ]),
    );
  }
}

// ── Online toggle ─────────────────────────────────────────────────────────────

class _OnlineToggle extends ConsumerStatefulWidget {
  const _OnlineToggle({required this.profile, required this.ref});
  final DriverProfileFull profile;
  final WidgetRef ref;

  @override
  ConsumerState<_OnlineToggle> createState() => _OnlineToggleState();
}

class _OnlineToggleState extends ConsumerState<_OnlineToggle> {
  late bool _online;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _online = widget.profile.isOnline;
  }

  Future<void> _toggle(bool value) async {
    setState(() { _loading = true; _online = value; });
    try {
      await ref.read(driverRepositoryProvider).setAvailability(value);
      ref.invalidate(driverProfileProvider);
    } catch (_) {
      setState(() => _online = !value);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Không thể thay đổi trạng thái. Thử lại sau.'),
          backgroundColor: AppColors.danger,
        ));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: _online ? AppColors.success.withValues(alpha: 0.15) : AppColors.bgOverlay,
            shape: BoxShape.circle,
          ),
          child: Icon(
            _online ? Icons.wifi_tethering_rounded : Icons.wifi_tethering_off_rounded,
            color: _online ? AppColors.success : AppColors.textMuted,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            _online ? 'Đang nhận chuyến' : 'Ngoại tuyến',
            style: TextStyle(
              color: _online ? AppColors.success : AppColors.textSecondary,
              fontWeight: FontWeight.w700, fontSize: 15,
            ),
          ),
          Text(
            _online ? 'Bạn sẽ nhận được yêu cầu ghép chuyến' : 'Bật để bắt đầu nhận chuyến',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ])),
        _loading
            ? const SizedBox(width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
            : Switch.adaptive(value: _online, onChanged: _toggle, activeColor: AppColors.success),
      ]),
    );
  }
}

// ── Active trip shortcut ──────────────────────────────────────────────────────

class _ActiveTripCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeTripAsync = ref.watch(
      FutureProvider.autoDispose((r) => r.read(driverRepositoryProvider).getActiveTrip()),
    );

    return activeTripAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (trip) {
        if (trip == null || trip.isCompleted || trip.isCancelled) return const SizedBox.shrink();
        return AppCard(
          onTap: () => context.push('/driver/active'),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.directions_car_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Chuyến đang chạy', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
              Text('${trip.seatsFilled}/${trip.seatsTotal} hành khách',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ])),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ]),
        );
      },
    );
  }
}

// ── Pending matches tile ──────────────────────────────────────────────────────

class _PendingMatchesTile extends StatelessWidget {
  const _PendingMatchesTile({required this.matchesAsync});
  final AsyncValue<List<TripMatch>> matchesAsync;

  @override
  Widget build(BuildContext context) {
    return matchesAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (matches) {
        if (matches.isEmpty) return const SizedBox.shrink();
        return AppCard(
          onTap: () => context.push('/driver/matches'),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.notification_important_rounded, color: AppColors.warning, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${matches.length} yêu cầu ghép chuyến',
                style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
              const Text('Nhấn để xem và chấp nhận',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text('${matches.length}',
                style: const TextStyle(color: AppColors.warning, fontWeight: FontWeight.w800, fontSize: 13)),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ]),
        );
      },
    );
  }
}

// ── Stats row ─────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.totalTrips, required this.rating});
  final int    totalTrips;
  final double rating;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: _StatCard(
        icon: Icons.star_rounded,
        iconColor: AppColors.warning,
        value: rating.toStringAsFixed(1),
        label: 'Đánh giá',
      )),
      const SizedBox(width: 12),
      Expanded(child: _StatCard(
        icon: Icons.check_circle_rounded,
        iconColor: AppColors.success,
        value: '$totalTrips',
        label: 'Tổng chuyến',
      )),
    ]);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.iconColor, required this.value, required this.label});
  final IconData icon;
  final Color    iconColor;
  final String   value;
  final String   label;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(children: [
        Icon(icon, color: iconColor, size: 26),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 22)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ]),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.error_outline, color: AppColors.danger, size: 40),
        const SizedBox(height: 12),
        Text(message, style: const TextStyle(color: AppColors.textSecondary)),
        const SizedBox(height: 16),
        OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
      ]),
    );
  }
}
