import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/storage/file/file.dart';
import 'package:novyse/core/storage/file/file_uri.dart';
import 'package:novyse/core/stores/status_message_type.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/image_crop/image_crop.dart';
import 'package:novyse/ui/components/profile/profile_card.dart';
import 'package:novyse/core/utils/profile_gradient_ui.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/status/status_message.dart';

typedef BannerImagePicker = Future<PickedFileAsset?> Function();

typedef BannerImageUploader = Future<bool> Function(PickedFileAsset asset);

typedef BannerImageRemover = Future<bool> Function();

Future<void> showBannerUploadSheet(
  BuildContext context, {
  BannerImagePicker? pickImage,
  BannerImageUploader? uploadImage,
  BannerImageRemover? removeImage,
}) {
  final l10n = context.l10n;
  return ResponsiveOverlay.show<void>(
    context: context,
    title: l10n.settingsBannerUploadTitle,
    subtitle: l10n.settingsBannerUploadSubtitle,
    mode: ResponsiveOverlayMode.dynamic,
    child: BannerUploadSheet(
      pickImage: pickImage,
      uploadImage: uploadImage,
      removeImage: removeImage,
    ),
  );
}

class BannerUploadSheet extends ConsumerStatefulWidget {
  const BannerUploadSheet({
    super.key,
    this.pickImage,
    this.uploadImage,
    this.removeImage,
  });

  final BannerImagePicker? pickImage;
  final BannerImageUploader? uploadImage;
  final BannerImageRemover? removeImage;

  @override
  ConsumerState<BannerUploadSheet> createState() => _BannerUploadSheetState();
}

class _BannerUploadSheetState extends ConsumerState<BannerUploadSheet> {
  PickedFileAsset? _file;
  ImageCropSelection? _selection;
  String? _validationError;
  String? _uploadError;
  bool _uploading = false;
  bool _removing = false;

  bool get _canUpload {
    final file = _file;
    if (file == null ||
        _selection == null ||
        _uploading ||
        _removing ||
        _validationError != null) {
      return false;
    }
    final bytes = file.bytes;
    return bytes != null && bytes.isNotEmpty;
  }

  Future<void> _chooseImage() async {
    if (_uploading || _removing) return;
    final picked = await (widget.pickImage ?? FileHandler.pickSingleImage)();
    if (!mounted || picked == null) return;

    final bytes = picked.bytes;
    final size = bytes?.length ?? picked.size;
    final mime = getMimeType({'name': picked.name}, headerBytes: bytes);
    final validation = validateFiles(
      [
        {'name': picked.name, 'size': size, 'mimeType': mime},
      ],
      fileType: 'Image',
      maxFiles: 1,
      maxSingleSize: ProfilePictureService.maxProfilePictureBytes,
      maxTotalSize: ProfilePictureService.maxProfilePictureBytes,
    );

    setState(() {
      _file = picked;
      _selection = null;
      _uploadError = null;
      _validationError = validation.hasErrors
          ? (validation.globalError ??
                validation.invalidFilesData.first.errors.first)
          : null;
    });
  }

  Future<void> _upload() async {
    final file = _file;
    final bytes = file?.bytes;
    if (file == null || bytes == null || bytes.isEmpty || _uploading) return;

    final selection = _selection;
    if (selection == null) return;

    setState(() => _uploading = true);
    final PickedFileAsset cropped;
    try {
      final bytesOut = await cropImageBytes(
        Uint8List.fromList(bytes),
        selection.normalized,
      );
      cropped = PickedFileAsset(
        name: croppedFileName(file.name),
        size: bytesOut.length,
        bytes: bytesOut,
        extension: 'png',
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _uploadError = context.l10n.settingsBannerUploadError;
      });
      return;
    }
    if (!mounted) return;
    final ok = await (widget.uploadImage ?? _uploadWithService)(cropped);
    if (!mounted) return;
    if (ok) {
      ref.invalidate(profilePictureUriProvider);
      Navigator.of(context, rootNavigator: true).pop();
      return;
    }
    setState(() {
      _uploading = false;
      _uploadError = context.l10n.settingsBannerUploadError;
    });
  }

  Future<bool> _uploadWithService(PickedFileAsset file) {
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) return Future.value(false);
    final userUUID = ref.read(userStoreProvider).localUserUUID;
    return ProfilePictureService.instance.uploadBannerPicture(
      userUUID: userUUID,
      name: file.name,
      mimeType: getMimeType({'name': file.name}, headerBytes: bytes),
      bytes: Uint8List.fromList(bytes),
    );
  }

  Future<void> _remove() async {
    if (_uploading || _removing) return;
    setState(() {
      _removing = true;
      _uploadError = null;
    });
    final ok = await (widget.removeImage ?? _removeWithService)();
    if (!mounted) return;
    if (ok) {
      ref.invalidate(profilePictureUriProvider);
      Navigator.of(context, rootNavigator: true).pop();
      return;
    }
    setState(() {
      _removing = false;
      _uploadError = context.l10n.settingsBannerRemoveError;
    });
  }

  Future<bool> _removeWithService() {
    final userUUID = ref.read(userStoreProvider).localUserUUID;
    return ProfilePictureService.instance.removeBannerPicture(
      userUUID: userUUID,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final user = ref.watch(localUserProvider);
    final file = _file;
    final message = _uploadError ?? _validationError;
    final previewBytes = _validationError == null ? file?.bytes : null;
    final showGuide = previewBytes != null && previewBytes.isNotEmpty;
    final hasBanner =
        file == null &&
        user?.bannerPictureUUID != null &&
        user!.bannerPictureUUID!.isNotEmpty;
    final bannerAsync = hasBanner
        ? ref.watch(profilePictureUriProvider(user.bannerPictureUUID))
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showGuide)
          ImageCropGuide(
            bytes: Uint8List.fromList(previewBytes),
            shape: ImageCropShape.rectangle,
            aspectRatio: kProfileBannerAspectRatio,
            enabled: !_uploading,
            onChanged: (selection) {
              final first = _selection == null;
              _selection = selection;
              if (first && mounted) setState(() {});
            },
            onError: () {
              if (!mounted) return;
              setState(() {
                _validationError = context.l10n.settingsBannerCropError;
              });
            },
          )
        else
          _CurrentBanner(
            uri: bannerAsync?.valueOrNull,
            bannerColor: user?.bannerColor,
          ),
        if (showGuide) ...[
          const SizedBox(height: 12),
          Text(
            l10n.settingsBannerCropHint,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        if (file != null && _validationError == null) ...[
          const SizedBox(height: 8),
          Text(
            file.name,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 20),
        AppButton(
          label: l10n.settingsBannerChooseImage,
          onPressed: (_uploading || _removing) ? null : _chooseImage,
        ),
        if (hasBanner) ...[
          const SizedBox(height: 12),
          AppButton(
            label: l10n.settingsBannerRemoveAction,
            variant: AppButtonVariant.danger,
            isLoading: _removing,
            onPressed: (_uploading || _removing) ? null : _remove,
          ),
        ],
        if (message != null) ...[
          const SizedBox(height: 12),
          StatusMessage(
            type: StatusMessageType.danger,
            content: [message],
            closable: _uploadError != null,
            onClose: _uploadError == null
                ? null
                : () => setState(() => _uploadError = null),
          ),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: l10n.settingsCommonCancel,
                onPressed: (_uploading || _removing)
                    ? null
                    : () => Navigator.of(context, rootNavigator: true).pop(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: l10n.settingsBannerUploadAction,
                isLoading: _uploading,
                onPressed: _canUpload ? _upload : null,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _CurrentBanner extends StatelessWidget {
  const _CurrentBanner({required this.uri, this.bannerColor});

  final String? uri;
  final ProfileGradient? bannerColor;

  @override
  Widget build(BuildContext context) {
    final resolved = uri;
    ImageProvider? provider;
    if (resolved != null && resolved.isNotEmpty) {
      if (resolved.startsWith('http://') ||
          resolved.startsWith('https://') ||
          resolved.startsWith('blob:')) {
        provider = NetworkImage(resolved);
      } else if (!kIsWeb) {
        provider = FileImage(fileFromUri(resolved));
      }
    }

    final color = bannerColor;
    return AspectRatio(
      aspectRatio: kProfileBannerAspectRatio,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: color != null && color.stops.isNotEmpty
              ? linearGradientFromProfileGradient(color)
              : null,
          color: color != null && color.stops.isNotEmpty
              ? null
              : Colors.transparent,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: provider == null
              ? const SizedBox.shrink()
              : Image(
                  image: provider,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
        ),
      ),
    );
  }
}
