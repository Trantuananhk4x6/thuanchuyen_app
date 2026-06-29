class QuoteResponse {
  const QuoteResponse({
    required this.quotedPrice,
    required this.distanceKm,
    required this.durationMin,
  });

  final int    quotedPrice;
  final double distanceKm;
  final int    durationMin;

  factory QuoteResponse.fromJson(Map<String, dynamic> j) => QuoteResponse(
    quotedPrice: j['quotedPrice'] as int? ?? 0,
    distanceKm:  (j['distanceKm'] as num?)?.toDouble() ?? 0.0,
    durationMin: j['durationMin'] as int? ?? 0,
  );
}

class TripRequest {
  const TripRequest({
    required this.id,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropoffLat,
    required this.dropoffLng,
    required this.departureTime,
    required this.seats,
    required this.quotedPrice,
    required this.distanceKm,
    required this.durationMin,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
    this.cargoWeightKg,
    this.tripId,
  });

  final String   id;
  final String   pickupAddress;
  final String   dropoffAddress;
  final double   pickupLat;
  final double   pickupLng;
  final double   dropoffLat;
  final double   dropoffLng;
  final DateTime departureTime;
  final int      seats;
  final int      quotedPrice;
  final double   distanceKm;
  final int      durationMin;
  final String   status; // PENDING|MATCHED|CANCELLED|EXPIRED
  final DateTime expiresAt;
  final DateTime createdAt;
  final double?  cargoWeightKg;
  final String?  tripId;

  factory TripRequest.fromJson(Map<String, dynamic> j) => TripRequest(
    id:             j['id'],
    pickupAddress:  j['pickupAddress']  ?? '',
    dropoffAddress: j['dropoffAddress'] ?? '',
    pickupLat:      (j['pickupLat']  as num).toDouble(),
    pickupLng:      (j['pickupLng']  as num).toDouble(),
    dropoffLat:     (j['dropoffLat'] as num).toDouble(),
    dropoffLng:     (j['dropoffLng'] as num).toDouble(),
    departureTime:  DateTime.parse(j['departureTime']),
    seats:          j['seats']       as int? ?? 1,
    quotedPrice:    j['quotedPrice'] as int? ?? 0,
    distanceKm:     (j['distanceKm'] as num?)?.toDouble() ?? 0.0,
    durationMin:    j['durationMin'] as int? ?? 0,
    status:         j['status']      ?? 'PENDING',
    expiresAt:      DateTime.parse(j['expiresAt']),
    createdAt:      DateTime.parse(j['createdAt']),
    cargoWeightKg:  (j['cargoWeightKg'] as num?)?.toDouble(),
    tripId:         j['tripId'],
  );

  bool get isPending   => status == 'PENDING';
  bool get isMatched   => status == 'MATCHED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isExpired   => status == 'EXPIRED';
}
