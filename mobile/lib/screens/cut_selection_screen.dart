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
import '../services/cut_transaction_service.dart';
import '../widgets/plotter_status_action.dart';
import '../widgets/dim_no_image_placeholder.dart';

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
  int _selectedSpeed = 30;
  int _selectedForce = 33;
  final int _cutPasses = 1;
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

  static const Map<String, String> _brandImageMap = {
    'apple': 'APPLE.jpg',
    'macbook': 'MACBOOK.jpg',
    'samsung': 'Samsung.jpg',
    'xiaomi': 'Xiaomi.jpg',
    'vivo': 'vivo.jpg',
    'oppo': 'Oppo.jpg',
    'oneplus': 'Oneplus.jpg',
    'realme': 'Realme.jpg',
    'motorola': 'Motorola.jpg',
    'nokia': 'Nokia.jpg',
    'google': 'Google.jpg',
    'nothing': 'Nothing.jpg',
    'sony': 'Sony.jpg',
    'lenovo': 'Lenovo.jpg',
    'asus': 'Asus.png',
    'infinix': 'Infinix.jpg',
    'tecno': 'Tecno.jpg',
    'honor': 'Honor.jpg',
    'huawei': 'Huawei.jpg',
    'lg': 'LG.jpg',
    'boat': 'Boat.jpg',
    'noise': 'Noise.jpg',
    'fire boltt': 'Fire Boltt.jpg',
    'fireboltt': 'Fire Boltt.jpg',
    'ptron': 'PTRON.jpg',
    'boult': 'Boult.png',
    'fastrack': 'Fastrack.png',
    'crossbeat': 'Crossbeat.png',
    'dji': 'DJI.png',
    'garmin': 'Garmin.jpg',
    'fitbit': 'Fitbit.jpg',
    'amazfit': 'Amazfit.jpg',
    'portronics': 'Portronics.png',
    'syska': 'Syska.png',
    'molife': 'Molife.png',
    'foxin': 'Foxin.png',
    'maxima': 'Maxima.png',
    'play': 'PLAY.png',
    'og': 'OG.png',
    'u&i': 'U&i.png',
    'iball': 'iball.png',
    'blackberry': 'blackberry.png',
    'zavia': 'Zavia.png',
    'moto': 'Moto.png',
    'meizu': 'MEIZU.jpg',
    'zte': 'ZTE.jpg',
    'comio': 'COMIO.jpg',
    'yu': 'YU.jpg',
    'vertu': 'VERTU.jpg',
    'muvaudio': 'MuvAudio.jpg',
    'ubon': 'Ubon.jpg',
    'vibez': 'Vibez.jpg',
    'corum': 'CORUM.jpg',
    'intex': 'Intex.jpg',
    'minix': 'MINIX.jpg',
    'benco': 'Benco.jpg',
    'tagg': 'TAGG.jpg',
    'goqii': 'GOQii.jpg',
    'xolo': 'Xolo.jpg',
    'realix': 'REALIX.jpg',
    'kratos': 'Kratos.jpg',
    'mobilla': 'Mobilla.jpg',
    'corseca': 'Corseca.jpg',
    'rapz': 'Rapz.jpg',
    'ather': 'ather.jpg',
    'honeybud': 'honeybud.jpg',
    'unix': 'Unix.jpg',
    'helix timex': 'Helix Timex.jpg',
    'timex': 'Timex.jpg',
    'hammer': 'Hammer.jpg',
    'flix': 'FLiX.jpg',
    'tcl': 'TCL.jpg',
    'diesel': 'DIESEL.jpg',
    'palm': 'Palm.jpg',
    'lyf': 'LYF.jpg',
    'soyes': 'Soyes.jpg',
    'kindle': 'Kindle.jpg',
    'tvs': 'TVS.jpg',
    'fujitsu': 'FUJITSU.jpg',
    'i kall': 'I KALL.jpg',
    'tres care': 'TRES CARE.jpg',
    'acer': 'Acer.jpg',
    'suzuki': 'SUZUKI.jpg',
    'gopro': 'GoPro.jpg',
    'infocus': 'Infocus.jpg',
    'jio': 'Jio.jpg',
    'canon': 'Canon.jpg',
    'coolpad': 'coolpad.jpg',
    'oraimo': 'oraimo.jpg',
    'glo': 'glo.jpg',
    'nikon': 'Nikon.jpg',
    'bose': 'Bose.jpg',
    'skullcandy': 'Skullcandy.jpg',
    'itel': 'Itel.jpg',
    'leeco': 'LeEco.jpg',
    'urban': 'Urban.jpg',
    'lava': 'Lava.jpg',
    'micromax': 'Micromax.jpg',
    'gizmore': 'Gizmore.jpg',
    'dizo': 'Dizo.jpg',
    'gionee': 'Gionee.jpg',
    'htc': 'Htc.jpg',
    'panasonic': 'Panasonic.jpg',
    'mafe': 'Mafe.jpg',
    'pebble': 'Pebble.jpg',
  };

  static String _buildS3Url(String path) {
    final cleanPath = path.startsWith('/') ? path.substring(1) : path;
    final encodedSegments = cleanPath.split('/').map((s) => Uri.encodeComponent(s)).join('/');
    return '$_s3CatalogBaseUrl/$encodedSegments';
  }

  String _getImageUrl(dynamic item) {
    final itemName = item['name']?.toString().trim() ?? '';
    final lowerName = itemName.toLowerCase();

    // 1. Direct imageUrl if provided
    final imagePath = item['imageUrl']?.toString().trim() ?? '';
    if (imagePath.isNotEmpty) {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return Uri.encodeFull(imagePath);
      }
      if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
        final cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
        return Uri.encodeFull('${ApiService.baseUrl.replaceFirst('/api', '')}/$cleanPath');
      }
      return _buildS3Url(imagePath);
    }

    // 2. Direct iconUrl if provided
    final iconPath = item['iconUrl']?.toString().trim() ?? '';
    if (iconPath.isNotEmpty &&
        (iconPath.endsWith('.jpg') ||
         iconPath.endsWith('.jpeg') ||
         iconPath.endsWith('.png') ||
         iconPath.endsWith('.webp') ||
         iconPath.startsWith('http') ||
         iconPath.contains('/'))) {
      if (iconPath.startsWith('http://') || iconPath.startsWith('https://')) {
        return Uri.encodeFull(iconPath);
      }
      if (iconPath.startsWith('/uploads/') || iconPath.startsWith('uploads/')) {
        final cleanPath = iconPath.startsWith('/') ? iconPath.substring(1) : iconPath;
        return Uri.encodeFull('${ApiService.baseUrl.replaceFirst('/api', '')}/$cleanPath');
      }
      return _buildS3Url(iconPath);
    }

    // 3. Known Brand S3 Image Mapping
    if (_brandImageMap.containsKey(lowerName)) {
      return _buildS3Url(_brandImageMap[lowerName]!);
    }

    // 4. Fallback by name on S3
    if (itemName.isNotEmpty) {
      final formattedName = itemName[0].toUpperCase() + itemName.substring(1).toLowerCase();
      return _buildS3Url('$formattedName.jpg');
    }

    return _buildS3Url('Phone.jpg');
  }

  Widget _buildModelImage() {
    final imageUrl = _getImageUrl(widget.item);
    final hasDirectImage = (widget.item['imageUrl'] != null && widget.item['imageUrl'].toString().trim().isNotEmpty);

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: (!hasDirectImage && !_brandImageMap.containsKey((widget.item['name']?.toString() ?? '').toLowerCase()))
          ? const DimNoImagePlaceholder(size: 64, isDark: false, label: 'No image')
          : Image.network(
              imageUrl,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const DimNoImagePlaceholder(size: 64, isDark: false, label: 'No image');
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
        actions: const [
          PlotterStatusAction(),
        ],
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
                        if (_isCutting && (_loadingMessage.contains('Cutting') || _loadingMessage.contains('physically'))) ...[
                          LinearProgressIndicator(
                            value: _cutProgress / 100,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
                          ),
                          const SizedBox(height: 8),
                          Text('$_cutProgress%', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                        const SizedBox(height: 16),
                        TextButton.icon(
                          onPressed: () async {
                            await _plotterService.reset();
                            if (mounted) {
                              setState(() {
                                _isCutting = false;
                              });
                            }
                          },
                          icon: const Icon(Icons.cancel, color: Colors.red),
                          label: const Text('Cancel Cut', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                        ),
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
    final rawPreview = design['designFilePath']?.toString().trim() ?? '';
    String? previewUrl;
    if (rawPreview.isNotEmpty) {
      if (rawPreview.startsWith('http://') || rawPreview.startsWith('https://')) {
        previewUrl = Uri.encodeFull(rawPreview);
      } else if (rawPreview.startsWith('/uploads/') || rawPreview.startsWith('uploads/')) {
        final cleanPath = rawPreview.startsWith('/') ? rawPreview.substring(1) : rawPreview;
        previewUrl = Uri.encodeFull('${ApiService.baseUrl.replaceFirst('/api', '')}/$cleanPath');
      } else {
        previewUrl = _buildS3Url(rawPreview);
      }
    }

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
          final String title = "${widget.item['brand']?['name'] ?? ''} > ${widget.item['name'] ?? ''} > ${design['cutPattern']?['name'] ?? ''}";
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DiyDesignerScreen(
                initialCutFileId: design['id'],
                modelId: widget.item['id']?.toString(),
                title: title,
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
                child: (previewUrl != null && previewUrl.isNotEmpty)
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          previewUrl,
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

              // Cutting Speed Header & Selected Value
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Cutting Speed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF4F46E5).withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      '$_selectedSpeed mm/s',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        color: Color(0xFF4F46E5),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              // Speed Controls: [-] Slider [+]
              Row(
                children: [
                  InkWell(
                    onTap: _selectedSpeed > 10
                        ? () => setDialogState(() => _selectedSpeed = (_selectedSpeed - 10).clamp(10, 1000))
                        : null,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _selectedSpeed > 10
                            ? const Color(0xFF4F46E5).withValues(alpha: 0.12)
                            : Colors.grey.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.remove,
                        size: 18,
                        color: _selectedSpeed > 10 ? const Color(0xFF4F46E5) : Colors.grey,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Slider(
                      value: _selectedSpeed.toDouble().clamp(10.0, 100.0),
                      min: 10,
                      max: 100,
                      divisions: 9,
                      label: '$_selectedSpeed mm/s',
                      activeColor: const Color(0xFF4F46E5),
                      onChanged: (val) => setDialogState(() => _selectedSpeed = val.toInt()),
                    ),
                  ),
                  InkWell(
                    onTap: _selectedSpeed < 100
                        ? () => setDialogState(() => _selectedSpeed = (_selectedSpeed + 10).clamp(10, 100))
                        : null,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _selectedSpeed < 100
                            ? const Color(0xFF4F46E5).withValues(alpha: 0.12)
                            : Colors.grey.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.add,
                        size: 18,
                        color: _selectedSpeed < 100 ? const Color(0xFF4F46E5) : Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Cutting Force Header & Selected Value
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Cutting Force / Pressure', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCE1D19).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFCE1D19).withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      '$_selectedForce',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        color: Color(0xFFCE1D19),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              // Force Controls: [-] Slider [+]
              Row(
                children: [
                  InkWell(
                    onTap: _selectedForce > 1
                        ? () => setDialogState(() => _selectedForce = (_selectedForce - 1).clamp(1, 100))
                        : null,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _selectedForce > 1
                            ? const Color(0xFFCE1D19).withValues(alpha: 0.12)
                            : Colors.grey.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.remove,
                        size: 18,
                        color: _selectedForce > 1 ? const Color(0xFFCE1D19) : Colors.grey,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Slider(
                      value: _selectedForce.toDouble().clamp(1.0, 100.0),
                      min: 1,
                      max: 100,
                      divisions: 99,
                      label: '$_selectedForce',
                      activeColor: const Color(0xFFCE1D19),
                      onChanged: (val) => setDialogState(() => _selectedForce = val.toInt()),
                    ),
                  ),
                  InkWell(
                    onTap: _selectedForce < 100
                        ? () => setDialogState(() => _selectedForce = (_selectedForce + 1).clamp(1, 100))
                        : null,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _selectedForce < 100
                            ? const Color(0xFFCE1D19).withValues(alpha: 0.12)
                            : Colors.grey.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.add,
                        size: 18,
                        color: _selectedForce < 100 ? const Color(0xFFCE1D19) : Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

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

    String? currentCutToken;

    try {
      // Validate Cut on Backend via atomic transaction service
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final validation = await CutTransactionService.initiateAndValidate(
        licenseKey: authProvider.licenseKey,
        organizationId: authProvider.organizationId,
        modelId: widget.item['id'] ?? '',
      );

      if (validation['valid'] != true || validation['cutToken'] == null) {
        final reason = validation['error'] ?? 'Insufficient credits or inactive license.';
        throw Exception('Cut validation failed: $reason');
      }

      final cutToken = validation['cutToken'] as String;
      currentCutToken = cutToken;

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
      final key = encrypt.Key.fromUtf8('flashgard-secure-plt-data-key-32');
      final iv = encrypt.IV(Uint8List.fromList(encryptedBytes.sublist(0, 16)));
      final ciphertext = encryptedBytes.sublist(16);
      
      final encrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.cbc));
      final decrypted = encrypter.decryptBytes(encrypt.Encrypted(Uint8List.fromList(ciphertext)), iv: iv);
      
      String pltContent = utf8.decode(decrypted);

      print('[PlotterService] Decrypted data preview: ${pltContent.substring(0, pltContent.length > 50 ? 50 : pltContent.length)}...');

      if (pltContent.isEmpty) {
        throw Exception('The decrypted design file is empty.');
      }
      
      if (!pltContent.trim().toUpperCase().startsWith('IN')) {
        throw Exception('Invalid design data format. Decryption may have failed or file is corrupted.');
      }

      // PHASE 3: Send to Plotter
      await CutTransactionService.markCutting(cutToken, plotterId: _plotterService.connectedName);

      final double estimatedSeconds = PlotterService.estimateCutDuration(pltContent, _selectedSpeed);
      if (mounted) {
        setState(() {
          _loadingMessage = _plotterService.isClassicPlotter 
              ? 'Plotter physically cutting... (${estimatedSeconds.round()} seconds remaining)'
              : 'Cutting in Progress...';
          _cutProgress = 0;
        });
      }

      _progressSubscription = _plotterService.progressStream.listen((progress) {
        if (mounted) {
          setState(() {
            _cutProgress = progress;
            if (_plotterService.isClassicPlotter) {
              final remaining = ((100 - progress) / 100 * estimatedSeconds).round();
              _loadingMessage = 'Plotter physically cutting... ($remaining seconds remaining)';
            } else {
              _loadingMessage = 'Cutting: $progress%';
            }
          });
        }
      });

      final success = await _plotterService.cutFile(
        content: pltContent,
        name: widget.item['name'] ?? 'CutFile',
        speed: _selectedSpeed,
        force: _selectedForce,
        passes: _cutPasses,
        width: _selectedWidth,
        height: _selectedHeight,
      );

      if (success) {
        await CutTransactionService.commitCut(
          cutToken: cutToken,
          plotterId: _plotterService.connectedName ?? 'Plotter',
        );
      } else {
        // Hardware failure / abort: preserve user credit
        await CutTransactionService.abortCut(
          cutToken: cutToken,
          reason: 'Hardware cut failed or was reset',
          plotterId: _plotterService.connectedName ?? 'Plotter',
        );
      }

      if (mounted) {
        setState(() => _isCutting = false);
        _progressSubscription?.cancel();
        _progressSubscription = null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success 
                ? 'Cut completed successfully!' 
                : 'Plotter stopped. Credits were preserved.'),
            backgroundColor: success ? Colors.green : Colors.orange.shade800,
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
      if (currentCutToken != null) {
        await CutTransactionService.abortCut(
          cutToken: currentCutToken,
          reason: 'Exception: $e',
          plotterId: _plotterService.connectedName ?? 'Plotter',
        );
      }

      if (mounted) {
        setState(() => _isCutting = false);
        _progressSubscription?.cancel();
        _progressSubscription = null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e. Credits were preserved.'), 
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
