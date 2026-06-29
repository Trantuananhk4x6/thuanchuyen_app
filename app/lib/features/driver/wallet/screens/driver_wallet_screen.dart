import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/wallet.dart';
import '../../../../features/shared/widgets/status_badge.dart';
import '../../dashboard/screens/driver_dashboard_screen.dart';

final _vnd = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

// ── Providers ─────────────────────────────────────────────────────────────────

final walletProvider = FutureProvider.autoDispose<DriverWallet>(
  (ref) => ref.read(driverRepositoryProvider).getWallet(),
);

final earningsProvider = FutureProvider.autoDispose<List<WalletTransaction>>(
  (ref) => ref.read(driverRepositoryProvider).getEarnings(),
);

final withdrawalsProvider = FutureProvider.autoDispose<List<WithdrawalRequest>>(
  (ref) => ref.read(driverRepositoryProvider).getWithdrawals(),
);

// ── Screen ────────────────────────────────────────────────────────────────────

class DriverWalletScreen extends ConsumerStatefulWidget {
  const DriverWalletScreen({super.key});

  @override
  ConsumerState<DriverWalletScreen> createState() => _DriverWalletScreenState();
}

class _DriverWalletScreenState extends ConsumerState<DriverWalletScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final walletAsync = ref.watch(walletProvider);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Ví tài xế'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              ref.invalidate(walletProvider);
              ref.invalidate(earningsProvider);
              ref.invalidate(withdrawalsProvider);
            },
          ),
        ],
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          dividerColor: AppColors.borderSubtle,
          tabs: const [
            Tab(text: 'Giao dịch'),
            Tab(text: 'Rút tiền'),
          ],
        ),
      ),
      body: Column(children: [
        // Balance cards
        walletAsync.when(
          loading: () => const _BalanceSkeleton(),
          error: (_, __) => const SizedBox.shrink(),
          data: (w) => _BalanceCards(wallet: w),
        ),

        // Tabs
        Expanded(
          child: TabBarView(controller: _tab, children: [
            _TransactionsList(),
            _WithdrawalsList(walletAsync: walletAsync),
          ]),
        ),
      ]),
    );
  }
}

// ── Balance cards ─────────────────────────────────────────────────────────────

class _BalanceCards extends StatelessWidget {
  const _BalanceCards({required this.wallet});
  final DriverWallet wallet;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Expanded(child: _BalCard(
          label:   'Có thể rút',
          amount:  wallet.withdrawableBalance,
          color:   AppColors.success,
          icon:    Icons.account_balance_wallet_rounded,
        )),
        const SizedBox(width: 12),
        Expanded(child: _BalCard(
          label:   'Đang giữ',
          amount:  wallet.pendingBalance,
          color:   AppColors.warning,
          icon:    Icons.hourglass_top_rounded,
        )),
      ]),
    );
  }
}

class _BalCard extends StatelessWidget {
  const _BalCard({required this.label, required this.amount, required this.color, required this.icon});
  final String label;
  final int    amount;
  final Color  color;
  final IconData icon;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ]),
      const SizedBox(height: 8),
      Text(
        _vnd.format(amount),
        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 18),
        overflow: TextOverflow.ellipsis,
      ),
    ]),
  );
}

class _BalanceSkeleton extends StatelessWidget {
  const _BalanceSkeleton();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(16),
    child: Center(child: SizedBox(height: 24, width: 24,
      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))),
  );
}

// ── Transactions list ─────────────────────────────────────────────────────────

class _TransactionsList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(earningsProvider);

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
      error: (e, _) => Center(child: Text(e is ApiException ? e.message : 'Không tải được',
        style: const TextStyle(color: AppColors.danger))),
      data: (txs) => txs.isEmpty
          ? const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.receipt_long_outlined, color: AppColors.textMuted, size: 40),
                SizedBox(height: 10),
                Text('Chưa có giao dịch', style: TextStyle(color: AppColors.textMuted)),
              ]),
            )
          : ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: txs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _TxCard(tx: txs[i]),
            ),
    );
  }
}

class _TxCard extends StatelessWidget {
  const _TxCard({required this.tx});
  final WalletTransaction tx;

  static const _typeLabel = {
    'TRIP_CREDIT': 'Thu nhập chuyến',
    'WITHDRAWAL':  'Rút tiền',
    'ADJUSTMENT':  'Điều chỉnh',
    'RELEASE':     'Giải phóng ví',
    'REFUND':      'Hoàn tiền',
  };

  @override
  Widget build(BuildContext context) {
    final isCredit = tx.isCredit;
    return AppCard(
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: isCredit ? AppColors.success.withValues(alpha: 0.1) : AppColors.danger.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            isCredit ? Icons.arrow_circle_down_rounded : Icons.arrow_circle_up_rounded,
            color: isCredit ? AppColors.success : AppColors.danger,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_typeLabel[tx.type] ?? tx.type,
            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 2),
          Text(
            '${tx.createdAt.day.toString().padLeft(2,'0')}/${tx.createdAt.month.toString().padLeft(2,'0')}/${tx.createdAt.year}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
          if (tx.availableAt != null && tx.type == 'TRIP_CREDIT')
            Text('Khả dụng: ${tx.availableAt!.day}/${tx.availableAt!.month}',
              style: const TextStyle(color: AppColors.warning, fontSize: 11)),
        ])),
        Text(
          '${isCredit ? '+' : '-'}${_vnd.format(tx.amount.abs())}',
          style: TextStyle(
            color: isCredit ? AppColors.success : AppColors.danger,
            fontWeight: FontWeight.w700, fontSize: 14,
          ),
        ),
      ]),
    );
  }
}

// ── Withdrawals list + form ───────────────────────────────────────────────────

class _WithdrawalsList extends ConsumerStatefulWidget {
  const _WithdrawalsList({required this.walletAsync});
  final AsyncValue<DriverWallet> walletAsync;

  @override
  ConsumerState<_WithdrawalsList> createState() => _WithdrawalsListState();
}

class _WithdrawalsListState extends ConsumerState<_WithdrawalsList> {
  bool _showForm = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(withdrawalsProvider);

    return Column(children: [
      if (!_showForm)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: GradientButton(
            label: 'Tạo yêu cầu rút tiền',
            icon: Icons.send_rounded,
            onPressed: () => setState(() => _showForm = true),
          ),
        ),

      if (_showForm)
        _WithdrawForm(
          maxAmount: widget.walletAsync.valueOrNull?.withdrawableBalance ?? 0,
          onSuccess: () {
            setState(() => _showForm = false);
            ref.invalidate(withdrawalsProvider);
            ref.invalidate(walletProvider);
          },
          onCancel: () => setState(() => _showForm = false),
        ),

      const SizedBox(height: 8),

      Expanded(
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
          error: (e, _) => Center(child: Text(e is ApiException ? e.message : 'Không tải được',
            style: const TextStyle(color: AppColors.danger))),
          data: (list) => list.isEmpty
              ? const Center(child: Text('Chưa có yêu cầu rút tiền',
                  style: TextStyle(color: AppColors.textMuted)))
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _WithdrawCard(w: list[i]),
                ),
        ),
      ),
    ]);
  }
}

class _WithdrawCard extends StatelessWidget {
  const _WithdrawCard({required this.w});
  final WithdrawalRequest w;

  static const _statusLabel = {
    'PENDING':    'Chờ duyệt',
    'APPROVED':   'Đã duyệt',
    'REJECTED':   'Từ chối',
    'PROCESSING': 'Đang xử lý',
    'DONE':       'Hoàn thành',
  };

  static const _statusColor = {
    'PENDING':    AppColors.warning,
    'APPROVED':   AppColors.info,
    'REJECTED':   AppColors.danger,
    'PROCESSING': AppColors.primary,
    'DONE':       AppColors.success,
  };

  @override
  Widget build(BuildContext context) {
    final color = _statusColor[w.status] ?? AppColors.textMuted;
    return AppCard(
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_vnd.format(w.amount),
            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 4),
          Text('${w.bankName} • ${w.bankAccountNo}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          Text(
            '${w.createdAt.day.toString().padLeft(2,'0')}/${w.createdAt.month.toString().padLeft(2,'0')}/${w.createdAt.year}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
          if (w.adminNote != null && w.adminNote!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Ghi chú: ${w.adminNote}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
          ],
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Text(_statusLabel[w.status] ?? w.status,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }
}

// ── Withdrawal form ───────────────────────────────────────────────────────────

class _WithdrawForm extends ConsumerStatefulWidget {
  const _WithdrawForm({required this.maxAmount, required this.onSuccess, required this.onCancel});
  final int maxAmount;
  final VoidCallback onSuccess;
  final VoidCallback onCancel;

  @override
  ConsumerState<_WithdrawForm> createState() => _WithdrawFormState();
}

class _WithdrawFormState extends ConsumerState<_WithdrawForm> {
  final _amountCtrl  = TextEditingController();
  final _bankCtrl    = TextEditingController();
  final _accountCtrl = TextEditingController();
  final _nameCtrl    = TextEditingController();
  bool   _loading    = false;
  String _error      = '';

  @override
  void dispose() {
    _amountCtrl.dispose();
    _bankCtrl.dispose();
    _accountCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = int.tryParse(_amountCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    if (amount <= 0) { setState(() => _error = 'Nhập số tiền hợp lệ'); return; }
    if (amount > widget.maxAmount) { setState(() => _error = 'Số tiền vượt quá số dư khả dụng'); return; }
    if (_bankCtrl.text.isEmpty || _accountCtrl.text.isEmpty || _nameCtrl.text.isEmpty) {
      setState(() => _error = 'Điền đầy đủ thông tin ngân hàng');
      return;
    }
    setState(() { _loading = true; _error = ''; });
    try {
      await ref.read(driverRepositoryProvider).requestWithdrawal(
        amount:          amount,
        bankName:        _bankCtrl.text.trim(),
        bankAccountNo:   _accountCtrl.text.trim(),
        bankAccountName: _nameCtrl.text.trim(),
      );
      widget.onSuccess();
    } on ApiException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Không tạo được yêu cầu. Thử lại.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: AppCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('Yêu cầu rút tiền',
              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.close, color: AppColors.textMuted, size: 20),
              onPressed: widget.onCancel,
            ),
          ]),
          Text('Khả dụng: ${_vnd.format(widget.maxAmount)}',
            style: const TextStyle(color: AppColors.success, fontSize: 12)),
          const SizedBox(height: 14),

          TextField(
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(labelText: 'Số tiền (VND)', prefixIcon: Icon(Icons.payments_outlined)),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _bankCtrl,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(labelText: 'Tên ngân hàng', prefixIcon: Icon(Icons.account_balance_outlined)),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _accountCtrl,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(labelText: 'Số tài khoản', prefixIcon: Icon(Icons.credit_card_outlined)),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(labelText: 'Tên chủ tài khoản', prefixIcon: Icon(Icons.person_outline)),
          ),

          if (_error.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
          ],

          const SizedBox(height: 14),
          GradientButton(
            label: 'Gửi yêu cầu',
            loading: _loading,
            onPressed: _loading ? null : _submit,
          ),
        ]),
      ),
    );
  }
}
