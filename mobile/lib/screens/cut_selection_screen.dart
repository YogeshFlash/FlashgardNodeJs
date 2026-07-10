import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/plotter_service.dart';
import 'diy_designer_screen.dart';

class CutSelectionScreen extends StatefulWidget {
  final Map<String, dynamic> item;

  const CutSelectionScreen({super.key, required this.item});

  @override
  State<CutSelectionScreen> createState() => _CutSelectionScreenState();
}

class _CutSelectionScreenState extends State<CutSelectionScreen> {
  final PlotterService _plotterService = PlotterService();
  List<dynamic> _designs = [];
  bool _isLoading = true;
  bool _isCutting = false;
  String _loadingMessage = 'Processing...';
  int _cutProgress = 0;
  int _selectedSpeed = 300;
  int _selectedForce = 300;
  String? _connectionType;
  double? _selectedWidth;
  double? _selectedHeight;
  double? _pageWidth;
  double? _pageHeight;
  Map<String, int>? _machineParams;
  StreamSubscription<int>? _progressSubscription;

  @override
  void initState() {
    super.initState();
    _fetchDesigns();
  }

  @override
  void dispose() {
    _progressSubscription?.cancel();
    super.dispose();
  }

  Future<void> _fetchDesigns() async {
    final designs = await ApiService.getModelCutFiles(widget.item['id']);
    if (mounted) {
      setState(() {
        _designs = designs;
        _isLoading = false;
      });
    }
  }

  static const _s3CatalogBaseUrl = 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog';

  String _getImageUrl(dynamic item) {
    final path = item['imageUrl']?.toString() ?? '';
    if (path.isNotEmpty) {
      if (path.startsWith('http')) return path;
      if (!path.contains('/')) {
        return '$_s3CatalogBaseUrl/$path';
      }
      final cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return '${ApiService.baseUrl.replaceFirst('/api', '')}/$cleanPath';
    }
    
    final name = item['name']?.toString() ?? '';
    if (name.isEmpty) return '$_s3CatalogBaseUrl/Phone.jpg';
    
    final formattedName = name[0].toUpperCase() + name.substring(1).toLowerCase();
    return '$_s3CatalogBaseUrl/$formattedName.jpg';
  }

  Widget _buildModelImage() {
    final imageUrl = _getImageUrl(widget.item);
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Image.network(
        imageUrl,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) {
          return Icon(Icons.smartphone, size: 64, color: Theme.of(context).colorScheme.primary);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.item['name']),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: Stack(
        children: [
          Container(
            color: Colors.white,
            child: Column(
              children: [
                // Model Header
                Container(
                  padding: const EdgeInsets.all(24),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: _buildModelImage(),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Select Cut Design',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[900],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Choose the protection style for your device',
                        style: TextStyle(color: Colors.grey[600], fontSize: 14),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _designs.isEmpty
                          ? _buildEmptyState()
                          : RefreshIndicator(
                              color: const Color(0xFFCE1D19),
                              backgroundColor: Colors.white,
                              onRefresh: _fetchDesigns,
                              child: ListView.builder(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.all(16),
                                itemCount: _designs.length,
                                itemBuilder: (context, index) {
                                  final design = _designs[index];
                                  return _buildDesignCard(design);
                                },
                              ),
                            ),
                ),
              ],
            ),
          ),
          if (_isCutting)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: Center(
                child: Card(
                  margin: const EdgeInsets.all(32),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircularProgressIndicator(),
                        const SizedBox(height: 24),
                        Text(_loadingMessage, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        const SizedBox(height: 16),
                        if (_isCutting && _loadingMessage.contains('Cutting')) ...[
                          LinearProgressIndicator(
                            value: _cutProgress / 100,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
                          ),
                          const SizedBox(height: 8),
                          Text('$_cutProgress%', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                        const SizedBox(height: 8),
                        const Text('Please keep your phone near the plotter', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.layers_clear_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text(
            'No designs available',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          const Text(
            'Check back later for new patterns',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildDesignCard(dynamic design) {
    final cutType = design['cutPattern']?['name'] ?? 'Custom Cut';
    final desc = design['cutPattern']?['description'] ?? 'Precision design for this model';
    final previewPath = design['designFilePath'];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DiyDesignerScreen(
                initialCutFileId: design['id'],
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: (previewPath != null && previewPath.isNotEmpty)
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          previewPath.startsWith('http')
                              ? previewPath
                              : '${ApiService.baseUrl.replaceFirst('/api', '')}${previewPath.startsWith('/') ? '' : '/'}$previewPath',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(Icons.layers_outlined, size: 32, color: Theme.of(context).colorScheme.primary);
                          },
                        ),
                      )
                    : Icon(Icons.layers_outlined, size: 32, color: Theme.of(context).colorScheme.primary),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cutType,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      desc,
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }


  Future<void> _showCutConfirmation(dynamic design) async {
    final isConnected = await _plotterService.isConnected();
    final connType = await _plotterService.getConnectionType();
    if (isConnected) {
      final size = await _plotterService.getPageSize();
      Map<String, int>? params;
      if (connType != 'classic') {
        params = await _plotterService.getMachineParameters();
      }
      if (mounted) {
        setState(() {
          _connectionType = connType;
          _pageWidth = size?['width'];
          _pageHeight = size?['height'];
          _machineParams = params;
          
          // Pre-fill from hardware if available
          if (params != null) {
            _selectedSpeed = params['speed'] ?? 300;
          }
          _selectedWidth = _pageWidth ?? 180.0;
          _selectedHeight = _pageHeight ?? 297.0; // Default A4 if 0
          if (_selectedHeight == 0) _selectedHeight = 297.0; 
        });
      }
    }
    
    if (!mounted) return;

    if (!isConnected) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Plotter Not Connected'),
          content: const Text('Please connect to the plotter in settings before cutting.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                // The main navigation handles settings tab, but for simplicity here 
                // we just tell the user to use the tab.
              },
              child: const Text('Go to Settings'),
            ),
          ],
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              const Text('Confirm Cut'),
              const SizedBox(width: 8),
              if (_connectionType != null && !(widget.item['name']?.toString().toLowerCase().contains('portrait2') ?? false))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _connectionType == 'classic' ? Colors.orange.withOpacity(0.15) : Colors.blue.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _connectionType == 'classic' ? Colors.orange : Colors.blue),
                  ),
                  child: Text(
                    _connectionType == 'classic' ? 'Standard BT' : 'SDK',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _connectionType == 'classic' ? Colors.orange[800] : Colors.blue[800]),
                  ),
                ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Are you sure you want to cut the ${design['cutPattern']?['name'] ?? 'pattern'} for ${widget.item['name']}?'),
              const SizedBox(height: 20),
              const Text('Cutting Speed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Slider(
                value: _selectedSpeed.toDouble(),
                min: 10,
                max: 1000,
                divisions: 99,
                label: '$_selectedSpeed',
                onChanged: (val) => setDialogState(() => _selectedSpeed = val.toInt()),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Width (mm)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        TextField(
                          decoration: const InputDecoration(hintText: '208.0'),
                          keyboardType: TextInputType.number,
                          onChanged: (val) => _selectedWidth = double.tryParse(val) ?? _selectedWidth,
                          controller: TextEditingController(text: _selectedWidth?.toStringAsFixed(0)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Height (mm)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        TextField(
                          decoration: const InputDecoration(hintText: '297'),
                          keyboardType: TextInputType.number,
                          onChanged: (val) => _selectedHeight = double.tryParse(val) ?? _selectedHeight,
                          controller: TextEditingController(text: _selectedHeight?.toStringAsFixed(0)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (_machineParams != null && _connectionType != 'classic') ...[
                const SizedBox(height: 16),
                const Text('Current Machine Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blue)),
                Text('HW Speed: ${_machineParams?['speed']}, HW Force: ${_machineParams?['pressure']}, HW Width: ${_machineParams?['width']}', 
                  style: const TextStyle(fontSize: 11, color: Colors.blue)),
              ],
              if (_connectionType == 'classic') ...[
                const SizedBox(height: 16),
                const Text('Direct Bluetooth — PLT data will be sent as-is', style: TextStyle(fontSize: 11, color: Colors.orange, fontStyle: FontStyle.italic)),
              ],
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _handleCut(design);
              },
              child: const Text('START CUTTING'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleCut(dynamic design) async {
    setState(() {
      _isCutting = true;
      _loadingMessage = 'Validating Cut...';
    });

    try {
      // Validate Cut on Backend
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final validation = await ApiService.validateCut(
        licenseKey: authProvider.licenseKey,
        organizationId: authProvider.organizationId,
        modelId: widget.item['id'] ?? '',
      );

      if (validation == null || validation['valid'] != true || validation['cutToken'] == null) {
        final reason = validation?['error'] ?? 'Insufficient credits or inactive license.';
        throw Exception('Cut validation failed: $reason');
      }

      final cutToken = validation['cutToken'] as String;

      if (mounted) {
        setState(() {
          _loadingMessage = 'Downloading Design...';
        });
      }

      // PHASE 1: Complete Download from Database
      // This ensures we have the full file on the phone before touching the hardware
      final details = await ApiService.getCutFileDetails(design['id']);
      
      if (details == null || details['encryptedPltData'] == null) {
        throw Exception('Could not fetch cut file data from server. Please check your connection.');
      }

      // PHASE 2: Data Extraction & Validation
      List<int> encryptedBytes = [];
      final rawData = details['encryptedPltData'];
      
      if (rawData is String) {
        encryptedBytes = base64Decode(rawData);
      } else if (rawData is Map && rawData['data'] != null) {
        encryptedBytes = List<int>.from(rawData['data']);
      } else if (rawData is List) {
        encryptedBytes = List<int>.from(rawData);
      }

      if (encryptedBytes.length < 16) {
        throw Exception('Invalid or corrupted encrypted data');
      }

      // Decrypt the data
      // Key must be the same as backend (32 chars)
      final key = encrypt.Key.fromUtf8('flashgard-secure-plt-data-key-32');
      final iv = encrypt.IV(Uint8List.fromList(encryptedBytes.sublist(0, 16)));
      final ciphertext = encryptedBytes.sublist(16);
      
      final encrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.cbc));
      final decrypted = encrypter.decryptBytes(encrypt.Encrypted(Uint8List.fromList(ciphertext)), iv: iv);
      
      String pltContent = utf8.decode(decrypted);

      // Senior Dev: Diagnostic logging to verify decryption
      print('[PlotterService] Decrypted data preview: ${pltContent.substring(0, pltContent.length > 50 ? 50 : pltContent.length)}...');

      if (pltContent.isEmpty) {
        throw Exception('The decrypted design file is empty.');
      }
      
      // Basic validation: HP-GL files should almost always start with 'IN' (Initialize)
      if (!pltContent.trim().toUpperCase().startsWith('IN')) {
        throw Exception('Invalid design data format. Decryption may have failed or file is corrupted.');
      }

      // PHASE 3: Send to Plotter
      // At this point, internet is no longer required
      if (mounted) {
        setState(() {
          _loadingMessage = 'Cutting in Progress...';
          _cutProgress = 0;
        });
      }

      // Listen to real-time progress
      _progressSubscription = _plotterService.progressStream.listen((progress) {
        if (mounted) {
          setState(() {
            _cutProgress = progress;
          });
        }
      });

      final success = await _plotterService.cutFile(
        content: pltContent,
        name: widget.item['name'] ?? 'CutFile',
        speed: _selectedSpeed,
        force: _selectedForce,
        width: _selectedWidth,
        height: _selectedHeight,
      );

      if (success) {
        try {
          await ApiService.logCut(
            cutToken: cutToken,
            plotterId: _plotterService.connectedName ?? 'Plotter',
            isPositiveCut: true,
          );
        } catch (e) {
          print('Error logging cut on server: $e');
        }
      }

      if (mounted) {
        setState(() => _isCutting = false);
        _progressSubscription?.cancel();
        _progressSubscription = null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Cut completed successfully!' : 'Plotter error during cutting'),
            backgroundColor: success ? Colors.green : Colors.red,
            action: success ? null : SnackBarAction(
              label: 'Reset Plotter',
              textColor: Colors.white,
              onPressed: () async {
                final resetSuccess = await _plotterService.reset();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(resetSuccess ? 'Plotter reset/reconnected successfully!' : 'Failed to reset plotter.'),
                      backgroundColor: resetSuccess ? Colors.green : Colors.red,
                    ),
                  );
                }
              },
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCutting = false);
        _progressSubscription?.cancel();
        _progressSubscription = null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'), 
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'Reset Plotter',
              textColor: Colors.white,
              onPressed: () async {
                final resetSuccess = await _plotterService.reset();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(resetSuccess ? 'Plotter reset/reconnected successfully!' : 'Failed to reset plotter.'),
                      backgroundColor: resetSuccess ? Colors.green : Colors.red,
                    ),
                  );
                }
              },
            ),
          ),
        );
      }
    }
  }
}
