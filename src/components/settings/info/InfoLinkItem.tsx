import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import Icon from "@/src/components/Icon";

interface InfoLinkItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  theme: any;
}

const InfoLinkItem = ({ label, icon, onPress, theme }: InfoLinkItemProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.leftContent}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor:
                theme.backgroundSettingsCardsSecondary ||
                "rgba(255,255,255,0.05)",
            },
          ]}
        >
          <Icon name={icon} color={theme.text} size={18} />
        </View>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      </View>
      <Icon name="ArrowRight01Icon" color={theme.textSecondary} size={18} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default InfoLinkItem;
