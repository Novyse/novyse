import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";

interface SectionProps {
  titleKey?: string;
  children: React.ReactNode;
  theme: any;
  style?: any;
}

const Section = ({
  titleKey,
  children,
  theme,
  style,
}: SectionProps) => (
  <View style={[sectionStyles.container, style]}>
    {titleKey && (
      <AppText
        style={[sectionStyles.title, { color: theme.subtitle2 }]}
        translationKey={titleKey}
        selectable={false}
      />
    )}
    <View
      style={[
        sectionStyles.card,
        { backgroundColor: theme.backgroundMainGradient?.[0] ?? theme.card },
      ]}
    >
      {children}
    </View>
  </View>
);

const sectionStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
});

export default Section;
