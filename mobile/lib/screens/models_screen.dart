import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'cut_selection_screen.dart';
import '../services/api_service.dart';
import '../widgets/plotter_status_action.dart';
import '../widgets/category_3d_icon.dart';
import '../widgets/dim_no_image_placeholder.dart';

enum ViewMode {
  compactGrid, // 3 columns
  visualCards, // 2 columns
  detailedList, // 1 column list
}

class ModelsScreen extends StatefulWidget {
  final String title;
  final String? categoryId;
  final String? brandId;
  final String? parentCategoryId;
  final bool isRoot;
  final List<String> breadcrumbs;

  const ModelsScreen({
    super.key,
    this.title = 'Models',
    this.categoryId,
    this.brandId,
    this.parentCategoryId,
    this.isRoot = true,
    this.breadcrumbs = const ['Models'],
  });

  @override
  State<ModelsScreen> createState() => _ModelsScreenState();
}

class _ModelsScreenState extends State<ModelsScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _items = [];
  List<dynamic> _filteredItems = [];
  bool _isLoading = true;
  late stt.SpeechToText _speech;

  Timer? _debounce;
  bool _isSearching = false;
  bool _isSearchLoading = false;
  List<dynamic> _searchedCategories = [];
  List<dynamic> _searchedBrands = [];
  List<dynamic> _searchedModels = [];
  String _searchFilterType = 'all'; // 'all', 'category', 'brand', 'model'

  ViewMode _viewMode = ViewMode.compactGrid;
  int _sortOption = 0; // 0: Default, 1: A-Z, 2: Z-A

  static const _s3CatalogBaseUrl = 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog';

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _loadSavedViewMode();
    _fetchData();
  }

  Future<void> _loadSavedViewMode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final modeStr = prefs.getString('models_screen_view_mode');
      if (modeStr != null && mounted) {
        setState(() {
          if (modeStr == ViewMode.visualCards.name) {
            _viewMode = ViewMode.visualCards;
          } else if (modeStr == ViewMode.detailedList.name) {
            _viewMode = ViewMode.detailedList;
          } else {
            _viewMode = ViewMode.compactGrid;
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _setViewMode(ViewMode mode) async {
    if (_viewMode == mode) return;
    HapticFeedback.selectionClick();
    setState(() => _viewMode = mode);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('models_screen_view_mode', mode.name);
    } catch (_) {}
  }

  void _cycleSort() {
    HapticFeedback.lightImpact();
    setState(() {
      _sortOption = (_sortOption + 1) % 3;
    });
  }

  List<dynamic> get _displayItems {
    final list = List<dynamic>.from(_filteredItems);
    if (_sortOption == 1) {
      list.sort((a, b) => (a['name']?.toString() ?? '').toLowerCase().compareTo((b['name']?.toString() ?? '').toLowerCase()));
    } else if (_sortOption == 2) {
      list.sort((a, b) => (b['name']?.toString() ?? '').toLowerCase().compareTo((a['name']?.toString() ?? '').toLowerCase()));
    }
    return list;
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    try {
      _speech.stop();
    } catch (_) {}
    super.dispose();
  }

  Future<void> _startVoiceSearch() async {
    try {
      bool available = await _speech.initialize();
      if (available && mounted) {
        String recognizedWords = '';
        showModalBottomSheet(
          context: context,
          isDismissible: true,
          backgroundColor: const Color(0xFF131722),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          builder: (modalContext) {
            return StatefulBuilder(
              builder: (context, setModalState) {
                if (!_speech.isListening) {
                  _speech.listen(
                    onResult: (result) {
                      setModalState(() {
                        recognizedWords = result.recognizedWords;
                      });
                      if (result.finalResult) {
                        _searchController.text = result.recognizedWords;
                        _onSearch(result.recognizedWords);
                        Future.delayed(const Duration(milliseconds: 600), () {
                          if (modalContext.mounted && Navigator.canPop(modalContext)) {
                            Navigator.pop(modalContext);
                          }
                        });
                      }
                    },
                  );
                }

                return Container(
                  padding: const EdgeInsets.all(24),
                  height: 270,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        _speech.isListening ? 'Listening...' : 'Tap Mic to Speak',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 24),
                      GestureDetector(
                        onTap: () {
                          if (_speech.isListening) {
                            _speech.stop();
                            setModalState(() {});
                          } else {
                            recognizedWords = '';
                            _speech.listen(
                              onResult: (result) {
                                setModalState(() {
                                  recognizedWords = result.recognizedWords;
                                });
                                if (result.finalResult) {
                                  _searchController.text = result.recognizedWords;
                                  _onSearch(result.recognizedWords);
                                   Future.delayed(const Duration(milliseconds: 600), () {
                                     if (modalContext.mounted && Navigator.canPop(modalContext)) {
                                       Navigator.pop(modalContext);
                                     }
                                   });
                                }
                              },
                            );
                            setModalState(() {});
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFCE1D19),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFCE1D19).withValues(alpha: _speech.isListening ? 0.6 : 0.2),
                                blurRadius: _speech.isListening ? 30 : 10,
                                spreadRadius: _speech.isListening ? 10 : 0,
                              ),
                            ],
                          ),
                          child: Icon(
                            _speech.isListening ? Icons.mic : Icons.mic_none,
                            size: 36,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        recognizedWords.isEmpty 
                            ? 'Say category, brand or model name...' 
                            : recognizedWords,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: recognizedWords.isEmpty ? Colors.white.withValues(alpha: 0.4) : Colors.white,
                          fontStyle: recognizedWords.isEmpty ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ).then((_) {
          if (_speech.isListening) {
            _speech.stop();
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    List<dynamic> data = [];
    
    try {
      if (widget.isRoot) {
        final response = await ApiService.getModelCategories(parentId: 'null');
        final roots = response.where((cat) => cat['parentId'] == null).toList();
        final mainModel = roots.isNotEmpty ? roots.firstWhere((cat) => cat['name'] == 'Main Model', orElse: () => null) : null;
        
        if (mainModel != null) {
          final subResponse = await ApiService.getModelCategories(parentId: mainModel['id']);
          data = subResponse.where((cat) => cat['parentId'] == mainModel['id']).toList();
        } else {
          data = roots;
        }
      } else if (widget.categoryId != null) {
        final subcatsResponse = await ApiService.getModelCategories(parentId: widget.categoryId!);
        final subcats = subcatsResponse.where((cat) => cat['parentId'] == widget.categoryId).toList();
        final brands = await ApiService.getBrands(widget.categoryId!);
        data = [...subcats, ...brands];
      } else if (widget.brandId != null) {
        data = await ApiService.getModels(widget.brandId!, categoryId: widget.parentCategoryId);
      }
      
      try {
        final List<dynamic> sortedData = List.from(data);
        sortedData.sort((a, b) {
          if (a is! Map || b is! Map) return 0;
          
          final sortOrderAVal = a['sortOrder'];
          final sortOrderBVal = b['sortOrder'];
          
          final hasSortOrderA = sortOrderAVal != null && sortOrderAVal.toString().trim().isNotEmpty;
          final hasSortOrderB = sortOrderBVal != null && sortOrderBVal.toString().trim().isNotEmpty;
          
          if (hasSortOrderA && hasSortOrderB) {
            final int orderA = int.tryParse(sortOrderAVal.toString()) ?? 0;
            final int orderB = int.tryParse(sortOrderBVal.toString()) ?? 0;
            if (orderA != orderB) return orderA.compareTo(orderB);
          } else if (hasSortOrderA) {
            return -1;
          } else if (hasSortOrderB) {
            return 1;
          }
          
          final dateStrA = a['createdAt']?.toString() ?? a['created_at']?.toString() ?? '';
          final dateStrB = b['createdAt']?.toString() ?? b['created_at']?.toString() ?? '';
          
          if (dateStrA.isNotEmpty && dateStrB.isNotEmpty) {
            try {
              final dateA = DateTime.parse(dateStrA);
              final dateB = DateTime.parse(dateStrB);
              return dateB.compareTo(dateA);
            } catch (_) {}
          } else if (dateStrA.isNotEmpty) {
            return -1;
          } else if (dateStrB.isNotEmpty) {
            return 1;
          }
          
          return 0;
        });
        data = sortedData;
      } catch (_) {}
    } catch (_) {}

    if (mounted) {
      setState(() {
        _items = data;
        _filteredItems = data;
        _isLoading = false;
      });
    }
  }

  void _onSearch(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();

    if (query.isEmpty) {
      setState(() {
        _isSearching = false;
        _filteredItems = _items;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 300), () async {
      if (!mounted) return;
      setState(() {
        _isSearching = true;
        _isSearchLoading = true;
      });

      try {
        final results = await Future.wait([
          ApiService.searchModelCategories(query),
          ApiService.searchBrands(query),
          ApiService.searchModels(query),
        ]);

        if (mounted) {
          setState(() {
            _searchedCategories = results[0];
            _searchedBrands = results[1];
            _searchedModels = results[2];
            _isSearchLoading = false;
          });
        }
      } catch (_) {
        if (mounted) {
          setState(() => _isSearchLoading = false);
        }
      }
    });
  }

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
    'honda': 'HONDA.jpg',
    'hyundai': 'HYUNDAI.jpg',
    'toyota': 'TOYOTA.jpg',
    'tata': 'TATA.jpg',
    'mahindra': 'MAHINDRA.jpg',
    'kia': 'KIA.jpg',
    'jeep': 'JEEP.jpg',
    'ford': 'FORD.jpg',
    'dell': 'DELL.jpg',
    'hp': 'HP.jpg',
    'microsoft': 'Microsoft.jpg',
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
    'nissan': 'NISSAN.jpg',
    'mg': 'MG.jpg',
    'volkswagen': 'volkswagen.jpg',
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

    // 1. Direct imageUrl if provided (Models or Brands with explicit imageUrl)
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

    // 2. Direct iconUrl if it's an image file
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

    // 4. Default by name on S3
    if (itemName.isNotEmpty) {
      final formattedName = itemName[0].toUpperCase() + itemName.substring(1).toLowerCase();
      return _buildS3Url('$formattedName.jpg');
    }

    return _buildS3Url('Phone.jpg');
  }

  void _onItemTap(dynamic item) {
    final String itemName = item['name']?.toString() ?? '';
    final isCategory = item.containsKey('parentId');
    final isModel = item.containsKey('brandId');
    final isBrand = !isCategory && !isModel;

    final List<String> nextBreadcrumbs = [...widget.breadcrumbs, itemName];

    if (isCategory) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ModelsScreen(
            title: itemName,
            categoryId: item['id'].toString(),
            isRoot: false,
            breadcrumbs: nextBreadcrumbs,
          ),
        ),
      );
    } else if (isBrand) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ModelsScreen(
            title: itemName,
            brandId: item['id'].toString(),
            parentCategoryId: widget.categoryId,
            isRoot: false,
            breadcrumbs: nextBreadcrumbs,
          ),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CutSelectionScreen(item: item),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final darkBgGradient = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Color(0xFF090D16),
        Color(0xFF0E1424),
        Color(0xFF111728),
      ],
    );

    final lightBgGradient = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [Color(0xFFF8FAFC), Color(0xFFF1F5F9)],
    );

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title, 
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w800, 
                fontSize: 19,
                color: isDark ? Colors.white : theme.colorScheme.onSurface, 
                letterSpacing: 0.2,
              ),
            ),
            if (!widget.isRoot && widget.breadcrumbs.length > 1)
              Text(
                widget.breadcrumbs[widget.breadcrumbs.length - 2],
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: isDark ? Colors.white54 : Colors.black45,
                  fontWeight: FontWeight.w500,
                ),
              ),
          ],
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: isDark ? Colors.white : theme.colorScheme.onSurface,
        iconTheme: IconThemeData(color: isDark ? Colors.white : theme.colorScheme.onSurface),
        actions: const [
          PlotterStatusAction(),
        ],
        leading: !widget.isRoot ? IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.pop(context),
        ) : null,
      ),
      body: Container(
        decoration: BoxDecoration(gradient: isDark ? darkBgGradient : lightBgGradient),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Breadcrumbs Navigation Bar
            if (widget.breadcrumbs.length > 1) _buildBreadcrumbsBar(isDark),

            // Modern Search Input Box
            _buildSearchBox(isDark),

            // View Mode & Controls Toolbar
            if (!_isSearching) _buildToolbar(isDark),

            // Main Catalog Body
            Expanded(
              child: _isSearching
                  ? _buildSearchResults(isDark)
                  : RefreshIndicator(
                      color: const Color(0xFFCE1D19),
                      backgroundColor: isDark ? const Color(0xFF151926) : Colors.white,
                      onRefresh: _fetchData,
                      child: _isLoading
                          ? const Center(child: CircularProgressIndicator(color: Color(0xFFCE1D19)))
                          : _filteredItems.isEmpty
                              ? _buildEmptyState(isDark)
                              : _buildCurrentViewLayout(isDark),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreadcrumbsBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: widget.breadcrumbs.length,
        separatorBuilder: (context, index) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Icon(Icons.chevron_right_rounded, size: 16, color: isDark ? Colors.white30 : Colors.black26),
        ),
        itemBuilder: (context, index) {
          final isLast = index == widget.breadcrumbs.length - 1;
          final crumbName = widget.breadcrumbs[index];
          return GestureDetector(
            onTap: () {
              if (!isLast) {
                // Pop back to the clicked ancestor
                int popCount = widget.breadcrumbs.length - 1 - index;
                int current = 0;
                Navigator.of(context).popUntil((_) => current++ >= popCount);
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: isLast
                    ? const Color(0xFFCE1D19).withValues(alpha: 0.14)
                    : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04)),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isLast
                      ? const Color(0xFFCE1D19).withValues(alpha: 0.4)
                      : (isDark ? Colors.white12 : Colors.black12),
                  width: 1,
                ),
              ),
              child: Center(
                child: Text(
                  crumbName,
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    color: isLast ? const Color(0xFFCE1D19) : (isDark ? Colors.white70 : Colors.black87),
                    fontWeight: isLast ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSearchBox(bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF141926) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFF0F172A).withValues(alpha: 0.07),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: TextField(
          controller: _searchController,
          onChanged: _onSearch,
          style: GoogleFonts.inter(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Search ${widget.title.toLowerCase()}...',
            hintStyle: GoogleFonts.inter(
              color: isDark ? Colors.white38 : Colors.black38,
              fontSize: 14,
            ),
            prefixIcon: Icon(
              Icons.search_rounded, 
              size: 22, 
              color: isDark ? Colors.white54 : Colors.black45,
            ),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_searchController.text.isNotEmpty)
                  IconButton(
                    icon: Icon(Icons.clear, size: 18, color: isDark ? Colors.white54 : Colors.black45),
                    onPressed: () {
                      _searchController.clear();
                      _onSearch('');
                    },
                  ),
                IconButton(
                  icon: const Icon(Icons.mic_rounded, size: 20, color: Color(0xFFCE1D19)),
                  onPressed: _startVoiceSearch,
                ),
              ],
            ),
            filled: false,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
          ),
        ),
      ),
    );
  }

  Widget _buildToolbar(bool isDark) {
    final displayList = _displayItems;
    final sortLabels = ['Default', 'A-Z', 'Z-A'];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
      child: Row(
        children: [
          // Item count badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.white10 : Colors.black12,
              ),
            ),
            child: Text(
              '${displayList.length} items',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : const Color(0xFF475569),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Sort Chip Toggle
          GestureDetector(
            onTap: _cycleSort,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _sortOption != 0
                    ? const Color(0xFFCE1D19).withValues(alpha: 0.12)
                    : (isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.04)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _sortOption != 0
                      ? const Color(0xFFCE1D19).withValues(alpha: 0.3)
                      : (isDark ? Colors.white10 : Colors.black12),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.sort_rounded,
                    size: 14,
                    color: _sortOption != 0 ? const Color(0xFFCE1D19) : (isDark ? Colors.white70 : const Color(0xFF475569)),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    sortLabels[_sortOption],
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _sortOption != 0 ? const Color(0xFFCE1D19) : (isDark ? Colors.white70 : const Color(0xFF475569)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Spacer(),

          // Multiple Type List Option Switcher
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF141926) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.08),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildViewModeButton(
                  mode: ViewMode.compactGrid,
                  icon: Icons.grid_view_rounded,
                  tooltip: 'Compact Grid',
                  isDark: isDark,
                ),
                _buildViewModeButton(
                  mode: ViewMode.visualCards,
                  icon: Icons.dashboard_rounded,
                  tooltip: 'Visual Cards',
                  isDark: isDark,
                ),
                _buildViewModeButton(
                  mode: ViewMode.detailedList,
                  icon: Icons.view_agenda_rounded,
                  tooltip: 'List View',
                  isDark: isDark,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildViewModeButton({
    required ViewMode mode,
    required IconData icon,
    required String tooltip,
    required bool isDark,
  }) {
    final isSelected = _viewMode == mode;
    return GestureDetector(
      onTap: () => _setViewMode(mode),
      child: Tooltip(
        message: tooltip,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFFCE1D19)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 17,
            color: isSelected
                ? Colors.white
                : (isDark ? Colors.white54 : Colors.black45),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentViewLayout(bool isDark) {
    final items = _displayItems;

    switch (_viewMode) {
      case ViewMode.compactGrid:
        return _buildCompactGrid(items, isDark);
      case ViewMode.visualCards:
        return _buildVisualCards(items, isDark);
      case ViewMode.detailedList:
        return _buildDetailedList(items, isDark);
    }
  }

  // ==========================================
  // Image & Placeholder Helpers
  // ==========================================
  bool _hasDirectImage(dynamic item) {
    if (item is! Map) return false;
    final imgUrl = item['imageUrl']?.toString().trim() ?? '';
    if (imgUrl.isNotEmpty) return true;
    final iconUrl = item['iconUrl']?.toString().trim() ?? '';
    if (iconUrl.endsWith('.jpg') ||
        iconUrl.endsWith('.jpeg') ||
        iconUrl.endsWith('.png') ||
        iconUrl.endsWith('.webp') ||
        iconUrl.startsWith('http') ||
        iconUrl.contains('/')) {
      return true;
    }
    final name = (item['name']?.toString() ?? '').toLowerCase().trim();
    if (_brandImageMap.containsKey(name)) return true;
    return false;
  }

  Widget _buildItemThumbnail({
    required dynamic item,
    required double size,
    required bool isDark,
    String? explicitType,
  }) {
    final String itemName = item['name']?.toString() ?? '';
    final String? iconUrl = item['iconUrl']?.toString();
    final bool isCategory = explicitType != null
        ? explicitType == 'category'
        : item.containsKey('parentId');
    final bool isModel = explicitType != null
        ? explicitType == 'model'
        : item.containsKey('brandId');
    final bool hasImage = _hasDirectImage(item);
    final String resolvedImageUrl = _getImageUrl(item);

    // If it's a model with no image, show dim placeholder directly
    if (isModel && !hasImage) {
      return DimNoImagePlaceholder(size: size, isDark: isDark, label: 'No image');
    }

    return Image.network(
      resolvedImageUrl,
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        if (isCategory) {
          return Category3DIcon(name: itemName, iconUrl: iconUrl, size: size);
        }
        return DimNoImagePlaceholder(size: size, isDark: isDark, label: 'No image');
      },
    );
  }

  // ==========================================
  // Layout 1: Compact Grid (3 Columns)
  // ==========================================
  Widget _buildCompactGrid(List<dynamic> items, bool isDark) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
      physics: const BouncingScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.77,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildCompactGridCard(item, isDark);
      },
    );
  }

  Widget _buildCompactGridCard(dynamic item, bool isDark) {
    final String itemName = item['name']?.toString() ?? '';
    final String? iconUrl = item['iconUrl']?.toString();
    final bool isCategory = item.containsKey('parentId');
    final bool hasImage = _hasDirectImage(item);
    final categoryType = Category3DIcon.getType(itemName, iconUrl);
    final Color glowColor = isCategory
        ? Category3DIcon.getGlowColor(categoryType)
        : (hasImage
            ? const Color(0xFF64748B).withValues(alpha: isDark ? 0.25 : 0.15)
            : Colors.transparent);

    const double fixedImageSize = 64.0;

    return GestureDetector(
      onTap: () => _onItemTap(item),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF151A26) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.07) : const Color(0xFF0F172A).withValues(alpha: 0.06),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    if (glowColor != Colors.transparent)
                      Container(
                        width: fixedImageSize + 10,
                        height: fixedImageSize + 10,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              glowColor.withValues(alpha: 0.35),
                              glowColor.withValues(alpha: 0.1),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.6, 1.0],
                          ),
                        ),
                      ),
                    SizedBox(
                      width: fixedImageSize,
                      height: fixedImageSize,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: _buildItemThumbnail(
                          item: item,
                          size: fixedImageSize,
                          isDark: isDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 0, 6, 10),
              child: Text(
                itemName,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  fontSize: 12.5,
                  letterSpacing: 0.1,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // Layout 2: Visual Cards (2 Columns)
  // ==========================================
  Widget _buildVisualCards(List<dynamic> items, bool isDark) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
      physics: const BouncingScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 0.80,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildVisualCard(item, isDark);
      },
    );
  }

  Widget _buildVisualCard(dynamic item, bool isDark) {
    final String itemName = item['name']?.toString() ?? '';
    final String? iconUrl = item['iconUrl']?.toString();
    final bool isCategory = item.containsKey('parentId');
    final bool hasImage = _hasDirectImage(item);
    final categoryType = Category3DIcon.getType(itemName, iconUrl);
    final Color glowColor = isCategory
        ? Category3DIcon.getGlowColor(categoryType)
        : (hasImage
            ? const Color(0xFF64748B).withValues(alpha: isDark ? 0.25 : 0.15)
            : Colors.transparent);

    const double fixedImageSize = 96.0;

    return GestureDetector(
      onTap: () => _onItemTap(item),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF151926) : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFF0F172A).withValues(alpha: 0.07),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.05),
              blurRadius: 14,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    if (glowColor != Colors.transparent)
                      Container(
                        width: fixedImageSize + 14,
                        height: fixedImageSize + 14,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              glowColor.withValues(alpha: 0.35),
                              glowColor.withValues(alpha: 0.08),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.65, 1.0],
                          ),
                        ),
                      ),
                    SizedBox(
                      width: fixedImageSize,
                      height: fixedImageSize,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: _buildItemThumbnail(
                          item: item,
                          size: fixedImageSize,
                          isDark: isDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
              child: Text(
                itemName,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  letterSpacing: 0.1,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // Layout 3: Detailed List View (1 Column)
  // ==========================================
  Widget _buildDetailedList(List<dynamic> items, bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
      physics: const BouncingScrollPhysics(),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildListRow(item, isDark);
      },
    );
  }

  Widget _buildListRow(dynamic item, bool isDark) {
    final String itemName = item['name']?.toString() ?? '';
    final String? iconUrl = item['iconUrl']?.toString();
    final bool isModel = item.containsKey('brandId');
    final bool isCategory = item.containsKey('parentId');
    final categoryType = Category3DIcon.getType(itemName, iconUrl);
    final glowColor = isCategory
        ? Category3DIcon.getGlowColor(categoryType)
        : Colors.transparent;

    const double fixedAvatarSize = 64.0;
    const double fixedListImageSize = 54.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF151926) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFF0F172A).withValues(alpha: 0.06),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Container(
          width: fixedAvatarSize,
          height: fixedAvatarSize,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0C101A) : Colors.grey[100],
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isCategory
                  ? glowColor.withValues(alpha: 0.25)
                  : (isDark ? Colors.white10 : Colors.black12),
              width: 1.2,
            ),
          ),
          child: Center(
            child: SizedBox(
              width: fixedListImageSize,
              height: fixedListImageSize,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _buildItemThumbnail(
                  item: item,
                  size: fixedListImageSize,
                  isDark: isDark,
                ),
              ),
            ),
          ),
        ),
        title: Text(
          itemName,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700, 
            fontSize: 14.5, 
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        subtitle: Text(
          isModel ? 'Tap to cut protector' : 'Tap to view',
          style: GoogleFonts.inter(
            color: isDark ? Colors.white38 : Colors.black38,
            fontSize: 11.5,
          ),
        ),
        trailing: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFFCE1D19)),
        ),
        onTap: () => _onItemTap(item),
      ),
    );
  }

  // ==========================================
  // Enhanced Search Results View
  // ==========================================
  Widget _buildSearchResults(bool isDark) {
    if (_isSearchLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFCE1D19)));
    }

    final totalCount = _searchedCategories.length + _searchedBrands.length + _searchedModels.length;

    if (totalCount == 0) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off_rounded, size: 52, color: isDark ? Colors.white24 : Colors.black26),
            const SizedBox(height: 16),
            Text(
              'No matching results found',
              style: GoogleFonts.inter(
                color: isDark ? Colors.white54 : Colors.black45,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                _searchController.clear();
                _onSearch('');
              },
              child: const Text('Clear Search', style: TextStyle(color: Color(0xFFCE1D19))),
            ),
          ],
        ),
      );
    }

    // Filter list based on selected chip
    final showCategories = _searchFilterType == 'all' || _searchFilterType == 'category';
    final showBrands = _searchFilterType == 'all' || _searchFilterType == 'brand';
    final showModels = _searchFilterType == 'all' || _searchFilterType == 'model';

    return Column(
      children: [
        // Search Filter Chips
        Container(
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildSearchFilterChip('all', 'All ($totalCount)', isDark),
              if (_searchedCategories.isNotEmpty)
                _buildSearchFilterChip('category', 'Categories (${_searchedCategories.length})', isDark),
              if (_searchedBrands.isNotEmpty)
                _buildSearchFilterChip('brand', 'Brands (${_searchedBrands.length})', isDark),
              if (_searchedModels.isNotEmpty)
                _buildSearchFilterChip('model', 'Models (${_searchedModels.length})', isDark),
            ],
          ),
        ),
        const SizedBox(height: 8),

        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
            physics: const BouncingScrollPhysics(),
            children: [
              if (showCategories && _searchedCategories.isNotEmpty) ...[
                _buildSearchSectionHeader('Categories', _searchedCategories.length),
                ..._searchedCategories.map((cat) => _buildSearchRowItem(cat, 'category', isDark)),
                const SizedBox(height: 16),
              ],
              if (showBrands && _searchedBrands.isNotEmpty) ...[
                _buildSearchSectionHeader('Brands', _searchedBrands.length),
                ..._searchedBrands.map((brand) => _buildSearchRowItem(brand, 'brand', isDark)),
                const SizedBox(height: 16),
              ],
              if (showModels && _searchedModels.isNotEmpty) ...[
                _buildSearchSectionHeader('Models', _searchedModels.length),
                ..._searchedModels.map((model) => _buildSearchRowItem(model, 'model', isDark)),
                const SizedBox(height: 16),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSearchFilterChip(String type, String label, bool isDark) {
    final isSelected = _searchFilterType == type;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _searchFilterType = type);
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFFCE1D19)
              : (isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.04)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFFCE1D19) : (isDark ? Colors.white10 : Colors.black12),
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchSectionHeader(String title, int count) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 6),
      child: Row(
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: const Color(0xFFCE1D19),
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(
              color: const Color(0xFFCE1D19).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '$count',
              style: GoogleFonts.inter(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: const Color(0xFFCE1D19),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchRowItem(dynamic item, String type, bool isDark) {
    final String itemName = item['name']?.toString() ?? '';

    final Color tagColor = type == 'category'
        ? const Color(0xFF38BDF8)
        : (type == 'brand' ? const Color(0xFFF59E0B) : const Color(0xFF10B981));

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161A26) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFF0F172A).withValues(alpha: 0.06),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0E131F) : Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: _buildItemThumbnail(
              item: item,
              size: 48,
              isDark: isDark,
              explicitType: type,
            ),
          ),
        ),
        title: Text(
          itemName,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700, 
            fontSize: 14, 
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        subtitle: Row(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: tagColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                type.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w700,
                  color: tagColor,
                ),
              ),
            ),
            if (type == 'model') ...[
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  '${item['brand']?['name'] ?? ''} ${item['category']?['name'] != null ? '• ${item['category']['name']}' : ''}',
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    color: isDark ? Colors.white54 : Colors.black45,
                    fontSize: 11.5,
                  ),
                ),
              ),
            ],
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.04),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFFCE1D19)),
        ),
        onTap: () {
          final List<String> nextBreadcrumbs = [...widget.breadcrumbs, itemName];
          if (type == 'category') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ModelsScreen(
                  title: itemName,
                  categoryId: item['id'].toString(),
                  isRoot: false,
                  breadcrumbs: nextBreadcrumbs,
                ),
              ),
            );
          } else if (type == 'brand') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ModelsScreen(
                  title: itemName,
                  brandId: item['id'].toString(),
                  parentCategoryId: widget.categoryId,
                  isRoot: false,
                  breadcrumbs: nextBreadcrumbs,
                ),
              ),
            );
          } else {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CutSelectionScreen(item: item),
              ),
            );
          }
        },
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 140),
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.03),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.layers_clear_rounded, 
                  size: 48, 
                  color: isDark ? Colors.white30 : Colors.black26,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'No models or items found', 
                style: GoogleFonts.inter(
                  color: isDark ? Colors.white70 : Colors.black54,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Pull down to refresh catalog',
                style: GoogleFonts.inter(
                  color: isDark ? Colors.white38 : Colors.black38,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
