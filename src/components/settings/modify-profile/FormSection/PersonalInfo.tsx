import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import Label from "@/src/components/Label";
import SectionHeader from "@/src/components/SectionHeader";
import BlurInput from "@/src/components/BlurInput";

interface PersonalInfoProps {
  name: string;
  surname: string;
  username: string;
  email: string;
  description?: string;
  birthday?: string;
}

export default function PersonalInfo({
  name,
  surname,
  username,
  email,
  description,
  birthday,
}: PersonalInfoProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const [nameValue, setNameValue] = useState(name || "");
  const [surnameValue, setSurnameValue] = useState(surname || "");
  const [usernameValue, setUsernameValue] = useState(username || "");
  const [emailValue, setEmailValue] = useState(email || "");
  const [descriptionValue, setDescriptionValue] = useState(description || "");
  const [birthdayValue, setBirthdayValue] = useState(birthday || "");

  const [charCount, setCharCount] = useState(
    descriptionValue ? descriptionValue.length : 0,
  );
  const MAX_CHAR_COUNT = 2048;

  useEffect(() => {
    setCharCount(descriptionValue ? descriptionValue.length : 0);
  }, [descriptionValue]);

  return (
    <>
      <SectionHeader icon="UserIcon" title="Personal Info" />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Label text={"Name"} />
          <BlurInput value={nameValue} onChange={setNameValue} />
        </View>
        <View style={styles.halfInput}>
          <Label text={"Surname"} />
          <BlurInput value={surnameValue} onChange={setSurnameValue} />
        </View>
      </View>

      <View style={styles.fullInput}>
        <View style={styles.labelRow}>
          <Label text={"Description"} />
          <Text style={styles.charCount}>
            {charCount}/{MAX_CHAR_COUNT}
          </Text>
        </View>
        <BlurInput
          placeholder="Tell us about yourself..."
          value={descriptionValue}
          maxLenght={MAX_CHAR_COUNT}
          onChange={setDescriptionValue}
        />
      </View>

      {/* Gestisci full input con half blur input per handle email */}

      <View style={styles.fullInput}>
        <Label text={"Username"} />
        <BlurInput
          value={usernameValue}
          onChange={setUsernameValue}
          prefix="@"
        />
      </View>

      <View style={styles.fullInput}>
        <Label text={"Email"} />
        <BlurInput
          value={emailValue}
          onChange={setEmailValue}
          disabled={true}
        />
      </View>

      {/* Campo speciale per birthday */}

      <View style={styles.fullInput}>
        <Label text={"Birthday"} />
        <BlurInput
          placeholder="DD/MM/YYYY"
          value={birthdayValue}
          onChange={setBirthdayValue}
        />
      </View>
    </>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 20,
    },
    halfInput: {
      flex: 1,
    },
    fullInput: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    charCount: {
      fontSize: 11,
      color: theme.text,
    },
    inputIconWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      borderRadius: 99,
      paddingHorizontal: 12,
    },
  });
