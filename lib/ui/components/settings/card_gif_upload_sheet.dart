import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/storage/file/file.dart';
import 'package:novyse/core/storage/file/file_uri.dart';
import 'package:novyse/core/stores/status_message_type.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/status/status_message.dart';

typedef CardGifPicker = Future<PickedFileAsset?> Function();

typedef CardGifUploader = Future<bool> Function(PickedFileAsset asset);

typedef CardGifRemover = Future<bool> Function();

Future<void> showCardGifUploadSheet(
  BuildContext context, {
  CardGifPicker? pickGif,
  CardGifUploader? uploadGif,
  CardGifRemover? removeGif,
}) {
  final l10n = context.l10n;
  return ResponsiveOverlay.show<void>(
    context: context,
    title: l10n.settingsCardGifUploadTitle,
    subtitle: l10n.settingsCardGifUploadSubtitle,
    mode: ResponsiveOverlayMode.dynamic,
    child: CardGifUploadSheet(
      pickGif: pickGif,
      uploadGif: uploadGif,
      removeGif: removeGif,
    ),
  );
}

class CardGifUploadSheet extends ConsumerStatefulWidget {
  const CardGifUploadSheet({
    super.key,
    this.pickGif,
    this.uploadGif,
    this.removeGif,
  });

  final CardGifPicker? pickGif;
  final CardGifUploader? uploadGif;
  final CardGifRemover? removeGif;

  @override
  ConsumerState<CardGifUploadSheet> createState() => _CardGifUploadSheetState();
}

class _CardGifUploadSheetState extends ConsumerState<CardGifUploadSheet> {
  PickedFileAsset? _file;
  String? _validationError;
  String? _uploadError;
  bool _uploading = false;
  bool _removing = false;

  bool get _canUpload {
    final file = _file;
    if (file == null ||
        _uploading ||
        _removing ||
        _validationError != null) {
      return false;
    }
    final bytes = file.bytes;
    return bytes != null && bytes.isNotEmpty;
  }

  bool _isGif({required String name, required String mime, List<int>? bytes}) {
    final clean = mime.split(';').first.trim().toLowerCase();
    if (clean == 'image/gif') return true;
    final ext = name.split('.').last.toLowerCase();
    if (ext == 'gif') return true;
    // GIF87a / GIF89a magic
    if (bytes != null &&
        bytes.length >= 6 &&
        bytes[0] == 0x47 &&
        bytes[1] == 0x49 &&
        bytes[2] == 0x46) {
      return true;
    }
    return false;
  }

  Future<void> _chooseGif() async {
    if (_uploading || _removing) return;
    final picked = await (widget.pickGif ?? FileHandler.pickSingleGif)();
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

    String? error;
    if (validation.hasErrors) {
      error = validation.globalError ??
          validation.invalidFilesData.first.errors.first;
    } else if (!_isGif(name: picked.name, mime: mime, bytes: bytes)) {
      error = context.l10n.settingsCardGifNotGifError;
    }

    setState(() {
      _file = picked;
      _uploadError = null;
      _validationError = error;
    });
  }

  Future<void> _upload() async {
    final file = _file;
    final bytes = file?.bytes;
    if (file == null || bytes == null || bytes.isEmpty || _uploading) return;

    setState(() => _uploading = true);
    final ok = await (widget.uploadGif ?? _uploadWithService)(file);
    if (!mounted) return;
    if (ok) {
      ref.invalidate(profilePictureUriProvider);
      Navigator.of(context, rootNavigator: true).pop();
      return;
    }
    setState(() {
      _uploading = false;
      _uploadError = context.l10n.settingsCardGifUploadError;
    });
  }

  Future<bool> _uploadWithService(PickedFileAsset file) {
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) return Future.value(false);
    final userUUID = ref.read(userStoreProvider).localUserUUID;
    return ProfilePictureService.instance.uploadCardPicture(
      userUUID: userUUID,
      name: file.name,
      mimeType: 'image/gif',
      bytes: Uint8List.fromList(bytes),
    );
  }

  Future<void> _remove() async {
    if (_uploading || _removing) return;
    setState(() {
      _removing = true;
      _uploadError = null;
    });
    final ok = await (widget.removeGif ?? _removeWithService)();
    if (!mounted) return;
    if (ok) {
      ref.invalidate(profilePictureUriProvider);
      Navigator.of(context, rootNavigator: true).pop();
      return;
    }
    setState(() {
      _removing = false;
      _uploadError = context.l10n.settingsCardGifRemoveError;
    });
  }

  Future<bool> _removeWithService() {
    final userUUID = ref.read(userStoreProvider).localUserUUID;
    return ProfilePictureService.instance.removeCardPicture(
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
    final showPicked = previewBytes != null && previewBytes.isNotEmpty;
    final hasCardGif =
        file == null &&
        user?.cardPictureUUID != null &&
        user!.cardPictureUUID!.isNotEmpty;
    final cardAsync = hasCardGif
        ? ref.watch(profilePictureUriProvider(user.cardPictureUUID))
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showPicked)
          _GifPreview(bytes: Uint8List.fromList(previewBytes))
        else
          _CurrentCardGif(uri: cardAsync?.valueOrNull),
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
          label: l10n.settingsCardGifChooseImage,
          onPressed: (_uploading || _removing) ? null : _chooseGif,
        ),
        if (hasCardGif) ...[
          const SizedBox(height: 12),
          AppButton(
            label: l10n.settingsCardGifRemoveAction,
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
                label: l10n.settingsCardGifUploadAction,
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

class _GifPreview extends StatelessWidget {
  const _GifPreview({required this.bytes});

  final Uint8List bytes;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: AspectRatio(
        aspectRatio: 17 / 10,
        child: ColoredBox(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Image.memory(
            bytes,
            fit: BoxFit.contain,
            gaplessPlayback: true,
            errorBuilder: (_, _, _) => const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}

class _CurrentCardGif extends StatelessWidget {
  const _CurrentCardGif({required this.uri});

  final String? uri;

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

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: AspectRatio(
        aspectRatio: 17 / 10,
        child: ColoredBox(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: provider == null
              ? const SizedBox.shrink()
              : Image(
                  image: provider,
                  fit: BoxFit.contain,
                  gaplessPlayback: true,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
        ),
      ),
    );
  }
}
