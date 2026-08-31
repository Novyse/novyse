import 'dart:io' as io;
import 'dart:math' as math;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/themes/themes.dart';

/// Universal, cross-platform Avatar component.
///
/// Features:
/// 1. File & S3 storage resolution via [ProfilePictureService] and [profilePictureUriProvider].
/// 2. Deterministic vibrant gradient with uppercase initial letter (or bookmark for saved messages) when no PFP is available.
/// 3. Online status badge indicator with responsive sizing.
/// 4. Interactive edit overlay support when [onEdit] is provided.
class Avatar extends ConsumerStatefulWidget {
  final String? uuid;
  final String? uri;
  final String? name;
  final String? seedKey;
  final double size;
  final bool isOnline;
  final bool isSavedMessages;
  final VoidCallback? onEdit;
  final VoidCallback? onTap;
  final BoxBorder? border;
  final List<BoxShadow>? customShadow;
  final TextStyle? textStyle;
  final Widget? child;

  const Avatar({
    super.key,
    this.uuid,
    this.uri,
    this.name,
    this.seedKey,
    this.size = 32.0,
    this.isOnline = false,
    this.isSavedMessages = false,
    this.onEdit,
    this.onTap,
    this.border,
    this.customShadow,
    this.textStyle,
    this.child,
  });

  /// The 8 curated gradient color pairs matching Novyse design tokens.
  static const List<List<Color>> colorSchemes = [
    [Color(0xFF4F46E5), Color(0xFF7C3AED)],
    [Color(0xFF2563EB), Color(0xFF38BDF8)],
    [Color(0xFF059669), Color(0xFF34D399)],
    [Color(0xFFD97706), Color(0xFFFBBF24)],
    [Color(0xFFDB2777), Color(0xFFF472B6)],
    [Color(0xFF7C2D12), Color(0xFFF97316)],
    [Color(0xFF4C1D95), Color(0xFFA855F7)],
    [Color(0xFF0F766E), Color(0xFF2DD4BF)],
  ];

  @override
  ConsumerState<Avatar> createState() => _AvatarState();
}

class _AvatarState extends ConsumerState<Avatar> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final hasUuid =
        !widget.isSavedMessages &&
        widget.uuid != null &&
        widget.uuid!.isNotEmpty;

    final pfpAsync = hasUuid
        ? ref.watch(profilePictureUriProvider(widget.uuid))
        : null;
    final resolvedAsyncUri = pfpAsync?.valueOrNull;

    final effectiveUri =
        !widget.isSavedMessages &&
            ((widget.uri != null && widget.uri!.isNotEmpty) ||
                (resolvedAsyncUri != null && resolvedAsyncUri.isNotEmpty))
        ? (widget.uri ?? resolvedAsyncUri)
        : null;

    final indicatorSize = math.max(widget.size * 0.26, 8.0);
    final indicatorBorderWidth = math.max(widget.size * 0.045, 1.5);

    Widget avatarContent = Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: widget.border,
        boxShadow: widget.customShadow,
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background / Image / Placeholder
          ClipOval(
            child: effectiveUri != null && effectiveUri.isNotEmpty
                ? _buildImage(effectiveUri)
                : _buildPlaceholder(),
          ),

          // Custom child overlay if any
          if (widget.child != null) widget.child!,

          // Edit icon overlay when onEdit is provided
          if (widget.onEdit != null && _isHovered)
            Container(
              decoration: const BoxDecoration(
                color: Colors.black45,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  Icons.edit_rounded,
                  color: Colors.white,
                  size: math.max(widget.size * 0.35, 14.0),
                ),
              ),
            ),
        ],
      ),
    );

    // Online indicator badge outside the clip
    final contentWithIndicator = Stack(
      clipBehavior: Clip.none,
      children: [
        avatarContent,
        if (widget.isOnline)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: indicatorSize,
              height: indicatorSize,
              decoration: BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  width: indicatorBorderWidth,
                ),
              ),
            ),
          ),
      ],
    );

    if (widget.onEdit != null || widget.onTap != null) {
      return MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: GestureDetector(
          onTap: widget.onEdit ?? widget.onTap,
          behavior: HitTestBehavior.opaque,
          child: contentWithIndicator,
        ),
      );
    }

    return contentWithIndicator;
  }

  /// Builds the image widget handling memory, file, network, and web paths with error fallback.
  Widget _buildImage(String uri) {
    if (kIsWeb) {
      final bytes = FileStorage.instance.getBytesSync(uri);
      if (bytes != null && bytes.isNotEmpty) {
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          width: widget.size,
          height: widget.size,
          errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
        );
      }
    }

    if (uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('blob:')) {
      return Image.network(
        uri,
        fit: BoxFit.cover,
        width: widget.size,
        height: widget.size,
        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
      );
    }

    if (!kIsWeb) {
      final cleanPath = uri.startsWith('file://')
          ? uri.replaceFirst('file://', '')
          : uri;
      final file = io.File(cleanPath);
      return Image.file(
        file,
        fit: BoxFit.cover,
        width: widget.size,
        height: widget.size,
        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
      );
    }

    // Web fallback
    return Image.network(
      uri,
      fit: BoxFit.cover,
      width: widget.size,
      height: widget.size,
      errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
    );
  }

  /// Generates the deterministic vibrant gradient and initial letter placeholder.
  Widget _buildPlaceholder() {
    final seed = widget.seedKey ?? widget.uuid ?? widget.name ?? 'default';
    final hash = seed.isEmpty
        ? 0
        : seed.codeUnits.fold<int>(0, (prev, elem) => prev + elem);
    final gradientColors =
        Avatar.colorSchemes[hash.abs() % Avatar.colorSchemes.length];

    final initial = (widget.name != null && widget.name!.trim().isNotEmpty)
        ? widget.name!.trim().characters.first.toUpperCase()
        : '?';

    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradientColors,
        ),
      ),
      child: Center(
        child: widget.isSavedMessages
            ? Icon(
                Icons.bookmark_rounded,
                color: Colors.white,
                size: math.max(widget.size * 0.48, 12.0),
              )
            : Text(
                initial,
                style:
                    widget.textStyle ??
                    TextStyle(
                      color: Colors.white,
                      fontSize: math.max(widget.size * 0.42, 10.0),
                      fontWeight: FontWeight.w700,
                    ),
              ),
      ),
    );
  }
}
