import 'dart:async';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/plotter_service.dart';
import 'head_pressure_dialog.dart';

class PlotterConnectionSheet extends StatefulWidget {
  const PlotterConnectionSheet({super.key});

  @override
  State<PlotterConnectionSheet> createState() => _PlotterConnectionSheetState();
}

class _PlotterConnectionSheetState extends State<PlotterConnectionSheet>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final PlotterService _plotterService = PlotterService();
  late TabController _tabController;

  List<PlotterDevice> _usbDevices = [];
  List<PlotterDevice> _btDevices = [];
  bool _isCheckingUsb = false;
  bool _isSearchingBt = false;
  bool _isConnecting = false;
  bool _isBtEnabled = true;
  Timer? _usbPollingTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Default to USB tab if already connected via USB, else check USB immediately
    final isUsbActive = _plotterService.isUsbPlotter;
    _tabController = TabController(length: 2, vsync: this, initialIndex: isUsbActive ? 0 : 0);
    _tabController.addListener(_handleTabChange);
    _plotterService.addListener(_onServiceChange);

    // Automatically check for connected USB devices and Bluetooth state on open
    _checkUsbDevices();
    _checkBluetoothState();

    // Auto-poll USB every 2 seconds when on USB tab so plugged devices appear instantly
    _usbPollingTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (mounted && _tabController.index == 0 && !_isConnecting) {
        _checkUsbDevices(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _usbPollingTimer?.cancel();
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
      _checkUsbDevices();
    }
  }

  void _handleTabChange() {
    if (_tabController.index == 1) {
      _checkBluetoothState();
    } else if (_tabController.index == 0) {
      _checkUsbDevices();
    }
  }

  void _onServiceChange() {
    if (mounted) {
      _checkUsbDevices(silent: true);
      setState(() {});
    }
  }

  /// Verifies whether the device's Bluetooth radio is enabled
  Future<void> _checkBluetoothState() async {
    final enabled = await _plotterService.isBluetoothEnabled();
    if (mounted) {
      setState(() => _isBtEnabled = enabled);
    }
  }

  /// Prompts to enable Bluetooth, waits briefly, and refreshes state
  Future<void> _enableBluetooth() async {
    await _plotterService.requestEnableBluetooth();
    await Future.delayed(const Duration(milliseconds: 1000));
    await _checkBluetoothState();
    if (_isBtEnabled && mounted) {
      _startBtSearch();
    }
  }

  /// Modal dialog when Bluetooth is required
  void _showEnableBluetoothDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.bluetooth_disabled_rounded, color: Colors.orange, size: 24),
            SizedBox(width: 10),
            Text('Bluetooth Required', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Bluetooth is turned off on your device. Please turn on Bluetooth to discover and connect to wireless cutting plotters.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _plotterService.openBluetoothSettings();
            },
            icon: const Icon(Icons.settings, size: 16),
            label: const Text('Settings'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 40),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await _enableBluetooth();
            },
            icon: const Icon(Icons.bluetooth, size: 16),
            label: const Text('Turn On'),
          ),
        ],
      ),
    );
  }

  /// Instantly checks for connected USB OTG plotters without needing Bluetooth permissions
  Future<void> _checkUsbDevices({bool silent = false}) async {
    if (!silent) setState(() => _isCheckingUsb = true);
    try {
      final devices = await _plotterService.getConnectedUsbDevices();
      if (mounted) {
        setState(() {
          _usbDevices = devices;
          if (!silent) _isCheckingUsb = false;
        });
      }
    } catch (e) {
      if (mounted && !silent) setState(() => _isCheckingUsb = false);
    }
  }

  /// Searches for Bluetooth BLE and Classic SPP plotters
  Future<void> _startBtSearch() async {
    // 1. Check if Bluetooth radio is enabled
    final isEnabled = await _plotterService.isBluetoothEnabled();
    if (!isEnabled) {
      if (mounted) {
        setState(() => _isBtEnabled = false);
        _showEnableBluetoothDialog();
      }
      return;
    }
    if (mounted) {
      setState(() => _isBtEnabled = true);
    }

    // 2. Request runtime permissions
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
          const SnackBar(content: Text('Bluetooth & Location permissions are required for wireless search.')),
        );
      }
      return;
    }

    setState(() {
      _isSearchingBt = true;
      _btDevices = [];
    });

    try {
      final devices = await _plotterService.search(timeout: 8000);
      if (mounted) {
        setState(() {
          // Filter out USB devices from Bluetooth tab
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
        _showEnableBluetoothDialog();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSearchingBt = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Bluetooth search error: $e')),
        );
      }
    }
  }

  Future<void> _connectToDevice(PlotterDevice device) async {
    // If connecting via Bluetooth, ensure Bluetooth is still turned on
    if (!device.isUsb) {
      final isEnabled = await _plotterService.isBluetoothEnabled();
      if (!isEnabled) {
        if (mounted) {
          setState(() => _isBtEnabled = false);
          _showEnableBluetoothDialog();
        }
        return;
      }
    }

    setState(() => _isConnecting = true);

    final connectResult = await _plotterService.connect(device);

    if (mounted) {
      setState(() => _isConnecting = false);

      final isSuccess = connectResult['success'] == true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isSuccess
              ? 'Connected to ${device.name} via ${device.isUsb ? "USB Cable" : "Bluetooth"}'
              : 'Failed to connect: ${connectResult['error'] ?? "Unknown error"}'),
          backgroundColor: isSuccess ? Colors.green : Colors.red,
        ),
      );

      // Refresh USB status
      if (device.isUsb) {
        _checkUsbDevices();
      }
    }
  }

  Future<void> _disconnect() async {
    await _plotterService.disconnect();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Plotter disconnected')),
      );
      _checkUsbDevices();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final connectedAddress = _plotterService.connectedAddress;
    final connectedName = _plotterService.connectedName;
    final isConnected = connectedAddress != null;
    final isUsb = _plotterService.isUsbPlotter;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
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
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withOpacity(0.15),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Header with connection pill
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isConnected
                      ? Colors.green.withOpacity(0.12)
                      : const Color(0xFF4F46E5).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isConnected
                      ? (isUsb ? Icons.usb_rounded : Icons.bluetooth_connected)
                      : Icons.print_outlined,
                  color: isConnected ? Colors.green : const Color(0xFF4F46E5),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Plotter Connection',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ),
              if (isConnected) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green, size: 12),
                      const SizedBox(width: 4),
                      Text(
                        isUsb ? 'USB' : 'BT',
                        style: const TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Active Connection Banner
          if (isConnected)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : Colors.green.shade50.withOpacity(0.5),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.green.withOpacity(0.35)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isUsb ? Icons.usb_rounded : Icons.bluetooth_connected,
                          color: Colors.green.shade700,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              connectedName ?? 'Plotter',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$connectedAddress • ${isUsb ? "Direct USB OTG Cable" : (_plotterService.isClassicPlotter ? "Bluetooth SPP" : "BLE SDK")}',
                              style: TextStyle(
                                fontSize: 11,
                                color: theme.colorScheme.onSurface.withOpacity(0.6),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.refresh, color: Colors.orange[700], size: 22),
                        tooltip: 'Reset connection',
                        onPressed: () async {
                          final success = await _plotterService.reset();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Plotter reset signal sent!' : 'Reset failed.'),
                                backgroundColor: success ? Colors.green : Colors.red,
                              ),
                            );
                          }
                        },
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: Colors.red[400], size: 20),
                        tooltip: 'Disconnect',
                        onPressed: _disconnect,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  // Head Pressure & Force Control Action
                  InkWell(
                    onTap: () => HeadPressureDialog.show(context),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF4F46E5).withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF4F46E5).withOpacity(0.25)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.tune_rounded, size: 18, color: Color(0xFF4F46E5)),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Head Pressure & Force Control',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF4F46E5),
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF4F46E5),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Force: ${_plotterService.currentForce}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right, size: 16, color: Color(0xFF4F46E5)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Connection Mode Tabs (USB vs Bluetooth)
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
              labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              tabs: const [
                Tab(
                  iconMargin: EdgeInsets.zero,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.usb_rounded, size: 16),
                        SizedBox(width: 6),
                        Text('USB Cable'),
                      ],
                    ),
                  ),
                ),
                Tab(
                  iconMargin: EdgeInsets.zero,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.bluetooth, size: 16),
                        SizedBox(width: 6),
                        Text('Bluetooth'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Tab Views
          SizedBox(
            height: 280,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildUsbTabView(theme, isDark, isConnected, isUsb),
                _buildBluetoothTabView(theme, isDark, isConnected),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// USB OTG Tab View
  Widget _buildUsbTabView(ThemeData theme, bool isDark, bool isConnected, bool isUsb) {
    if (isConnected && isUsb) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.usb_rounded, size: 48, color: Colors.green),
            ),
            const SizedBox(height: 12),
            Text(
              'Plotter Connected via USB Cable',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: theme.colorScheme.onSurface),
            ),
            const SizedBox(height: 4),
            Text(
              'Your plotter is ready for direct high-speed cutting.',
              style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withOpacity(0.6)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _disconnect,
              icon: const Icon(Icons.power_settings_new, size: 16),
              label: const Text('Disconnect USB'),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_usbDevices.isNotEmpty) ...[
            Row(
              children: [
                Text(
                  'Detected USB Plotter',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${_usbDevices.length} Detected',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._usbDevices.map((device) {
              final hasPerm = device.hasUsbPermission;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFFAF5FF),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.purple.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.purple.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.usb_rounded, color: Colors.purple, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  device.name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (hasPerm ? Colors.green : Colors.orange).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  hasPerm ? 'Ready' : 'Needs Access',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: hasPerm ? Colors.green.shade700 : Colors.orange.shade800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            device.serialNumber != null && device.serialNumber!.isNotEmpty
                                ? 'S/N: ${device.serialNumber} • OTG Port'
                                : (device.vendorId != null
                                    ? 'VID: 0x${device.vendorId!.toRadixString(16).padLeft(4, '0').toUpperCase()} PID: 0x${device.productId!.toRadixString(16).padLeft(4, '0').toUpperCase()} • OTG Port'
                                    : 'Plugged into OTG port'),
                            style: TextStyle(fontSize: 11, color: Colors.purple.shade700, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.purple,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(0, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      onPressed: _isConnecting ? null : () => _connectToDevice(device),
                      child: _isConnecting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(hasPerm ? 'Connect' : 'Allow & Connect', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                  ],
                ),
              );
            }),
          ] else ...[
            // Live scanning status bar
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 1.8, color: Colors.blue.shade700),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Scanning USB port • 0 devices connected',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.blue.shade300 : Colors.blue.shade800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Helpful USB OTG Connection Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : Colors.grey.shade200,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: Color(0xFF4F46E5)),
                      SizedBox(width: 8),
                      Text(
                        'Device card not showing? Check these:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _buildStepRow('1', 'Remove phone cover/case so the OTG adapter plugs in all the way.'),
                  const SizedBox(height: 6),
                  _buildStepRow('2', 'Turn plotter power ON (must be plugged into wall power socket).'),
                  const SizedBox(height: 6),
                  _buildStepRow('3', 'Ensure using a genuine USB-C OTG Host adapter, not a charging converter.'),
                  const SizedBox(height: 6),
                  _buildStepRow('4', 'Unplug and firmly re-seat the OTG adapter in your phone.'),
                  const SizedBox(height: 10),
                  // OTG phone setting notice
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.orange.withOpacity(0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.lightbulb_outline, color: Colors.orange, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Vivo, Oppo, Realme, OnePlus: Enable "OTG Connection" in Phone Settings.\nSamsung: Disable "Auto Blocker > Block USB" if active.',
                            style: TextStyle(fontSize: 11, color: isDark ? Colors.orange.shade200 : Colors.orange.shade900, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),

          // Action Buttons: Detect and OTG Settings
          Row(
            children: [
              Expanded(
                flex: 3,
                child: SizedBox(
                  height: 46,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF4F46E5),
                      side: const BorderSide(color: Color(0xFF4F46E5)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _isCheckingUsb ? null : _checkUsbDevices,
                    icon: _isCheckingUsb
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF4F46E5)),
                          )
                        : const Icon(Icons.refresh_rounded, size: 18),
                    label: Text(
                      _isCheckingUsb ? 'Checking...' : 'Detect USB Plotter',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 46,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange.shade700,
                      side: BorderSide(color: Colors.orange.shade300),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => _plotterService.openOtgSettings(),
                    icon: const Icon(Icons.settings, size: 16),
                    label: const Text(
                      'OTG Settings',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepRow(String step, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 18,
          height: 18,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: Color(0xFF4F46E5),
            shape: BoxShape.circle,
          ),
          child: Text(
            step,
            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 12, color: Colors.black87),
          ),
        ),
      ],
    );
  }

  /// Bluetooth Tab View
  Widget _buildBluetoothTabView(ThemeData theme, bool isDark, bool isConnected) {
    if (!_isBtEnabled) {
      return Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.bluetooth_disabled_rounded, size: 44, color: Colors.orange.shade700),
              ),
              const SizedBox(height: 12),
              Text(
                'Bluetooth is Turned Off',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Please turn on Bluetooth to scan for and connect to wireless cutting plotters.',
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.colorScheme.onSurface.withOpacity(0.65),
                    height: 1.3,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _plotterService.openBluetoothSettings(),
                    icon: const Icon(Icons.settings, size: 16),
                    label: const Text('Settings', style: TextStyle(fontSize: 13)),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    onPressed: _enableBluetooth,
                    icon: const Icon(Icons.bluetooth, size: 16),
                    label: const Text('Turn On Bluetooth', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            onPressed: _isSearchingBt || _isConnecting ? null : _startBtSearch,
            icon: _isSearchingBt
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.bluetooth_searching, size: 18),
            label: Text(
              _isSearchingBt ? 'Searching Bluetooth...' : 'Scan Bluetooth Plotters',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            ),
          ),
        ),
        const SizedBox(height: 10),

        Expanded(
          child: _btDevices.isEmpty
              ? Center(
                  child: Text(
                    _isSearchingBt ? 'Scanning for nearby plotters...' : 'Tap "Scan Bluetooth Plotters" above.',
                    style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                  ),
                )
              : ListView.builder(
                  itemCount: _btDevices.length,
                  itemBuilder: (context, index) {
                    final device = _btDevices[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? const Color(0xFF334155) : Colors.grey.shade200,
                        ),
                      ),
                      child: ListTile(
                        dense: true,
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: device.isClassic
                                ? Colors.orange.withOpacity(0.12)
                                : Colors.blue.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            device.isClassic ? Icons.bluetooth : Icons.bluetooth_connected,
                            color: device.isClassic ? Colors.orange : Colors.blue,
                            size: 18,
                          ),
                        ),
                        title: Text(
                          device.name,
                          style: TextStyle(fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface),
                        ),
                        subtitle: Text(
                          device.address,
                          style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurface.withOpacity(0.5)),
                        ),
                        trailing: _isConnecting
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.chevron_right, size: 20),
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
