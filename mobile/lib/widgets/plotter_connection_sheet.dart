import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../services/plotter_service.dart';

class PlotterConnectionSheet extends StatefulWidget {
  const PlotterConnectionSheet({super.key});

  @override
  State<PlotterConnectionSheet> createState() => _PlotterConnectionSheetState();
}

class _PlotterConnectionSheetState extends State<PlotterConnectionSheet> {
  final PlotterService _plotterService = PlotterService();
  List<PlotterDevice> _devices = [];
  bool _isSearching = false;
  bool _isConnecting = false;

  @override
  void initState() {
    super.initState();
    _plotterService.addListener(_onServiceChange);
  }

  @override
  void dispose() {
    _plotterService.removeListener(_onServiceChange);
    super.dispose();
  }

  void _onServiceChange() {
    if (mounted) setState(() {});
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
      final devices = await _plotterService.search(timeout: 8000);
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
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Disconnected')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final connectedAddress = _plotterService.connectedAddress;
    final connectedName = _plotterService.connectedName;
    final isConnected = connectedAddress != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Indicator bar
          Center(
            child: Container(
              width: 48,
              height: 4.5,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withOpacity(0.12),
                borderRadius: BorderRadius.circular(2.5),
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Plotter Connection',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              if (isConnected)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.withOpacity(0.3)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'Connected',
                        style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),

          // Connection status card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.04),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isConnected 
                        ? Colors.green.withOpacity(0.1) 
                        : theme.colorScheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isConnected ? Icons.print_rounded : Icons.print_disabled_rounded,
                    color: isConnected ? Colors.green : theme.colorScheme.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isConnected ? (connectedName ?? 'Unknown Device') : 'No Device Connected',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isConnected ? connectedAddress : 'Scan to connect to a nearby plotter',
                        style: TextStyle(
                          fontSize: 12,
                          color: theme.colorScheme.onSurface.withOpacity(0.5),
                        ),
                      ),
                    ],
                  ),
                ),
                if (isConnected) ...[
                  IconButton(
                    icon: Icon(Icons.refresh, color: Colors.orange[400], size: 22),
                    tooltip: 'Reset connection',
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
                  ),
                  IconButton(
                    icon: const Icon(Icons.link_off, color: Colors.redAccent, size: 22),
                    tooltip: 'Disconnect',
                    onPressed: _disconnect,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Scan Button
          if (!isConnected)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                onPressed: _isSearching || _isConnecting ? null : _startSearch,
                icon: _isSearching
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.bluetooth_searching, size: 20),
                label: Text(
                  _isSearching ? 'Searching...' : 'Search for Plotter',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                ),
              ),
            ),

          // Devices List
          if (!isConnected && _devices.isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(
              'Available Devices',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 250),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _devices.length,
                itemBuilder: (context, index) {
                  final device = _devices[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.04),
                      ),
                    ),
                    child: ListTile(
                      dense: true,
                      leading: Icon(
                        device.isClassic ? Icons.bluetooth : Icons.bluetooth_connected,
                        color: device.isClassic ? Colors.orange : Colors.blue,
                      ),
                      title: Text(
                        device.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                      subtitle: Text(
                        device.address,
                        style: TextStyle(
                          color: theme.colorScheme.onSurface.withOpacity(0.5),
                        ),
                      ),
                      trailing: _isConnecting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(Icons.chevron_right, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                      onTap: _isConnecting ? null : () => _connectToDevice(device),
                    ),
                  );
                },
              ),
            ),
          ] else if (!isConnected && !_isSearching) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                'No devices listed. Tap search above.',
                style: TextStyle(
                  fontSize: 12,
                  color: theme.colorScheme.onSurface.withOpacity(0.4),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
