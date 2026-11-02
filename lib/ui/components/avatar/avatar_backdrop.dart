import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/storage/file/file_storage.dart';

/// Two-stop backdrop palette derived from a profile picture.
///
/// Color extraction matches Flutter's
/// [ColorScheme.fromImageProvider]: the image is scaled as a whole (max
/// 112px), quantized with Celebi, then [Score.score] picks the seed. That is
/// the dominant, scheme-suitable color of the *entire* bitmap — not a center
/// crop. [DynamicSchemeVariant.content] keeps that seed in
/// [ColorScheme.primaryContainer], which is the variant Material recommends
/// for imagery.
class AvatarBackdrop {
  /// Primary container → primary, two tones of the image seed.
  static List<Color> gradientFromScheme(ColorScheme scheme) {
    return [scheme.primaryContainer, scheme.primary];
  }

  /// Dominant-color scheme for [provider], using Material's image pipeline.
  static Future<ColorScheme?> schemeFromImageProvider(
    ImageProvider provider, {
    Brightness brightness = Brightness.light,
  }) async {
    try {
      return await ColorScheme.fromImageProvider(
        provider: provider,
        brightness: brightness,
        dynamicSchemeVariant: DynamicSchemeVariant.content,
      );
    } catch (_) {
      return null;
    }
  }

  static Future<List<Color>?> gradientFromBytes(
    Uint8List bytes, {
    Brightness brightness = Brightness.light,
  }) async {
    final scheme = await schemeFromImageProvider(
      MemoryImage(bytes),
      brightness: brightness,
    );
    if (scheme == null) return null;
    return gradientFromScheme(scheme);
  }
}

/// Arguments for [avatarBackdropGradientProvider].
typedef AvatarBackdropArgs = ({String pfpUUID, Brightness brightness});

/// Resolves a two-stop gradient from the profile picture identified by
/// [AvatarBackdropArgs.pfpUUID].
///
/// Returns `null` when the picture is missing or extraction fails; callers
/// should fall back to [Avatar.gradientColorsFor].
final avatarBackdropGradientProvider =
    FutureProvider.family<List<Color>?, AvatarBackdropArgs>((ref, args) async {
      if (args.pfpUUID.isEmpty) return null;
      final uri = await ref.watch(
        profilePictureUriProvider(args.pfpUUID).future,
      );
      if (uri == null || uri.isEmpty) return null;
      final bytes = await FileStorage.instance.getBytes(uri);
      if (bytes == null || bytes.isEmpty) return null;
      return AvatarBackdrop.gradientFromBytes(
        bytes,
        brightness: args.brightness,
      );
    });
