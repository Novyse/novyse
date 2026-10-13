import 'dart:ffi';
import 'dart:io';

import 'package:ffi/ffi.dart';

import 'package:novyse/core/comms/devices/os_default_audio_stub.dart';

export 'os_default_audio_stub.dart' show OsDefaultAudioNames;

/// Console-role default capture/render endpoints (Windows only).
Future<OsDefaultAudioNames> readOsDefaultAudioNames() async {
  if (!Platform.isWindows) return const OsDefaultAudioNames();
  try {
    return _WindowsDefaultAudio().read();
  } catch (_) {
    return const OsDefaultAudioNames();
  }
}

class _WindowsDefaultAudio {
  static const _clsctxAll = 23;
  static const _eRender = 0;
  static const _eCapture = 1;
  static const _eConsole = 0;
  static const _vtLpWstr = 31;

  OsDefaultAudioNames read() {
    final ole32 = DynamicLibrary.open('ole32.dll');
    final coInitializeEx = ole32.lookupFunction<Int32 Function(Pointer, Uint32), int Function(Pointer, int)>('CoInitializeEx');
    final coUninitialize = ole32.lookupFunction<Void Function(), void Function()>('CoUninitialize');
    final coCreateInstance = ole32.lookupFunction<Int32 Function(Pointer, Pointer, Uint32, Pointer, Pointer), int Function(Pointer, Pointer, int, Pointer, Pointer)>('CoCreateInstance');
    final propVariantClear = ole32.lookupFunction<Int32 Function(Pointer), int Function(Pointer)>('PropVariantClear');
    final coTaskMemFree = ole32.lookupFunction<Void Function(Pointer), void Function(Pointer)>('CoTaskMemFree');

    final ownInit = coInitializeEx(nullptr, 2) == 0;
    try {
      final enumerator = _create(
        coCreateInstance,
        '{BCDE0395-E52F-467C-8E3D-C4579291692E}',
        '{A95664D2-9614-4F35-A746-DE8DB63617E6}',
      );
      if (enumerator == nullptr) return const OsDefaultAudioNames();
      try {
        final input = _endpoint(enumerator, _eCapture, propVariantClear, coTaskMemFree);
        final output = _endpoint(enumerator, _eRender, propVariantClear, coTaskMemFree);
        return OsDefaultAudioNames(
          inputId: input?.id,
          input: input?.label,
          outputId: output?.id,
          output: output?.label,
        );
      } finally {
        _release(enumerator);
      }
    } finally {
      if (ownInit) coUninitialize();
    }
  }

  Pointer<Void> _create(
    int Function(Pointer, Pointer, int, Pointer, Pointer) coCreateInstance,
    String clsid,
    String iid,
  ) {
    final clsidPtr = _guid(clsid);
    final iidPtr = _guid(iid);
    final out = calloc<Pointer<Void>>();
    try {
      if (coCreateInstance(clsidPtr, nullptr, _clsctxAll, iidPtr, out) != 0) {
        return nullptr;
      }
      return out.value;
    } finally {
      calloc.free(clsidPtr);
      calloc.free(iidPtr);
      calloc.free(out);
    }
  }

  ({String? id, String? label})? _endpoint(
    Pointer<Void> enumerator,
    int dataFlow,
    int Function(Pointer) propVariantClear,
    void Function(Pointer) coTaskMemFree,
  ) {
    final getDefault = _method(enumerator, 4)
        .cast<NativeFunction<Int32 Function(Pointer, Int32, Int32, Pointer<Pointer<Void>>)>>()
        .asFunction<int Function(Pointer, int, int, Pointer<Pointer<Void>>)>();
    final deviceOut = calloc<Pointer<Void>>();
    final hr = getDefault(enumerator, dataFlow, _eConsole, deviceOut);
    final device = deviceOut.value;
    calloc.free(deviceOut);
    if (hr != 0 || device == nullptr) return null;
    try {
      final id = _endpointId(device, coTaskMemFree);
      final openStore = _method(device, 4)
          .cast<NativeFunction<Int32 Function(Pointer, Uint32, Pointer<Pointer<Void>>)>>()
          .asFunction<int Function(Pointer, int, Pointer<Pointer<Void>>)>();
      final storeOut = calloc<Pointer<Void>>();
      final storeHr = openStore(device, 0, storeOut);
      final store = storeOut.value;
      calloc.free(storeOut);
      if (storeHr != 0 || store == nullptr) return (id: id, label: null);
      try {
        return (id: id, label: _friendlyName(store, propVariantClear));
      } finally {
        _release(store);
      }
    } finally {
      _release(device);
    }
  }

  String? _endpointId(Pointer<Void> device, void Function(Pointer) coTaskMemFree) {
    final getId = _method(device, 5)
        .cast<NativeFunction<Int32 Function(Pointer, Pointer<Pointer<Utf16>>)>>()
        .asFunction<int Function(Pointer, Pointer<Pointer<Utf16>>)>();
    final out = calloc<Pointer<Utf16>>();
    try {
      if (getId(device, out) != 0 || out.value == nullptr) return null;
      final id = out.value.toDartString().trim();
      coTaskMemFree(out.value.cast());
      return id.isEmpty ? null : id;
    } finally {
      calloc.free(out);
    }
  }

  String? _friendlyName(Pointer<Void> store, int Function(Pointer) propVariantClear) {
    final getValue = _method(store, 5)
        .cast<NativeFunction<Int32 Function(Pointer, Pointer<_PropertyKey>, Pointer<_PropVariant>)>>()
        .asFunction<int Function(Pointer, Pointer<_PropertyKey>, Pointer<_PropVariant>)>();
    final key = calloc<_PropertyKey>();
    final value = calloc<_PropVariant>();
    try {
      final guid = _guidData('{a45c254e-df1c-4efd-8020-67d146a850e0}');
      for (var i = 0; i < 16; i++) {
        key.ref.fmtid[i] = guid[i];
      }
      key.ref.pid = 14;
      if (getValue(store, key, value) != 0 || value.ref.vt != _vtLpWstr || value.ref.ptr == nullptr) {
        return null;
      }
      return value.ref.ptr.cast<Utf16>().toDartString().trim();
    } finally {
      propVariantClear(value);
      calloc.free(key);
      calloc.free(value);
    }
  }

  Pointer<NativeFunction<Int32 Function()>> _method(Pointer<Void> object, int index) {
    final vtable = object.cast<Pointer<Pointer<Void>>>().value;
    return vtable.cast<Pointer<NativeFunction<Int32 Function()>>>()[index];
  }

  void _release(Pointer<Void> object) {
    if (object == nullptr) return;
    _method(object, 2)
        .cast<NativeFunction<Uint32 Function(Pointer)>>()
        .asFunction<int Function(Pointer)>()(object);
  }

  Pointer<Uint8> _guid(String value) {
    final bytes = _guidData(value);
    final ptr = calloc<Uint8>(16);
    for (var i = 0; i < 16; i++) {
      ptr[i] = bytes[i];
    }
    return ptr;
  }

  List<int> _guidData(String value) {
    final hex = value.replaceAll(RegExp(r'[{}-]'), '');
    final bytes = [for (var i = 0; i < 32; i += 2) int.parse(hex.substring(i, i + 2), radix: 16)];
    return [
      bytes[3], bytes[2], bytes[1], bytes[0],
      bytes[5], bytes[4],
      bytes[7], bytes[6],
      bytes[8], bytes[9], bytes[10], bytes[11],
      bytes[12], bytes[13], bytes[14], bytes[15],
    ];
  }
}

final class _PropertyKey extends Struct {
  @Array(16)
  external Array<Uint8> fmtid;

  @Uint32()
  external int pid;
}

final class _PropVariant extends Struct {
  @Uint16()
  external int vt;

  @Uint16()
  external int reserved1;

  @Uint16()
  external int reserved2;

  @Uint16()
  external int reserved3;

  external Pointer<Utf16> ptr;
}
