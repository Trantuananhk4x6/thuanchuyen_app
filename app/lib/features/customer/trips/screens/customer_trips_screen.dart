import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/trip.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/trips_provider.dart';

const _statuses = ['', 'PENDING', 'ACTIVE', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const _statusLabels = {
  '': 'Tất cả',
  'PENDING':   'Chờ',
  'ACTIVE':    'Đã xác nhận',
  'ONGOING':   'Đang chạy',
  'COMPLETED': 'Hoàn thành',
  'CANCELLED': 'Đã huỷ',
};

class CustomerTripsScreen extends ConsumerWidget {
  const CustomerTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customerTripsProvider);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Chuyến của tôi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(customerTripsProvider.notifier).load(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          SizedBox(
            height: 52,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _statuses.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final s = _statuses[i];
                final active = state.status == s;
                return ChoiceChip(
                  label: Text(_statusLabels[s] ?? s),
                  selected: active,
                  onSelected: (_) => ref.read(customerTripsProvider.notifier).setStatus(s),
                );
              },
            ),
          ),

          if (state.error.isNotEmpty)
            _ErrorBar(message: state.error, onRetry: () => ref.read(customerTripsProvider.notifier).load()),

          Expanded(
            child: state.loading
                ? const _Loading()
                : state.items.isEmpty
                    ? const _Empty()
                    : RefreshIndicator(
                        color: AppColors.primary,
                        backgroundColor: AppColors.bgSurface,
                        onRefresh: () => ref.read(customerTripsProvider.notifier).load(),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: state.items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) => _TripCard(trip: state.items[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip});
  final Trip trip;

  @override
  Widget build(BuildContext context) {
    final cfg = tripStatusConfig(trip.status);

    return AppCard(
      onTap: () => context.push('/customer/trips/${trip.id}'),
      child: Row(children: [
        // Status icon
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: cfg.bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cfg.color.withValues(alpha: 0.3)),
          ),
          child: Icon(_statusIcon(trip.status), color: cfg.color, size: 20),
        ),
        const SizedBox(width: 12),

        // Info
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text(
                  trip.driverProfile?.user.fullName ?? 'Tài xế',
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              if (trip.driverProfile != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.bgOverlay,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    trip.driverProfile!.vehiclePlate,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontFamily: 'monospace'),
                  ),
                ),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.directions_car_outlined, size: 12, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text(trip.driverProfile?.vehicleType ?? '—', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              const SizedBox(width: 12),
              const Icon(Icons.access_time_rounded, size: 12, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text(
                _formatDate(trip.createdAt),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
            ]),
          ]),
        ),

        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          StatusBadge(trip.status),
          const SizedBox(height: 4),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
        ]),
      ]),
    );
  }

  IconData _statusIcon(String s) {
    return switch (s) {
      'COMPLETED' => Icons.check_circle_outline_rounded,
      'CANCELLED' => Icons.cancel_outlined,
      'ONGOING'   => Icons.directions_car_rounded,
      _           => Icons.schedule_rounded,
    };
  }

  String _formatDate(DateTime d) {
    return '${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')} '
        '${d.day.toString().padLeft(2,'0')}/${d.month.toString().padLeft(2,'0')}';
  }
}

class _ErrorBar extends StatelessWidget {
  const _ErrorBar({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
        const SizedBox(width: 8),
        Expanded(child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
        TextButton(
          onPressed: onRetry,
          child: const Text('Thử lại', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600, fontSize: 12)),
        ),
      ]),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();
  @override
  Widget build(BuildContext context) => const Center(
    child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
  );
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 72, height: 72,
        decoration: BoxDecoration(
          color: AppColors.bgOverlay,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: const Icon(Icons.directions_car_outlined, color: AppColors.textMuted, size: 32),
      ),
      const SizedBox(height: 16),
      const Text('Chưa có chuyến nào', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      const Text('Đặt chuyến đầu tiên của bạn!', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
    ]),
  );
}
