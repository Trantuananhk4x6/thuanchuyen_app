import 'trip.dart';
import 'trip_stop.dart';

/// Phản hồi của GET /customer/trips/{id} — gồm trip + danh sách điểm dừng (stops).
/// Toạ độ thật của chuyến nằm ở [stops] (PICKUP/DROPOFF), KHÔNG ở trip.route.
class TripDetail {
  const TripDetail({
    required this.trip,
    required this.stops,
    this.myPickupOrder,
    this.currentStopIndex,
  });

  final Trip            trip;
  final List<TripStop>  stops;
  final int?            myPickupOrder;
  final int?            currentStopIndex;

  factory TripDetail.fromJson(Map<String, dynamic> j) => TripDetail(
    trip: Trip.fromJson(j['trip'] as Map<String, dynamic>),
    stops: (j['stops'] as List? ?? const [])
        .map((e) => TripStop.fromJson(e as Map<String, dynamic>))
        .toList(),
    myPickupOrder:    j['myPickupOrder']    as int?,
    currentStopIndex: j['currentStopIndex'] as int?,
  );

  List<TripStop> get pickups  => stops.where((s) => s.isPickup).toList();
  List<TripStop> get dropoffs => stops.where((s) => s.isDropoff).toList();
  TripStop? get firstPickup => pickups.isNotEmpty  ? pickups.first  : null;
  TripStop? get lastDropoff => dropoffs.isNotEmpty ? dropoffs.last  : null;
}

/// Phản hồi của GET /customer/trips/{id}/driver-location (poll vị trí tài xế).
class DriverLocation {
  const DriverLocation({required this.status, this.lat, this.lng, this.updatedAt});

  final String     status;
  final double?    lat;
  final double?    lng;
  final DateTime?  updatedAt;

  bool get hasLocation => lat != null && lng != null;

  factory DriverLocation.fromJson(Map<String, dynamic> j) {
    final loc = j['location'] as Map<String, dynamic>?;
    return DriverLocation(
      status: j['status'] ?? '',
      lat: loc != null ? (loc['lat'] as num?)?.toDouble() : null,
      lng: loc != null ? (loc['lng'] as num?)?.toDouble() : null,
      updatedAt: loc != null && loc['updatedAt'] != null
          ? DateTime.tryParse(loc['updatedAt'].toString())
          : null,
    );
  }
}
