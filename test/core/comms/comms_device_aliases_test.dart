import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';

CommsDevice _mic(String id, String label, {String? groupId}) => CommsDevice(
  id: id,
  label: label,
  kind: CommsDeviceKind.audioInput,
  groupId: groupId,
);

void main() {
  test('browser default merges with the device sharing its group id', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault([
      _mic('default', 'Standard – Kopfhörer', groupId: 'group-a'),
      _mic('communications', 'Kommunikation – Kopfhörer', groupId: 'group-a'),
      _mic('abc123', 'Kopfhörer (abc123)', groupId: 'group-a'),
      _mic('def456', 'Eingebautes Mikrofon', groupId: 'group-b'),
    ]);

    expect(normalized.devices.map((d) => d.id), ['def456']);
    expect(normalized.systemDefault.id, 'abc123');
    expect(
      CommsDevicesDefaults.defaultOptionLabel(normalized.systemDefault.label),
      'Default: Kopfhörer (abc123)',
    );
  });

  test('windows default uses the physical device, not the role entry', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('{0.0.1.00000000}.{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}', 'Default - Mikrofon (Realtek)'),
        _mic('{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}', 'Mikrofon (Realtek)'),
        _mic('{usb}', 'USB-Mikrofon'),
      ],
      osDefaultId: r'{0.0.1.00000000}.{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
      osDefaultLabel: 'Mikrofon (Realtek)',
    );

    expect(normalized.devices.map((d) => d.id), ['{usb}']);
    expect(normalized.systemDefault.id, '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}');
  });

  test('role entry id still resolves to the physical device', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('{0.0.1.00000000}.{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}', 'Default - Microphone (NVIDIA Broadcast)'),
        _mic('Microphone (NVIDIA Broadcast)', 'Microphone (NVIDIA Broadcast)'),
        _mic('{usb}', 'USB Microphone'),
      ],
      osDefaultId: r'{0.0.1.00000000}.{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
      osDefaultLabel: 'Microfono (NVIDIA Broadcast)',
    );

    expect(normalized.devices.map((d) => d.id), ['{usb}']);
    expect(normalized.systemDefault.id, 'Microphone (NVIDIA Broadcast)');
  });

  test('physical device label may be longer than the role name', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault([
      _mic('virtual', 'Default - Headset Microphone'),
      _mic('physical', 'Headset Microphone (Realtek)'),
      _mic('other', 'USB Microphone'),
    ]);

    expect(normalized.systemDefault.id, 'physical');
    expect(normalized.devices.map((d) => d.id), ['other']);
  });

  test('os name wins over list order with several role entries', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('virtual-realtek', 'Default - Microphone (Realtek)'),
        _mic('physical-realtek', 'Microphone (Realtek)'),
        _mic('virtual-nvidia', 'Default - Microphone (NVIDIA Broadcast)'),
        _mic('physical-nvidia', 'Microphone (NVIDIA Broadcast)'),
      ],
      osDefaultLabel: 'Microphone (NVIDIA Broadcast)',
    );

    expect(normalized.systemDefault.id, 'physical-nvidia');
    expect(normalized.devices.map((d) => d.id), ['virtual-realtek', 'physical-realtek']);
  });

  test('windows default is the device named by the first role entry', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('virtual', 'Default - Microphone (NVIDIA Broadcast)'),
        _mic('physical', 'Microphone (NVIDIA Broadcast)'),
        _mic('{usb}', 'USB Microphone'),
      ],
      osDefaultLabel: 'nome che non coincide',
    );

    expect(normalized.systemDefault.id, 'physical');
    expect(normalized.devices.map((d) => d.id), ['{usb}']);
  });

  test('exact os friendly name is the fallback when ids differ', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('{nvidia}', 'Microfono (NVIDIA Broadcast)'),
        _mic('{realtek}', 'Microfono (Realtek)'),
      ],
      osDefaultLabel: 'Microfono (NVIDIA Broadcast)',
    );

    expect(normalized.devices.map((d) => d.id), ['{realtek}']);
    expect(normalized.systemDefault.id, '{nvidia}');
    expect(
      CommsDevicesDefaults.defaultOptionLabel(normalized.systemDefault.label),
      'Default: Microfono (NVIDIA Broadcast)',
    );
  });

  test('linux default with colon separator maps to physical device and collapses', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('default: Microphone', 'default: Microphone'),
        _mic('hw:0,0', 'Microphone'),
        _mic('usb', 'USB Microphone'),
      ],
      osDefaultLabel: 'Microphone',
    );

    expect(normalized.devices.map((d) => d.id), ['usb']);
    expect(normalized.systemDefault.id, 'hw:0,0');
    expect(
      CommsDevicesDefaults.defaultOptionLabel(normalized.systemDefault.label),
      'Default: Microphone',
    );
  });

  test('linux default device alone collapses into clean system default label', () {
    final normalized = CommsDevicesDefaults.collapseSystemDefault(
      [
        _mic('default: HDA Intel PCH', 'default: HDA Intel PCH'),
        _mic('usb', 'USB Microphone'),
      ],
      osDefaultLabel: 'HDA Intel PCH',
    );

    expect(normalized.devices.map((d) => d.id), ['usb']);
    expect(normalized.systemDefault.id, 'default: HDA Intel PCH');
    expect(
      CommsDevicesDefaults.defaultOptionLabel(normalized.systemDefault.label),
      'Default: HDA Intel PCH',
    );
  });
}
