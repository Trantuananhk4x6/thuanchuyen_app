/// Trạng thái hồ sơ KYC của tài xế (GET /driver/kyc).
class KycDocumentDto {
  const KycDocumentDto({required this.id, required this.type, this.path, this.url});
  final String id;
  final String type;
  final String? path; // path trong private bucket (để nộp lại)
  final String? url;  // signed URL ngắn hạn (để hiển thị)

  factory KycDocumentDto.fromJson(Map<String, dynamic> j) => KycDocumentDto(
        id: j['id']?.toString() ?? '',
        type: j['type']?.toString() ?? '',
        path: j['path']?.toString(),
        url: j['url']?.toString(),
      );
}

/// Kết quả upload 1 ảnh KYC: path lưu vào hồ sơ, url để xem trước.
class KycUploadResult {
  const KycUploadResult({required this.path, this.url});
  final String path;
  final String? url;

  factory KycUploadResult.fromJson(Map<String, dynamic> j) => KycUploadResult(
        path: j['path']?.toString() ?? '',
        url: j['url']?.toString(),
      );
}

class KycStatus {
  const KycStatus({
    required this.verificationStatus,
    this.rejectReason,
    this.vehicleType = 'CAR',
    this.vehiclePlate = '',
    this.seats = 4,
    this.cccdNumber = '',
    this.address = '',
    this.allowCargo = false,
    this.cargoCapacityKg,
    this.documents = const [],
  });

  final String verificationStatus; // NONE | PENDING | APPROVED | REJECTED
  final String? rejectReason;
  final String vehicleType;
  final String vehiclePlate;
  final int seats;
  final String cccdNumber;
  final String address;
  final bool allowCargo;
  final double? cargoCapacityKg;
  final List<KycDocumentDto> documents;

  bool get isNone => verificationStatus == 'NONE';
  bool get isPending => verificationStatus == 'PENDING';
  bool get isApproved => verificationStatus == 'APPROVED';
  bool get isRejected => verificationStatus == 'REJECTED';
  bool get canEdit => isNone || isRejected;

  factory KycStatus.fromJson(Map<String, dynamic> j) => KycStatus(
        verificationStatus: j['verificationStatus']?.toString() ?? 'NONE',
        rejectReason: j['rejectReason']?.toString(),
        vehicleType: j['vehicleType']?.toString() ?? 'CAR',
        vehiclePlate: j['vehiclePlate']?.toString() ?? '',
        seats: (j['seats'] as num?)?.toInt() ?? 4,
        cccdNumber: j['cccdNumber']?.toString() ?? '',
        address: j['address']?.toString() ?? '',
        allowCargo: j['allowCargo'] as bool? ?? false,
        cargoCapacityKg: (j['cargoCapacityKg'] as num?)?.toDouble(),
        documents: ((j['documents'] as List?) ?? [])
            .map((e) => KycDocumentDto.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
