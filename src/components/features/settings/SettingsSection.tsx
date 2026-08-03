import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

interface SettingsSectionProps {
  titleKey?: string;
  children: React.ReactNode;
  style?: any;
}

const SettingsSection = ({ titleKey, children, style }: SettingsSectionProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[sectionStyles.container, style]}>
      {titleKey && (
        <AppText
          style={[sectionStyles.title, { color: theme.subtitle }]}
          translationKey={titleKey}
        />
      )}
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: theme.backgroundMainGradient?.[0] },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const sectionStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 5, 
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
});

export default SettingsSection;
