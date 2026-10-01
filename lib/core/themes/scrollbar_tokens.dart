import 'package:flutter/material.dart';

/// Shared scrollbar tokens (single source of truth for every overlay
/// scrollbar in the app).
///
/// The look stays the stock Material 3 one (thin fixed-size thumb, no
/// track, color change on hover): only the grab area is fixed at
/// `thickness` 8 so thumbs are easier to hit with a mouse without changing
/// the aesthetics.
///
/// The side window resize handles are kept thin
/// (`WindowChromeStyle.resizeSideEdgeSize`, 2px), so the side scrollbars
/// stay grabbable at the window edge with no inset needed.
abstract final class AppScrollbarTokens {
  /// Resting thumb thickness (visually unchanged vs stock).
  static const double thickness = 8;

  static const Radius radius = Radius.circular(8);

  static const double minThumbLength = 24;
}
