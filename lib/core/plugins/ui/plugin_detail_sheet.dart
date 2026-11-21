import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/ui/components/markdown/markdown_style.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:url_launcher/url_launcher.dart';

/// The page of one plugin: banner, logo, README and the metadata of the build.
///
/// It reads nothing from the gateway beyond [entry]: the README is the file of
/// the release (images included, as the page renders it) and the table is the
/// same entry the store listed, so the two cannot disagree.
class PluginDetailSheet extends StatelessWidget {
  const PluginDetailSheet({super.key, required this.entry});

  final PluginEntry entry;

  static Future<void> show(BuildContext context, {required PluginEntry entry}) {
    return ResponsiveOverlay.show<void>(
      context: context,
      title: entry.name,
      maxWidth: 900,
      sheetMaxWidth: 720,
      maxHeightFactor: 0.92,
      child: PluginDetailSheet(entry: entry),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      shrinkWrap: true,
      padding: EdgeInsets.zero,
      children: [
        _Header(entry: entry),
        const SizedBox(height: 34),
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 620;
            final meta = _MetaPanel(entry: entry);
            final readme = _ReadmePanel(entry: entry);

            if (!wide) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [meta, const SizedBox(height: 20), readme],
              );
            }

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: readme),
                const SizedBox(width: 24),
                SizedBox(width: 250, child: meta),
              ],
            );
          },
        ),
      ],
    );
  }
}

/// Banner with the logo hanging over its bottom-left corner.
class _Header extends StatelessWidget {
  const _Header({required this.entry});

  final PluginEntry entry;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: AspectRatio(
            aspectRatio: 1600 / 600,
            child: PluginBanner(entry: entry),
          ),
        ),
        Positioned(
          left: 14,
          bottom: -24,
          child: PluginLogo(entry: entry, size: 64, bordered: true),
        ),
      ],
    );
  }
}

/// The artwork of a plugin across the app.
///
/// Both widgets fall back to the theme when the plugin ships no image, so a new
/// plugin is presentable before anyone draws a banner.
class PluginBanner extends StatelessWidget {
  const PluginBanner({super.key, required this.entry});

  final PluginEntry entry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [scheme.primaryContainer, scheme.surfaceContainerHighest],
        ),
      ),
    );

    if (entry.bannerUrl.isEmpty) return fallback;

    return CachedNetworkImage(
      imageUrl: entry.bannerUrl,
      fit: BoxFit.cover,
      placeholder: (context, url) =>
          ColoredBox(color: scheme.surfaceContainerHighest),
      errorWidget: (context, url, error) => fallback,
    );
  }
}

/// The logo of a plugin: `icon.png` of the bundle, with its initial as fallback.
class PluginLogo extends StatelessWidget {
  const PluginLogo({
    super.key,
    required this.entry,
    this.size = 46,
    this.bordered = false,
  });

  final PluginEntry entry;
  final double size;

  /// A ring and a surface behind the logo, for when it sits over the banner.
  final bool bordered;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final radius = BorderRadius.circular(size * 0.22);

    final fallback = ColoredBox(
      color: scheme.primaryContainer,
      child: Center(
        child: Text(
          entry.name.isEmpty ? '?' : entry.name.characters.first.toUpperCase(),
          style: TextStyle(
            fontSize: size * 0.34,
            fontWeight: FontWeight.w600,
            color: scheme.onPrimaryContainer,
          ),
        ),
      ),
    );

    final logo = ClipRRect(
      borderRadius: radius,
      child: SizedBox(
        width: size,
        height: size,
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

    if (!bordered) return logo;

    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(size * 0.22 + 2),
      ),
      child: logo,
    );
  }
}

/// `53412` → `52 KB`.
String formatPluginSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}

/// Version, author, permissions and the rest of what the manifest declared.
class _MetaPanel extends StatelessWidget {
  const _MetaPanel({required this.entry});

  final PluginEntry entry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.25),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _row(
            context,
            l10n.pluginDetailVersion,
            _text(context, entry.version),
          ),
          if (entry.description.isNotEmpty)
            _row(
              context,
              l10n.pluginDetailDescription,
              _text(context, entry.description),
            ),
          if (!entry.author.isEmpty)
            _row(
              context,
              l10n.pluginDetailAuthor,
              _author(context, entry.author),
            ),
          if (entry.sizeBytes > 0)
            _row(
              context,
              l10n.pluginDetailSize,
              _text(context, formatPluginSize(entry.sizeBytes)),
            ),
          _row(
            context,
            l10n.pluginDetailLanguages,
            _text(
              context,
              entry.locales.isEmpty
                  ? l10n.pluginDetailNone
                  : entry.locales.join(', '),
            ),
          ),
          if (entry.minAppVersion.isNotEmpty)
            _row(
              context,
              l10n.pluginDetailMinAppVersion,
              _text(context, entry.minAppVersion),
            ),
          _row(
            context,
            l10n.pluginDetailCapabilities,
            _chips(context, entry.capabilities),
          ),
          _row(
            context,
            l10n.pluginDetailChannels,
            _chips(context, entry.channels),
          ),
          _row(
            context,
            l10n.pluginDetailFrame,
            entry.frameOrigins.isEmpty
                ? _text(context, l10n.pluginDetailNone)
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final origin in entry.frameOrigins)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(
                            origin,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _author(BuildContext context, PluginAuthor author) {
    final uri = author.url.isEmpty ? null : Uri.tryParse(author.url);

    // Without a page, or with one that is not a launchable URL, the name is
    // plain text: a broken link is worse than no link.
    if (uri == null || !uri.hasScheme) return _text(context, author.name);

    final scheme = Theme.of(context).colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(4),
      onTap: () async {
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
      child: Text(
        author.name,
        style: TextStyle(
          fontSize: 12.5,
          height: 1.3,
          color: scheme.primary,
          decoration: TextDecoration.underline,
          decorationColor: scheme.primary.withValues(alpha: 0.5),
        ),
      ),
    );
  }

  Widget _text(BuildContext context, String value) {
    return Text(
      value,
      style: TextStyle(
        fontSize: 12.5,
        height: 1.3,
        color: Theme.of(context).colorScheme.onSurface,
      ),
    );
  }

  Widget _chips(BuildContext context, List<String> values) {
    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;

    if (values.isEmpty) return _text(context, l10n.pluginDetailNone);

    return Wrap(
      spacing: 5,
      runSpacing: 5,
      children: [
        for (final value in values)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              color: scheme.primary.withValues(alpha: 0.12),
            ),
            child: Text(
              value,
              style: TextStyle(fontSize: 10, color: scheme.primary),
            ),
          ),
      ],
    );
  }

  Widget _row(BuildContext context, String label, Widget child) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 9.5,
              letterSpacing: 0.6,
              fontWeight: FontWeight.w600,
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 3),
          child,
        ],
      ),
    );
  }
}

/// The README of the release, rendered as Markdown.
///
/// Images are absolute URLs by contract (a relative path would resolve against
/// nothing in a raw file), so the default image builder is enough.
class _ReadmePanel extends StatefulWidget {
  const _ReadmePanel({required this.entry});

  final PluginEntry entry;

  @override
  State<_ReadmePanel> createState() => _ReadmePanelState();
}

class _ReadmePanelState extends State<_ReadmePanel> {
  final Dio _dio = Dio();

  String? _markdown;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });

    final url = widget.entry.readmeUrl;

    if (url.isEmpty) {
      setState(() {
        _markdown = null;
        _loading = false;
      });
      return;
    }

    try {
      final response = await _dio.get<String>(
        url,
        options: Options(
          responseType: ResponseType.plain,
          followRedirects: true,
        ),
      );

      if (!mounted) return;

      setState(() {
        _markdown = response.data;
        _loading = false;
      });
    } on Object {
      if (!mounted) return;

      setState(() {
        _failed = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;

    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_failed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.pluginDetailReadmeError,
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
          ),
          TextButton(
            onPressed: _load,
            child: Text(l10n.pluginDetailReadmeRetry),
          ),
        ],
      );
    }

    final markdown = _markdown;

    if (markdown == null || markdown.trim().isEmpty) {
      return Text(
        l10n.pluginDetailReadmeEmpty,
        style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
      );
    }

    return MarkdownBody(
      data: markdown,
      selectable: true,
      styleSheet: appMarkdownStyleSheet(
        context,
        fontSize: 13,
        height: 1.45,
        background: scheme.surfaceContainerHighest,
      ),
      onTapLink: (text, href, title) async {
        final uri = href == null ? null : Uri.tryParse(href);
        if (uri == null) return;

        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
    );
  }
}
