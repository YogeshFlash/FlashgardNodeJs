import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../services/plotter_service.dart';
import '../services/api_service.dart';
import '../widgets/plotter_status_action.dart';
import '../widgets/plotter_connection_sheet.dart';
import '../widgets/server_config_dialog.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final PlotterService _plotterService = PlotterService();
  String? _connectedAddress;
  String? _connectedName;
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    _plotterService.addListener(_loadConnectionStatus);
    _loadConnectionStatus();
  }

  @override
  void dispose() {
    _plotterService.removeListener(_loadConnectionStatus);
    super.dispose();
  }

  Future<void> _loadConnectionStatus() async {
    final isConnected = await _plotterService.isConnected();
    final address = await _plotterService.getConnectedAddress();
    final name = await _plotterService.getConnectedName();
    if (mounted) {
      setState(() {
        _isConnected = isConnected;
        _connectedAddress = address;
        _connectedName = name;
      });
    }
  }

  Future<void> _disconnect() async {
    await _plotterService.disconnect();
    _loadConnectionStatus();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Disconnected')),
      );
    }
  }

  Widget _buildConnectionBadge() {
    if (!_isConnected) return const SizedBox.shrink();
    final isUsb = _plotterService.isUsbPlotter;
    final color = isUsb ? Colors.purple : Colors.green;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isUsb ? Icons.usb_rounded : Icons.bluetooth_connected, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            isUsb ? 'USB Cable' : 'Connected',
            style: TextStyle(
              fontSize: 10, 
              color: color,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bgGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: isDark
          ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
          : [const Color(0xFFF8FAFC), const Color(0xFFF1F5F9)],
    );

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Settings',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: theme.colorScheme.onSurface,
            letterSpacing: 0.5,
          ),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: theme.colorScheme.onSurface,
        actions: const [
          PlotterStatusAction(),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(gradient: bgGradient),
        child: RefreshIndicator(
          color: const Color(0xFFCE1D19),
          backgroundColor: Colors.white,
          onRefresh: _loadConnectionStatus,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
            _buildSectionHeader('Hardware'),
            
            _buildCardWrapper(
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    onTap: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                        ),
                        builder: (context) => const PlotterConnectionSheet(),
                      ).then((_) => _loadConnectionStatus());
                    },
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: (_isConnected ? (_plotterService.isUsbPlotter ? Colors.purple : Colors.green) : const Color(0xFFCE1D19)).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _isConnected ? (_plotterService.isUsbPlotter ? Icons.usb_rounded : Icons.print_rounded) : Icons.print_outlined,
                        color: _isConnected ? (_plotterService.isUsbPlotter ? Colors.purple : Colors.green) : const Color(0xFFCE1D19),
                      ),
                    ),
                    title: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Plotter Connection',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _buildConnectionBadge(),
                      ],
                    ),
                    subtitle: Text(
                      _isConnected 
                        ? 'Connected to ${_connectedName ?? _connectedAddress ?? 'Unknown'} (${_plotterService.isUsbPlotter ? "USB Cable" : "Bluetooth"})' 
                        : 'Tap to connect via USB OTG cable or Bluetooth',
                      style: TextStyle(color: const Color(0xFF0F172A).withOpacity(0.6), fontWeight: FontWeight.w500),
                    ),
                    trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  ),
                  if (_connectedAddress != null) ...[
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(
                            onPressed: () async {
                              final success = await _plotterService.reset();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(success ? 'Plotter reset signal sent!' : 'Failed to reset plotter.'),
                                    backgroundColor: success ? Colors.green : Colors.red,
                                  ),
                                );
                              }
                            },
                            icon: const Icon(Icons.refresh, size: 16, color: Colors.orange),
                            label: const Text('Reset', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.w900)),
                          ),
                          const SizedBox(width: 8),
                          TextButton.icon(
                            onPressed: _disconnect,
                            icon: const Icon(Icons.power_settings_new, size: 16, color: Color(0xFFCE1D19)),
                            label: const Text('Disconnect', style: TextStyle(color: Color(0xFFCE1D19), fontWeight: FontWeight.w900)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 12, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'ACCOUNT',
                      style: TextStyle(
                        color: Color(0xFFCE1D19),
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 20, color: Color(0xFFCE1D19)),
                      onPressed: () async {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Refreshing account details...'), duration: Duration(seconds: 1)),
                        );
                        final success = await Provider.of<AuthProvider>(context, listen: false).refreshProfile();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(success ? 'Account refreshed successfully!' : 'Failed to refresh account details.'),
                              backgroundColor: success ? Colors.green : Colors.red,
                            ),
                          );
                        }
                      },
                    ),
                  ],
                ),
              ),
             
             Consumer<AuthProvider>(
               builder: (context, auth, _) {
                 final isSuper = auth.isSuperAdmin;
                 final orgText = auth.orgName ?? (isSuper ? 'Bling Accessories' : 'Personal Account');
                 final licText = isSuper
                     ? (auth.licenseKey != null && auth.licenseKey!.isNotEmpty
                         ? _decryptLicenseKey(auth.licenseKey)
                         : 'System Super Admin (All-Access)')
                     : _decryptLicenseKey(auth.licenseKey);

                 return Column(
                   children: [
                     _buildCardWrapper(
                       ListTile(
                         leading: Icon(
                           isSuper ? Icons.admin_panel_settings_outlined : Icons.business_outlined,
                           color: isSuper ? const Color(0xFFCE1D19) : theme.colorScheme.onSurface,
                         ),
                         title: Text('Organization', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                         subtitle: Text(
                           orgText,
                           style: TextStyle(
                             color: theme.colorScheme.onSurface.withOpacity(0.6),
                             fontWeight: FontWeight.w500,
                           ),
                         ),
                         trailing: isSuper
                             ? Container(
                                 padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                 decoration: BoxDecoration(
                                   color: const Color(0xFFCE1D19).withOpacity(0.12),
                                   borderRadius: BorderRadius.circular(8),
                                 ),
                                 child: const Text(
                                   'ADMIN',
                                   style: TextStyle(
                                     fontSize: 10,
                                     color: Color(0xFFCE1D19),
                                     fontWeight: FontWeight.w900,
                                     letterSpacing: 0.5,
                                   ),
                                 ),
                               )
                             : null,
                       ),
                     ),
                     _buildCardWrapper(
                       ListTile(
                         leading: Icon(
                           isSuper ? Icons.verified_user_outlined : Icons.vpn_key_outlined,
                           color: isSuper ? const Color(0xFFCE1D19) : theme.colorScheme.onSurface,
                         ),
                         title: Text('License', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                         subtitle: Text(
                           licText,
                           style: TextStyle(
                             color: theme.colorScheme.onSurface.withOpacity(0.6),
                             fontWeight: FontWeight.w500,
                           ),
                         ),
                       ),
                     ),
                   ],
                 );
               },
             ),
            
            _buildCardWrapper(
              ListTile(
                leading: Icon(Icons.lock_outline, color: theme.colorScheme.onSurface),
                title: Text('Change Password', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                trailing: Icon(Icons.chevron_right, color: theme.colorScheme.onSurface),
              ),
            ),

            Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                return _buildCardWrapper(
                  SwitchListTile(
                    secondary: Icon(Icons.lock_person_outlined, color: theme.colorScheme.onSurface),
                    title: Text('Device Lock & Biometric Login', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                    subtitle: const Text('Sign in with PIN, pattern, fingerprint, or face'),
                    activeColor: const Color(0xFFCE1D19),
                    value: authProvider.isBiometricsEnabled,
                    onChanged: (bool value) async {
                      final success = await authProvider.enableBiometrics(value);
                      if (!success && mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to update biometric settings.')),
                        );
                      }
                    },
                  ),
                );
              },
            ),
            
            const SizedBox(height: 16),
            _buildSectionHeader('App'),
            
            Consumer<ThemeProvider>(
              builder: (context, themeProvider, _) {
                return _buildCardWrapper(
                  SwitchListTile(
                    secondary: Icon(themeProvider.isDarkMode ? Icons.dark_mode : Icons.light_mode, color: theme.colorScheme.onSurface),
                    title: Text(themeProvider.isDarkMode ? 'Dark Mode' : 'Light Mode', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                    subtitle: const Text('Toggle app appearance'),
                    activeColor: const Color(0xFFCE1D19),
                    value: themeProvider.isDarkMode,
                    onChanged: (bool value) {
                      themeProvider.toggleTheme();
                    },
                  ),
                );
              },
            ),

            _buildSectionHeader('Server & Network'),
            _buildCardWrapper(
              InkWell(
                onTap: () async {
                  final changed = await ServerConfigDialog.show(context);
                  if (changed == true && mounted) setState(() {});
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: (ApiService.isLive ? Colors.green : Colors.orange).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          ApiService.isLive ? Icons.cloud_done_rounded : Icons.wifi_rounded,
                          color: ApiService.isLive ? Colors.green : Colors.orange,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Backend Server',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: (ApiService.isLive ? Colors.green : Colors.orange).withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Text(
                                    ApiService.environmentLabel,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: ApiService.isLive ? Colors.green[800] : Colors.orange[900],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    ApiService.baseUrl,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFCE1D19).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Switch',
                          style: TextStyle(
                            color: Color(0xFFCE1D19),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            _buildCardWrapper(
              ListTile(
                leading: Icon(Icons.info_outline, color: theme.colorScheme.onSurface),
                title: Text('About Flashgard', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                subtitle: Text('Version 1.0.0', style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.5))),
              ),
            ),
            
            _buildCardWrapper(
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w800)),
                onTap: () async {
                  await Provider.of<AuthProvider>(context, listen: false).logout();
                  if (mounted) {
                    Navigator.of(context).pushReplacementNamed('/login');
                  }
                },
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }

  Widget _buildCardWrapper(Widget child) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : theme.colorScheme.onSurface.withOpacity(0.05),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: child,
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: Color(0xFFCE1D19),
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.5,
          ),
        ),
      );
    }

  String _decryptLicenseKey(String? key) {
    if (key == null || key.isEmpty) return 'Standard License';
    if (!key.startsWith('enc:')) return key;

    try {
      final encryptedBase64 = key.substring(4); // Remove 'enc:'
      final encryptionKey = encrypt.Key.fromUtf8('flashgard-secure-plt-data-key-32');
      final iv = encrypt.IV(Uint8List(16)); // 16 bytes of zeros

      final encrypter = encrypt.Encrypter(encrypt.AES(encryptionKey, mode: encrypt.AESMode.ctr, padding: null));
      return encrypter.decrypt(encrypt.Encrypted.fromBase64(encryptedBase64), iv: iv);
    } catch (e) {
      print('Error decrypting license key: $e');
      return key;
    }
  }
}
