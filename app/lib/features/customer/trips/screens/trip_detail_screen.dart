import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/date_format.dart';
import '../../../shared/widgets/app_map.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/trips_provider.dart';

class TripDetailScreen extends ConsumerStatefulWidget {
  const TripDetailScreen({super.key, required this.tripId});
  final String tripId;

  @override
  ConsumerState<TripDetailScreen> createState() => _TripDetailState();
}

class _TripDetailState extends ConsumerState<TripDetailScreen> {
  int    _hoverStar = 0;
  int    _selectedStar = 0;
  bool   _cancelling = false;
  bool   _rating = false;
  String _cancelErr = '';
  String _ratingErr = '';

  Future<void> _cancelTrip() async {
    setState(() { _cancelling = true; _cancelErr = ''; });
    try {
      await ref.read(tripRepositoryProvider).cancelTrip(widget.tripId);
      ref.invalidate(tripDetailProvider(widget.tripId));
    } catch (e) {
      setState(() => _cancelErr = 'Không thể huỷ chuyến. Thử lại sau.');
    } finally {
      setState(() => _cancelling = false);
    }
  }

  Future<void> _submitRating(int stars) async {
    setState(() { _rating = true; _ratingErr = ''; });
    try {
      await ref.read(tripRepositoryProvider).rateTrip(widget.tripId, stars: stars);
      ref.invalidate(tripDetailProvider(widget.tripId));
    } catch (_) {
      setState(() => _ratingErr = 'Không gửi được đánh giá.');
    } finally {
      setState(() { _rating = false; _selectedStar = 0; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripAsync = ref.watch(tripDetailProvider(widget.tripId));

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(title: const Text('Chi tiết chuyến')),
      body: tripAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
        error: (e, _) => const Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.error_outline, color: AppColors.danger, size: 40),
            SizedBox(height: 12),
            Text('Không tải được chuyến', style: TextStyle(color: AppColors.textSecondary)),
          ]),
        ),
        data: (detail) {
          final trip  = detail.trip;
          final stops = detail.stops;
          return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Status card
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  StatusBadge(trip.status),
                  const Spacer(),
                  Text('#${trip.id.substring(trip.id.length - 8)}',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontFamily: 'monospace')),
                ]),
                if (detail.firstPickup != null && detail.lastDropoff != null) ...[
                  const SizedBox(height: 16),
                  _RouteRow(
                    origin: detail.firstPickup!.address,
                    dest:   detail.lastDropoff!.address,
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 12),

            // Bản đồ lộ trình (các điểm đón/trả)
            if (stops.isNotEmpty) ...[
              AppMap(
                height: 200,
                markers: [
                  for (final s in stops)
                    MapMarkerData(
                      point: LatLng(s.lat, s.lng),
                      color: s.isPickup ? AppColors.info : AppColors.danger,
                      icon:  s.isPickup ? Icons.my_location_rounded : Icons.flag_rounded,
                    ),
                ],
                polyline: [for (final s in stops) LatLng(s.lat, s.lng)],
              ),
              const SizedBox(height: 12),
            ],

            // Theo dõi tài xế (khi chuyến đang chạy)
            if (trip.isOngoing && trip.driverProfile != null) ...[
              ElevatedButton.icon(
                onPressed: () => context.push('/customer/trips/${trip.id}/track'),
                icon: const Icon(Icons.navigation_rounded, size: 18),
                label: const Text('Theo dõi tài xế trực tiếp'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Driver info
            if (trip.driverProfile != null)
              AppCard(
                child: Row(children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                    child: Text(
                      (trip.driverProfile!.user.fullName ?? 'T')[0].toUpperCase(),
                      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 18),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(trip.driverProfile!.user.fullName ?? 'Tài xế',
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
                    Text(trip.driverProfile!.user.phone,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.bgOverlay,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(trip.driverProfile!.vehiclePlate,
                      style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 13)),
                  ),
                ]),
              ),
            const SizedBox(height: 12),

            // Seats
            AppCard(
              child: Row(children: [
                const Icon(Icons.airline_seat_recline_normal_rounded, color: AppColors.primary, size: 20),
                const SizedBox(width: 10),
                const Text('Ghế đã đặt', style: TextStyle(color: AppColors.textSecondary)),
                const Spacer(),
                Text('${trip.seatsFilled} / ${trip.seatsTotal}',
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
              ]),
            ),
            const SizedBox(height: 12),

            // Timestamps
            AppCard(
              child: Column(children: [
                if (trip.startedAt != null)
                  _TimeRow(label: 'Khởi hành', time: trip.startedAt!, icon: Icons.play_arrow_rounded, color: AppColors.info),
                if (trip.completedAt != null)
                  _TimeRow(label: 'Hoàn thành', time: trip.completedAt!, icon: Icons.check_circle_rounded, color: AppColors.success),
                _TimeRow(label: 'Đặt lúc', time: trip.createdAt, icon: Icons.access_time_rounded, color: AppColors.textMuted),
              ]),
            ),

            // Cancel error
            if (_cancelErr.isNotEmpty) ...[
              const SizedBox(height: 12),
              _ErrorBox(_cancelErr),
            ],

            // Cancel button
            if (trip.canCancel) ...[
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _cancelling ? null : _cancelTrip,
                icon: _cancelling
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.cancel_outlined, size: 18),
                label: Text(_cancelling ? 'Đang huỷ...' : 'Huỷ chuyến'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.danger),
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
            ],

            // Rating (only when completed)
            if (trip.isCompleted) ...[
              const SizedBox(height: 20),
              AppCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Đánh giá chuyến đi',
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (i) {
                      final star = i + 1;
                      return GestureDetector(
                        onTap: () { setState(() => _selectedStar = star); _submitRating(star); },
                        child: MouseRegion(
                          onEnter: (_) => setState(() => _hoverStar = star),
                          onExit:  (_) => setState(() => _hoverStar = 0),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(
                              Icons.star_rounded,
                              size: 36,
                              color: star <= (_hoverStar > 0 ? _hoverStar : _selectedStar)
                                  ? AppColors.warning
                                  : AppColors.borderMedium,
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  if (_rating) ...[
                    const SizedBox(height: 8),
                    const Center(child: SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))),
                  ],
                  if (_ratingErr.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _ErrorBox(_ratingErr),
                  ],
                ]),
              ),
            ],
          ],
          );
        },
      ),
    );
  }
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.origin, required this.dest});
  final String origin;
  final String dest;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Column(children: [
        Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppColors.info, shape: BoxShape.circle)),
        Container(width: 2, height: 32, color: AppColors.borderMedium),
        Container(width: 10, height: 10, decoration: const BoxDecoration(
          color: AppColors.danger, shape: BoxShape.circle,
        )),
      ]),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(origin, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
        const SizedBox(height: 22),
        Text(dest, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
      ])),
    ]);
  }
}

class _TimeRow extends StatelessWidget {
  const _TimeRow({required this.label, required this.time, required this.icon, required this.color});
  final String   label;
  final DateTime time;
  final IconData icon;
  final Color    color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const Spacer(),
        Text(
          AppDate.dateTime(time),
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
        ),
      ]),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
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
