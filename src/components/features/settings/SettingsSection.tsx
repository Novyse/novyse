import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
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
        <Typography
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
    borderRadius: 25,
    overflow: "hidden",
  },
});

export default SettingsSection;
