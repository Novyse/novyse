import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import { countryList, regionList } from "@/constants/Location";

import Label from "@/src/components/Label";
import SectionHeader from "@/src/components/SectionHeader";
import TextInput from "@/src/components/Input/TextInput";
import SelectInput from "@/src/components/Input/SelectInput";
import DateInput from "@/src/components/Input/DateInput";

interface PersonalInfoProps {
  name: string;
  surname: string;
  username: string;
  description?: string;
  birthday?: string;
  country?: string;
  region?: string;
  isSmallScreen?: boolean;
}

export default function PersonalInfo({
  name,
  surname,
  username,
  description,
  birthday,
  country,
  region,
  isSmallScreen = false,
}: PersonalInfoProps) {
  const { theme } = useContext(ThemeContext) as { theme: any };
  const styles = createStyles(theme, isSmallScreen);

  const [nameValue, setNameValue] = useState(name || "");
  const [surnameValue, setSurnameValue] = useState(surname || "");
  const [usernameValue, setUsernameValue] = useState(username || "");
  const [descriptionValue, setDescriptionValue] = useState(description || "");
  const [birthdayValue, setBirthdayValue] = useState(birthday || "");
  const [countryValue, setCountryValue] = useState(country || "");
  const [regionValue, setRegionValue] = useState("");

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
          <TextInput value={nameValue} onChange={setNameValue} />
        </View>
        <View style={styles.halfInput}>
          <Label text={"Surname"} />
          <TextInput value={surnameValue} onChange={setSurnameValue} />
        </View>
      </View>

      <View style={styles.fullInput}>
        <View style={styles.labelRow}>
          <Label text={"Description"} />
          <Text style={styles.charCount}>
            {charCount}/{MAX_CHAR_COUNT}
          </Text>
        </View>
        <TextInput
          placeholder="Tell us about yourself..."
          value={descriptionValue}
          maxLenght={MAX_CHAR_COUNT}
          numberOfLines={4}
          onChange={setDescriptionValue}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Label text={"Username"} />
          <TextInput
            value={usernameValue}
            onChange={setUsernameValue}
            prefix="@"
          />
        </View>
        <View style={styles.halfInput}>
          <Label text={"Birthday"} />
          <DateInput
            placeholder="DD/MM/YYYY"
            value={birthdayValue}
            disabled={true}
            onChange={setBirthdayValue}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Label text={"Region"} />
          <SelectInput
            options={regionList[countryValue as keyof typeof regionList] || []}
            placeholder={
              !countryValue ? "Select a country first" : "Select your region"
            }
            value={regionValue}
            disabled={!countryValue}
            onChange={setRegionValue}
            isSmallScreen={isSmallScreen}
          />
        </View>
        <View style={styles.halfInput}>
          <Label text={"Country"} />
          <SelectInput
            options={countryList}
            placeholder="Select your country"
            value={countryValue}
            onChange={setCountryValue}
            isSmallScreen={isSmallScreen}
          />
        </View>
      </View>
    </>
  );
}

const createStyles = (theme: any, isSmallScreen: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: isSmallScreen ? 12 : 16,
      marginBottom: isSmallScreen ? 16 : 20,
    },
    halfInput: {
      flex: 1,
    },
    fullInput: {
      marginBottom: isSmallScreen ? 16 : 20,
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
