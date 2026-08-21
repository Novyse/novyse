import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";

import { useThemeContext } from "@/src/context/ThemeContext";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";
import Switch from "@/src/components/ui/switch/Switch";
import SegmentedSwitch from "@/src/components/ui/switch/SegmentedSwitch";
import { useTranslation } from "react-i18next";
import { ScrollBar } from "@/constants/ScrollBar";
import Divider from "@/src/components/ui/divider/Divider";

interface ScreenShareSource {
  id: string;
  name: string;
  thumbnail?: string;
  appIcon?: string;
}

interface ScreenShareSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSourceSelected: (sourceId: string, includeAudio: boolean) => void;
}

const ScreenShareSelector = ({
  visible,
  onClose,
  onSourceSelected,
}: ScreenShareSelectorProps) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<ScreenShareSource[]>([]);
  const [hasNativeScreenShareMenu, setHasNativeScreenShareMenu] =
    useState(false);
  const [osVersion, setOsVersion] = useState<string | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<"screen" | "window">("screen");

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [includeAudio, setIncludeAudio] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSources();
      setSelectedSourceId(null);
      setIncludeAudio(false);
    }
  }, [visible]);

  useEffect(() => {
    console.log(sources);
  }, [sources]);

  const loadSources = async () => {
    if (!window.electron) return;
    setLoading(true);
    setPermissionDenied(false);

    try {
      const response = await window.electron.rpc.request(
        "screenshare:get-sources",
      );

      if (response.error === "permission-denied") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      if (response.hasNativeScreenShareMenu) {
        setHasNativeScreenShareMenu(true);
      } else {
        setSources(response.sources || []);
        setOsVersion(response.osVersion);
      }
    } catch (error) {
      console.error("Error loading screenshare sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const isMacAudioDisabled = () => {
    if (!osVersion) return false;
    const versionParts = osVersion.split(".").map(Number);
    if (versionParts[0] < 12) return true;
    if (versionParts[0] === 12) {
      if (versionParts[1] < 7) return true;
      if (versionParts[1] === 7 && versionParts[2] <= 6) return true;
    }
    return false;
  };
  const handleNativeShare = async (type: "screen" | "window" | "both") => {
    if (window.electron) {
      await window.electron.rpc.request("screenshare:set-native-type", type);
    }
    onSourceSelected("wayland", includeAudio);
    onClose();
  };

  const handleShare = () => {
    if (selectedSourceId) {
      onSourceSelected(selectedSourceId, includeAudio);
      onClose();
    }
  };

  const screens = sources.filter((s) => s.id.startsWith("screen:"));
  const windows = sources.filter((s) => s.id.startsWith("window:"));

  const isScreenSelected = selectedSourceId?.startsWith("screen:");
  const audioDisabledByMac = isMacAudioDisabled();

  // If a window is selected, audio cannot be included
  useEffect(() => {
    if (!isScreenSelected) {
      setIncludeAudio(false);
    }
  }, [isScreenSelected]);

  const activeSources = activeTab === "screen" ? screens : windows;

  const renderSourceItem = (source: ScreenShareSource) => {
    const isSelected = source.id === selectedSourceId;

    return (
      <TouchableOpacity
        key={source.id}
        style={[styles.sourceItem, isSelected && styles.sourceItemSelected]}
        onPress={() => setSelectedSourceId(source.id)}
      >
        <View style={styles.thumbnailContainer}>
          {source.thumbnail ? (
            <Image
              source={{ uri: source.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
        </View>
        <View style={styles.sourceNameContainer}>
          <Typography numberOfLines={1}>{source.name}</Typography>
        </View>
      </TouchableOpacity>
    );
  };

  const selectorContent = (
    <View style={styles.container}>
      <View style={styles.toggleWrapper}>
        <SegmentedSwitch
          buttonWidth={160}
          options={[
            {
              value: "screen",
              label: t("chat.comms.selectors.screenshare.screen"),
            },
            {
              value: "window",
              label: t("chat.comms.selectors.screenshare.window"),
            },
          ]}
          value={activeTab}
          onChange={(val) => {
            setActiveTab(val as "screen" | "window");
            if (val === "window") setIncludeAudio(false);
          }}
        />
      </View>

      {loading ? (
        <View style={styles.sourcesArea}>
          <View style={styles.loadingContainer}>
            <Typography translationKey="chat.comms.selectors.screenshare.loading" />
          </View>
        </View>
      ) : permissionDenied ? (
        <View style={styles.sourcesArea}>
          <View style={styles.warningContainer}>
            <Typography
              variant="danger"
              translationKey="chat.comms.selectors.screenshare.permissionWarning"
            />
          </View>
        </View>
      ) : hasNativeScreenShareMenu ? null : (
        <View style={styles.sourcesArea}>
          <ScrollView
            style={styles.listWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {activeSources.map(renderSourceItem)}
            </View>
          </ScrollView>
        </View>
      )}

      <Divider/>

      <View style={styles.footer}>
        <View style={styles.footerAudioRow}>
          {activeTab === "screen" ? (
            audioDisabledByMac ? (
              <Typography
                variant="danger"
                translationKey="chat.comms.selectors.screenshare.macOsAudioWarning"
              />
            ) : (
              <View style={styles.audioToggleContainer}>
                <Switch value={includeAudio} onValueChange={setIncludeAudio} />
                <Typography translationKey="chat.comms.selectors.screenshare.includeAudio" />
              </View>
            )
          ) : null}
        </View>

        <View style={styles.footerButtonsRow}>
          <Button
            variant="secondary"
            translationKey="chat.comms.selectors.screenshare.cancel"
            onPress={onClose}
            style={styles.footerButton}
          />

          <Button
            translationKey="chat.comms.selectors.screenshare.startScreenShare"
            onPress={() =>
              hasNativeScreenShareMenu
                ? handleNativeShare(activeTab)
                : handleShare()
            }
            disabled={!hasNativeScreenShareMenu && !selectedSourceId}
            style={styles.footerButton}
          />
        </View>
      </View>
    </View>
  );

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      mode="adaptive"
      scrollable={false}
      titleTranslationKey="chat.comms.selectors.screenshare.title"
    >
      {selectorContent}
    </AdaptiveModal>
  );
};

function createStyle(theme: any) {
  return StyleSheet.create({
    container: {
      width: "100%",
      gap: 25
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    warningContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      paddingHorizontal: 20,
    },
    sourcesArea: {
      width: "100%",
      height: 320,
      minHeight: 320,
      maxHeight: 320,
    },
    listWrapper: {
      width: "100%",
      height: 320,
      minHeight: 320,
      maxHeight: 320,
      ...ScrollBar(theme),
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 5,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      width: 400,
      maxWidth: "100%",
      alignSelf: "center",
    },
    sourceItem: {
      width: 195,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.backgroundMain,
    },
    sourceItemSelected: {
      borderColor: theme.primary,
    },
    thumbnailContainer: {
      width: "100%",
      aspectRatio: 16 / 9,
      overflow: "hidden",
      backgroundColor: theme.borderColor,
    },
    thumbnail: {
      width: "100%",
      height: "100%",
    },
    thumbnailPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.borderColor,
    },
    sourceNameContainer: {
      height: 32,
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    footer: {
      gap: 25,
      padding: 15,
    },
    footerAudioRow: {
      height: 28,
      justifyContent: "center",
    },
    toggleWrapper: {
      paddingHorizontal: 10,
      alignItems: "center",
    },
    audioToggleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    footerButtonsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    footerButton: {
      flex: 1,
      alignSelf: "stretch",
    },
  });
}

export default ScreenShareSelector;
