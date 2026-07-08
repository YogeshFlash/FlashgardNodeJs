import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class RechargeScreen extends StatefulWidget {
  const RechargeScreen({super.key});

  @override
  State<RechargeScreen> createState() => _RechargeScreenState();
}

class _RechargeScreenState extends State<RechargeScreen> {
  late Razorpay _razorpay;
  List<dynamic> _packages = [];
  bool _isLoading = true;
  String? _errorMessage;
  bool _isProcessingPayment = false;
  String? _activeOrderId;
  String? _loadingPackageId; // tracks which specific package is processing

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    _loadPackages();
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  Future<void> _loadPackages() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final packages = await ApiService.fetchRechargePackages();
    if (mounted) {
      if (packages != null) {
        setState(() {
          _packages = packages;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Failed to load recharge packages. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _startPayment(Map<String, dynamic> package) async {
    if (_isProcessingPayment) return;

    setState(() {
      _isProcessingPayment = true;
      _loadingPackageId = package['id']?.toString();
    });

    final orderData = await ApiService.createRechargeOrder(package['id']);

    if (orderData == null || orderData['error'] != null) {
      if (mounted) {
        setState(() {
          _isProcessingPayment = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(orderData?['error'] ?? 'Failed to initialize order on server'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
      return;
    }

    _activeOrderId = orderData['razorpayOrderId'];

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    final options = {
      'key': orderData['keyId'],
      'amount': orderData['amount'],
      'name': 'Flashgard Pro',
      'description': 'Recharge ${package['credits']} Cuts',
      'order_id': _activeOrderId,
      'prefill': {
        'email': authProvider.userName ?? '',
      },
      'method': {
        'netbanking': false,
        'card': false,
        'upi': true,
      },
      'theme': {
        'color': '#4F46E5',
      }
    };

    try {
      _razorpay.open(options);
    } catch (e) {
      print('Error opening Razorpay checkout: $e');
      if (mounted) {
        setState(() {
          _isProcessingPayment = false;
        });
      }
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    if (response.orderId == null || response.paymentId == null || response.signature == null) {
      _showFeedback(false, 'Payment failed during validation callback');
      setState(() => _isProcessingPayment = false);
      return;
    }

    final verification = await ApiService.verifyRechargePayment(
      razorpayOrderId: response.orderId!,
      razorpayPaymentId: response.paymentId!,
      razorpaySignature: response.signature!,
    );

    if (mounted) {
      setState(() {
        _isProcessingPayment = false;
        _loadingPackageId = null;
      });

      if (verification != null && verification['error'] == null) {
        _showFeedback(true, 'Credits recharged successfully!');
        Navigator.pop(context, true); // Return true to refresh Home page balances
      } else {
        _showFeedback(false, verification?['error'] ?? 'Signature verification failed.');
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (mounted) {
      setState(() {
        _isProcessingPayment = false;
        _loadingPackageId = null;
      });
      _showFeedback(false, response.message ?? 'Payment cancelled or rejected');
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (mounted) {
      setState(() {
        _isProcessingPayment = false;
        _loadingPackageId = null;
      });
    }
  }

  void _showFeedback(bool isSuccess, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isSuccess ? Colors.green : Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    // Check active license gate
    final hasLicense = auth.licenseKey != null && auth.licenseKey!.isNotEmpty;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Recharge Credits',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: !hasLicense
            ? _buildNoLicenseGate(isDark)
            : _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFCE1D19)))
                : _errorMessage != null
                    ? _buildErrorView(isDark)
                    : RefreshIndicator(
                        color: const Color(0xFFCE1D19),
                        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                        onRefresh: _loadPackages,
                        child: _buildPackagesGrid(isDark),
                      ),
      ),
    );
  }

  Widget _buildNoLicenseGate(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lock_person_rounded,
              color: Color(0xFFEF4444),
              size: 72,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Recharge Blocked',
            style: GoogleFonts.outfit(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(
              'Your organization does not have an active subscription license. Recharging credits requires a valid registered license.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 16,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 64, color: Colors.orange.shade400),
          const SizedBox(height: 16),
          Text(
            _errorMessage!,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 16,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadPackages,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try Again'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildPackagesGrid(bool isDark) {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
      itemCount: _packages.length + 1, // +1 for header
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select Recharge Package',
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Credits are instantly credited to your organization wallet upon verification.',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          );
        }
        final pkg = _packages[index - 1];
        return Padding(
          padding: const EdgeInsets.only(bottom: 16.0),
          child: _buildPackageCard(pkg, isDark),
        );
      },
    );
  }

  Widget _buildPackageCard(Map<String, dynamic> pkg, bool isDark) {
    final themeColor = const Color(0xFFCE1D19);
    final pkgId = pkg['id']?.toString();
    final isThisLoading = _loadingPackageId == pkgId;
    final isDisabled = _isProcessingPayment && !isThisLoading;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isThisLoading
              ? themeColor.withOpacity(0.5)
              : isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
          width: isThisLoading ? 2.0 : 1.5,
        ),
      ),
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  pkg['name'] ?? '',
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDisabled
                        ? (isDark ? Colors.white38 : const Color(0xFF0F172A).withOpacity(0.4))
                        : isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  pkg['description'] ?? '',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: isDisabled
                        ? (isDark ? const Color(0xFF94A3B8).withOpacity(0.4) : const Color(0xFF64748B).withOpacity(0.4))
                        : isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: themeColor.withOpacity(isDisabled ? 0.05 : 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${pkg['credits']} Cuts',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDisabled ? themeColor.withOpacity(0.4) : themeColor,
                        ),
                      ),
                    ),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${pkg['price']}',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: isDisabled
                      ? (isDark ? Colors.white38 : const Color(0xFF0F172A).withOpacity(0.35))
                      : isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: isDisabled || isThisLoading ? null : () => _startPayment(pkg),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themeColor,
                  disabledBackgroundColor: isDisabled ? Colors.grey.shade300 : themeColor.withOpacity(0.7),
                  minimumSize: const Size(0, 40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  elevation: 0,
                ),
                child: isThisLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(
                        'Pay',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isDisabled ? Colors.grey.shade500 : Colors.white,
                        ),
                      ),
              )
            ],
          )
        ],
      ),
    );
  }
}
