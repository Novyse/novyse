import 'dart:ffi';

import 'package:ffi/ffi.dart';
import 'package:novyse/core/comms/devices/os_default_audio_stub.dart';

/// Reads the default capture and render endpoints on macOS via CoreAudio.
Future<OsDefaultAudioNames> readMacOsDefaultAudioNames() async {
  return _MacOsDefaultAudio().read();
}

class _MacOsDefaultAudio {
  // CoreAudio constants
  static const _kAudioObjectSystemObject = 1;
  static const _kAudioHardwarePropertyDefaultInputDevice = 0x6466696e; // 'dfin'
  static const _kAudioHardwarePropertyDefaultOutputDevice = 0x64666f75; // 'dfou'
  static const _kAudioDevicePropertyDeviceNameCFString = 0x6c6e616d; // 'lnam'
  static const _kAudioObjectPropertyScopeGlobal = 0x676c6f62; // 'glob'
  static const _kAudioObjectPropertyElementMain = 0;
  static const _kCFStringEncodingUTF8 = 0x08000100;

  OsDefaultAudioNames read() {
    final coreAudio = DynamicLibrary.open(
      '/System/Library/Frameworks/CoreAudio.framework/CoreAudio',
    );
    final coreFoundation = DynamicLibrary.open(
      '/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation',
    );

    final audioObjectGetPropertyData = coreAudio.lookupFunction<
        Int32 Function(Uint32, Pointer<_AudioObjectPropertyAddress>, Uint32,
            Pointer<Void>, Pointer<Uint32>, Pointer<Void>),
        int Function(int, Pointer<_AudioObjectPropertyAddress>, int,
            Pointer<Void>, Pointer<Uint32>, Pointer<Void>)>(
      'AudioObjectGetPropertyData',
    );

    final cfStringGetCString = coreFoundation.lookupFunction<
        Bool Function(Pointer<Void>, Pointer<Utf8>, Int64, Uint32),
        bool Function(Pointer<Void>, Pointer<Utf8>, int, int)>(
      'CFStringGetCString',
    );

    final cfRelease = coreFoundation.lookupFunction<
        Void Function(Pointer<Void>),
        void Function(Pointer<Void>)>('CFRelease');

    final input = _readDevice(
      audioObjectGetPropertyData,
      cfStringGetCString,
      cfRelease,
      isInput: true,
    );
    final output = _readDevice(
      audioObjectGetPropertyData,
      cfStringGetCString,
      cfRelease,
      isInput: false,
    );

    return OsDefaultAudioNames(
      inputId: input?.id,
      input: input?.label,
      outputId: output?.id,
      output: output?.label,
    );
  }

  ({String? id, String? label})? _readDevice(
    int Function(int, Pointer<_AudioObjectPropertyAddress>, int,
            Pointer<Void>, Pointer<Uint32>, Pointer<Void>)
        getProperty,
    bool Function(Pointer<Void>, Pointer<Utf8>, int, int) cfStringGetCString,
    void Function(Pointer<Void>) cfRelease, {
    required bool isInput,
  }) {
    final address = calloc<_AudioObjectPropertyAddress>();
    final sizePtr = calloc<Uint32>();
    final deviceIdPtr = calloc<Uint32>();

    try {
      // Step 1: Get the default device ID.
      address.ref.mSelector = isInput
          ? _kAudioHardwarePropertyDefaultInputDevice
          : _kAudioHardwarePropertyDefaultOutputDevice;
      address.ref.mScope = _kAudioObjectPropertyScopeGlobal;
      address.ref.mElement = _kAudioObjectPropertyElementMain;
      sizePtr.value = sizeOf<Uint32>();

      final status = getProperty(
        _kAudioObjectSystemObject,
        address,
        0,
        nullptr,
        sizePtr,
        deviceIdPtr.cast(),
      );
      if (status != 0) return null;

      final deviceId = deviceIdPtr.value;
      if (deviceId == 0) return null;

      // Step 2: Get the friendly name (CFStringRef).
      address.ref.mSelector = _kAudioDevicePropertyDeviceNameCFString;

      final cfStringPtr = calloc<Pointer<Void>>();
      sizePtr.value = sizeOf<Pointer<Void>>();

      try {
        final nameStatus = getProperty(
          deviceId,
          address,
          0,
          nullptr,
          sizePtr,
          cfStringPtr.cast(),
        );
        if (nameStatus != 0 || cfStringPtr.value == nullptr) {
          return (id: deviceId.toString(), label: null);
        }

        final cfString = cfStringPtr.value;
        try {
          final buffer = calloc<Uint8>(256);
          try {
            if (cfStringGetCString(
                cfString, buffer.cast<Utf8>(), 256, _kCFStringEncodingUTF8)) {
              final name = buffer.cast<Utf8>().toDartString().trim();
              return (
                id: deviceId.toString(),
                label: name.isNotEmpty ? name : null,
              );
            }
          } finally {
            calloc.free(buffer);
          }
        } finally {
          cfRelease(cfString);
        }
      } finally {
        calloc.free(cfStringPtr);
      }
    } finally {
      calloc.free(address);
      calloc.free(sizePtr);
      calloc.free(deviceIdPtr);
    }
    return (id: deviceIdPtr.value.toString(), label: null);
  }
}

final class _AudioObjectPropertyAddress extends Struct {
  @Uint32()
  external int mSelector;

  @Uint32()
  external int mScope;

  @Uint32()
  external int mElement;
}
