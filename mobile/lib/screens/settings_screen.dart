import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/plotter_service.dart';

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
    _loadConnectionStatus();
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
    if (_connectionType == null || (_connectedName?.toLowerCase().contains('portrait2') ?? false)) return const SizedBox.shrink();
    final isClassic = _connectionType == 'classic';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isClassic ? Colors.orange.withOpacity(0.12) : Colors.blue.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isClassic ? Colors.orange.withOpacity(0.3) : Colors.blue.withOpacity(0.3)),
      ),
      child: Text(
        isClassic ? 'Standard BT' : 'BLE SDK',
        style: TextStyle(
          fontSize: 10, 
          color: isClassic ? Colors.orange[800] : Colors.blue[800],
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bgGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        const Color(0xFFF8FAFC),
        const Color(0xFFF1F5F9),
      ],
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 0.5)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: Container(
        decoration: BoxDecoration(gradient: bgGradient),
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            _buildSectionHeader('Hardware'),
            
            // Plotter Connection Card
            _buildCardWrapper(
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6B82C).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.print_outlined, color: Color(0xFFE6B82C)),
                ),
                title: Row(
                  children: [
                    const Text('Plotter Connection', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
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
                trailing: _connectedAddress != null 
                  ? TextButton(
                      onPressed: _disconnect, 
                      child: const Text('Disconnect', style: TextStyle(color: Color(0xFFE6B82C), fontWeight: FontWeight.w900)),
                    )
                  : null,
              ),
            ),
            
            if (_connectedAddress == null) 
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE6B82C),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shadowColor: const Color(0xFFE6B82C).withOpacity(0.3),
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
            _buildSectionHeader('Account'),
            
            _buildCardWrapper(
              const ListTile(
                leading: Icon(Icons.person_outline, color: Color(0xFF0F172A)),
                title: Text('Profile Information', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                trailing: Icon(Icons.chevron_right, color: Color(0xFF0F172A)),
              ),
            ),
            
            _buildCardWrapper(
              const ListTile(
                leading: Icon(Icons.lock_outline, color: Color(0xFF0F172A)),
                title: Text('Change Password', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                trailing: Icon(Icons.chevron_right, color: Color(0xFF0F172A)),
              ),
            ),
            
            const SizedBox(height: 16),
            _buildSectionHeader('App'),
            
            _buildCardWrapper(
              ListTile(
                leading: const Icon(Icons.info_outline, color: Color(0xFF0F172A)),
                title: const Text('About Flashgard', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                subtitle: Text('Version 1.0.0', style: TextStyle(color: const Color(0xFF0F172A).withOpacity(0.5))),
              ),
            ),
            
            _buildCardWrapper(
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w800)),
                onTap: () {
                  Navigator.of(context).pushReplacementNamed('/login');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardWrapper(Widget child) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.05), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
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
          color: Color(0xFFE6B82C),
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}
