class TripStop {
  const TripStop({
    required this.id,
    required this.tripId,
    required this.passengerId,
    required this.order,
    required this.type,
    required this.address,
    required this.lat,
    required this.lng,
    required this.status,
    this.etaAt,
    this.doneAt,
  });

  final String   id;
  final String   tripId;
  final String   passengerId;
  final int      order;
  final String   type;    // PICKUP | DROPOFF
  final String   address;
  final double   lat;
  final double   lng;
  final String   status;  // PENDING | DONE | SKIPPED
  final DateTime? etaAt;
  final DateTime? doneAt;

  factory TripStop.fromJson(Map<String, dynamic> j) => TripStop(
    id:          j['id'],
    tripId:      j['tripId']      ?? '',
    passengerId: j['passengerId'] ?? '',
    order:       j['order']       as int? ?? 0,
    type:        j['type']        ?? 'PICKUP',
    address:     j['address']     ?? '',
    lat:         (j['lat'] as num).toDouble(),
    lng:         (j['lng'] as num).toDouble(),
    status:      j['status']      ?? 'PENDING',
    etaAt:  j['etaAt']  != null ? DateTime.parse(j['etaAt'])  : null,
    doneAt: j['doneAt'] != null ? DateTime.parse(j['doneAt']) : null,
  );

  bool get isPending  => status == 'PENDING';
  bool get isDone     => status == 'DONE';
  bool get isSkipped  => status == 'SKIPPED';
  bool get isPickup   => type == 'PICKUP';
  bool get isDropoff  => type == 'DROPOFF';
}
