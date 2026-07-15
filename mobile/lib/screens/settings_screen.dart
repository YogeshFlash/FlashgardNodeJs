import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../services/plotter_service.dart';
import '../widgets/plotter_status_action.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final PlotterService _plotterService = PlotterService();
  List<PlotterDevice> _devices = [];
  bool _isSearching = false;
  String? _connectedAddress;
  String? _connectedName;
  String? _connectionType;
  bool _isConnected = false;
  bool _isConnecting = false;

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
    final type = await _plotterService.getConnectionType();
    if (mounted) {
      setState(() {
        _isConnected = isConnected;
        _connectedAddress = address;
        _connectedName = name;
        _connectionType = type;
      });
    }
  }

  Future<void> _startSearch() async {
    // Request permissions first
    Map<Permission, PermissionStatus> statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.location,
    ].request();

    if (statuses[Permission.bluetoothScan]!.isDenied ||
        statuses[Permission.bluetoothConnect]!.isDenied ||
        statuses[Permission.location]!.isDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bluetooth and Location permissions are required to find the plotter.')),
        );
      }
      return;
    }

    setState(() {
      _isSearching = true;
      _devices = [];
    });

    try {
      final devices = await _plotterService.search(timeout: 10000);
      if (mounted) {
        setState(() {
          _devices = devices;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error searching: $e')),
        );
      }
    }
  }

  Future<void> _connectToDevice(PlotterDevice device) async {
    setState(() {
      _isConnecting = true;
    });

    final connectResult = await _plotterService.connect(device);
    
    if (mounted) {
      setState(() {
        _isConnecting = false;
      });
      _loadConnectionStatus();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(connectResult['success'] 
            ? 'Connected to ${device.name}' 
            : 'Failed to connect: ${connectResult['error']}'),
          backgroundColor: connectResult['success'] ? Colors.green : Colors.red,
        ),
      );
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.withOpacity(0.3)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.bluetooth_connected, size: 12, color: Colors.green),
          SizedBox(width: 4),
          Text(
            'Connected',
            style: TextStyle(
              fontSize: 10, 
              color: Colors.green,
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
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFCE1D19).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.print_outlined, color: Color(0xFFCE1D19)),
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
                        ? 'Connected to ${_connectedName ?? _connectedAddress ?? 'Unknown'}' 
                        : 'Not connected',
                      style: TextStyle(color: const Color(0xFF0F172A).withOpacity(0.6), fontWeight: FontWeight.w500),
                    ),
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
                                    content: Text(success ? 'Plotter reset/reconnected successfully!' : 'Failed to reset plotter.'),
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
            
            if (_connectedAddress == null) 
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFCE1D19),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shadowColor: const Color(0xFFCE1D19).withOpacity(0.3),
                  ),
                  onPressed: _isSearching ? null : _startSearch,
                  icon: _isSearching 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.bluetooth_searching),
                  label: Text(
                    _isSearching ? 'Searching...' : 'Search for Plotter',
                    style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                ),
              ),

            if (_devices.isNotEmpty && _connectedAddress == null) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  'Available Devices', 
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0F172A), letterSpacing: 0.5),
                ),
              ),
              ..._devices.map((device) {
                bool isPortrait = device.name.toLowerCase().contains('portrait2');
                return _buildCardWrapper(
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: (device.isClassic ? Colors.orange : Colors.blue).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        device.isClassic ? Icons.bluetooth : Icons.bluetooth_connected,
                        color: device.isClassic ? Colors.orange : Colors.blue,
                      ),
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            device.name, 
                            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          ),
                        ),
                        if (!isPortrait)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (device.isClassic ? Colors.orange : Colors.blue).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              device.isClassic ? 'Classic' : 'BLE',
                              style: TextStyle(
                                fontSize: 10, 
                                color: device.isClassic ? Colors.orange[800] : device.isClassic ? Colors.orange[800] : Colors.blue[800],
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                      ],
                    ),
                    subtitle: isPortrait 
                      ? null 
                      : Text(device.address, style: TextStyle(color: const Color(0xFF0F172A).withOpacity(0.5))),
                    trailing: _isConnecting 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.chevron_right, color: Color(0xFF0F172A)),
                    onTap: _isConnecting ? null : () => _connectToDevice(device),
                  ),
                );
              }),
            ],

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
                 return Column(
                   children: [
                     _buildCardWrapper(
                       ListTile(
                         leading: Icon(Icons.business_outlined, color: theme.colorScheme.onSurface),
                         title: Text('Organization', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                         subtitle: Text(auth.orgName ?? 'Personal Account', style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6), fontWeight: FontWeight.w500)),
                       ),
                     ),
                     _buildCardWrapper(
                       ListTile(
                         leading: Icon(Icons.vpn_key_outlined, color: theme.colorScheme.onSurface),
                         title: Text('License', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                         subtitle: Text(_decryptLicenseKey(auth.licenseKey), style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6), fontWeight: FontWeight.w500)),
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
                    secondary: Icon(Icons.fingerprint, color: theme.colorScheme.onSurface),
                    title: Text('Biometric Login', style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface)),
                    subtitle: const Text('Sign in with fingerprint or face recognition'),
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
