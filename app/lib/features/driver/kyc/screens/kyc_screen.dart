import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/kyc_status.dart';
import '../../../../features/shared/widgets/status_badge.dart';
import '../../dashboard/screens/driver_dashboard_screen.dart';

// ── Doc slots ───────────────────────────────────────────────────────────────────

class _DocSlot {
  const _DocSlot({required this.type, required this.label, required this.hint, required this.icon, this.selfie = false});
  final String   type;
  final String   label;
  final String   hint;
  final IconData icon;
  final bool     selfie;
}

const _docSlots = [
  _DocSlot(type: 'CCCD_FRONT', label: 'CCCD mặt trước', hint: 'Chụp thẳng, thấy đủ 4 góc, rõ số và ảnh.', icon: Icons.credit_card_rounded),
  _DocSlot(type: 'CCCD_BACK', label: 'CCCD mặt sau', hint: 'Rõ đặc điểm nhận dạng và ngày cấp.', icon: Icons.credit_card_off_rounded),
  _DocSlot(type: 'DRIVER_LICENSE', label: 'Giấy phép lái xe', hint: 'Bằng còn hạn, đúng hạng xe đăng ký.', icon: Icons.drive_eta_outlined),
  _DocSlot(type: 'VEHICLE_REGISTRATION', label: 'Đăng ký xe (cà vẹt)', hint: 'Thông tin xe khớp biển số đã khai.', icon: Icons.article_outlined),
  _DocSlot(type: 'SELFIE', label: 'Ảnh chân dung (selfie)', hint: 'Khuôn mặt rõ, đủ sáng, không kính/khẩu trang.', icon: Icons.face_outlined, selfie: true),
];

const _vehicleTypes = [
  ('CAR', 'Ô tô', Icons.directions_car_rounded),
  ('VAN', 'Xe van', Icons.airport_shuttle_rounded),
  ('TRUCK', 'Xe tải', Icons.local_shipping_rounded),
];

final _plateRe = RegExp(r'^[A-Z0-9\-\.]+$');

class _DocUpload {
  _DocUpload({this.localFile, this.path, this.url, this.uploading = false, this.error});
  File?   localFile;
  String? path; // path trong private bucket — dùng để nộp hồ sơ
  String? url;  // signed URL (xem trước cho ảnh đã nộp trước đó)
  bool    uploading;
  String? error;
  bool get done => path != null;
}

// ── Screen ────────────────────────────────────────────────────────────────────

class KycScreen extends ConsumerStatefulWidget {
  const KycScreen({super.key});

  @override
  ConsumerState<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends ConsumerState<KycScreen> {
  final _plateCtrl   = TextEditingController();
  final _seatsCtrl   = TextEditingController(text: '4');
  final _cccdCtrl    = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _cargoCtrl   = TextEditingController();

  String _vehicleType = 'CAR';
  bool   _allowCargo  = false;

  final Map<String, _DocUpload> _docs = {for (final s in _docSlots) s.type: _DocUpload()};
  final _picker = ImagePicker();

  KycStatus? _kyc;
  bool   _loading    = true;
  bool   _submitting = false;
  bool   _submitted  = false;
  String _error      = '';

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  @override
  void dispose() {
    _plateCtrl.dispose();
    _seatsCtrl.dispose();
    _cccdCtrl.dispose();
    _addressCtrl.dispose();
    _cargoCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStatus() async {
    try {
      final kyc = await ref.read(driverRepositoryProvider).getKyc();
      if (!mounted) return;
      setState(() {
        _kyc = kyc;
        if (kyc != null && kyc.canEdit) _prefill(kyc);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _prefill(KycStatus kyc) {
    _vehicleType = kyc.vehicleType.isNotEmpty ? kyc.vehicleType : 'CAR';
    _plateCtrl.text = kyc.vehiclePlate;
    _seatsCtrl.text = kyc.seats > 0 ? kyc.seats.toString() : '4';
    _cccdCtrl.text = kyc.cccdNumber;
    _addressCtrl.text = kyc.address;
    _allowCargo = kyc.allowCargo;
    if (kyc.cargoCapacityKg != null) _cargoCtrl.text = kyc.cargoCapacityKg!.toStringAsFixed(0);
    for (final d in kyc.documents) {
      if (_docs.containsKey(d.type)) _docs[d.type] = _DocUpload(path: d.path, url: d.url);
    }
  }

  int get _docsDone => _docs.values.where((d) => d.done).length;

  // ── Pick + upload ──────────────────────────────────────────────────────────

  Future<void> _pickPhoto(_DocSlot slot) async {
    final src = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.bgSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (_) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 8),
          Container(width: 38, height: 4, decoration: BoxDecoration(color: AppColors.borderSubtle, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text(slot.label, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
          ListTile(
            leading: const Icon(Icons.photo_camera_rounded, color: AppColors.primary),
            title: const Text('Chụp ảnh', style: TextStyle(color: AppColors.textPrimary)),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_rounded, color: AppColors.info),
            title: const Text('Chọn từ thư viện', style: TextStyle(color: AppColors.textPrimary)),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
    if (src == null || !mounted) return;

    XFile? xf;
    try {
      xf = await _picker.pickImage(
        source: src,
        imageQuality: 80,
        maxWidth: 1600,
        preferredCameraDevice: slot.selfie ? CameraDevice.front : CameraDevice.rear,
      );
    } catch (_) {
      if (mounted) setState(() => _docs[slot.type] = _DocUpload(error: 'Không mở được camera/thư viện'));
      return;
    }
    if (xf == null) return;

    final file = File(xf.path);
    setState(() => _docs[slot.type] = _DocUpload(localFile: file, uploading: true));
    try {
      final res = await ref.read(driverRepositoryProvider).uploadKycImage(filePath: xf.path, docType: slot.type);
      if (!mounted) return;
      setState(() => _docs[slot.type] = _DocUpload(localFile: file, path: res.path, url: res.url));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _docs[slot.type] = _DocUpload(localFile: file, error: e.message));
    } catch (_) {
      if (!mounted) return;
      setState(() => _docs[slot.type] = _DocUpload(localFile: file, error: 'Tải ảnh thất bại. Thử lại.'));
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  Future<void> _submit() async {
    final plate = _plateCtrl.text.trim().toUpperCase();
    final seats = int.tryParse(_seatsCtrl.text.trim()) ?? 0;
    final cccd  = _cccdCtrl.text.trim();
    final addr  = _addressCtrl.text.trim();

    String? err;
    if (cccd.length != 12 || int.tryParse(cccd) == null) {
      err = 'Số CCCD phải gồm đúng 12 chữ số';
    } else if (addr.length < 5) {
      err = 'Vui lòng nhập địa chỉ thường trú';
    } else if (plate.length < 5 || plate.length > 20 || !_plateRe.hasMatch(plate)) {
      err = 'Biển số xe không hợp lệ (VD: 51A-12345)';
    } else if (seats < 1 || seats > 45) {
      err = 'Số ghế không hợp lệ (1–45)';
    } else if (_allowCargo && (double.tryParse(_cargoCtrl.text.trim()) ?? 0) <= 0) {
      err = 'Nhập tải trọng hàng hoá (kg)';
    } else if (_allowCargo && (double.tryParse(_cargoCtrl.text.trim()) ?? 0) > 50000) {
      err = 'Tải trọng tối đa 50000 kg';
    } else if (_docsDone < _docSlots.length) {
      final missing = _docSlots.where((s) => !_docs[s.type]!.done).map((s) => s.label).join(', ');
      err = 'Chưa tải đủ giấy tờ: $missing';
    }
    if (err != null) { setState(() => _error = err!); return; }

    setState(() { _submitting = true; _error = ''; });
    try {
      final docs = _docSlots.map((s) => {'type': s.type, 'path': _docs[s.type]!.path!}).toList();
      await ref.read(driverRepositoryProvider).submitKyc(
            vehicleType: _vehicleType,
            vehiclePlate: plate,
            seats: seats,
            cccdNumber: cccd,
            address: addr,
            allowCargo: _allowCargo,
            cargoCapacityKg: _allowCargo ? double.tryParse(_cargoCtrl.text.trim()) : null,
            documents: docs,
          );
      ref.invalidate(driverProfileProvider);
      if (!mounted) return;
      setState(() { _submitting = false; _submitted = true; });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() { _submitting = false; _error = e.message; });
    } catch (_) {
      if (!mounted) return;
      setState(() { _submitting = false; _error = 'Không nộp được hồ sơ. Thử lại sau.'; });
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_submitted) return const _ResultView.success();

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(title: const Text('Đăng ký tài xế (KYC)')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
          : (_kyc != null && !_kyc!.canEdit)
              ? _StatusView(kyc: _kyc!)
              : _buildForm(),
    );
  }

  Widget _buildForm() {
    final rejected = _kyc?.isRejected ?? false;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Banner
        _Banner(
          color: rejected ? AppColors.danger : AppColors.info,
          icon: rejected ? Icons.error_outline_rounded : Icons.info_outline_rounded,
          text: rejected
              ? 'Hồ sơ bị từ chối: ${_kyc?.rejectReason ?? "Vui lòng cập nhật và gửi lại."}'
              : 'Hoàn thành thông tin và giấy tờ bên dưới rồi nộp hồ sơ để được xác minh.',
        ),
        const SizedBox(height: 20),

        // Personal
        const _SectionHeader('Thông tin cá nhân'),
        const SizedBox(height: 12),
        _Field(ctrl: _cccdCtrl, label: 'Số CCCD (12 chữ số)', hint: '012345678901', icon: Icons.badge_outlined,
          type: TextInputType.number, maxLength: 12,
          formatters: [FilteringTextInputFormatter.digitsOnly]),
        const SizedBox(height: 10),
        _Field(ctrl: _addressCtrl, label: 'Địa chỉ thường trú', hint: 'Số nhà, đường, phường/xã, tỉnh/thành',
          icon: Icons.home_outlined, maxLines: 2),
        const SizedBox(height: 22),

        // Vehicle
        const _SectionHeader('Thông tin xe'),
        const SizedBox(height: 12),
        _VehicleTypeSelector(value: _vehicleType, onChanged: (v) => setState(() => _vehicleType = v)),
        const SizedBox(height: 12),
        _Field(ctrl: _plateCtrl, label: 'Biển số xe', hint: '51A-12345', icon: Icons.confirmation_number_outlined,
          formatters: [UpperCaseFormatter()]),
        const SizedBox(height: 10),
        _Field(ctrl: _seatsCtrl, label: 'Số ghế (không kể tài xế)', hint: '4', icon: Icons.airline_seat_recline_normal_rounded,
          type: TextInputType.number, formatters: [FilteringTextInputFormatter.digitsOnly]),
        const SizedBox(height: 12),

        // Cargo
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: _allowCargo ? AppColors.info.withValues(alpha: 0.08) : AppColors.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _allowCargo ? AppColors.info.withValues(alpha: 0.3) : AppColors.borderSubtle),
          ),
          child: Column(children: [
            InkWell(
              onTap: () => setState(() => _allowCargo = !_allowCargo),
              child: Row(children: [
                const Icon(Icons.inventory_2_outlined, color: AppColors.info, size: 18),
                const SizedBox(width: 10),
                const Expanded(child: Text('Nhận ghép hàng hoá', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600))),
                Switch.adaptive(value: _allowCargo, activeThumbColor: AppColors.info, onChanged: (v) => setState(() => _allowCargo = v)),
              ]),
            ),
            if (_allowCargo) ...[
              const SizedBox(height: 4),
              _Field(ctrl: _cargoCtrl, label: 'Tải trọng tối đa (kg)', hint: '50', icon: Icons.scale_outlined, type: TextInputType.number,
                formatters: [FilteringTextInputFormatter.digitsOnly]),
              const SizedBox(height: 8),
            ],
          ]),
        ),
        const SizedBox(height: 22),

        // Documents
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const _SectionHeader('Giấy tờ (ảnh rõ nét)'),
          Text('$_docsDone/${_docSlots.length}',
            style: TextStyle(color: _docsDone == _docSlots.length ? AppColors.success : AppColors.textSecondary, fontWeight: FontWeight.w700, fontSize: 13)),
        ]),
        const SizedBox(height: 12),
        ..._docSlots.map((slot) => _DocCard(slot: slot, state: _docs[slot.type]!, onTap: () => _pickPhoto(slot))),
        const SizedBox(height: 16),

        if (_error.isNotEmpty) ...[
          _Banner(color: AppColors.danger, icon: Icons.error_outline, text: _error),
          const SizedBox(height: 14),
        ],

        GradientButton(
          label: rejected ? 'Gửi lại hồ sơ' : 'Nộp hồ sơ',
          icon: Icons.send_rounded,
          loading: _submitting,
          onPressed: _submitting ? null : _submit,
        ),
        const SizedBox(height: 32),
      ]),
    );
  }
}

// ── Status (pending / approved) view ────────────────────────────────────────────

class _StatusView extends StatelessWidget {
  const _StatusView({required this.kyc});
  final KycStatus kyc;

  @override
  Widget build(BuildContext context) {
    final approved = kyc.isApproved;
    final color = approved ? AppColors.success : AppColors.warning;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Center(child: Column(children: [
          const SizedBox(height: 12),
          Container(
            width: 76, height: 76,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle, border: Border.all(color: color.withValues(alpha: 0.4), width: 2)),
            child: Icon(approved ? Icons.verified_rounded : Icons.hourglass_top_rounded, color: color, size: 40),
          ),
          const SizedBox(height: 16),
          Text(approved ? 'Hồ sơ đã được duyệt' : 'Hồ sơ đang chờ duyệt',
            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 19)),
          const SizedBox(height: 8),
          Text(
            approved ? 'Bạn có thể bật trực tuyến và bắt đầu nhận chuyến.' : 'Thường trong 24–48 giờ. Bạn sẽ nhận được thông báo khi có kết quả.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 24),
        ])),
        const _SectionHeader('Thông tin đã gửi'),
        const SizedBox(height: 10),
        _InfoTile('Biển số', kyc.vehiclePlate),
        _InfoTile('Loại xe', _vehicleLabel(kyc.vehicleType)),
        _InfoTile('Số ghế', kyc.seats.toString()),
        _InfoTile('Số CCCD', kyc.cccdNumber),
        _InfoTile('Địa chỉ', kyc.address),
        const SizedBox(height: 18),
        const _SectionHeader('Giấy tờ'),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 0.85,
          children: kyc.documents.map((d) => _RemoteDocThumb(doc: d)).toList(),
        ),
        const SizedBox(height: 24),
        OutlinedButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text('Quay lại')),
        const SizedBox(height: 24),
      ]),
    );
  }
}

class _RemoteDocThumb extends StatelessWidget {
  const _RemoteDocThumb({required this.doc});
  final KycDocumentDto doc;

  @override
  Widget build(BuildContext context) {
    final url = doc.url;
    return GestureDetector(
      onTap: url == null ? null : () => showDialog(
        context: context,
        builder: (_) => GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(color: Colors.black87, alignment: Alignment.center,
            child: InteractiveViewer(child: Image.network(url, fit: BoxFit.contain))),
        ),
      ),
      child: Column(children: [
        Expanded(child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: url == null
              ? Container(color: AppColors.bgOverlay, width: double.infinity, child: const Icon(Icons.image_outlined, color: AppColors.textMuted))
              : Image.network(url, fit: BoxFit.cover, width: double.infinity,
                  errorBuilder: (_, __, ___) => Container(color: AppColors.bgOverlay, child: const Icon(Icons.broken_image_outlined, color: AppColors.textMuted)),
                  loadingBuilder: (c, w, p) => p == null ? w : Container(color: AppColors.bgOverlay, child: const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)))),
                ),
        )),
        const SizedBox(height: 4),
        Text(_docLabel(doc.type), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
      ]),
    );
  }
}

// ── Result view ─────────────────────────────────────────────────────────────────

class _ResultView extends StatelessWidget {
  const _ResultView.success();

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bgDark,
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), shape: BoxShape.circle, border: Border.all(color: AppColors.success.withValues(alpha: 0.3), width: 2)),
            child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 44),
          ),
          const SizedBox(height: 24),
          const Text('Nộp hồ sơ thành công!', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 20)),
          const SizedBox(height: 10),
          const Text('Hồ sơ đang được xét duyệt. Bạn sẽ được thông báo trong 1–2 ngày làm việc.',
            textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5)),
          const SizedBox(height: 28),
          OutlinedButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text('Quay lại trang chủ')),
        ]),
      ),
    ),
  );
}

// ── Widgets ─────────────────────────────────────────────────────────────────────

String _vehicleLabel(String t) => _vehicleTypes.firstWhere((e) => e.$1 == t, orElse: () => (t, t, Icons.directions_car_rounded)).$2;
String _docLabel(String t) => _docSlots.firstWhere((e) => e.type == t, orElse: () => _DocSlot(type: t, label: t, hint: '', icon: Icons.article_outlined)).label;

class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) =>
      newValue.copyWith(text: newValue.text.toUpperCase());
}

class _Banner extends StatelessWidget {
  const _Banner({required this.color, required this.icon, required this.text});
  final Color color;
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.3)),
    ),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: color, size: 17),
      const SizedBox(width: 10),
      Expanded(child: Text(text, style: TextStyle(color: color, fontSize: 12.5, height: 1.4))),
    ]),
  );
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;
  @override
  Widget build(BuildContext context) => Text(title, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14));
}

class _InfoTile extends StatelessWidget {
  const _InfoTile(this.label, this.value);
  final String label, value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 90, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5))),
      Expanded(child: Text(value.isEmpty ? '—' : value, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500))),
    ]),
  );
}

class _VehicleTypeSelector extends StatelessWidget {
  const _VehicleTypeSelector({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Row(
    children: _vehicleTypes.map((t) {
      final selected = t.$1 == value;
      return Expanded(
        child: GestureDetector(
          onTap: () => onChanged(t.$1),
          child: Container(
            margin: EdgeInsets.only(right: t.$1 == 'TRUCK' ? 0 : 8),
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: selected ? AppColors.primary : AppColors.borderSubtle, width: selected ? 1.5 : 1),
            ),
            child: Column(children: [
              Icon(t.$3, color: selected ? AppColors.primary : AppColors.textMuted, size: 22),
              const SizedBox(height: 6),
              Text(t.$2, style: TextStyle(color: selected ? AppColors.primary : AppColors.textSecondary, fontSize: 12, fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
            ]),
          ),
        ),
      );
    }).toList(),
  );
}

class _Field extends StatelessWidget {
  const _Field({
    required this.ctrl, required this.label, required this.hint, required this.icon,
    this.type = TextInputType.text, this.maxLines = 1, this.maxLength, this.formatters,
  });
  final TextEditingController ctrl;
  final String label, hint;
  final IconData icon;
  final TextInputType type;
  final int maxLines;
  final int? maxLength;
  final List<TextInputFormatter>? formatters;

  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    keyboardType: type,
    maxLines: maxLines,
    maxLength: maxLength,
    inputFormatters: formatters,
    style: const TextStyle(color: AppColors.textPrimary),
    decoration: InputDecoration(labelText: label, hintText: hint, prefixIcon: Icon(icon, size: 18), counterText: ''),
  );
}

class _DocCard extends StatelessWidget {
  const _DocCard({required this.slot, required this.state, required this.onTap});
  final _DocSlot slot;
  final _DocUpload state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasError = state.error != null;
    final borderColor = state.done
        ? AppColors.success.withValues(alpha: 0.45)
        : hasError ? AppColors.danger.withValues(alpha: 0.5) : AppColors.borderSubtle;
    return GestureDetector(
      onTap: state.uploading ? null : onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: borderColor)),
        child: Row(children: [
          // Thumb
          Container(
            width: 54, height: 54,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: AppColors.bgOverlay),
            clipBehavior: Clip.antiAlias,
            child: state.uploading
                ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)))
                : state.localFile != null
                    ? Image.file(state.localFile!, fit: BoxFit.cover)
                    : state.url != null
                        ? Image.network(state.url!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Icon(slot.icon, color: AppColors.textMuted, size: 22))
                        : Icon(slot.icon, color: AppColors.textMuted, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(slot.label, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 2),
            Text(
              hasError ? state.error! : state.uploading ? 'Đang tải lên...' : state.done ? 'Đã tải — nhấn để đổi' : slot.hint,
              style: TextStyle(color: hasError ? AppColors.danger : state.done ? AppColors.success : AppColors.textMuted, fontSize: 11, height: 1.3),
            ),
          ])),
          const SizedBox(width: 8),
          Icon(
            state.done ? Icons.check_circle_rounded : hasError ? Icons.refresh_rounded : Icons.add_a_photo_outlined,
            color: state.done ? AppColors.success : hasError ? AppColors.danger : AppColors.textMuted, size: 20,
          ),
        ]),
      ),
    );
  }
}
