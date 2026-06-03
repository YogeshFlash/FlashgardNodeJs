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
        color: isClassic ? Colors.orange.withOpacity(0.1) : Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isClassic ? Colors.orange.withOpacity(0.3) : Colors.blue.withOpacity(0.3)),
      ),
      child: Text(
        isClassic ? 'Standard BT' : 'BLE SDK',
        style: TextStyle(
          fontSize: 10, 
          color: isClassic ? Colors.orange[800] : Colors.blue[800],
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        children: [
          _buildSectionHeader('Hardware'),
          ListTile(
            leading: const Icon(Icons.print_outlined, color: Color(0xFFCE1D19)),
            title: Row(
              children: [
                const Text('Plotter Connection'),
                const SizedBox(width: 8),
                _buildConnectionBadge(),
              ],
            ),
            subtitle: Text(_isConnected 
              ? 'Connected to ${_connectedName ?? _connectedAddress ?? 'Unknown'}' 
              : 'Not connected'),
            trailing: _connectedAddress != null 
              ? TextButton(onPressed: _disconnect, child: const Text('Disconnect'))
              : null,
          ),
          
          if (_connectedAddress == null) 
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: ElevatedButton.icon(
                onPressed: _isSearching ? null : _startSearch,
                icon: _isSearching 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.bluetooth_searching),
                label: Text(_isSearching ? 'Searching...' : 'Search for Plotter'),
              ),
            ),

          if (_devices.isNotEmpty && _connectedAddress == null) ...[
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('Available Devices', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
            ..._devices.map((device) {
              bool isPortrait = device.name.toLowerCase().contains('portrait2');
              return ListTile(
                leading: Icon(
                  device.isClassic ? Icons.bluetooth : Icons.bluetooth_connected,
                  color: device.isClassic ? Colors.orange : Colors.blue,
                ),
                title: Row(
                  children: [
                    Expanded(child: Text(device.name)),
                    if (!isPortrait)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: device.isClassic 
                            ? Colors.orange.withOpacity(0.1) 
                            : Colors.blue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          device.isClassic ? 'Classic' : 'BLE',
                          style: TextStyle(
                            fontSize: 10, 
                            color: device.isClassic ? Colors.orange[700] : Colors.blue[700],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
                subtitle: isPortrait ? null : Text(device.address),
                trailing: _isConnecting 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.chevron_right),
                onTap: _isConnecting ? null : () => _connectToDevice(device),
              );
            }),
          ],

          const Divider(height: 32),
          _buildSectionHeader('Account'),
          const ListTile(
            leading: Icon(Icons.person_outline),
            title: Text('Profile Information'),
            trailing: Icon(Icons.chevron_right),
          ),
          const ListTile(
            leading: Icon(Icons.lock_outline),
            title: Text('Change Password'),
            trailing: Icon(Icons.chevron_right),
          ),
          
          const Divider(height: 32),
          _buildSectionHeader('App'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('About Flashgard'),
            subtitle: Text('Version 1.0.0'),
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.of(context).pushReplacementNamed('/login');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: Colors.grey[600],
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
