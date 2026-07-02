import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../data/models/trip_detail.dart';
import '../../../shared/widgets/app_map.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/trips_provider.dart';

/// Khách theo dõi vị trí tài xế trực tiếp (poll mỗi 8s qua driverLocationProvider).
class LiveTrackingScreen extends ConsumerWidget {
  const LiveTrackingScreen({super.key, required this.tripId});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(tripDetailProvider(tripId));
    final locAsync    = ref.watch(driverLocationProvider(tripId));

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Theo dõi tài xế'),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(tripDetailProvider(tripId)),
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
        error: (e, _) => const Center(
          child: Text('Không tải được chuyến', style: TextStyle(color: AppColors.textSecondary)),
        ),
        data: (detail) {
          final stops = detail.stops;
          final loc   = locAsync.asData?.value;
          final driverPoint =
              (loc != null && loc.hasLocation) ? LatLng(loc.lat!, loc.lng!) : null;

          final markers = <MapMarkerData>[
            for (final s in stops)
              MapMarkerData(
                point: LatLng(s.lat, s.lng),
                color: s.isPickup ? AppColors.info : AppColors.danger,
                icon:  s.isPickup ? Icons.my_location_rounded : Icons.flag_rounded,
              ),
            if (driverPoint != null)
              MapMarkerData(
                point: driverPoint,
                color: AppColors.success,
                icon:  Icons.directions_car_rounded,
                label: 'Tài xế',
              ),
          ];

          return Column(children: [
            Expanded(
              child: AppMap(
                height: double.infinity,
                interactive: true,
                borderRadius: 0,
                markers: markers,
                polyline: [for (final s in stops) LatLng(s.lat, s.lng)],
              ),
            ),
            _StatusBar(detail: detail, loc: loc, waiting: locAsync.isLoading),
          ]);
        },
      ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  const _StatusBar({required this.detail, required this.loc, required this.waiting});
  final TripDetail     detail;
  final DriverLocation? loc;
  final bool           waiting;

  @override
  Widget build(BuildContext context) {
    final driver = detail.trip.driverProfile;
    final hasLoc = loc != null && loc!.hasLocation;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 16)],
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          StatusBadge(detail.trip.status),
          const Spacer(),
          Row(children: [
            Icon(hasLoc ? Icons.gps_fixed_rounded : Icons.gps_off_rounded,
                size: 14, color: hasLoc ? AppColors.success : AppColors.textMuted),
            const SizedBox(width: 5),
            Text(
              hasLoc
                  ? 'Cập nhật ${loc!.updatedAt != null ? AppDate.relative(loc!.updatedAt!) : 'vừa xong'}'
                  : (waiting ? 'Đang lấy vị trí…' : 'Chưa có vị trí tài xế'),
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ]),
        ]),
        if (driver != null) ...[
          const SizedBox(height: 14),
          Row(children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              child: Text(
                (driver.user.fullName ?? 'T')[0].toUpperCase(),
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 18),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(driver.user.fullName ?? 'Tài xế',
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
              Text('${driver.vehicleType} · ${driver.vehiclePlate}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ])),
            IconButton(
              tooltip: 'Gọi tài xế',
              icon: const Icon(Icons.phone_rounded, color: AppColors.success),
              onPressed: driver.user.phone.isEmpty
                  ? null
                  : () => launchUrl(Uri.parse('tel:${driver.user.phone}')),
            ),
          ]),
        ],
      ]),
    );
  }
}
