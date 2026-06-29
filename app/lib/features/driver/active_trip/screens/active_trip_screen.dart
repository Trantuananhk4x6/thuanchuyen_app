import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/trip.dart';
import '../../../../data/models/trip_stop.dart';
import '../../../../data/repositories/driver_repository.dart';
import '../../../../features/shared/widgets/status_badge.dart';
import '../../dashboard/screens/driver_dashboard_screen.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class _ActiveTripState {
  const _ActiveTripState({
    this.trip,
    this.stops       = const [],
    this.loading     = true,
    this.error       = '',
    this.actionError = '',
  });
  final Trip?       trip;
  final List<TripStop> stops;
  final bool        loading;
  final String      error;
  final String      actionError;

  _ActiveTripState copyWith({
    Trip? trip, List<TripStop>? stops, bool? loading,
    String? error, String? actionError,
  }) => _ActiveTripState(
    trip:        trip        ?? this.trip,
    stops:       stops       ?? this.stops,
    loading:     loading     ?? this.loading,
    error:       error       ?? this.error,
    actionError: actionError ?? this.actionError,
  );
}

class _ActiveTripNotifier extends StateNotifier<_ActiveTripState> {
  _ActiveTripNotifier(this._repo) : super(const _ActiveTripState()) { load(); }
  final DriverRepository _repo;
  Timer? _locationTimer;

  Future<void> load() async {
    state = state.copyWith(loading: true, error: '');
    try {
      final trip = await _repo.getActiveTrip();
      if (trip == null) {
        state = state.copyWith(loading: false, trip: null, stops: []);
        return;
      }
      final stops = await _repo.getTripStops(trip.id);
      stops.sort((a, b) => a.order.compareTo(b.order));
      state = state.copyWith(trip: trip, stops: stops, loading: false);
      if (trip.isOngoing) _startLocationUpdates(trip.id);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Không tải được chuyến đang chạy');
    }
  }

  void _startLocationUpdates(String tripId) {
    _locationTimer?.cancel();
    _pushLocation(tripId); // immediate push on start
    _locationTimer = Timer.periodic(const Duration(seconds: 6), (_) => _pushLocation(tripId));
  }

  Future<void> _pushLocation(String tripId) async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      await _repo.updateLocation(tripId, lat: pos.latitude, lng: pos.longitude);
    } catch (_) {}
  }

  Future<void> startTrip() async {
    final trip = state.trip;
    if (trip == null) return;
    state = state.copyWith(actionError: '');
    try {
      await _repo.startTrip(trip.id);
      await load();
    } on ApiException catch (e) {
      state = state.copyWith(actionError: e.message);
    } catch (_) {
      state = state.copyWith(actionError: 'Không thể bắt đầu chuyến. Thử lại.');
    }
  }

  Future<void> completeStop(String stopId) async {
    final trip = state.trip;
    if (trip == null) return;
    state = state.copyWith(actionError: '');
    try {
      await _repo.completeStop(trip.id, stopId);
      await load();
    } on ApiException catch (e) {
      state = state.copyWith(actionError: e.message);
    } catch (_) {
      state = state.copyWith(actionError: 'Không thể cập nhật điểm dừng. Thử lại.');
    }
  }

  Future<void> noShowStop(String stopId) async {
    final trip = state.trip;
    if (trip == null) return;
    state = state.copyWith(actionError: '');
    try {
      await _repo.noShowStop(trip.id, stopId);
      await load();
    } on ApiException catch (e) {
      state = state.copyWith(actionError: e.message);
    } catch (_) {
      state = state.copyWith(actionError: 'Không thể đánh dấu. Thử lại.');
    }
  }

  Future<void> completeTrip() async {
    final trip = state.trip;
    if (trip == null) return;
    state = state.copyWith(actionError: '');
    try {
      await _repo.completeTrip(trip.id);
      _locationTimer?.cancel();
      await load();
    } on ApiException catch (e) {
      state = state.copyWith(actionError: e.message);
    } catch (_) {
      state = state.copyWith(actionError: 'Không thể hoàn thành chuyến. Thử lại.');
    }
  }

  @override
  void dispose() { _locationTimer?.cancel(); super.dispose(); }
}

final activeTripProvider = StateNotifierProvider.autoDispose<_ActiveTripNotifier, _ActiveTripState>(
  (ref) => _ActiveTripNotifier(ref.read(driverRepositoryProvider)),
);

// ── Screen ────────────────────────────────────────────────────────────────────

class ActiveTripScreen extends ConsumerWidget {
  const ActiveTripScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activeTripProvider);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Chuyến đang chạy'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(activeTripProvider.notifier).load(),
          ),
        ],
      ),
      body: state.loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
          : state.error.isNotEmpty
              ? _ErrorView(state.error, onRetry: () => ref.read(activeTripProvider.notifier).load())
              : state.trip == null
                  ? _NoTripView()
                  : _TripView(state: state, ref: ref),
    );
  }
}

class _NoTripView extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.directions_car_outlined, color: AppColors.textMuted, size: 56),
      SizedBox(height: 16),
      Text('Không có chuyến đang chạy', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 16)),
      SizedBox(height: 8),
      Text('Chấp nhận yêu cầu để bắt đầu', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
    ]),
  );
}

// ── Trip view ─────────────────────────────────────────────────────────────────

class _TripView extends StatelessWidget {
  const _TripView({required this.state, required this.ref});
  final _ActiveTripState state;
  final WidgetRef        ref;

  @override
  Widget build(BuildContext context) {
    final trip    = state.trip!;
    final stops   = state.stops;
    final pending = stops.where((s) => s.isPending).toList();
    final allDone = stops.isNotEmpty && stops.every((s) => !s.isPending);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Trip status card
        AppCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              StatusBadge(trip.status),
              const Spacer(),
              Text('${trip.seatsFilled}/${trip.seatsTotal} hành khách',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ]),
            if (trip.startedAt != null) ...[
              const SizedBox(height: 8),
              Row(children: [
                const Icon(Icons.play_arrow_rounded, size: 14, color: AppColors.info),
                const SizedBox(width: 4),
                Text(
                  'Khởi hành: ${trip.startedAt!.hour.toString().padLeft(2,'0')}:${trip.startedAt!.minute.toString().padLeft(2,'0')}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
              ]),
            ],
          ]),
        ),
        const SizedBox(height: 12),

        // Action error
        if (state.actionError.isNotEmpty) ...[
          _ErrorBox(state.actionError),
          const SizedBox(height: 12),
        ],

        // Start button (if ACTIVE, not yet ONGOING)
        if (trip.isActive) ...[
          GradientButton(
            label: 'Bắt đầu chuyến',
            icon: Icons.play_arrow_rounded,
            onPressed: () => ref.read(activeTripProvider.notifier).startTrip(),
          ),
          const SizedBox(height: 16),
        ],

        // Stops list
        if (stops.isNotEmpty) ...[
          const Text('Lịch trình điểm dừng',
            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          ...stops.asMap().entries.map((e) => _StopCard(
            stop: e.value,
            isActive: trip.isOngoing && e.value.isPending &&
                (e.key == 0 || stops[e.key - 1].isDone || stops[e.key - 1].isSkipped),
            onComplete: () => ref.read(activeTripProvider.notifier).completeStop(e.value.id),
            onNoShow:   () => ref.read(activeTripProvider.notifier).noShowStop(e.value.id),
          )),
          const SizedBox(height: 16),
        ],

        // Complete trip button
        if (trip.isOngoing && allDone) ...[
          GradientButton(
            label: 'Hoàn thành chuyến',
            icon: Icons.check_circle_outline_rounded,
            onPressed: () => _confirmComplete(context, ref),
          ),
        ],
      ],
    );
  }

  void _confirmComplete(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        title: const Text('Hoàn thành chuyến?', style: TextStyle(color: AppColors.textPrimary)),
        content: const Text('Xác nhận tất cả hành khách đã được trả về điểm đến.',
          style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Huỷ', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(activeTripProvider.notifier).completeTrip();
            },
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
  }
}

// ── Stop card ─────────────────────────────────────────────────────────────────

class _StopCard extends StatefulWidget {
  const _StopCard({
    required this.stop,
    required this.isActive,
    required this.onComplete,
    required this.onNoShow,
  });
  final TripStop     stop;
  final bool         isActive;
  final VoidCallback onComplete;
  final VoidCallback onNoShow;

  @override
  State<_StopCard> createState() => _StopCardState();
}

class _StopCardState extends State<_StopCard> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final s = widget.stop;

    final (statusColor, statusBg, statusLabel) = switch (s.status) {
      'DONE'    => (AppColors.success, const Color(0x1F34D399), 'Hoàn thành'),
      'SKIPPED' => (AppColors.textMuted, AppColors.bgOverlay, 'Bỏ qua'),
      _         => (widget.isActive ? AppColors.primary : AppColors.textMuted,
                    widget.isActive ? const Color(0x1F6366F1) : AppColors.bgOverlay,
                    widget.isActive ? 'Hiện tại' : 'Chờ'),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: widget.isActive ? AppColors.primary.withValues(alpha: 0.4) : AppColors.borderSubtle,
          width: widget.isActive ? 1.5 : 1,
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: s.isPickup ? AppColors.info.withValues(alpha: 0.1) : AppColors.danger.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(
                s.isPickup ? Icons.arrow_circle_up_rounded : Icons.arrow_circle_down_rounded,
                size: 13,
                color: s.isPickup ? AppColors.info : AppColors.danger,
              ),
              const SizedBox(width: 4),
              Text(
                s.isPickup ? 'ĐÓN' : 'TRẢ',
                style: TextStyle(
                  color: s.isPickup ? AppColors.info : AppColors.danger,
                  fontSize: 11, fontWeight: FontWeight.w700,
                ),
              ),
            ]),
          ),
          const SizedBox(width: 8),
          Text('Điểm ${s.order + 1}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(99)),
            child: Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
        ]),
        const SizedBox(height: 8),
        Text(s.address,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),

        if (s.etaAt != null) ...[
          const SizedBox(height: 4),
          Text(
            'ETA: ${s.etaAt!.hour.toString().padLeft(2,'0')}:${s.etaAt!.minute.toString().padLeft(2,'0')}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],

        if (widget.isActive && s.isPending) ...[
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _loading ? null : () async {
                  setState(() => _loading = true);
                  widget.onNoShow();
                  if (mounted) setState(() => _loading = false);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.warning,
                  side: const BorderSide(color: AppColors.warning),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: const Text('Không có mặt', style: TextStyle(fontSize: 12)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _loading ? null : () async {
                  setState(() => _loading = true);
                  widget.onComplete();
                  if (mounted) setState(() => _loading = false);
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: _loading
                    ? const SizedBox(width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(s.isPickup ? 'Đã đón' : 'Đã trả',
                        style: const TextStyle(fontSize: 12)),
              ),
            ),
          ]),
        ],
      ]),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView(this.message, {required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.error_outline, color: AppColors.danger, size: 40),
      const SizedBox(height: 12),
      Text(message, style: const TextStyle(color: AppColors.textSecondary)),
      const SizedBox(height: 16),
      OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
    ]),
  );
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.danger.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
    ),
    child: Row(children: [
      const Icon(Icons.error_outline, color: AppColors.danger, size: 15),
      const SizedBox(width: 8),
      Expanded(child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 12))),
    ]),
  );
}
