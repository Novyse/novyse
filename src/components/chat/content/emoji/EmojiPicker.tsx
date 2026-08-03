import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ViewToken,
} from "react-native";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import Platform from "@/src/utils/device/type";
import AsyncStorage from "@react-native-async-storage/async-storage";
import emojies from "emoji-datasource";
import { t } from "i18next";

import { ScrollBar } from "@/constants/ScrollBar";

import { useThemeContext } from "@/src/context/ThemeContext";

import BlurredView from "@/src/components/BlurredView";
import Icon from "@/src/components/ui/icon/Icon";
import ToggleSelector from "@/src/components/ui/switch/SegmentedSwitch";
import AppText from "@/src/components/ui/text/AppText";

interface EmojiPickerProps {
  mode: "quick" | "full";
  onSelectEmoji: (emoji: string) => void;
  onExpandMenu?: () => void;
  defaultWidth?: number;
}

const STORAGE_KEY = "novyse-recent-emojis";
const QUICK_EMOJIS = ["❤️", "👍", "🔥"];

// Convert unified Unicode hex strings from emoji-datasource into actual characters
const charFromUnified = (unified: string) => {
  try {
    return String.fromCodePoint(
      ...unified.split("-").map((u) => parseInt(u, 16)),
    );
  } catch (e) {
    return null;
  }
};

const EMOJI_CATEGORIES = [
  {
    key: "Smileys & Emotion",
    translationKey: "chat.emojiCategories.smileys",
    icon: "SmileIcon",
  },
  {
    key: "People & Body",
    translationKey: "chat.emojiCategories.people",
    icon: "UserIcon",
  },
  {
    key: "Animals & Nature",
    translationKey: "chat.emojiCategories.animals",
    icon: "LeafIcon",
  },
  {
    key: "Food & Drink",
    translationKey: "chat.emojiCategories.food",
    icon: "Apple01Icon",
  },
  {
    key: "Travel & Places",
    translationKey: "chat.emojiCategories.travel",
    icon: "CompassIcon",
  },
  {
    key: "Activities",
    translationKey: "chat.emojiCategories.activities",
    icon: "BasketballIcon",
  },
  {
    key: "Objects",
    translationKey: "chat.emojiCategories.objects",
    icon: "Settings02Icon",
  },
  {
    key: "Symbols",
    translationKey: "chat.emojiCategories.symbols",
    icon: "AlphabetGreekIcon",
  },
  {
    key: "Flags",
    translationKey: "chat.emojiCategories.flags",
    icon: "Flag02Icon",
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  mode,
  onSelectEmoji,
  onExpandMenu,
  defaultWidth,
}) => {
  const { theme } = useThemeContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [containerWidth, setContainerWidth] = useState(defaultWidth || 360);
  const [activeCategory, setActiveCategory] = useState("Smileys & Emotion");

  const columnCount = containerWidth < 200 ? 4 : 8;
  const colSize = (containerWidth - 16) / columnCount;
  const isMobile = Platform === "mobile";

  const styles = useMemo(
    () => createStyle(theme, columnCount, colSize, isMobile),
    [theme, columnCount, colSize, isMobile],
  );

  // Load recents
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        setRecentEmojis(JSON.parse(val));
        setActiveCategory("recents");
      }
    });
  }, []);

  // Save recents when an emoji is selected
  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      const current = val ? JSON.parse(val) : [];
      const updated = [
        emoji,
        ...current.filter((e: string) => e !== emoji),
      ].slice(0, 24);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    });
  };

  // Filter & sanitize the full dataset of emojis
  const allEmojis = useMemo(() => {
    return emojies
      .filter((e) => !e.obsoleted_by)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((e) => ({
        char: charFromUnified(e.unified),
        name: e.name ? e.name.toLowerCase() : "",
        shortName: e.short_name ? e.short_name.toLowerCase() : "",
        category: e.category,
        keywords: e.short_names ? e.short_names.join(" ").toLowerCase() : "",
      }))
      .filter((e) => e.char !== null);
  }, []);

  // Map emojis by category
  const categorizedEmojis = useMemo(() => {
    const groups: Record<string, string[]> = {};
    allEmojis.forEach((e) => {
      if (e.char) {
        if (!groups[e.category]) {
          groups[e.category] = [];
        }
        groups[e.category].push(e.char);
      }
    });
    return groups;
  }, [allEmojis]);

  // Compute final sections based on search query
  const sections = useMemo(() => {
    const list = [];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      const filtered = allEmojis
        .filter(
          (e) =>
            e.name.includes(query) ||
            e.shortName.includes(query) ||
            e.keywords.includes(query),
        )
        .map((e) => e.char) as string[];

      list.push({
        key: "search",
        translationKey: "chat.emojiCategories.searchResults",
        emojis: filtered,
      });
      return list;
    }

    if (recentEmojis.length > 0) {
      list.push({
        key: "recents",
        translationKey: "chat.emojiCategories.recents",
        icon: "Clock01Icon",
        emojis: recentEmojis,
      });
    }

    EMOJI_CATEGORIES.forEach((cat) => {
      const emojis = categorizedEmojis[cat.key] || [];
      if (emojis.length > 0) {
        list.push({
          key: cat.key,
          translationKey: cat.translationKey,
          icon: cat.icon,
          emojis: emojis,
        });
      }
    });

    return list;
  }, [searchQuery, recentEmojis, categorizedEmojis, allEmojis]);

  // Categories Toolbar horizontal item keys list
  const activeCategoriesList = useMemo(() => {
    const list = [];
    if (recentEmojis.length > 0) {
      list.push({ key: "recents", icon: "Clock01Icon" });
    }
    EMOJI_CATEGORIES.forEach((cat) => {
      list.push({ key: cat.key, icon: cat.icon });
    });
    return list;
  }, [recentEmojis]);

  const displayedQuickEmojis = useMemo(() => {
    const combined = [...recentEmojis, ...QUICK_EMOJIS];
    const unique = Array.from(new Set(combined));
    return unique.slice(0, 3);
  }, [recentEmojis]);

  const toggleOptions = useMemo(() => {
    return activeCategoriesList.map((cat) => {
      const fullCat = EMOJI_CATEGORIES.find((c) => c.key === cat.key);
      return {
        value: cat.key,
        icon:
          cat.key === "recents" ? "Clock01Icon" : fullCat?.icon || "SmileIcon",
      };
    });
  }, [activeCategoriesList]);

  const scrollToCategory = (categoryKey: string, index: number) => {
    setActiveCategory(categoryKey);
    const targetIndex = flatData.findIndex(
      (item) => item.type === "header" && item.categoryKey === categoryKey,
    );
    if (targetIndex !== -1) {
      flashListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false,
      });
    }
  };

  const flashListRef = useRef<FlashListRef<any>>(null);

  const flatData = useMemo(() => {
    const data: any[] = [];
    sections.forEach((section) => {
      data.push({
        type: "header",
        key: `header-${section.key}`,
        titleKey: section.translationKey,
        categoryKey: section.key,
      });

      for (let i = 0; i < section.emojis.length; i += columnCount) {
        data.push({
          type: "row",
          key: `row-${section.key}-${i}`,
          categoryKey: section.key,
          emojis: section.emojis.slice(i, i + columnCount),
        });
      }
    });
    return data;
  }, [sections, columnCount]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        // Find the first visible header or the category of the first visible row
        const firstVisible = viewableItems[0].item;
        if (
          firstVisible &&
          firstVisible.categoryKey &&
          firstVisible.categoryKey !== activeCategory
        ) {
          setActiveCategory(firstVisible.categoryKey);
        }
      }
    },
  ).current;

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
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

      return (
        <View style={styles.emojiGrid}>
          {item.emojis.map((emoji: string, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={styles.emojiCell}
              onPress={() => handleSelect(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
    [handleSelect, styles],
  );

  const handleLayout = (e: any) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  if (mode === "quick") {
    return (
      <View style={styles.quickContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScrollView}
          contentContainerStyle={styles.quickScroll}
        >
          {displayedQuickEmojis.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              style={styles.emojiBtn}
              onPress={() => onSelectEmoji(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {onExpandMenu && (
          <TouchableOpacity style={styles.expandBtn} onPress={onExpandMenu}>
            <Icon name="ArrowDown01Icon" size={24} color={theme.icon} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const categoryToolbar = !searchQuery ? (
    <View style={styles.toolbarWrapper}>
      <ToggleSelector
        options={toggleOptions}
        value={activeCategory}
        onChange={(val) => {
          const idx = activeCategoriesList.findIndex((cat) => cat.key === val);
          scrollToCategory(val, idx);
        }}
        style={styles.categoryToggleSelector}
      />
    </View>
  ) : null;

  return (
    <View
      style={[styles.fullContainer, isMobile && styles.fullContainerMobile]}
      onLayout={handleLayout}
    >
      {isMobile && categoryToolbar}

      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBarInput}
          placeholder={t("chat.emojiCategories.searchPlaceholder")}
          placeholderTextColor={theme.placeholderText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          clearButtonMode="always"
        />
      </View>

      <View style={styles.listWrapper}>
        <FlashList
          ref={flashListRef}
          data={flatData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          estimatedItemSize={colSize || 45}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {!isMobile && categoryToolbar}
    </View>
  );
};

const createStyle = (
  theme: any,
  columnCount: number,
  colSize: number,
  isMobile: boolean,
) =>
  StyleSheet.create({
    fullContainer: {
      flex: 1,
      width: "100%",
      backgroundColor: "transparent",
      borderRadius: 10,
      overflow: "hidden",
      ...ScrollBar(theme),
    },
    searchBarContainer: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      width: "100%",
      backgroundColor: "transparent",
    },
    searchBarInput: {
      height: 35,
      borderRadius: 100,
      paddingHorizontal: 10,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.backgroundTextField,
    },
    listWrapper: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 4,
    },
    sectionHeaderContainer: {
      width: "100%",
      paddingHorizontal: 10,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
      marginVertical: 10,
      marginLeft: 5,
    },
    emojiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      width: "100%",
      paddingHorizontal: 10,
    },
    emojiCell: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      width: `${100 / columnCount}%`,
      height: colSize,
    },
    emojiText: {
      textAlign: "center",
      fontSize: colSize * 0.6,
    },
    toolbarWrapper: {
      backgroundColor: "transparent",
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
      ...ScrollBar(theme),
    },
    fullContainerMobile: {
      borderRadius: 0,
      borderWidth: 0,
    },
    toolbarIconWrapper: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 4,
      height: 32,
      backgroundColor: theme.primary,
    },
    toolbarIconWrapperActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    quickContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      paddingHorizontal: 4,
      paddingVertical: 4,
      width: "100%",
      height: "100%",
    },
    quickScrollView: {
      flex: 1,
    },
    quickScroll: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 4,
      flexGrow: 1,
      height: "100%",
    },
    emojiBtn: {
      padding: 4,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      backgroundColor: "transparent",
    },
    expandBtn: {
      padding: 4,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      marginLeft: 2,
      backgroundColor: "transparent",
    },
    categoryToggleSelector: {
      marginBottom: 0,
    },
  });
