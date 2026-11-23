import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/themes/themes.dart';

/// Neutral skeleton line shown while voice/audio metadata is loading.
class MessagePlaceholderBar extends StatelessWidget {
  const MessagePlaceholderBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 8,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.onSurfaceVariant
            .withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(AppRadius.xsm),
      ),
    );
  }
}
