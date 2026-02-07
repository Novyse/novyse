import React from "react";
import { View, StyleSheet } from "react-native";

import PersonalInfo from "./PersonalInfo";
import Appareance from "./Appearance";
import Connections from "./Connections";

const Divider: React.FC = () => <View style={styles.divider} />;

interface FormSectionProps {
  name: string;
  surname: string;
  username: string;
  email: string;
  description?: string;
  birthday?: string;
}

export default function FormSection({
  name,
  surname,
  username,
  email,
  description,
  birthday,
}: FormSectionProps) {
  return (
    <View style={styles.formSection}>
      {/* Personal Info */}
      <PersonalInfo
        name={name}
        surname={surname}
        username={username}
        email={email}
        description={description}
        birthday={birthday}
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
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 24,
  },
});
