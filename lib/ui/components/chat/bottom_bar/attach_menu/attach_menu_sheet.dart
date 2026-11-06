import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_handler.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_item.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

/// Content of the attach (message-type) menu, hosted inside a
/// [ResponsiveOverlay] (bottom sheet on mobile, dialog on desktop/web).
///
/// The [SegmentedSwitch] acts as a floating bar pinned to the bottom of
/// this component (absolute, overlapping the panel): switching segment
/// switches the panel itself, so each message type gets its own screen
/// and the user can compose different content without leaving the sheet.
///
/// Layout / insets note: the bar sits at the bottom of this component's
/// box, so it inherits the host's insets — [OverlayBottomSheet] already
/// offsets its content with `SafeArea(top: false)` (system navigation bar
/// on mobile, zero on desktop/web where [MediaQuery] padding is zero).
/// No extra bottom padding is added here on purpose to avoid doubling
/// that inset. The panel scrolls full-bleed behind the floating bar
/// (see [_kPanelBottomPad]).
class AttachMenuSheetContent extends ConsumerStatefulWidget {
  const AttachMenuSheetContent({super.key, required this.chatUUID});

  final String chatUUID;

  static const List<AttachMenuAction> menuItems = [
    AttachMenuAction.media,
    AttachMenuAction.camera,
    AttachMenuAction.file,
    AttachMenuAction.recording,
    AttachMenuAction.location,
    AttachMenuAction.todo,
    AttachMenuAction.poll,
  ];

  @override
  ConsumerState<AttachMenuSheetContent> createState() =>
      _AttachMenuSheetContentState();
}

/// Fixed panel height so the inner [Stack] (panel + absolute floating
/// bar) has bounded constraints inside the sheet's scroll view.
const double _kSheetBodyHeight = 400;

/// Room kept at the end of the scrolling panel so its last content can
/// scroll above the overlapping floating bar.
const double _kPanelBottomPad = 84;

class _AttachMenuSheetContentState
    extends ConsumerState<AttachMenuSheetContent> {
  AttachMenuAction _selected = AttachMenuAction.media;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return SizedBox(
      height: _kSheetBodyHeight,
      child: Stack(
        children: [
          // Scrollable panel: full-bleed, runs behind the floating bar.
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: _kPanelBottomPad),
              child: _AttachPanel(
                key: ValueKey(_selected),
                action: _selected,
                chatUUID: widget.chatUUID,
              ),
            ),
          ),
          // Floating bar: absolute at the bottom of the component.
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SegmentedSwitch<AttachMenuAction>(
              options: [
                for (final action in AttachMenuSheetContent.menuItems)
                  SegmentedOption(
                    value: action,
                    label: action.label(l10n),
                    icon: AppHugeIcon(
                      icon: action.icon,
                      size: 18,
                      color: action == _selected
                          ? scheme.onPrimary
                          : scheme.onSurfaceVariant,
                    ),
                    // Disabled segments are not selectable: SegmentedSwitch
                    // already ignores taps on them.
                    enabled: action.enabled,
                  ),
              ],
              value: _selected,
              onChanged: (value) => setState(() => _selected = value),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dispatches each menu action to its own specific panel component.
/// Placeholders render only text for now: swap them with the real
/// component from another file when ready.
class _AttachPanel extends StatelessWidget {
  const _AttachPanel({
    super.key,
    required this.action,
    required this.chatUUID,
  });

  final AttachMenuAction action;
  final String chatUUID;

  @override
  Widget build(BuildContext context) {
    return switch (action) {
      AttachMenuAction.media => _MediaAttachPanel(chatUUID: chatUUID),
      AttachMenuAction.file => _FileAttachPanel(chatUUID: chatUUID),
      AttachMenuAction.camera => const _CameraAttachPanel(),
      AttachMenuAction.recording => const _RecordingAttachPanel(),
      AttachMenuAction.location => const _LocationAttachPanel(),
      AttachMenuAction.todo => const _TodoAttachPanel(),
      AttachMenuAction.poll => const _PollAttachPanel(),
    };
  }
}

/// Pops the sheet only when there is actually a sheet route above the
/// app content (never the last route: in widget tests the auto-picker
/// panels mount without a sheet and must stay put).
void _closeSheet(BuildContext context) {
  final navigator = Navigator.of(context, rootNavigator: true);
  if (navigator.canPop()) navigator.pop();
}

/// Media panel: the action lives on the card button — tapping it closes
/// the sheet and opens the system media picker (same flow as before).
class _MediaAttachPanel extends ConsumerStatefulWidget {
  const _MediaAttachPanel({required this.chatUUID});

  final String chatUUID;

  @override
  ConsumerState<_MediaAttachPanel> createState() => _MediaAttachPanelState();
}

class _MediaAttachPanelState extends ConsumerState<_MediaAttachPanel> {
  Future<void> _open() async {
    final container = ProviderScope.containerOf(context, listen: false);
    _closeSheet(context);
    await AttachMenuHandler.pickMedia(container, widget.chatUUID);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _PickerPanelBody(
      label: l10n.attachMenuMedia,
      icon: AttachMenuAction.media.icon,
      onSelect: _open,
    );
  }
}

/// File panel: same as media, with the generic file picker.
class _FileAttachPanel extends ConsumerStatefulWidget {
  const _FileAttachPanel({required this.chatUUID});

  final String chatUUID;

  @override
  ConsumerState<_FileAttachPanel> createState() => _FileAttachPanelState();
}

class _FileAttachPanelState extends ConsumerState<_FileAttachPanel> {
  Future<void> _open() async {
    final container = ProviderScope.containerOf(context, listen: false);
    _closeSheet(context);
    await AttachMenuHandler.pickFile(container, widget.chatUUID);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _PickerPanelBody(
      label: l10n.attachMenuFile,
      icon: AttachMenuAction.file.icon,
      onSelect: _open,
    );
  }
}

/// Body shared by the picker panels: icon + label + the action button
/// that opens the system picker.
// todo replace with proper component
class _PickerPanelBody extends StatelessWidget {
  const _PickerPanelBody({
    required this.label,
    required this.icon,
    required this.onSelect,
  });

  final String label;
  final List<List<dynamic>> icon;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppHugeIcon(icon: icon, size: 40),
            const SizedBox(height: 12),
            Text(label, style: theme.textTheme.titleMedium),
            const SizedBox(height: 16),
            FilledButton.tonal(onPressed: onSelect, child: Text(l10n.select)),
          ],
        ),
      ),
    );
  }
}

// Placeholders for the disabled entries: specific components already
// wired to the switch, rendering only text until their real UI lands.
// TODO: replace the Text with the real component from its own file.

// TODO: replace with CameraComponent.
class _CameraAttachPanel extends StatelessWidget {
  const _CameraAttachPanel();

  @override
  Widget build(BuildContext context) {
    return _PlaceholderAttachPanel(label: context.l10n.attachMenuCamera);
  }
}

// TODO: replace with RecordingComponent.
class _RecordingAttachPanel extends StatelessWidget {
  const _RecordingAttachPanel();

  @override
  Widget build(BuildContext context) {
    return _PlaceholderAttachPanel(label: context.l10n.attachMenuRecording);
  }
}

// TODO: replace with LocationComponent.
class _LocationAttachPanel extends StatelessWidget {
  const _LocationAttachPanel();

  @override
  Widget build(BuildContext context) {
    return _PlaceholderAttachPanel(label: context.l10n.attachMenuLocation);
  }
}

// TODO: replace with TodoComponent.
class _TodoAttachPanel extends StatelessWidget {
  const _TodoAttachPanel();

  @override
  Widget build(BuildContext context) {
    return _PlaceholderAttachPanel(label: context.l10n.attachMenuTodo);
  }
}

// TODO: replace with PollComponent.
class _PollAttachPanel extends StatelessWidget {
  const _PollAttachPanel();

  @override
  Widget build(BuildContext context) {
    return _PlaceholderAttachPanel(label: context.l10n.attachMenuPoll);
  }
}

// todo: replace with proper component
class _PlaceholderAttachPanel extends StatelessWidget {
  const _PlaceholderAttachPanel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
        child: Text(
          label,
          style: Theme.of(context).textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

/// Opens the attach menu as an adaptive overlay: bottom sheet on mobile,
/// dialog on desktop/web (same component, [ResponsiveOverlayMode.dynamic]).
Future<void> showAttachMenuSheet(BuildContext context, String chatUUID) {
  final l10n = AppLocalizations.of(context)!;
  return ResponsiveOverlay.show<void>(
    context: context,
    title: l10n.attachFilesTooltip,
    child: AttachMenuSheetContent(chatUUID: chatUUID),
  );
}
