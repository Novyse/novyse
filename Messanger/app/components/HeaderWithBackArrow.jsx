import React, { useContext } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

const HeaderWithBackArrow = ({ goBackTo }) => {
  const { theme } = useContext(ThemeContext);
  //   const styles = createStyle(theme);
  const router = useRouter();

  return (
    <View>
      <Pressable
        onPress={() => {
          router.navigate(goBackTo);
        }}
        //   style={styles.backButton}
      >
        <Icon name="arrow-back" size={24} color={theme.icon} />
      </Pressable>
    </View>
  );
};

// const createStyle = (theme) =>
//   StyleSheet.create({
//   });

export default HeaderWithBackArrow;
