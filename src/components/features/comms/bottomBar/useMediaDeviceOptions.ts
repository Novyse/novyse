import { useState, useEffect } from "react";
import { Room } from "livekit-client";
import { SelectOption } from "@/src/components/features/settings/SettingsSelectGroup";
import {
  usesNativeAudioRouting,
  getNativeAudioRoutes,
  filterNativeSpeakerRoutes,
  NATIVE_AUDIO_ROUTE_LABEL_PREFIX,
} from "@/src/utils/comms/nativeAudio";

export type MediaDeviceKind = "audioinput" | "audiooutput" | "videoinput";

type MediaDeviceOptionsConfig = {
  enabled: boolean;
  currentDeviceId: string;
  /** LiveKit/WebRTC device kind. Ignored when native Android routes are used. */
  kind: MediaDeviceKind;
  iconName: string;
  /** i18n prefix, e.g. `chat.comms.selectors.microphone` */
  i18nPrefix: string;
  /**
   * Android-only: list AudioSession output routes instead of WebRTC devices.
   * Used for speaker — mic follows the same OS route.
   */
  nativeRouteIcons?: Record<string, string>;
};

const NATIVE_SPEAKER_ICONS: Record<string, string> = {
  speaker: "VolumeHighIcon",
  bluetooth: "BluetoothIcon",
  headset: "HeadphonesIcon",
};

const toWebDeviceOptions = (
  devices: MediaDeviceInfo[],
  currentDeviceId: string,
  iconName: string,
  i18nPrefix: string,
): SelectOption[] =>
  devices.map((device) => {
    const isSelected =
      device.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        device.deviceId === devices[0]?.deviceId);

    return {
      value: device.deviceId,
      iconName,
      labelKey: !device.label ? `${i18nPrefix}.defaultName` : undefined,
      labelOptions: !device.label ? { id: device.deviceId } : undefined,
      labelText: device.label || undefined,
      valueKey: isSelected ? `${i18nPrefix}.currentlySelected` : undefined,
    };
  });

const toNativeRouteOptions = (
  routes: string[],
  currentDeviceId: string,
  icons: Record<string, string>,
  fallbackIcon: string,
  i18nPrefix: string,
): SelectOption[] =>
  routes.map((routeId) => ({
    value: routeId,
    iconName: icons[routeId] || fallbackIcon,
    labelKey: `${NATIVE_AUDIO_ROUTE_LABEL_PREFIX}.${routeId}`,
    valueKey:
      routeId === currentDeviceId
        ? `${i18nPrefix}.currentlySelected`
        : undefined,
  }));

/**
 * Shared options loader for mic / speaker / camera selectors.
 * Web + desktop (+ iOS): Room.getLocalDevices.
 * Android speaker: native AudioSession routes (mic is tied to the same route).
 */
export const useMediaDeviceOptions = ({
  enabled,
  currentDeviceId,
  kind,
  iconName,
  i18nPrefix,
  nativeRouteIcons,
}: MediaDeviceOptionsConfig) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const useNativeRoutes =
          !!nativeRouteIcons && usesNativeAudioRouting && kind === "audiooutput";

        if (useNativeRoutes) {
          const routes = await getNativeAudioRoutes(filterNativeSpeakerRoutes);
          if (cancelled) return;
          setOptions(
            toNativeRouteOptions(
              routes,
              currentDeviceId,
              nativeRouteIcons,
              iconName,
              i18nPrefix,
            ),
          );
          return;
        }

        const devices = await Room.getLocalDevices(kind);
        if (cancelled) return;
        setOptions(
          toWebDeviceOptions(devices, currentDeviceId, iconName, i18nPrefix),
        );
      } catch (error) {
        console.error(`Error loading ${kind} devices:`, error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    currentDeviceId,
    kind,
    iconName,
    i18nPrefix,
    nativeRouteIcons,
  ]);

  return { options, loading };
};

/** Presets so selectors stay one-liners. */
export const MICROPHONE_DEVICE_OPTIONS = {
  kind: "audioinput" as const,
  iconName: "Mic02Icon",
  i18nPrefix: "chat.comms.selectors.microphone",
};

export const SPEAKER_DEVICE_OPTIONS = {
  kind: "audiooutput" as const,
  iconName: "VolumeHighIcon",
  i18nPrefix: "chat.comms.selectors.speaker",
  nativeRouteIcons: NATIVE_SPEAKER_ICONS,
};

export const CAMERA_DEVICE_OPTIONS = {
  kind: "videoinput" as const,
  iconName: "Camera01Icon",
  i18nPrefix: "chat.comms.selectors.camera",
};
