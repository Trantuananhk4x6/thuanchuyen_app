import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../features/shared/widgets/status_badge.dart';
import '../../dashboard/screens/driver_dashboard_screen.dart';

// ── Doc types ─────────────────────────────────────────────────────────────────

class _DocSlot {
  const _DocSlot({required this.type, required this.label, required this.icon});
  final String   type;
  final String   label;
  final IconData icon;
}

const _docSlots = [
  _DocSlot(type: 'CCCD_FRONT',          label: 'CCCD mặt trước',      icon: Icons.credit_card_rounded),
  _DocSlot(type: 'CCCD_BACK',           label: 'CCCD mặt sau',        icon: Icons.credit_card_off_rounded),
  _DocSlot(type: 'DRIVER_LICENSE',      label: 'Bằng lái xe',         icon: Icons.drive_eta_outlined),
  _DocSlot(type: 'VEHICLE_REGISTRATION',label: 'Đăng ký xe',          icon: Icons.article_outlined),
  _DocSlot(type: 'SELFIE',              label: 'Ảnh chân dung (selfie)',icon: Icons.face_outlined),
];

// ── Screen ────────────────────────────────────────────────────────────────────

class KycScreen extends ConsumerStatefulWidget {
  const KycScreen({super.key});

  @override
  ConsumerState<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends ConsumerState<KycScreen> {
  // Form fields
  final _vehicleTypeCtrl  = TextEditingController();
  final _vehiclePlateCtrl = TextEditingController();
  final _seatsCtrl        = TextEditingController();
  final _cccdCtrl         = TextEditingController();
  final _addressCtrl      = TextEditingController();
  bool   _allowCargo      = false;

  // Photos
  final Map<String, File> _photos = {};
  bool   _submitting  = false;
  String _error       = '';
  bool   _submitted   = false;

  final _picker = ImagePicker();

  @override
  void dispose() {
    _vehicleTypeCtrl.dispose();
    _vehiclePlateCtrl.dispose();
    _seatsCtrl.dispose();
    _cccdCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(String docType) async {
    final src = await showAdaptiveDialog<ImageSource>(
      context: context,
      builder: (_) => AlertDialog.adaptive(
        title: const Text('Chọn ảnh'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, ImageSource.camera),
            child: const Text('Chụp ảnh'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, ImageSource.gallery),
            child: const Text('Thư viện'),
          ),
        ],
      ),
    );
    if (src == null || !mounted) return;

    final xf = await _picker.pickImage(source: src, imageQuality: 75, maxWidth: 1280);
    if (xf == null) return;
    setState(() => _photos[docType] = File(xf.path));
  }

  Future<void> _submit() async {
    // Validate form
    if (_vehicleTypeCtrl.text.trim().isEmpty ||
        _vehiclePlateCtrl.text.trim().isEmpty ||
        _cccdCtrl.text.trim().isEmpty ||
        _addressCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Điền đầy đủ thông tin bắt buộc');
      return;
    }
    final seats = int.tryParse(_seatsCtrl.text.trim()) ?? 0;
    if (seats <= 0 || seats > 50) {
      setState(() => _error = 'Số ghế không hợp lệ (1–50)');
      return;
    }

    // Check all docs uploaded
    final missing = _docSlots.where((d) => !_photos.containsKey(d.type)).toList();
    if (missing.isNotEmpty) {
      setState(() => _error = 'Chưa tải ảnh: ${missing.map((d) => d.label).join(', ')}');
      return;
    }

    setState(() { _submitting = true; _error = ''; });
    try {
      final repo = ref.read(driverRepositoryProvider);

      await repo.submitKyc(
        vehicleType:  _vehicleTypeCtrl.text.trim(),
        vehiclePlate: _vehiclePlateCtrl.text.trim().toUpperCase(),
        seats:        seats,
        cccdNumber:   _cccdCtrl.text.trim(),
        address:      _addressCtrl.text.trim(),
        allowCargo:   _allowCargo,
      );

      // Upload each document
      for (final slot in _docSlots) {
        final file = _photos[slot.type];
        if (file == null) continue;
        await repo.uploadKycDocument(filePath: file.path, docType: slot.type);
      }

      setState(() { _submitting = false; _submitted = true; });
    } on ApiException catch (e) {
      setState(() { _submitting = false; _error = e.message; });
    } catch (_) {
      setState(() { _submitting = false; _error = 'Không nộp được hồ sơ. Thử lại sau.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) return _SuccessView();

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(title: const Text('Nộp hồ sơ KYC')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Info banner
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.info.withValues(alpha: 0.25)),
            ),
            child: const Row(children: [
              Icon(Icons.info_outline, color: AppColors.info, size: 18),
              SizedBox(width: 10),
              Expanded(child: Text(
                'Hồ sơ sẽ được xét duyệt trong 1–2 ngày làm việc.',
                style: TextStyle(color: AppColors.info, fontSize: 12),
              )),
            ]),
          ),

          // ── Vehicle info ───────────────────────────────────────────────────
          const _SectionHeader('Thông tin xe'),
          const SizedBox(height: 12),
          _Field(ctrl: _vehicleTypeCtrl, label: 'Loại xe', hint: 'VD: Toyota Innova, Ford Transit',
            icon: Icons.directions_car_outlined),
          const SizedBox(height: 10),
          _Field(ctrl: _vehiclePlateCtrl, label: 'Biển số xe', hint: 'VD: 51A-12345',
            icon: Icons.confirmation_number_outlined),
          const SizedBox(height: 10),
          _Field(ctrl: _seatsCtrl, label: 'Số ghế (không kể tài xế)', hint: '4',
            icon: Icons.airline_seat_recline_normal_rounded,
            type: TextInputType.number),
          const SizedBox(height: 10),

          // Cargo toggle
          Row(children: [
            Switch.adaptive(
              value: _allowCargo,
              onChanged: (v) => setState(() => _allowCargo = v),
              activeColor: AppColors.primary,
            ),
            const SizedBox(width: 8),
            const Text('Nhận vận chuyển hàng hóa',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ]),
          const SizedBox(height: 20),

          // ── Personal info ──────────────────────────────────────────────────
          const _SectionHeader('Thông tin cá nhân'),
          const SizedBox(height: 12),
          _Field(ctrl: _cccdCtrl, label: 'Số CCCD / CMND', hint: '012345678901',
            icon: Icons.badge_outlined, type: TextInputType.number),
          const SizedBox(height: 10),
          _Field(ctrl: _addressCtrl, label: 'Địa chỉ thường trú', hint: '123 Đường ABC, TP.HCM',
            icon: Icons.home_outlined, maxLines: 2),
          const SizedBox(height: 24),

          // ── Documents ─────────────────────────────────────────────────────
          const _SectionHeader('Tài liệu (ảnh chụp rõ nét)'),
          const SizedBox(height: 12),
          ..._docSlots.map((slot) => _DocUploader(
            slot: slot,
            file: _photos[slot.type],
            onTap: () => _pickPhoto(slot.type),
          )),
          const SizedBox(height: 20),

          // Error
          if (_error.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
              ),
              child: Row(children: [
                const Icon(Icons.error_outline, color: AppColors.danger, size: 15),
                const SizedBox(width: 8),
                Expanded(child: Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 12))),
              ]),
            ),
            const SizedBox(height: 14),
          ],

          // Submit
          GradientButton(
            label: 'Nộp hồ sơ',
            icon: Icons.send_rounded,
            loading: _submitting,
            onPressed: _submitting ? null : _submit,
          ),
          const SizedBox(height: 32),
        ]),
      ),
    );
  }
}

// ── Success view ──────────────────────────────────────────────────────────────

class _SuccessView extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bgDark,
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.success.withValues(alpha: 0.3), width: 2),
            ),
            child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 44),
          ),
          const SizedBox(height: 24),
          const Text('Nộp hồ sơ thành công!',
            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 20)),
          const SizedBox(height: 10),
          const Text('Hồ sơ đang được xét duyệt. Bạn sẽ được thông báo trong 1–2 ngày làm việc.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5)),
          const SizedBox(height: 28),
          OutlinedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Quay lại'),
          ),
        ]),
      ),
    ),
  );
}

// ── Widget helpers ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Text(title,
    style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14));
}

class _Field extends StatelessWidget {
  const _Field({
    required this.ctrl,
    required this.label,
    required this.hint,
    required this.icon,
    this.type = TextInputType.text,
    this.maxLines = 1,
  });
  final TextEditingController ctrl;
  final String   label;
  final String   hint;
  final IconData icon;
  final TextInputType type;
  final int maxLines;

  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    keyboardType: type,
    maxLines: maxLines,
    style: const TextStyle(color: AppColors.textPrimary),
    decoration: InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon, size: 18),
    ),
  );
}

class _DocUploader extends StatelessWidget {
  const _DocUploader({required this.slot, required this.file, required this.onTap});
  final _DocSlot slot;
  final File?    file;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: file != null ? AppColors.success.withValues(alpha: 0.4) : AppColors.borderSubtle,
          ),
        ),
        child: Row(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: AppColors.bgOverlay,
              image: file != null
                  ? DecorationImage(image: FileImage(file!), fit: BoxFit.cover)
                  : null,
            ),
            child: file == null
                ? Icon(slot.icon, color: AppColors.textMuted, size: 22)
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(slot.label,
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13)),
            const SizedBox(height: 2),
            Text(
              file != null ? 'Đã chọn — Nhấn để thay đổi' : 'Nhấn để chọn ảnh',
              style: TextStyle(
                color: file != null ? AppColors.success : AppColors.textMuted,
                fontSize: 11,
              ),
            ),
          ])),
          Icon(
            file != null ? Icons.check_circle_rounded : Icons.upload_rounded,
            color: file != null ? AppColors.success : AppColors.textMuted,
            size: 20,
          ),
        ]),
      ),
    );
  }
}
