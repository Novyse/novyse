import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Label from "@/src/components/ui/label/Label";
import { ThemeContext } from "@/src/context/ThemeContext";

interface SettingsSectionProps {
  titleKey?: string;
  children: React.ReactNode;
}

const SettingsSection = ({ titleKey, children }: SettingsSectionProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={sectionStyles.container}>
      {titleKey && <Label translationKey={titleKey} />}
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: theme.backgroundMain },
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
  card: {
    borderRadius: 25,
    overflow: "hidden",
  },
});

export default SettingsSection;
