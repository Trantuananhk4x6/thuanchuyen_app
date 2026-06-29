class TripMatch {
  const TripMatch({
    required this.id,
    required this.requestId,
    required this.driverProfileId,
    required this.fareShare,
    required this.driverNet,
    required this.detourKm,
    required this.status,
    required this.offeredAt,
    required this.expiresAt,
    this.respondedAt,
    this.driverProfile,
    this.request,
  });

  final String     id;
  final String     requestId;
  final String     driverProfileId;
  final int        fareShare;
  final int        driverNet;
  final double     detourKm;
  final String     status; // OFFERED|ACCEPTED|REJECTED|EXPIRED
  final DateTime   offeredAt;
  final DateTime   expiresAt;
  final DateTime?  respondedAt;
  final MatchDriver? driverProfile;
  final MatchRequest? request;

  factory TripMatch.fromJson(Map<String, dynamic> j) => TripMatch(
    id:              j['id'],
    requestId:       j['requestId'],
    driverProfileId: j['driverProfileId'],
    fareShare:       j['fareShare']  as int? ?? 0,
    driverNet:       j['driverNet']  as int? ?? 0,
    detourKm:        (j['detourKm']  as num?)?.toDouble() ?? 0.0,
    status:          j['status']     ?? 'OFFERED',
    offeredAt:       DateTime.parse(j['offeredAt']),
    expiresAt:       DateTime.parse(j['expiresAt']),
    respondedAt:     j['respondedAt'] != null ? DateTime.parse(j['respondedAt']) : null,
    driverProfile:   j['driverProfile'] != null
        ? MatchDriver.fromJson(j['driverProfile'] as Map<String, dynamic>)
        : null,
    request: j['request'] != null
        ? MatchRequest.fromJson(j['request'] as Map<String, dynamic>)
        : null,
  );

  bool get isOffered  => status == 'OFFERED';
  bool get isAccepted => status == 'ACCEPTED';

  Duration get timeLeft {
    final left = expiresAt.difference(DateTime.now());
    return left.isNegative ? Duration.zero : left;
  }
}

class MatchDriver {
  const MatchDriver({
    required this.vehiclePlate,
    required this.vehicleType,
    required this.seats,
    required this.rating,
    required this.totalTrips,
    required this.user,
  });

  final String   vehiclePlate;
  final String   vehicleType;
  final int      seats;
  final double   rating;
  final int      totalTrips;
  final MatchUser user;

  factory MatchDriver.fromJson(Map<String, dynamic> j) => MatchDriver(
    vehiclePlate: j['vehiclePlate'] ?? '',
    vehicleType:  j['vehicleType']  ?? '',
    seats:        j['seats']        as int? ?? 0,
    rating:       (j['rating']      as num?)?.toDouble() ?? 5.0,
    totalTrips:   j['totalTrips']   as int? ?? 0,
    user: MatchUser.fromJson(j['user'] as Map<String, dynamic>),
  );
}

class MatchRequest {
  const MatchRequest({
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.seats,
    required this.departureTime,
  });

  final String   pickupAddress;
  final String   dropoffAddress;
  final int      seats;
  final DateTime departureTime;

  factory MatchRequest.fromJson(Map<String, dynamic> j) => MatchRequest(
    pickupAddress:  j['pickupAddress']  ?? '',
    dropoffAddress: j['dropoffAddress'] ?? '',
    seats:          j['seats']          as int? ?? 1,
    departureTime:  DateTime.parse(j['departureTime']),
  );
}

class MatchUser {
  const MatchUser({required this.phone, this.fullName, this.avatarUrl});
  final String  phone;
  final String? fullName;
  final String? avatarUrl;

  factory MatchUser.fromJson(Map<String, dynamic> j) => MatchUser(
    phone:     j['phone']     ?? '',
    fullName:  j['fullName'],
    avatarUrl: j['avatarUrl'],
  );
}
