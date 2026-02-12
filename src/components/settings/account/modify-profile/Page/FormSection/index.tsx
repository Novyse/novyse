import React from "react";
import { View, StyleSheet } from "react-native";

import PersonalInfo from "./PersonalInfo";
import Appareance from "./Appearance";
import Connections from "./Connections";
import Divider from "@/src/components/Divider";

interface FormSectionProps {
  name: string;
  surname: string;
  username: string;
  description?: string;
  birthday?: string;
  country?: string;
  region?: string;
  isSmallScreen?: boolean;
}

export default function FormSection({
  name,
  surname,
  username,
  description,
  birthday,
  country,
  region,
  isSmallScreen = false,
}: FormSectionProps) {
  return (
    <View style={styles.formSection}>
      {/* Personal Info */}
      <PersonalInfo
        name={name}
        surname={surname}
        username={username}
        description={description}
        birthday={birthday}
        country={country}
        region={region}
        isSmallScreen={isSmallScreen}
      />

      <Divider />

      {/* Appearance */}

      <Appareance />

      <Divider />

      {/* Connections */}
      <Connections />
    </View>
  );
}

const styles = StyleSheet.create({
  formSection: {
    paddingHorizontal: 20,
    width: "100%",
  },
});
