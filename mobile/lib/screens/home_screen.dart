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
            'backgroundColor': '#CE1D19',
            'iconName': 'phone_iphone',
          },
          {
            'title': 'New Galaxy S25 Skins',
            'subtitle': 'Explore the latest styles for Samsung S25.',
            'backgroundColor': '#E6B82C',
            'iconName': 'smartphone',
          }
        ];
        _actions = [
          {'label': 'Scan', 'iconName': 'qr_code_scanner', 'action': 'scan'},
          {'label': 'History', 'iconName': 'history', 'action': 'history'},
          {'label': 'Stock', 'iconName': 'inventory_2_outlined', 'action': 'stock'},
          {'label': 'Help', 'iconName': 'support_agent', 'action': 'help'},
        ];
        _infocards = [
          {
            'title': 'How to apply Flashgard Skins',
            'excerpt': 'Learn the best techniques for a perfect application every time.',
            'timeText': '5 min read',
          },
          {
            'title': 'New Machine Firmware v2.1',
            'excerpt': 'Stability improvements and 15% faster cutting speeds.',
            'timeText': 'Yesterday',
          },
          {
            'title': 'System Maintenance',
            'excerpt': 'The CRM will be undergoing maintenance on Sunday at 2 AM GMT.',
            'timeText': '2 days ago',
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

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;
    final secondaryColor = Theme.of(context).colorScheme.secondary;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _loadHomeContent,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [
                      Color(0xFFFFF7F7), // Soft Logo Red undertone
                      Color(0xFFFFFFF0), // Soft Logo Gold undertone
                      Color(0xFFF9FAFB),
                    ],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Premium Custom Header
                    _buildHeader(context, primaryColor, secondaryColor),

                    // Promotions Carousel Section
                    if (_promotions.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.fromLTRB(20, 8, 20, 4),
                        child: Text(
                          'Featured Announcements',
                          style: TextStyle(
                            fontSize: 16, 
                            fontWeight: FontWeight.w800, 
                            letterSpacing: -0.5,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      SizedBox(
                        height: 200,
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
                              _parseColor(promo['backgroundColor'] ?? '#CE1D19'),
                              _getIconData(promo['iconName'] ?? 'phone_iphone'),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List<Widget>.generate(
                          _promotions.length,
                          (index) => AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            width: _activePage == index ? 24 : 8,
                            height: 6,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(3),
                              color: _activePage == index
                                  ? primaryColor
                                  : Colors.grey[300],
                            ),
                          ),
                        ),
                      ),
                    ],
                    
                    // Quick Actions Section
                    if (_actions.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.fromLTRB(20, 24, 20, 16),
                        child: Text(
                          'Quick Services',
                          style: TextStyle(
                            fontSize: 16, 
                            fontWeight: FontWeight.w800, 
                            letterSpacing: -0.5,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          mainAxisSpacing: 16,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.82,
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _actions.length,
                        itemBuilder: (context, index) {
                          final act = _actions[index];
                          return _buildActionItem(
                            context,
                            _getIconData(act['iconName'] ?? 'info_outline'),
                            act['label'] ?? '',
                            primaryColor,
                            secondaryColor,
                          );
                        },
                      ),
                    ],

                    // Info & Updates Section
                    if (_infocards.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.fromLTRB(20, 28, 20, 12),
                        child: Text(
                          'Knowledge Center & Updates',
                          style: TextStyle(
                            fontSize: 16, 
                            fontWeight: FontWeight.w800, 
                            letterSpacing: -0.5,
                            color: Color(0xFF1E293B),
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
                            card['timeText'] ?? card['timeLabel'] ?? '5 min read',
                            primaryColor,
                          );
                        },
                      ),
                    ],
                    
                    const SizedBox(height: 48),
                  ],
                ),
              ),
            ),
          ),
    );
  }

  Widget _buildHeader(BuildContext context, Color primary, Color secondary) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 52, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back,',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Flashgard Operator',
                    style: TextStyle(color: Color(0xFF0F172A), fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.8),
                  ),
                ],
              ),
              Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.refresh, color: Color(0xFF475569)),
                      onPressed: _loadHomeContent,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.notifications_none, color: Color(0xFF475569)),
                      onPressed: () {},
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Glow Status card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF1E293B), // Premium Slate/Zinc
                  const Color(0xFF0F172A),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A).withOpacity(0.15),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.bolt, color: secondary, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Device status: Connected',
                        style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Firmware version: v2.1 (Latest)',
                        style: TextStyle(color: Colors.grey[400], fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.2), // Soft Emerald green
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
                  ),
                  child: const Text(
                    'ONLINE',
                    style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromotionCard(String title, String subtitle, Color color, IconData icon) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            color,
            color.withRed(color.red > 40 ? color.red - 40 : 0),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.25), blurRadius: 12, offset: const Offset(0, 6)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            Positioned(
              right: -24,
              bottom: -24,
              child: Icon(icon, size: 160, color: Colors.white.withOpacity(0.12)),
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
                      fontSize: 20, 
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13, height: 1.3),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: color,
                      elevation: 0,
                      minimumSize: const Size(110, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: const Text('Explore Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(BuildContext context, IconData icon, String label, Color primary, Color secondary) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            // Action trigger
          },
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        primary.withOpacity(0.08),
                        secondary.withOpacity(0.08),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: primary, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  label, 
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12, 
                    fontWeight: FontWeight.w700, 
                    color: Color(0xFF334155),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, String title, String excerpt, String time, Color primary) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  primary.withOpacity(0.12),
                  primary.withOpacity(0.04),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Icons.feed_outlined, color: primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title, 
                  style: const TextStyle(
                    fontWeight: FontWeight.w800, 
                    fontSize: 14, 
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  excerpt, 
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, height: 1.35), 
                  maxLines: 2, 
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'NEWS & UPDATES',
                        style: TextStyle(color: Color(0xFF475569), fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Text(
                      time, 
                      style: const TextStyle(
                        color: Color(0xFF94A3B8), 
                        fontSize: 10, 
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
