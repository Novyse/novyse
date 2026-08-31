import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'adaptive.dart';
import 'chat_list_page.dart';
import 'chat_routes.dart';
import 'profile_page.dart';
import 'settings_page.dart';
import '../../core/router/navigator_keys.dart';
import '../../core/services/sync_service.dart';

class HomeTabControllerScope extends InheritedWidget {
  const HomeTabControllerScope({
    super.key,
    required this.controller,
    required super.child,
  });

  final TabController controller;

  static TabController? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<HomeTabControllerScope>()
        ?.controller;
  }

  static TabController of(BuildContext context) {
    final controller = maybeOf(context);
    assert(controller != null, 'HomeTabControllerScope not found');
    return controller!;
  }

  @override
  bool updateShouldNotify(HomeTabControllerScope oldWidget) {
    return controller != oldWidget.controller;
  }
}

class HomeTabBarView extends StatelessWidget {
  const HomeTabBarView({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return TabBarView(
      controller: HomeTabControllerScope.of(context),
      children: children,
    );
  }
}

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.detailNavigator});

  final Widget detailNavigator;

  static bool isWide(BuildContext context) => isMasterDetailLayout(context);

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _chatTabNavKey = GlobalKey<NavigatorState>();
  final _settingsTabNavKey = GlobalKey<NavigatorState>();
  final _profileTabNavKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_syncUrlWhenNoChat);

    // Trigger account initialization / delta sync
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(syncServiceProvider).ensureInitialized();
    });
  }

  String get _path => GoRouterState.of(context).uri.path;

  String? get _chatUUID => chatUUIDFromPath(_path);

  void _syncUrlWhenNoChat() {
    if (!mounted || _tabController.indexIsChanging) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _tabController.indexIsChanging) return;
      if (_chatUUID != null) return;
      final target = pathForTab(_tabController.index);
      if (_path != target) {
        context.go(target);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final fromUrl = tabIndexFromPath(_path);
    if (fromUrl == null ||
        fromUrl == _tabController.index ||
        _tabController.indexIsChanging) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (fromUrl != _tabController.index) {
        _tabController.index = fromUrl;
      }
    });
  }

  @override
  void dispose() {
    _tabController.removeListener(_syncUrlWhenNoChat);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabPressed(int index) {
    if (_tabController.index != index) {
      _tabController.animateTo(index);
    }
    if (_chatUUID == null) {
      context.go(pathForTab(index));
    }
  }

  Widget _masterPane({required Widget tabBar}) {
    return Stack(
      children: [
        HomeTabBarView(
          children: [
            _TabNavigator(
              navigatorKey: _chatTabNavKey,
              root: const ChatListPage(),
            ),
            _TabNavigator(
              navigatorKey: _settingsTabNavKey,
              root: const SettingsPage(),
            ),
            _TabNavigator(
              navigatorKey: _profileTabNavKey,
              root: const ProfilePage(),
            ),
          ],
        ),
        Positioned(left: 0, right: 0, bottom: 0, child: tabBar),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = isMasterDetailLayout(context);
    final chatOpen = _chatUUID != null;
    final shellCanPop = shellNavigatorKey.currentState?.canPop() ?? false;
    final tabBar = _FloatingTabBar(
      controller: _tabController,
      onTabPressed: _onTabPressed,
    );
    final master = _masterPane(tabBar: tabBar);
    final detail = widget.detailNavigator;

    final Widget body;
    if (wide) {
      body = Row(
        children: [
          SizedBox(width: kMasterPaneWidth, child: master),
          const VerticalDivider(width: 1),
          Expanded(child: detail),
        ],
      );
    } else {
      body = Stack(
        children: [
          master,
          IgnorePointer(ignoring: !chatOpen && !shellCanPop, child: detail),
        ],
      );
    }

    return HomeTabControllerScope(
      controller: _tabController,
      child: Scaffold(body: body),
    );
  }
}

class _TabNavigator extends StatelessWidget {
  const _TabNavigator({required this.navigatorKey, required this.root});

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget root;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      onGenerateInitialRoutes: (navigator, initialRoute) {
        return [MaterialPageRoute(builder: (_) => root)];
      },
      onGenerateRoute: (settings) {
        return MaterialPageRoute(builder: (_) => root, settings: settings);
      },
    );
  }
}

class EmptyDetailPane extends StatelessWidget {
  const EmptyDetailPane({super.key});

  @override
  Widget build(BuildContext context) {
    if (!isMasterDetailLayout(context)) {
      return const SizedBox.shrink();
    }
    return const ColoredBox(
      color: Colors.transparent,
      child: Center(
        child: Text(
          'Seleziona una chat dalla lista',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      ),
    );
  }
}

class _FloatingTabBar extends StatelessWidget {
  const _FloatingTabBar({required this.controller, required this.onTabPressed});

  final TabController controller;
  final ValueChanged<int> onTabPressed;

  static const List<_TabSpec> _items = [
    _TabSpec(icon: Icons.chat_bubble_outline, activeIcon: Icons.chat_bubble),
    _TabSpec(icon: Icons.settings_outlined, activeIcon: Icons.settings),
    _TabSpec(icon: Icons.person_outline, activeIcon: Icons.person),
  ];

  @override
  Widget build(BuildContext context) {
    final paneWidth = isMasterDetailLayout(context)
        ? kMasterPaneWidth
        : MediaQuery.sizeOf(context).width;
    final barWidth = (paneWidth * 0.64).clamp(220.0, 420.0);
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      minimum: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                width: barWidth,
                height: 68,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                decoration: BoxDecoration(
                  color: scheme.surface.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(
                    color: scheme.outline.withValues(alpha: 0.25),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 100,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: AnimatedBuilder(
                  animation: controller.animation!,
                  builder: (context, child) {
                    return LayoutBuilder(
                      builder: (context, constraints) {
                        final slotWidth = constraints.maxWidth / _items.length;
                        final animValue = controller.animation!.value;

                        return Stack(
                          children: [
                            Positioned(
                              left: animValue * slotWidth,
                              top: 0,
                              bottom: 0,
                              width: slotWidth,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: scheme.primary.withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(100),
                                ),
                              ),
                            ),
                            Row(
                              children: List.generate(_items.length, (index) {
                                final item = _items[index];
                                final selectedAmount =
                                    (1.0 - (animValue - index).abs()).clamp(
                                      0.0,
                                      1.0,
                                    );
                                final iconColor = Color.lerp(
                                  scheme.onSurfaceVariant,
                                  scheme.primary,
                                  selectedAmount,
                                );
                                final scale = 0.92 + (0.08 * selectedAmount);

                                return Expanded(
                                  child: Transform.scale(
                                    scale: scale,
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(
                                          100,
                                        ),
                                        onTap: () => onTabPressed(index),
                                        child: Center(
                                          child: Icon(
                                            selectedAmount > 0.5
                                                ? item.activeIcon
                                                : item.icon,
                                            color: iconColor,
                                            size: 28,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ),
                          ],
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TabSpec {
  final IconData icon;
  final IconData activeIcon;

  const _TabSpec({required this.icon, required this.activeIcon});
}
