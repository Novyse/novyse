import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import AppText from "@/src/components/ui/text/AppText";

import { countryList, regionList } from "@/constants/Location";

import Label from "@/src/components/Label";
import SectionHeader from "@/src/components/SectionHeader";
import TextInput from "@/src/components/ui/input/TextInput";
import SelectInput from "@/src/components/ui/input/SelectInput";
import DateInput from "@/src/components/ui/input/DateInput";

interface PersonalInfoProps {
  initialValues: {
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

export default function PersonalInfo({
  initialValues,
  onChangeField,
  isSmallScreen = false,
}: PersonalInfoProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext) as { theme: any };
  const styles = createStyles(theme, isSmallScreen);

  const [nameVal, setNameVal] = useState(initialValues.name);
  const [surnameVal, setSurnameVal] = useState(initialValues.surname);
  const [usernameVal, setUsernameVal] = useState(initialValues.username);
  const [descriptionVal, setDescriptionVal] = useState(initialValues.biography);
  const [birthdayVal, setBirthdayVal] = useState(initialValues.birthday);
  const [countryVal, setCountryVal] = useState(initialValues.country);
  const [regionVal, setRegionVal] = useState(initialValues.region);

  // Sync internal state with external original values when parent tells us to restore
  useEffect(() => {
    setNameVal(initialValues.name);
    setSurnameVal(initialValues.surname);
    setUsernameVal(initialValues.username);
    setDescriptionVal(initialValues.biography);
    setBirthdayVal(initialValues.birthday);
    setCountryVal(initialValues.country);
    setRegionVal(initialValues.region);
  }, [initialValues]);

  const handleFieldChange = (
    field: string,
    val: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    setter(val);
    onChangeField(field, val);
  };

  const MAX_CHAR_COUNT = 2048;
  const descriptionLength = descriptionVal ? descriptionVal.length : 0;

  return (
    <>
      <SectionHeader
        icon="UserIcon"
        translationKey="settings.modifyProfile.personalInfo"
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Label translationKey="settings.modifyProfile.name" />
          <TextInput
            value={nameVal}
            onChange={(val) => handleFieldChange("name", val, setNameVal)}
          />
        </View>
        <View style={styles.halfInput}>
          <Label translationKey="settings.modifyProfile.surname" />
          <TextInput
            value={surnameVal}
            onChange={(val) => handleFieldChange("surname", val, setSurnameVal)}
          />
        </View>
      </View>

      <View style={styles.fullInput}>
        <View style={styles.labelRow}>
          <Label translationKey="settings.modifyProfile.biography" />
          <AppText style={styles.charCount}>
            {descriptionLength}/{MAX_CHAR_COUNT}
          </AppText>
        </View>
        <TextInput
          placeholder={t("settings.modifyProfile.biographyPlaceholder")}
          value={descriptionVal}
          maxLenght={MAX_CHAR_COUNT}
          numberOfLines={4}
          onChange={(val) =>
            handleFieldChange("biography", val, setDescriptionVal)
          }
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Label translationKey="settings.modifyProfile.username" />
          <TextInput
            value={usernameVal}
            disabled={true}
            onChange={(val) =>
              handleFieldChange("username", val, setUsernameVal)
            }
            prefix="@"
          />
        </View>
        <View style={styles.halfInput}>
          <Label translationKey="settings.modifyProfile.birthday" />
          <DateInput
            placeholder={t("settings.modifyProfile.birthdayFormat")}
            value={birthdayVal}
            disabled={true}
            onChange={(val) =>
              handleFieldChange("birthday", val, setBirthdayVal)
            }
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Label translationKey="settings.modifyProfile.region" />
          <SelectInput
            options={regionList[countryVal as keyof typeof regionList] || []}
            placeholder={
              !countryVal
                ? t("settings.modifyProfile.selectCountryFirst")
                : t("settings.modifyProfile.selectRegion")
            }
            value={regionVal}
            disabled={!countryVal}
            onChange={(val) => handleFieldChange("region", val, setRegionVal)}
            isSmallScreen={isSmallScreen}
          />
        </View>
        <View style={styles.halfInput}>
          <Label translationKey="settings.modifyProfile.country" />
          <SelectInput
            options={countryList}
            placeholder={t("settings.modifyProfile.selectCountry")}
            disabled={true}
            value={countryVal}
            onChange={(val) => handleFieldChange("country", val, setCountryVal)}
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
  });
