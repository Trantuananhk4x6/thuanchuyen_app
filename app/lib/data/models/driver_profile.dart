class DriverProfileFull {
  const DriverProfileFull({
    required this.id,
    required this.userId,
    required this.vehicleType,
    required this.vehiclePlate,
    required this.seats,
    required this.address,
    required this.verificationStatus,
    required this.isOnline,
    required this.rating,
    required this.totalTrips,
    this.allowCargo = false,
    this.cargoCapacityKg,
    this.rejectReason,
  });

  final String  id;
  final String  userId;
  final String  vehicleType;
  final String  vehiclePlate;
  final int     seats;
  final String  address;
  final String  verificationStatus; // NONE|PENDING|APPROVED|REJECTED
  final bool    isOnline;
  final double  rating;
  final int     totalTrips;
  final bool    allowCargo;
  final double? cargoCapacityKg;
  final String? rejectReason;

  factory DriverProfileFull.fromJson(Map<String, dynamic> j) => DriverProfileFull(
    id:                   j['id'],
    userId:               j['userId'],
    vehicleType:          j['vehicleType']  ?? '',
    vehiclePlate:         j['vehiclePlate'] ?? '',
    seats:                j['seats']        as int? ?? 0,
    address:              j['address']      ?? '',
    verificationStatus:   j['verificationStatus'] ?? 'NONE',
    isOnline:             j['isOnline']     as bool? ?? false,
    rating:               (j['rating']      as num?)?.toDouble() ?? 5.0,
    totalTrips:           j['totalTrips']   as int? ?? 0,
    allowCargo:           j['allowCargo']   as bool? ?? false,
    cargoCapacityKg:      (j['cargoCapacityKg'] as num?)?.toDouble(),
    rejectReason:         j['rejectReason'],
  );

  bool get isApproved => verificationStatus == 'APPROVED';
  bool get isPending  => verificationStatus == 'PENDING';
  bool get isNone     => verificationStatus == 'NONE';
  bool get isRejected => verificationStatus == 'REJECTED';
}
