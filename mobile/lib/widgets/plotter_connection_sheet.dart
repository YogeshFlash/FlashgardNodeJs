import 'dart:async';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/plotter_service.dart';
import 'cutting_plotter_icon.dart';

class PlotterConnectionSheet extends StatefulWidget {
  const PlotterConnectionSheet({super.key});

  @override
  State<PlotterConnectionSheet> createState() => _PlotterConnectionSheetState();
}

class _PlotterConnectionSheetState extends State<PlotterConnectionSheet>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final PlotterService _plotterService = PlotterService();
  late TabController _tabController;

  List<PlotterDevice> _otgDevices = [];
  List<PlotterDevice> _btDevices = [];
  bool _isSearchingBt = false;
  bool _isConnecting = false;
  String? _connectingAddress;
  bool _isBtEnabled = true;
  Timer? _otgPollingTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    final isUsbActive = _plotterService.isUsbPlotter;
    _tabController = TabController(length: 2, vsync: this, initialIndex: isUsbActive ? 0 : 0);
    _tabController.addListener(_handleTabChange);
    _plotterService.addListener(_onServiceChange);

    // Initial silent detection
    _checkOtgDevices(silent: true);
    _checkBluetoothState();

    // Auto-poll OTG every 1.5 seconds silently for instant plug-and-play detection
    _otgPollingTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      if (mounted && _tabController.index == 0 && !_isConnecting) {
        _checkOtgDevices(silent: true);
      }
    });

    // If starting on Bluetooth tab, automatically begin scan with zero taps
    if (_tabController.index == 1) {
      _startBtSearch();
    }
  }

  @override
  void dispose() {
    _otgPollingTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    _plotterService.removeListener(_onServiceChange);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkBluetoothState();
      _checkOtgDevices(silent: true);
    }
  }

  void _handleTabChange() {
    if (_tabController.index == 1) {
      _checkBluetoothState();
      // Auto-scan Bluetooth immediately upon switching tabs (eliminates extra tap)
      if (!_isSearchingBt && !_isConnecting) {
        _startBtSearch();
      }
    } else if (_tabController.index == 0) {
      _checkOtgDevices(silent: true);
    }
  }

  void _onServiceChange() {
    if (mounted) {
      _checkOtgDevices(silent: true);
      setState(() {});
    }
  }

  Future<void> _checkBluetoothState() async {
    final enabled = await _plotterService.isBluetoothEnabled();
    if (mounted) {
      setState(() => _isBtEnabled = enabled);
    }
  }

  Future<void> _enableBluetooth() async {
    await _plotterService.requestEnableBluetooth();
    await Future.delayed(const Duration(milliseconds: 800));
    await _checkBluetoothState();
    if (_isBtEnabled && mounted) {
      _startBtSearch();
    }
  }

  Future<void> _checkOtgDevices({bool silent = true}) async {
    try {
      final devices = await _plotterService.getConnectedUsbDevices();
      if (mounted) {
        setState(() {
          _otgDevices = devices;
        });
      }
    } catch (_) {}
  }

  Future<void> _startBtSearch() async {
    final isEnabled = await _plotterService.isBluetoothEnabled();
    if (!isEnabled) {
      if (mounted) {
        setState(() => _isBtEnabled = false);
      }
      return;
    }
    if (mounted) {
      setState(() => _isBtEnabled = true);
    }

    try {
      await [
        Permission.bluetoothScan,
        Permission.bluetoothConnect,
        Permission.location,
      ].request();
    } catch (_) {}

    if (!mounted) return;
    setState(() {
      _isSearchingBt = true;
      _btDevices = [];
    });

    try {
      final devices = await _plotterService.search(timeout: 7000);
      if (mounted) {
        setState(() {
          _btDevices = devices.where((d) => !d.isUsb).toList();
          _isSearchingBt = false;
        });
      }
    } on BluetoothDisabledException {
      if (mounted) {
        setState(() {
          _isBtEnabled = false;
          _isSearchingBt = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSearchingBt = false);
      }
    }
  }

  Future<void> _connectToDevice(PlotterDevice device) async {
    if (!device.isUsb) {
      final isEnabled = await _plotterService.isBluetoothEnabled();
      if (!isEnabled) {
        if (mounted) {
          setState(() => _isBtEnabled = false);
        }
        return;
      }
    }

    setState(() {
      _isConnecting = true;
      _connectingAddress = device.address;
    });

    final connectResult = await _plotterService.connect(device);

    if (mounted) {
      setState(() {
        _isConnecting = false;
        _connectingAddress = null;
      });

      final isSuccess = connectResult['success'] == true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isSuccess
              ? 'Connected to ${device.name} via ${device.isUsb ? "OTG" : "Bluetooth"}'
              : 'Failed to connect: ${connectResult['error'] ?? "Unknown error"}'),
          backgroundColor: isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          duration: const Duration(seconds: 2),
        ),
      );

      if (device.isUsb) {
        _checkOtgDevices(silent: true);
      }

      // Automatically close sheet on success to save an extra dismissal tap
      if (isSuccess) {
        Navigator.pop(context);
      }
    }
  }

  Future<void> _disconnect() async {
    await _plotterService.disconnect();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Plotter disconnected'),
          duration: Duration(seconds: 2),
        ),
      );
      _checkOtgDevices(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final connectedAddress = _plotterService.connectedAddress;
    final connectedName = _plotterService.connectedName;
    final isConnected = connectedAddress != null;
    final isOtg = _plotterService.isUsbPlotter;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withOpacity(0.18),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isConnected
                      ? const Color(0xFF10B981).withOpacity(0.12)
                      : theme.colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: CuttingPlotterIcon(
                  size: 20,
                  color: isConnected ? const Color(0xFF10B981) : theme.colorScheme.primary,
                  isConnected: isConnected,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Plotter Connection',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ),
              if (isConnected)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 12),
                      const SizedBox(width: 4),
                      Text(
                        isOtg ? 'OTG' : 'BT',
                        style: const TextStyle(
                          color: Color(0xFF10B981),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Active Connection Banner
          if (isConnected)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.35)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isOtg ? Icons.cable_rounded : Icons.bluetooth_connected_rounded,
                      color: const Color(0xFF10B981),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          connectedName ?? 'Plotter',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          isOtg ? 'Connected via OTG' : 'Connected via Bluetooth',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF10B981),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.refresh_rounded, color: Colors.amber.shade700, size: 20),
                    tooltip: 'Reset connection',
                    visualDensity: VisualDensity.compact,
                    onPressed: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      final success = await _plotterService.reset();
                      if (!mounted) return;
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Plotter reset signal sent' : 'Reset failed'),
                          backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.power_settings_new_rounded, color: Color(0xFFEF4444), size: 20),
                    tooltip: 'Disconnect',
                    visualDensity: VisualDensity.compact,
                    onPressed: _disconnect,
                  ),
                ],
              ),
            ),

          // Segmented Tabs: OTG vs Bluetooth
          Container(
            height: 42,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: theme.colorScheme.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: theme.colorScheme.onSurface.withOpacity(0.6),
              labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              tabs: const [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.cable_rounded, size: 16),
                      SizedBox(width: 6),
                      Text('OTG'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bluetooth_rounded, size: 16),
                      SizedBox(width: 6),
                      Text('Bluetooth'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Content Views
          SizedBox(
            height: 240,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOtgTabView(theme, isDark, isConnected, isOtg),
                _buildBluetoothTabView(theme, isDark, isConnected),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Ultra-streamlined OTG Tab (No help text, no scanning USB port text)
  Widget _buildOtgTabView(ThemeData theme, bool isDark, bool isConnected, bool isOtg) {
    if (isConnected && isOtg) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cable_rounded, size: 40, color: Color(0xFF10B981)),
            ),
            const SizedBox(height: 12),
            Text(
              'Plotter Connected via OTG',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 15,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFEF4444),
                side: const BorderSide(color: Color(0xFFEF4444)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                minimumSize: const Size(160, 40),
              ),
              onPressed: _disconnect,
              icon: const Icon(Icons.power_settings_new_rounded, size: 16),
              label: const Text('Disconnect OTG', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ),
          ],
        ),
      );
    }

    // When OTG plotter is physically plugged in
    if (_otgDevices.isNotEmpty) {
      return ListView.builder(
        itemCount: _otgDevices.length,
        itemBuilder: (context, index) {
          final device = _otgDevices[index];
          final isThisConnecting = _isConnecting && _connectingAddress == device.address;

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFFAF5FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.purple.withOpacity(0.3)),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: _isConnecting ? null : () => _connectToDevice(device),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.cable_rounded, color: Colors.purple, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          device.name,
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Plugged via OTG',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.purple.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purple,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(80, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    onPressed: _isConnecting ? null : () => _connectToDevice(device),
                    child: isThisConnecting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text(
                            'Connect',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                          ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    }

    // Empty state: Minimalist, no scanning port bar, no help text paragraphs
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.cable_rounded,
              size: 36,
              color: theme.colorScheme.onSurface.withOpacity(0.35),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'No OTG Plotter Detected',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Plug in your OTG adapter to connect automatically',
            style: TextStyle(
              fontSize: 11,
              color: theme.colorScheme.onSurface.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.orange.shade800,
              side: BorderSide(color: Colors.orange.shade300),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              visualDensity: VisualDensity.compact,
            ),
            onPressed: () => _plotterService.openOtgSettings(),
            icon: const Icon(Icons.settings, size: 14),
            label: const Text('OTG Settings', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  /// Streamlined Bluetooth Tab (Auto-searches, 1-tap connect, no help text)
  Widget _buildBluetoothTabView(ThemeData theme, bool isDark, bool isConnected) {
    if (!_isBtEnabled) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.bluetooth_disabled_rounded, size: 36, color: Colors.orange.shade700),
            ),
            const SizedBox(height: 10),
            Text(
              'Bluetooth is Turned Off',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 14,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    visualDensity: VisualDensity.compact,
                  ),
                  onPressed: () => _plotterService.openBluetoothSettings(),
                  child: const Text('Settings', style: TextStyle(fontSize: 12)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    visualDensity: VisualDensity.compact,
                    elevation: 0,
                  ),
                  onPressed: _enableBluetooth,
                  child: const Text('Turn On', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Compact Status & Re-scan bar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  _isSearchingBt ? 'Scanning nearby plotters...' : 'Nearby Devices',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                if (_isSearchingBt) ...[
                  const SizedBox(width: 8),
                  const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 1.8),
                  ),
                ],
              ],
            ),
            IconButton(
              icon: Icon(Icons.refresh_rounded, size: 18, color: theme.colorScheme.primary),
              visualDensity: VisualDensity.compact,
              tooltip: 'Scan again',
              onPressed: _isSearchingBt || _isConnecting ? null : _startBtSearch,
            ),
          ],
        ),
        const SizedBox(height: 4),

        // Device List (1-tap connect)
        Expanded(
          child: _btDevices.isEmpty
              ? Center(
                  child: _isSearchingBt
                      ? const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                            SizedBox(height: 8),
                            Text('Scanning for plotters...', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'No Bluetooth plotters found',
                              style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withOpacity(0.5)),
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: _startBtSearch,
                              icon: const Icon(Icons.search, size: 14),
                              label: const Text('Scan Again', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                )
              : ListView.builder(
                  itemCount: _btDevices.length,
                  itemBuilder: (context, index) {
                    final device = _btDevices[index];
                    final isThisConnecting = _isConnecting && _connectingAddress == device.address;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? const Color(0xFF334155) : Colors.grey.shade200,
                        ),
                      ),
                      child: ListTile(
                        dense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.bluetooth_connected_rounded,
                            color: Color(0xFF3B82F6),
                            size: 18,
                          ),
                        ),
                        title: Text(
                          device.name,
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        subtitle: Text(
                          device.address,
                          style: TextStyle(
                            fontSize: 10,
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                          ),
                        ),
                        trailing: isThisConnecting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: theme.colorScheme.primary,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(64, 30),
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  elevation: 0,
                                ),
                                onPressed: _isConnecting ? null : () => _connectToDevice(device),
                                child: const Text(
                                  'Connect',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                        onTap: _isConnecting ? null : () => _connectToDevice(device),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
