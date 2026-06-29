class DriverWallet {
  const DriverWallet({
    required this.id,
    required this.withdrawableBalance,
    required this.pendingBalance,
    this.transactions = const [],
  });

  final String               id;
  final int                  withdrawableBalance;
  final int                  pendingBalance;
  final List<WalletTransaction> transactions;

  factory DriverWallet.fromJson(Map<String, dynamic> j) => DriverWallet(
    id:                   j['id'],
    withdrawableBalance:  j['withdrawableBalance'] as int? ?? 0,
    pendingBalance:       j['pendingBalance']      as int? ?? 0,
    transactions: j['transactions'] != null
        ? (j['transactions'] as List)
            .map((e) => WalletTransaction.fromJson(e as Map<String, dynamic>))
            .toList()
        : [],
  );

  int get totalBalance => withdrawableBalance + pendingBalance;
}

class WalletTransaction {
  const WalletTransaction({
    required this.id,
    required this.amount,
    required this.type,
    required this.description,
    required this.createdAt,
    this.availableAt,
    this.tripId,
  });

  final String   id;
  final int      amount;
  final String   type; // TRIP_CREDIT | WITHDRAWAL | ADJUSTMENT | RELEASE | REFUND
  final String   description;
  final DateTime createdAt;
  final DateTime? availableAt;
  final String?  tripId;

  factory WalletTransaction.fromJson(Map<String, dynamic> j) => WalletTransaction(
    id:          j['id'],
    amount:      j['amount']      as int? ?? 0,
    type:        j['type']        ?? '',
    description: j['description'] ?? '',
    createdAt:   DateTime.parse(j['createdAt']),
    availableAt: j['availableAt'] != null ? DateTime.parse(j['availableAt']) : null,
    tripId:      j['tripId'],
  );

  bool get isCredit =>
      type == 'TRIP_CREDIT' || type == 'RELEASE' || type == 'REFUND' || type == 'ADJUSTMENT';
  bool get isDebit  => type == 'WITHDRAWAL';
}

class WithdrawalRequest {
  const WithdrawalRequest({
    required this.id,
    required this.amount,
    required this.bankName,
    required this.bankAccountNo,
    required this.bankAccountName,
    required this.status,
    required this.createdAt,
    this.adminNote,
    this.processedAt,
  });

  final String   id;
  final int      amount;
  final String   bankName;
  final String   bankAccountNo;
  final String   bankAccountName;
  final String   status; // PENDING|APPROVED|REJECTED|PROCESSING|DONE
  final DateTime createdAt;
  final String?  adminNote;
  final DateTime? processedAt;

  factory WithdrawalRequest.fromJson(Map<String, dynamic> j) => WithdrawalRequest(
    id:              j['id'],
    amount:          j['amount']          as int? ?? 0,
    bankName:        j['bankName']        ?? '',
    bankAccountNo:   j['bankAccountNo']   ?? '',
    bankAccountName: j['bankAccountName'] ?? '',
    status:          j['status']          ?? 'PENDING',
    createdAt:       DateTime.parse(j['createdAt']),
    adminNote:       j['adminNote'],
    processedAt:     j['processedAt'] != null ? DateTime.parse(j['processedAt']) : null,
  );

  bool get isPending  => status == 'PENDING';
  bool get isDone     => status == 'DONE';
  bool get isRejected => status == 'REJECTED';
}
