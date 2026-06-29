import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/repositories/trip_repository.dart';
import '../../../../data/models/trip.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../auth/providers/auth_provider.dart';

final driverTripRepoProvider = Provider<TripRepository>(
  (ref) => TripRepository(ref.read(apiClientProvider)),
);

class _DriverTripsState {
  const _DriverTripsState({this.items = const [], this.total = 0, this.status = '', this.loading = true, this.error = ''});
  final List<Trip> items;
  final int    total;
  final String status;
  final bool   loading;
  final String error;

  _DriverTripsState copyWith({List<Trip>? items, int? total, String? status, bool? loading, String? error}) =>
    _DriverTripsState(items: items ?? this.items, total: total ?? this.total, status: status ?? this.status, loading: loading ?? this.loading, error: error ?? this.error);
}

class _DriverTripsNotifier extends StateNotifier<_DriverTripsState> {
  _DriverTripsNotifier(this._repo) : super(const _DriverTripsState()) { load(); }
  final TripRepository _repo;

  Future<void> load({String? status}) async {
    state = state.copyWith(loading: true, error: '', status: status ?? state.status);
    try {
      final res = await _repo.getDriverTrips(status: state.status);
      state = state.copyWith(items: res.items, total: res.total, loading: false);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Không tải được lịch sử chuyến');
    }
  }

  void setStatus(String s) => load(status: s);
}

final _driverTripsProvider = StateNotifierProvider.autoDispose<_DriverTripsNotifier, _DriverTripsState>(
  (ref) => _DriverTripsNotifier(ref.read(driverTripRepoProvider)),
);

const _statuses = ['', 'ACTIVE', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const _labels = {'': 'Tất cả', 'ACTIVE': 'Đã đặt', 'ONGOING': 'Đang chạy', 'COMPLETED': 'Hoàn thành', 'CANCELLED': 'Đã huỷ'};

class DriverTripsScreen extends ConsumerWidget {
  const DriverTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_driverTripsProvider);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Lịch sử chuyến'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(_driverTripsProvider.notifier).load(),
          ),
        ],
      ),
      body: Column(children: [
        // Filter
        SizedBox(
          height: 52,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: _statuses.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final s = _statuses[i];
              return ChoiceChip(
                label: Text(_labels[s] ?? s),
                selected: state.status == s,
                onSelected: (_) => ref.read(_driverTripsProvider.notifier).setStatus(s),
              );
            },
          ),
        ),

        if (state.error.isNotEmpty)
          _ErrBar(state.error, onRetry: () => ref.read(_driverTripsProvider.notifier).load()),

        Expanded(
          child: state.loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
              : state.items.isEmpty
                  ? _emptyState()
                  : RefreshIndicator(
                      color: AppColors.primary,
                      backgroundColor: AppColors.bgSurface,
                      onRefresh: () => ref.read(_driverTripsProvider.notifier).load(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: state.items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => _TripCard(trip: state.items[i]),
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _emptyState() => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.history_rounded, color: AppColors.textMuted, size: 48),
      SizedBox(height: 12),
      Text('Chưa có chuyến nào', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
    ]),
  );
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip});
  final Trip trip;

  @override
  Widget build(BuildContext context) {
    final cfg = tripStatusConfig(trip.status);
    return AppCard(
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: cfg.bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: cfg.color.withValues(alpha: 0.3))),
          child: Icon(_icon(trip.status), color: cfg.color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: AppColors.bgOverlay, borderRadius: BorderRadius.circular(4)),
              child: Text('#${trip.id.substring(trip.id.length - 8)}',
                style: const TextStyle(fontFamily: 'monospace', color: AppColors.textMuted, fontSize: 11)),
            ),
            const SizedBox(width: 8),
            StatusBadge(trip.status),
          ]),
          const SizedBox(height: 6),
          Row(children: [
            const Icon(Icons.airline_seat_recline_normal_rounded, size: 13, color: AppColors.primary),
            const SizedBox(width: 4),
            Text('${trip.seatsFilled}/${trip.seatsTotal} ghế', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            if (trip.startedAt != null) ...[
              const SizedBox(width: 12),
              const Icon(Icons.play_arrow_rounded, size: 13, color: AppColors.info),
              const SizedBox(width: 4),
              Text(_fmt(trip.startedAt!), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
          ]),
        ])),
        Text(
          '${trip.createdAt.day.toString().padLeft(2,'0')}/${trip.createdAt.month.toString().padLeft(2,'0')}',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ]),
    );
  }

  IconData _icon(String s) => switch(s) {
    'COMPLETED' => Icons.check_circle_outline_rounded,
    'CANCELLED' => Icons.cancel_outlined,
    'ONGOING'   => Icons.directions_car_rounded,
    _           => Icons.schedule_rounded,
  };

  String _fmt(DateTime d) => '${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')} ${d.day}/${d.month}';
}

class _ErrBar extends StatelessWidget {
  const _ErrBar(this.msg, {required this.onRetry});
  final String msg;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.danger.withValues(alpha: 0.3))),
    child: Row(children: [
      const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(msg, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
      TextButton(onPressed: onRetry, child: const Text('Thử lại', style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.w600))),
    ]),
  );
}
