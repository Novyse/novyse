import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { t } from "i18next";

import { ScrollBar } from "@/constants/ScrollBar";
import { useThemeContext } from "@/src/context/ThemeContext";
import AppText from "@/src/components/ui/text/AppText";
import ToggleSelector from "@/src/components/ToggleSelector";

import gateway from "@/src/utils/backend-services/api-gateway";

const STORAGE_KEY = "novyse-recent-gifs";
const MAX_RECENTS = 24;
const SEARCH_DEBOUNCE_MS = 350;

type GifResult = {
  id: string;
  provider?: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
};

interface GifPickerProps {
  onSelectGif: (url: string) => void;
}

const filterByProvider = (
  gifs: GifResult[],
  selectedProvider: string,
): GifResult[] => {
  if (selectedProvider === "all") return gifs;
  return gifs.filter((g) => g.provider === selectedProvider);
};

export const GifPicker: React.FC<GifPickerProps> = ({ onSelectGif }) => {
  const { theme } = useThemeContext();
  const styles = useMemo(() => createStyle(theme), [theme]);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [trending, setTrending] = useState<GifResult[]>([]);
  const [searchResults, setSearchResults] = useState<GifResult[]>([]);
  const [recentGifs, setRecentGifs] = useState<GifResult[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  const requestIdRef = useRef(0);

  const columnCount = containerWidth < 280 ? 2 : 3;
  const gap = 6;
  const cellWidth =
    (containerWidth - 20 - gap * (columnCount - 1)) / columnCount;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) setRecentGifs(parsed);
      } catch {
        // ignore corrupt storage
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestIdRef.current;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          success,
          data,
          error: apiError,
        } = await gateway.search.gif(debouncedQuery);
        if (!success) {
          throw new Error(apiError || "GIF search failed");
        }
        const items = Array.isArray(data?.items) ? data.items : [];
        const providers = Array.isArray(data?.providers) ? data.providers : [];
        if (!cancelled && id === requestIdRef.current) {
          setAvailableProviders(providers);
          if (debouncedQuery) {
            setSearchResults(items);
          } else {
            setTrending(items);
            setSearchResults([]);
          }
        }
      } catch (e: any) {
        if (!cancelled && id === requestIdRef.current) {
          setError(e?.message || "Failed to load GIFs");
        }
      } finally {
        if (!cancelled && id === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (gif: GifResult) => {
      onSelectGif(gif.url);
      setRecentGifs((prev) => {
        const updated = [gif, ...prev.filter((g) => g.id !== gif.id)].slice(
          0,
          MAX_RECENTS,
        );
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [onSelectGif],
  );

  const providerOptions = useMemo(() => {
    if (availableProviders.length === 0) return [];
    return [
      { value: "all", label: t("chat.gifCategories.providerAll") },
      ...availableProviders.map((id) => ({
        value: id,
        label: id ? id.charAt(0).toUpperCase() + id.slice(1) : id,
      })),
    ];
  }, [availableProviders]);

  const isSearching = debouncedQuery.length > 0;

  const listData = useMemo(() => {
    const data: Array<
      | { type: "header"; key: string; titleKey: string }
      | ({ type: "gif"; key: string } & GifResult)
    > = [];

    const pushSection = (key: string, titleKey: string, gifs: GifResult[]) => {
      const filtered = filterByProvider(gifs, selectedProvider);
      if (filtered.length === 0) return;
      data.push({ type: "header", key: `header-${key}`, titleKey });
      filtered.forEach((gif) => {
        data.push({ type: "gif", key: `${key}-${gif.id}`, ...gif });
      });
    };

    if (isSearching) {
      pushSection("search", "chat.gifCategories.searchResults", searchResults);
    } else {
      pushSection("recents", "chat.gifCategories.recents", recentGifs);
      pushSection("popular", "chat.gifCategories.popular", trending);
    }

    return data;
  }, [isSearching, searchResults, recentGifs, trending, selectedProvider]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[number] }) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeaderContainer}>
            <AppText
              style={styles.sectionHeader}
              translationKey={item.titleKey}
            />
          </View>
        );
      }

      const aspect = item.width && item.height ? item.width / item.height : 1;
      const itemHeight = cellWidth / Math.max(aspect, 0.6);

      return (
        <View style={styles.gifCellWrapper}>
          <TouchableOpacity
            style={[styles.gifCell, { height: itemHeight }]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.8}
          >
            <ExpoImage
              source={{ uri: item.previewUrl }}
              style={styles.gifImage}
              contentFit="cover"
              recyclingKey={item.id}
            />
          </TouchableOpacity>
        </View>
      );
    },
    [styles, cellWidth, handleSelect],
  );

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBarInput}
          placeholder={t("chat.gifCategories.searchPlaceholder")}
          placeholderTextColor={theme.placeholderText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          clearButtonMode="always"
        />
      </View>

      {providerOptions.length > 0 && (
        <View style={styles.providerToggleWrapper}>
          <ToggleSelector
            options={providerOptions}
            value={selectedProvider}
            onChange={setSelectedProvider}
            buttonWidth={containerWidth < 320 ? 70 : undefined}
          />
        </View>
      )}

      {loading && listData.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : error && listData.length === 0 ? (
        <View style={styles.center}>
          <AppText style={styles.errorText} text={error} />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.center}>
          <AppText
            style={styles.emptyText}
            translationKey={"chat.gifCategories.noResults"}
          />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={listData}
            keyExtractor={(item) => item.key}
            masonry
            numColumns={columnCount}
            optimizeItemArrangement={true}
            overrideItemLayout={(layout, item) => {
              if (item.type === "header") {
                layout.span = columnCount;
              }
            }}
            renderItem={renderItem}
            estimatedItemSize={120}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              loading ? (
                <ActivityIndicator
                  style={{ marginVertical: 12 }}
                  color={theme.primary}
                />
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      backgroundColor: "transparent",
      ...ScrollBar(theme),
    },
    searchBarContainer: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      width: "100%",
    },
    searchBarInput: {
      height: 35,
      borderRadius: 100,
      paddingHorizontal: 10,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.backgroundTextField,
    },
    providerToggleWrapper: {
      paddingHorizontal: 10,
      paddingBottom: 6,
      alignItems: "center",
    },
    listWrapper: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 8,
    },
    sectionHeaderContainer: {
      width: "100%",
      paddingHorizontal: 10,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
      marginVertical: 8,
      marginLeft: 5,
    },
    gifCellWrapper: {
      padding: 3,
    },
    gifCell: {
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: theme.backgroundSecondary,
    },
    gifImage: {
      width: "100%",
      height: "100%",
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorText: {
      color: theme.textDanger || theme.text,
      textAlign: "center",
      fontSize: 14,
    },
    emptyText: {
      color: theme.placeholderText || "#a1a1a1",
      textAlign: "center",
      fontSize: 14,
    },
  });
