import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// The store of the activities: the library of the plugins, from `GET /plugins`.
///
/// It only starts what it shows: the version, the bundle and the URLs are
/// chosen server-side when the activity starts, so the client cannot pin an
/// arbitrary build. Tapping a row asks the controller to start the slug and
/// closes the store, because the tile appears in the grid behind it.
class PluginStoreSheet extends ConsumerStatefulWidget {
  const PluginStoreSheet({super.key});

  static Future<void> show(BuildContext context) {
    return ResponsiveOverlay.show<void>(
      context: context,
      title: AppLocalizations.of(context)!.activitiesStoreTitle,
      maxWidth: 520,
      child: const PluginStoreSheet(),
    );
  }

  @override
  ConsumerState<PluginStoreSheet> createState() => _PluginStoreSheetState();
}

class _PluginStoreSheetState extends ConsumerState<PluginStoreSheet> {
  List<PluginEntry> _plugins = const [];
  bool _loading = true;
  String? _error;
  String? _startingSlug;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
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
        Flexible(
          child: ListView.separated(
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            itemCount: _plugins.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final entry = _plugins[index];

              return _PluginRow(
                entry: entry,
                isStarting: _startingSlug == entry.slug,
                isBlocked: readOnly || isFull || _startingSlug != null,
                isIncompatible: !entry.isCompatibleWith(config.appVersion),
                onStart: () => unawaited(_start(entry)),
              );
            },
          ),
        ),
      ],
    );
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

    setState(() => _startingSlug = entry.slug);

    final instance = await ref
        .read(activityControllerProvider.notifier)
        .start(entry.slug);

    if (!mounted) return;

    setState(() => _startingSlug = null);

    if (instance != null && mounted) {
      Navigator.of(context).maybePop();
    }
  }
}

/// One plugin of the library.
class _PluginRow extends StatelessWidget {
  const _PluginRow({
    required this.entry,
    required this.isStarting,
    required this.isBlocked,
    required this.isIncompatible,
    required this.onStart,
  });

  final PluginEntry entry;
  final bool isStarting;
  final bool isBlocked;
  final bool isIncompatible;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;
    final enabled = !isBlocked && !isIncompatible;

    return Opacity(
      opacity: enabled || isStarting ? 1 : 0.55,
      child: Material(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? onStart : null,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _PluginIcon(entry: entry),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              entry.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: scheme.onSurface,
                              ),
                            ),
                          ),
                          Text(
                            entry.version,
                            style: TextStyle(
                              fontSize: 11,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      if (entry.description.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          entry.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.25,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (entry.sizeBytes > 0)
                            _MetaLabel(text: _formatSize(entry.sizeBytes)),
                          for (final capability in entry.capabilities)
                            _CapabilityChip(label: capability),
                          if (isIncompatible)
                            _CapabilityChip(
                              label: l10n.activitiesIncompatible,
                              highlight: true,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                SizedBox(
                  width: 40,
                  height: 40,
                  child: Center(
                    child: isStarting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : FloatingIconButton(
                            tooltip: l10n.activitiesStart,
                            onPressed: enabled ? onStart : () {},
                            icon: AppHugeIcon(
                              icon: HugeIcons.strokeRoundedAddCircle,
                              color: enabled
                                  ? scheme.primary
                                  : scheme.onSurfaceVariant,
                              size: 20,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

/// The icon of the plugin, with the initial of the name as a fallback.
class _PluginIcon extends StatelessWidget {
  const _PluginIcon({required this.entry});

  final PluginEntry entry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fallback = Container(
      color: scheme.primaryContainer,
      child: Center(
        child: Text(
          entry.name.isEmpty ? '?' : entry.name.characters.first.toUpperCase(),
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: scheme.onPrimaryContainer,
          ),
        ),
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 44,
        height: 44,
        child: entry.iconUrl.isEmpty
            ? fallback
            : CachedNetworkImage(
                imageUrl: entry.iconUrl,
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => fallback,
                placeholder: (context, url) =>
                    ColoredBox(color: scheme.surfaceContainerHighest),
              ),
      ),
    );
  }
}

/// A capability declared by the plugin, shown as a chip.
class _CapabilityChip extends StatelessWidget {
  const _CapabilityChip({required this.label, this.highlight = false});

  final String label;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = highlight ? scheme.error : scheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        color: color.withValues(alpha: 0.12),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, color: color)),
    );
  }
}

/// The size of the bundle, as a plain label next to the chips.
class _MetaLabel extends StatelessWidget {
  const _MetaLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 10,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}
