class Trip {
  const Trip({
    required this.id,
    required this.status,
    required this.seatsTotal,
    required this.seatsFilled,
    required this.createdAt,
    this.startedAt,
    this.completedAt,
    this.driverProfile,
    this.route,
  });

  final String       id;
  final String       status;     // PENDING | ACTIVE | ONGOING | COMPLETED | CANCELLED
  final int          seatsTotal;
  final int          seatsFilled;
  final DateTime     createdAt;
  final DateTime?    startedAt;
  final DateTime?    completedAt;
  final TripDriver?  driverProfile;
  final TripRoute?   route;

  factory Trip.fromJson(Map<String, dynamic> j) => Trip(
    id:           j['id'],
    status:       j['status'],
    seatsTotal:   j['seatsTotal'] ?? 0,
    seatsFilled:  j['seatsFilled'] ?? 0,
    createdAt:    DateTime.parse(j['createdAt']),
    startedAt:    j['startedAt']   != null ? DateTime.parse(j['startedAt'])   : null,
    completedAt:  j['completedAt'] != null ? DateTime.parse(j['completedAt']) : null,
    driverProfile: j['driverProfile'] != null
        ? TripDriver.fromJson(j['driverProfile'] as Map<String, dynamic>)
        : null,
    route: j['route'] != null ? TripRoute.fromJson(j['route'] as Map<String, dynamic>) : null,
  );

  bool get isPending   => status == 'PENDING';
  bool get isActive    => status == 'ACTIVE';
  bool get isOngoing   => status == 'ONGOING';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';
  bool get canCancel   => isPending || isActive;
}

class TripDriver {
  const TripDriver({
    required this.vehiclePlate,
    required this.vehicleType,
    required this.user,
  });

  final String     vehiclePlate;
  final String     vehicleType;
  final TripUser   user;

  factory TripDriver.fromJson(Map<String, dynamic> j) => TripDriver(
    vehiclePlate: j['vehiclePlate'] ?? '',
    vehicleType:  j['vehicleType']  ?? '',
    user: TripUser.fromJson(j['user'] as Map<String, dynamic>),
  );
}

class TripUser {
  const TripUser({required this.phone, this.fullName, this.avatarUrl});
  final String  phone;
  final String? fullName;
  final String? avatarUrl;

  factory TripUser.fromJson(Map<String, dynamic> j) => TripUser(
    phone:     j['phone']     ?? '',
    fullName:  j['fullName'],
    avatarUrl: j['avatarUrl'],
  );
}

class TripRoute {
  const TripRoute({
    required this.originName,
    required this.destName,
    required this.originLat,
    required this.originLng,
    required this.destLat,
    required this.destLng,
  });

  final String originName;
  final String destName;
  final double originLat;
  final double originLng;
  final double destLat;
  final double destLng;

  factory TripRoute.fromJson(Map<String, dynamic> j) => TripRoute(
    originName: j['originName'] ?? '',
    destName:   j['destName']   ?? '',
    originLat:  (j['originLat'] as num).toDouble(),
    originLng:  (j['originLng'] as num).toDouble(),
    destLat:    (j['destLat']   as num).toDouble(),
    destLng:    (j['destLng']   as num).toDouble(),
  );
}

class TripListResponse {
  const TripListResponse({required this.items, required this.total});
  final List<Trip> items;
  final int        total;

  factory TripListResponse.fromJson(Map<String, dynamic> j) => TripListResponse(
    items: (j['items'] as List).map((e) => Trip.fromJson(e as Map<String, dynamic>)).toList(),
    total: j['total'] ?? 0,
  );
}
