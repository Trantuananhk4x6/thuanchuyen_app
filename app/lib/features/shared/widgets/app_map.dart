import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_theme.dart';

/// Một điểm hiển thị trên bản đồ (pin).
class MapMarkerData {
  const MapMarkerData({
    required this.point,
    required this.color,
    this.icon = Icons.location_on,
    this.label,
  });

  final LatLng    point;
  final Color     color;
  final IconData  icon;
  final String?   label;
}

/// Widget bản đồ tái dùng dựa trên flutter_map + tile CartoDB dark (hợp tông app,
/// không cần API key). Tự fit khung nhìn quanh các điểm; có thể vẽ polyline lộ trình.
///
/// Lưu ý production: nên đổi sang nhà cung cấp tile có hợp đồng (Goong/Mapbox…)
/// vì CartoDB/OSM có giới hạn sử dụng.
class AppMap extends StatelessWidget {
  const AppMap({
    super.key,
    required this.markers,
    this.polyline = const [],
    this.height = 200,
    this.interactive = false,
    this.controller,
    this.borderRadius = 16,
  });

  final List<MapMarkerData> markers;
  final List<LatLng>        polyline;
  final double              height;
  final bool                interactive;
  final MapController?       controller;
  final double              borderRadius;

  static const LatLng _vietnamCenter = LatLng(16.047, 108.206); // Đà Nẵng

  @override
  Widget build(BuildContext context) {
    final pts = markers.map((m) => m.point).toList();

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        height: height,
        child: Stack(children: [
          FlutterMap(
            mapController: controller,
            options: MapOptions(
              initialCenter: pts.isNotEmpty ? pts.first : _vietnamCenter,
              initialZoom: 13,
              initialCameraFit: pts.length > 1
                  ? CameraFit.coordinates(
                      coordinates: pts,
                      padding: const EdgeInsets.all(48),
                      maxZoom: 15,
                    )
                  : null,
              interactionOptions: InteractionOptions(
                flags: interactive
                    ? InteractiveFlag.all & ~InteractiveFlag.rotate
                    : InteractiveFlag.none,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'vn.thuanduong.thuanduong_app',
                retinaMode: RetinaMode.isHighDensity(context),
              ),
              if (polyline.length > 1)
                PolylineLayer(polylines: [
                  Polyline(
                    points: polyline,
                    strokeWidth: 4,
                    color: AppColors.primary.withValues(alpha: 0.9),
                  ),
                ]),
              MarkerLayer(
                markers: [
                  for (final m in markers)
                    Marker(
                      point: m.point,
                      width: 44,
                      height: 44,
                      alignment: Alignment.topCenter,
                      child: _Pin(data: m),
                    ),
                ],
              ),
            ],
          ),
          // Nhãn nguồn tile (yêu cầu attribution của CartoDB/OSM)
          Positioned(
            right: 6,
            bottom: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('© OSM · CARTO',
                  style: TextStyle(color: Colors.white60, fontSize: 8)),
            ),
          ),
        ]),
      ),
    );
  }
}

class _Pin extends StatelessWidget {
  const _Pin({required this.data});
  final MapMarkerData data;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          decoration: BoxDecoration(
            color: data.color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(color: data.color.withValues(alpha: 0.5), blurRadius: 8),
            ],
          ),
          padding: const EdgeInsets.all(5),
          child: Icon(data.icon, color: Colors.white, size: 16),
        ),
        if (data.label != null)
          Container(
            margin: const EdgeInsets.only(top: 2),
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(data.label!,
                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600)),
          ),
      ],
    );
  }
}
