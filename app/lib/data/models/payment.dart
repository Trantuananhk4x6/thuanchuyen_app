class Payment {
  const Payment({
    required this.id,
    required this.tripId,
    required this.customerId,
    required this.amount,
    required this.gateway,
    required this.status,
    required this.createdAt,
    this.paymentUrl,
    this.providerRef,
    this.paidAt,
    this.refundedAt,
    this.refundAmount,
  });

  final String   id;
  final String   tripId;
  final String   customerId;
  final int      amount;       // VND integer
  final String   gateway;     // PAYOS | WALLET
  final String   status;      // PENDING | PAID | FAILED | REFUNDED
  final DateTime createdAt;
  final String?  paymentUrl;
  final String?  providerRef;
  final DateTime? paidAt;
  final DateTime? refundedAt;
  final int?     refundAmount;

  factory Payment.fromJson(Map<String, dynamic> j) => Payment(
    id:           j['id'],
    tripId:       j['tripId'],
    customerId:   j['customerId'],
    amount:       j['amount']  as int? ?? 0,
    gateway:      j['gateway'] ?? 'PAYOS',
    status:       j['status']  ?? 'PENDING',
    createdAt:    DateTime.parse(j['createdAt']),
    paymentUrl:   j['paymentUrl'],
    providerRef:  j['providerRef'],
    paidAt:       j['paidAt']      != null ? DateTime.parse(j['paidAt'])      : null,
    refundedAt:   j['refundedAt']  != null ? DateTime.parse(j['refundedAt'])  : null,
    refundAmount: j['refundAmount'] as int?,
  );

  bool get isPaid     => status == 'PAID';
  bool get isPending  => status == 'PENDING';
  bool get isRefunded => status == 'REFUNDED';
}
