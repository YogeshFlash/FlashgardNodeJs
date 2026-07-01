import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  List<dynamic> _promotions = [];
  List<dynamic> _actions = [];
  List<dynamic> _infocards = [];
  int _activePage = 0;

  @override
  void initState() {
    super.initState();
    _loadHomeContent();
  }

  Future<void> _loadHomeContent() async {
    setState(() {
      _isLoading = true;
      _activePage = 0;
    });

    final data = await ApiService.fetchMobileHomeContent();
    if (data != null && mounted) {
      setState(() {
        _promotions = data['promotions'] ?? [];
        _actions = data['actions'] ?? [];
        _infocards = data['infocards'] ?? [];
        _isLoading = false;
      });
    } else if (mounted) {
      // Fallback/Default static values if offline or error
      setState(() {
        _promotions = [
          {
            'title': 'Exclusive iPhone 17 Launch',
            'subtitle': 'Get 20% off on all iPhone 17 Pro designs!',
            'backgroundColor': '#FF2D55', // Vibrant Hot Pink
            'iconName': 'phone_iphone',
          },
          {
            'title': 'New Galaxy S25 Skins',
            'subtitle': 'Explore the latest styles for Samsung S25.',
            'backgroundColor': '#FF9500', // Vibrant Neon Orange
            'iconName': 'smartphone',
          }
        ];
        _actions = [
          {'label': 'Scan QR', 'iconName': 'qr_code_scanner', 'action': 'scan'},
          {'label': 'History', 'iconName': 'history', 'action': 'history'},
          {'label': 'Stock', 'iconName': 'inventory_2_outlined', 'action': 'stock'},
          {'label': 'Help Support', 'iconName': 'support_agent', 'action': 'help'},
        ];
        _infocards = [
          {
            'title': 'How to apply Flashgard Skins',
            'excerpt': 'Learn the best techniques for a perfect application every time.',
            'timeText': '💡 TIPS • 5 min read',
          },
          {
            'title': 'New Machine Firmware v2.1',
            'excerpt': 'Stability improvements and 15% faster cutting speeds.',
            'timeText': '⚙️ UPDATE • Yesterday',
          },
          {
            'title': 'System Maintenance Info',
            'excerpt': 'The CRM will be undergoing maintenance on Sunday at 2 AM GMT.',
            'timeText': '⚠️ NOTICE • 2 days ago',
          }
        ];
        _isLoading = false;
      });
    }
  }

  IconData _getIconData(String name) {
    switch (name) {
      case 'phone_iphone': return Icons.phone_iphone;
      case 'smartphone': return Icons.smartphone;
      case 'qr_code_scanner': return Icons.qr_code_scanner;
      case 'history': return Icons.history;
      case 'inventory_2_outlined': return Icons.inventory_2_outlined;
      case 'support_agent': return Icons.support_agent;
      case 'info_outline': return Icons.info_outline;
      default: return Icons.info_outline;
    }
  }

  Color _parseColor(String hexColor) {
    try {
      hexColor = hexColor.replaceAll('#', '');
      if (hexColor.length == 6) {
        hexColor = 'FF$hexColor';
      }
      return Color(int.parse(hexColor, radix: 16));
    } catch (_) {
      return const Color(0xFFCE1D19);
    }
  }

  // Neon Gradient list helper for action cards
  List<Color> _getActionGradients(int index) {
    final gradients = [
      [const Color(0xFF00F2FE), const Color(0xFF4FACFE)], // Cyan to Blue
      [const Color(0xFFFF0844), const Color(0xFFFFB199)], // Red/Pink to Peach
      [const Color(0xFFF12711), const Color(0xFFF5AF19)], // Orange to Yellow
      [const Color(0xFFB1F91A), const Color(0xFF23D5AB)], // Neon Green
    ];
    return gradients[index % gradients.length];
  }

  @override
  Widget build(BuildContext context) {
    final bgGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        const Color(0xFFF8FAFC), // Very soft slate 50
        const Color(0xFFF1F5F9), // Slate 100
      ],
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(gradient: bgGradient),
        child: SafeArea(
          child: _isLoading 
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF2D55)),
                ),
              )
            : RefreshIndicator(
                color: const Color(0xFFFF2D55),
                backgroundColor: Colors.white,
                onRefresh: _loadHomeContent,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Beautiful Custom Header (Light Theme)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'Yo! ',
                                      style: TextStyle(
                                        color: Color(0xFF0F172A),
                                        fontSize: 28,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    Text(
                                      'Flashgarder ⚡',
                                      style: TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w900,
                                        foreground: Paint()..shader = const LinearGradient(
                                          colors: [Color(0xFFFF2D55), Color(0xFFFF9500)],
                                        ).createShader(const Rect.fromLTWH(0.0, 0.0, 200.0, 70.0)),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Ready to cut some awesome skins?',
                                  style: TextStyle(
                                    color: const Color(0xFF475569),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.08), width: 1.5),
                                color: Colors.white,
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF0F172A)),
                                onPressed: _loadHomeContent,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Promotions Carousel
                      if (_promotions.isNotEmpty) ...[
                        SizedBox(
                          height: 210,
                          child: PageView.builder(
                            itemCount: _promotions.length,
                            onPageChanged: (int page) {
                              setState(() {
                                _activePage = page;
                              });
                            },
                            itemBuilder: (context, index) {
                              final promo = _promotions[index];
                              return _buildPromotionCard(
                                promo['title'] ?? '',
                                promo['subtitle'] ?? '',
                                _parseColor(promo['backgroundColor'] ?? '#FF2D55'),
                                _getIconData(promo['iconName'] ?? 'phone_iphone'),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List<Widget>.generate(
                            _promotions.length,
                            (index) => AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: _activePage == index ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                color: _activePage == index
                                    ? const Color(0xFFFF2D55)
                                    : const Color(0xFF0F172A).withOpacity(0.12),
                              ),
                            ),
                          ),
                        ),
                      ],
                      
                      // Quick Actions Grid
                      if (_actions.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.fromLTRB(20, 32, 20, 16),
                          child: Text(
                            'Quick Actions',
                            style: TextStyle(
                              fontSize: 20, 
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: List<Widget>.generate(
                              _actions.length,
                              (index) {
                                final act = _actions[index];
                                return _buildActionItem(
                                  _getIconData(act['iconName'] ?? 'info_outline'),
                                  act['label'] ?? '',
                                  _getActionGradients(index),
                                );
                              },
                            ),
                          ),
                        ),
                      ],

                      // Information & Updates
                      if (_infocards.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.fromLTRB(20, 36, 20, 16),
                          child: Text(
                            'What\'s New?',
                            style: TextStyle(
                              fontSize: 20, 
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),

                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _infocards.length,
                          itemBuilder: (context, index) {
                            final card = _infocards[index];
                            return _buildInfoCard(
                              context,
                              card['title'] ?? '',
                              card['excerpt'] ?? '',
                              card['timeText'] ?? card['timeLabel'] ?? '💡 TIPS',
                              index,
                            );
                          },
                        ),
                      ],
                      
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
        ),
      ),
    );
  }

  Widget _buildPromotionCard(String title, String subtitle, Color color, IconData icon) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color,
            color.withOpacity(0.85),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.35), 
            blurRadius: 15, 
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.2), width: 1.5),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            Positioned(
              right: -30,
              bottom: -30,
              child: Icon(
                icon, 
                size: 180, 
                color: Colors.white.withOpacity(0.15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white, 
                      fontSize: 22, 
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9), 
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 3),
                        )
                      ],
                    ),
                    child: Text(
                      'Explore Now 🔥',
                      style: TextStyle(
                        color: color, 
                        fontWeight: FontWeight.w900, 
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label, List<Color> gradientColors) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.05), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            )
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {},
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: gradientColors,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: gradientColors[0].withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        )
                      ],
                    ),
                    child: Icon(icon, color: Colors.white, size: 20),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    label, 
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 11, 
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: 0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, String title, String excerpt, String tagLabel, int index) {
    // Determine dynamic accent color based on index to look rich and playful
    final accentColors = [
      const Color(0xFFFF2D55), // Hot Pink
      const Color(0xFF5856D6), // Purple
      const Color(0xFFFF9500), // Orange
      const Color(0xFF4CD964), // Green
    ];
    final colorAccent = accentColors[index % accentColors.length];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.05), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: colorAccent.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colorAccent.withOpacity(0.15), width: 1.5),
            ),
            child: Icon(Icons.bolt_rounded, color: colorAccent, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tag line
                Text(
                  tagLabel.toUpperCase(), 
                  style: TextStyle(
                    color: colorAccent, 
                    fontSize: 10, 
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  title, 
                  style: const TextStyle(
                    fontWeight: FontWeight.w900, 
                    fontSize: 16,
                    color: Color(0xFF0F172A),
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  excerpt, 
                  style: TextStyle(
                    color: const Color(0xFF475569), 
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ), 
                  maxLines: 2, 
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
