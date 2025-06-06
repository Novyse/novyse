import React, { useContext } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import EmojiSelector from "react-native-emoji-selector";

const EmojiPicker = ({ visible, onClose, onEmojiSelected }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const { width, height } = Dimensions.get("window");

  const handleEmojiSelected = (emoji) => {
    onEmojiSelected(emoji);
    onClose();
  };

  // For web platform, show as a modal with custom emoji grid
  if (Platform.OS === "web") {
    const emojiCategories = {
      "Smileys & People": [
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
        "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
        "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
        "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
        "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
        "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
        "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
        "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
        "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
        "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾",
        "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿",
        "😾", "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤏", "✌️", "🤞",
        "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
        "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
        "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
        "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁", "👅",
        "👄", "💋", "🩸"
      ],
      "Animals & Nature": [
        "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
        "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒",
        "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇",
        "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜",
        "🦟", "🦗", "🕷", "🕸", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕",
        "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳",
        "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛",
        "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖",
        "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈",
        "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨",
        "🦡", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"
      ],
      "Food & Drink": [
        "🍎", "🍏", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
        "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑",
        "🥦", "🥬", "🥒", "🌶", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅",
        "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳",
        "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔",
        "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗",
        "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟",
        "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡",
        "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬",
        "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕",
        "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷",
        "🥃", "🍸", "🍹", "🧉", "🍾"
      ],
      "Activities": [
        "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
        "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳",
        "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸",
        "🥌", "🎿", "⛷", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼",
        "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾",
        "🤾‍♂️", "🏌️‍♀️", "🏌️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘", "🧘‍♂️", "🏄‍♀️", "🏄",
        "🏄‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🤽‍♀️", "🤽", "🤽‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️",
        "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆",
        "🥇", "🥈", "🥉", "🏅", "🎖", "🏵", "🎗", "🎫", "🎟", "🎪",
        "🤹", "🤹‍♀️", "🤹‍♂️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼",
        "🎵", "🎶", "🥇", "🥈", "🥉", "🏆", "🏅", "🎖", "🏵", "🎗"
      ],
      "Objects": [
        "⌚", "📱", "📲", "💻", "⌨", "🖥", "🖨", "🖱", "🖲", "🕹",
        "🗜", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥",
        "📽", "🎞", "📞", "☎", "📟", "📠", "📺", "📻", "🎙", "🎚",
        "🎛", "🧭", "⏱", "⏲", "⏰", "🕰", "⏳", "⌛", "📡", "🔋",
        "🪫", "🔌", "💡", "🔦", "🕯", "🪔", "🧯", "🛢", "💸", "💵",
        "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖", "🪜", "🧰",
        "🪛", "🔧", "🔨", "⚒", "🛠", "⛏", "🪚", "🔩", "⚙", "🪤",
        "🧱", "⛓", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡", "⚔",
        "🛡", "🚬", "⚰", "🪦", "⚱", "🏺", "🔮", "📿", "🧿", "💈",
        "⚗", "🔭", "🔬", "🕳", "🩹", "🩺", "💊", "💉", "🩸", "🧬",
        "🦠", "🧫", "🧪", "🌡", "🧹", "🪠", "🧺", "🧻", "🚽", "🚿"
      ]
    };

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={[styles.webEmojiContainer, { maxHeight: height * 0.6 }]}>
            <View style={styles.webEmojiHeader}>
              <Text style={styles.webEmojiTitle}>Select Emoji</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={24}
                  color={theme.icon}
                  strokeWidth={1.5}
                />
              </Pressable>
            </View>
            
            <ScrollView style={styles.webEmojiScrollView}>
              {Object.entries(emojiCategories).map(([category, emojis]) => (
                <View key={category} style={styles.webEmojiCategory}>
                  <Text style={styles.webEmojiCategoryTitle}>{category}</Text>
                  <View style={styles.webEmojiGrid}>
                    {emojis.map((emoji, index) => (
                      <Pressable
                        key={`${category}-${index}`}
                        style={styles.webEmojiButton}
                        onPress={() => handleEmojiSelected(emoji)}
                      >
                        <Text style={styles.webEmojiText}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // For mobile platforms, use the emoji selector library
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.mobileEmojiContainer}>
          <View style={styles.mobileEmojiHeader}>
            <Text style={styles.mobileEmojiTitle}>Select Emoji</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={24}
                color={theme.icon}
                strokeWidth={1.5}
              />
            </Pressable>
          </View>
          
          <EmojiSelector
            onEmojiSelected={handleEmojiSelected}
            showSearchBar={false}
            showSectionTitles={true}
            showTabs={true}
            showHistory={true}
            columns={8}
            placeholder="Search emoji..."
            style={styles.emojiSelector}
          />
        </View>
      </View>
    </Modal>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    webEmojiContainer: {
      backgroundColor: theme.modalBackground,
      borderRadius: 12,
      padding: 0,
      width: "90%",
      maxWidth: 500,
      borderColor: theme.modalBorder,
      borderWidth: 1,
    },
    webEmojiHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.modalBorder,
    },
    webEmojiTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    webEmojiScrollView: {
      maxHeight: 400,
    },
    webEmojiCategory: {
      padding: 16,
    },
    webEmojiCategoryTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 12,
    },
    webEmojiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    webEmojiButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      backgroundColor: theme.backgroundChat,
    },
    webEmojiText: {
      fontSize: 24,
    },
    mobileEmojiContainer: {
      backgroundColor: theme.modalBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: "70%",
      width: "100%",
      position: "absolute",
      bottom: 0,
      borderColor: theme.modalBorder,
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    mobileEmojiHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.modalBorder,
    },
    mobileEmojiTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    emojiSelector: {
      flex: 1,
      backgroundColor: theme.modalBackground,
    },
  });

export default EmojiPicker;
