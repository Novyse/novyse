import '../l10n/l10n.dart';

/// Form validation utilities ported from React Native `validator.js`.
class Validator {
  static final RegExp _nameRegex = RegExp(r'^[a-zA-Z\s]+$');
  static final RegExp _handleRegex = RegExp(
    r'^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$',
  );

  /// Validates a user's full/display name.
  static String? validateName(String? value, [AppLocalizations? l10n]) {
    final name = value?.trim() ?? '';
    if (name.isEmpty) {
      return l10n?.requiredField ?? 'Required field';
    }
    if (name.length > 50) {
      return l10n?.nameTooLong ?? 'Name is too long (max 50 characters)';
    }
    if (!_nameRegex.hasMatch(name)) {
      return l10n?.invalidName ?? 'Name can only contain letters and spaces';
    }
    return null;
  }

  /// Validates a username / handle.
  static String? validateHandle(String? value, [AppLocalizations? l10n]) {
    final handle = value?.trim().toLowerCase() ?? '';
    if (handle.isEmpty) {
      return l10n?.requiredField ?? 'Required field';
    }
    if (handle.length < 3) {
      return l10n?.handleTooShort ?? 'Username must be at least 3 characters';
    }
    if (handle.length > 15) {
      return l10n?.handleTooLong ?? 'Username cannot exceed 15 characters';
    }
    if (handle.contains('__')) {
      return l10n?.handleConsecutiveUnderscores ??
          'Username cannot contain consecutive underscores';
    }
    if (!_handleRegex.hasMatch(handle)) {
      return l10n?.invalidHandle ??
          'Username can only contain lowercase letters, numbers, and underscores';
    }
    return null;
  }

  /// Validates a user's password.
  static String? validatePassword(String? value, [AppLocalizations? l10n]) {
    final password = value ?? '';
    if (password.isEmpty) {
      return l10n?.requiredField ?? 'Required field';
    }
    if (password.length < 8) {
      return l10n?.passwordTooShort ?? 'Password must be at least 8 characters';
    }
    return null;
  }

  /// Validates confirmation password against the original password.
  static String? validateConfirmPassword(
    String? value,
    String? originalPassword, [
    AppLocalizations? l10n,
  ]) {
    if (value == null || value.isEmpty) {
      return l10n?.requiredField ?? 'Required field';
    }
    if (value != originalPassword) {
      return l10n?.passwordsDoNotMatch ?? 'Passwords do not match';
    }
    return null;
  }

  // Boolean helper shortcuts
  static bool isNameValid(String? value) => validateName(value) == null;
  static bool isHandleValid(String? value) => validateHandle(value) == null;
  static bool isPasswordValid(String? value) => validatePassword(value) == null;
}
