import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/server_config_dialog.dart';
import 'qr_scanner_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  
  int _loginMode = 0; // 0: Email, 1: Mobile OTP
  bool _isLoading = false;
  bool _otpSent = false;


  @override
  void initState() {
    super.initState();
    _loginMode = 0; // Default to Email login
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleBiometricLogin() async {
    setState(() => _isLoading = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final success = await auth.loginWithBiometrics();
      if (success && mounted) {
        Navigator.pushReplacementNamed(context, '/home');
        return;
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device authentication failed or cancelled.')),
        );
      }
    } catch (e) {
      print('Device Login UI Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    bool success = false;

    if (_loginMode == 1) {
      if (!_otpSent) {
        // Mock send OTP
        await Future.delayed(const Duration(seconds: 1));
        setState(() {
          _otpSent = true;
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('OTP sent to your mobile (Use 123456)')),
        );
        return;
      } else {
        success = await auth.loginWithOtp(_phoneController.text, _otpController.text);
      }
    } else {
      success = await auth.login(_emailController.text, _passwordController.text);
    }

    if (success && mounted) {
      Navigator.pushReplacementNamed(context, '/home');
    } else if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login failed. Please check your credentials.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Server Environment Switcher Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  InkWell(
                    onTap: () async {
                      final changed = await ServerConfigDialog.show(context);
                      if (changed == true && mounted) setState(() {});
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: ApiService.isLive
                            ? Colors.green.withOpacity(0.12)
                            : Colors.orange.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: ApiService.isLive
                              ? Colors.green.withOpacity(0.4)
                              : Colors.orange.withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            ApiService.isLive ? Icons.cloud_done_rounded : Icons.wifi_rounded,
                            size: 13,
                            color: ApiService.isLive ? Colors.green[700] : Colors.orange[800],
                          ),
                          const SizedBox(width: 5),
                          Text(
                            ApiService.environmentLabel,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: ApiService.isLive ? Colors.green[800] : Colors.orange[900],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.tune_rounded,
                            size: 12,
                            color: ApiService.isLive ? Colors.green[700] : Colors.orange[800],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              Center(
                child: Image.asset(
                  'assets/logo.png',
                  height: 80,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Welcome Back',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.blueGrey[900],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Log in to manage your Flashgard account',
                style: TextStyle(color: Colors.blueGrey[500]),
              ),
              const SizedBox(height: 32),

              // Login Mode Toggle (Email default)
              Container(
                decoration: BoxDecoration(
                  color: Colors.blueGrey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() { _loginMode = 0; _otpSent = false; }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _loginMode == 0 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: _loginMode == 0 ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : null,
                          ),
                          child: Center(
                            child: Text('Email', style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _loginMode == 0 ? Theme.of(context).colorScheme.primary : Colors.blueGrey[600],
                              fontSize: 12,
                            )),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() { _loginMode = 1; }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _loginMode == 1 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: _loginMode == 1 ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : null,
                          ),
                          child: Center(
                            child: Text('Mobile OTP', style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _loginMode == 1 ? Theme.of(context).colorScheme.primary : Colors.blueGrey[600],
                              fontSize: 12,
                            )),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              if (_loginMode == 0) ...[
                const Text('Email Address', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    hintText: 'admin@flashgard.com',
                    prefixIcon: Icon(Icons.email_outlined, size: 20),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    hintText: '••••••••',
                    prefixIcon: Icon(Icons.lock_outline, size: 20),
                  ),
                ),
              ] else ...[
                const Text('Mobile Number', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  enabled: !_otpSent,
                  decoration: const InputDecoration(
                    hintText: '+91 98765 43210',
                    prefixIcon: Icon(Icons.phone_android_outlined, size: 20),
                  ),
                ),
                if (_otpSent) ...[
                  const SizedBox(height: 20),
                  const Text('Enter 6-digit OTP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(
                      hintText: '123456',
                      prefixIcon: Icon(Icons.password_outlined, size: 20),
                      counterText: "",
                    ),
                  ),
                ],
              ],
              
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                child: _isLoading 
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(_loginMode == 1 && !_otpSent ? 'Send OTP' : 'Sign In'),
              ),
              const SizedBox(height: 14),

              // Device Security / PIN / Pattern / Biometric Login Option
              Consumer<AuthProvider>(
                builder: (context, auth, _) {
                  if (auth.isBiometricsEnabled) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14.0),
                      child: OutlinedButton.icon(
                        onPressed: _isLoading ? null : _handleBiometricLogin,
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 48),
                          side: const BorderSide(color: Color(0xFF0F172A), width: 1.2),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.lock_person_rounded, color: Color(0xFF0F172A), size: 20),
                        label: const Text(
                          'Sign in with Device Lock (PIN / Pattern / Biometric)',
                          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 12.5),
                        ),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
              
              // Quick Onboarding QR Login
              OutlinedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                        ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  side: const BorderSide(color: Color(0xFF6366F1)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF6366F1), size: 20),
                label: const Text(
                  'Scan Welcome QR / Quick Login',
                  style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
              const SizedBox(height: 20),

              Center(
                child: TextButton(
                  onPressed: () {},
                  child: Text('Forgot Password?', style: TextStyle(color: Colors.blueGrey[600])),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
