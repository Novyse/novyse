import React from "react";
import { View, StyleSheet } from "react-native";

import PersonalInfo from "./PersonalInfo";
import Appareance from "./Appearance";
import Connections from "./Connections";
import Divider from "@/src/components/Divider";

interface FormSectionProps {
  values: {
    name: string;
    surname: string;
    username: string;
    biography: string;
    birthday: string;
    country: string;
    region: string;
  };
  onChangeField: (field: string, value: string) => void;
  isSmallScreen?: boolean;
}

export default function FormSection({
  values,
  onChangeField,
  isSmallScreen = false,
}: FormSectionProps) {
  return (
    <View style={styles.formSection}>
      {/* Personal Info */}
      <PersonalInfo
        initialValues={values}
        onChangeField={onChangeField}
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
