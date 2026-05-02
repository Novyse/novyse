import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { ThemeContext } from "@/context/ThemeContext";

interface SectionProps {
  titleKey?: string;
  children: React.ReactNode;
  style?: any;
}

const Section = ({ titleKey, children, style }: SectionProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[sectionStyles.container, style]}>
      {titleKey && (
        <AppText
          style={[sectionStyles.title, { color: theme.subtitle2 }]}
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
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 5,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
});

export default Section;
