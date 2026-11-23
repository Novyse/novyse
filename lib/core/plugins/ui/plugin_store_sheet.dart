import 'dart:async';
import 'dart:ui' show ImageFilter;

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';
import 'package:novyse/core/plugins/ui/plugin_detail_sheet.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// The store of the activities: the library of the plugins, from `GET /plugins`.
///
/// It only starts what it shows: the version, the bundle and the URLs are
/// chosen server-side when the activity starts, so the client cannot pin an
/// arbitrary build. The whole card starts the plugin and closes the store,
/// because the tile appears in the grid behind it; the info button opens the
/// page of the plugin, where starting is not possible on purpose.
class PluginStoreSheet extends ConsumerStatefulWidget {
  const PluginStoreSheet({super.key});

  static Future<void> show(BuildContext context) {
    return ResponsiveOverlay.show<void>(
      context: context,
      title: AppLocalizations.of(context)!.activitiesStoreTitle,
      maxWidth: 1040,
      maxHeightFactor: 0.9,
      child: const PluginStoreSheet(),
    );
  }

  @override
  ConsumerState<PluginStoreSheet> createState() => _PluginStoreSheetState();
}

class _PluginStoreSheetState extends ConsumerState<PluginStoreSheet> {
  final TextEditingController _search = TextEditingController();

  List<PluginEntry> _plugins = const [];
  bool _loading = true;
  String? _error;

  String? _startError;
  String? _startingSlug;

  /// What the field holds, lowercased: the library is short enough that
  /// filtering it on every keystroke costs nothing.
  String _query = '';

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// The entries matching [query], by title or by description.
  List<PluginEntry> get _visible {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) return _plugins;

    return _plugins
        .where(
          (entry) =>
              entry.name.toLowerCase().contains(query) ||
              entry.description.toLowerCase().contains(query),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final activities = ref.watch(activityControllerProvider);
    final isFull =
        activities.instances.length >= ActivityController.maxActivities;
    final readOnly = activities.readOnly;

    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final l10n = context.l10n;

    if (_error != null) {
      return _buildState(
        icon: HugeIcons.strokeRoundedAlert02,
        message: l10n.activitiesStoreError,
        detail: _error,
        action: TextButton(
          onPressed: () => unawaited(_load()),
          child: Text(l10n.activitiesStoreRetry),
        ),
      );
    }

    if (_plugins.isEmpty) {
      return _buildState(
        icon: HugeIcons.strokeRoundedPuzzle,
        message: l10n.activitiesStoreEmpty,
      );
    }

    final visible = _visible;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (readOnly || isFull)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              readOnly ? l10n.activitiesReadOnly : l10n.activitiesLimit,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        if (_startError != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              _startError!,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.error,
              ),
            ),
          ),
        _searchField(context, l10n),
        Flexible(
          child: visible.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 28),
                  child: Text(
                    l10n.activitiesStoreNoResults,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                )
              : GridView.builder(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    // On a full HD display the sheet is 1040 wide, which
                    // is four of these; anything narrower drops a column.
                    maxCrossAxisExtent: 260,
                    mainAxisExtent: 206,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: visible.length,
                  itemBuilder: (context, index) {
                    final entry = visible[index];

                    return _PluginCard(
                      entry: entry,
                      isStarting: _startingSlug == entry.slug,
                      isBlocked: readOnly || isFull || _startingSlug != null,
                      isIncompatible: !entry.isCompatibleWith(
                        config.appVersion,
                      ),
                      onStart: () => unawaited(_start(entry)),
                      onInfo: () => unawaited(
                        PluginDetailSheet.show(context, entry: entry),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _searchField(BuildContext context, AppLocalizations l10n) {
    final scheme = Theme.of(context).colorScheme;
    final idle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      borderSide: BorderSide(
        color: scheme.outlineVariant.withValues(alpha: 0.5),
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: _search,
        onChanged: (value) => setState(() => _query = value),
        textInputAction: TextInputAction.search,
        style: const TextStyle(fontSize: 13),
        decoration: InputDecoration(
          isDense: true,
          hintText: l10n.activitiesStoreSearch,
          hintStyle: TextStyle(
            fontSize: 13,
            color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
          ),
          prefixIcon: Icon(
            Icons.search_rounded,
            size: 18,
            color: scheme.onSurfaceVariant,
          ),
          prefixIconConstraints: const BoxConstraints(
            minWidth: 40,
            minHeight: 38,
          ),
          suffixIcon: _query.isEmpty
              ? null
              : IconButton(
                  onPressed: _clearSearch,
                  icon: const Icon(Icons.close_rounded, size: 16),
                  color: scheme.onSurfaceVariant,
                  visualDensity: VisualDensity.compact,
                ),
          suffixIconConstraints: const BoxConstraints(
            minWidth: 36,
            minHeight: 38,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
          border: idle,
          enabledBorder: idle,
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: BorderSide(
              color: scheme.primary.withValues(alpha: 0.6),
            ),
          ),
        ),
      ),
    );
  }

  void _clearSearch() {
    _search.clear();
    setState(() => _query = '');
  }

  Widget _buildState({
    required List<List<dynamic>> icon,
    required String message,
    String? detail,
    Widget? action,
  }) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppHugeIcon(icon: icon, color: scheme.onSurfaceVariant, size: 28),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: scheme.onSurface),
          ),
          if (detail != null) ...[
            const SizedBox(height: 4),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
            ),
          ],
          if (action != null) ...[const SizedBox(height: 8), action],
        ],
      ),
    );
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final library = await apiGateway.plugins.registry.list();
      if (!mounted) return;

      setState(() {
        _plugins = library.plugins;
        _loading = false;
      });
    } on PluginApiException catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error.code;
        _loading = false;
      });
    }
  }

  Future<void> _start(PluginEntry entry) async {
    if (_startingSlug != null) return;

    setState(() {
      _startingSlug = entry.slug;
      _startError = null;
    });

    final controller = ref.read(activityControllerProvider.notifier);

    // An instance is pinned to the build it was started with, so installing a
    // new version does not reach a running activity: tapping it again returned
    // the old one and looked like nothing happened.
    final running = ref
        .read(activityControllerProvider)
        .instances
        .where((instance) => instance.slug == entry.slug)
        .toList();

    if (running.isNotEmpty && running.first.version != entry.version) {
      await controller.stop(running.first.instanceId);
      if (!mounted) return;
    }

    final instance = await controller.start(entry.slug);

    if (!mounted) return;

    setState(() {
      _startingSlug = null;

      if (instance == null) {
        _startError =
            ref.read(activityControllerProvider).error ?? 'E_INTERNAL';
      }
    });

    if (instance != null) {
      Navigator.of(context).maybePop();
    }
  }
}

/// One plugin of the library, as one small rectangle that starts it.
///
/// The banner takes the upper part and the logo straddles the cut; below it
/// the name and the description, with the details on the left and the version
/// as a frosted tag over the artwork.
class _PluginCard extends StatelessWidget {
  const _PluginCard({
    required this.entry,
    required this.isStarting,
    required this.isBlocked,
    required this.isIncompatible,
    required this.onStart,
    required this.onInfo,
  });

  final PluginEntry entry;
  final bool isStarting;
  final bool isBlocked;
  final bool isIncompatible;
  final VoidCallback onStart;
  final VoidCallback onInfo;

  /// The logo sits half over the banner and half over the text.
  static const double _logoSize = 42;

  /// A fixed height keeps every card of the grid the same shape, whatever the
  /// aspect ratio of the banner of the plugin.
  static const double _bannerHeight = 84;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;
    final enabled = !isBlocked && !isIncompatible;

    return Opacity(
      opacity: enabled || isStarting ? 1 : 0.55,
      child: Material(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(AppRadius.bg),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? onStart : null,
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _artwork(context, l10n, scheme),
                  Expanded(child: _body(context, l10n, scheme)),
                ],
              ),
              if (isStarting)
                const Positioned.fill(
                  child: ColoredBox(
                    color: Color(0x66000000),
                    child: Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// The banner, with the logo over its lower edge and the version on top.
  Widget _artwork(
    BuildContext context,
    AppLocalizations l10n,
    ColorScheme scheme,
  ) {
    return SizedBox(
      height: _bannerHeight + _logoSize / 2,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            height: _bannerHeight,
            child: PluginBanner(entry: entry),
          ),
          Positioned(
            right: 7,
            top: 7,
            child: _GlassBadge(text: 'v${entry.version}'),
          ),
          if (isIncompatible)
            Positioned(
              left: 7,
              top: 7,
              child: _GlassBadge(
                text: l10n.activitiesIncompatible,
                color: scheme.error,
              ),
            ),
          Positioned(
            top: _bannerHeight - _logoSize / 2,
            left: 12,
            child: PluginLogo(entry: entry, size: _logoSize, bordered: true),
          ),
        ],
      ),
    );
  }

  Widget _body(
    BuildContext context,
    AppLocalizations l10n,
    ColorScheme scheme,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 8, 3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            entry.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: scheme.onSurface,
            ),
          ),
          if (entry.description.isNotEmpty) ...[
            const SizedBox(height: 1),
            Expanded(
              child: Text(
                entry.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10.5,
                  height: 1.25,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
          ] else
            const Spacer(),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: onInfo,
              style: TextButton.styleFrom(
                foregroundColor: scheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                minimumSize: const Size(0, 26),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
              child: Text(
                l10n.activitiesInfo,
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A small label over the banner, blurred behind it so the artwork shows
/// through without making the text unreadable.
class _GlassBadge extends StatelessWidget {
  const _GlassBadge({required this.text, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.xsm),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          color: (color ?? Colors.black).withValues(alpha: 0.4),
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
