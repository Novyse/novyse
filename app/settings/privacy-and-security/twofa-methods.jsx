import React, { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  Pressable,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import APIMethods from "@/app/utils/APImethods";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Delete02Icon, PlusSignCircleIcon } from "@hugeicons/core-free-icons";

const TwoFAMethods = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  const [methods, setMethods] = useState([]);
  const [activeMethods, setActiveMethods] = useState([]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const data = await APIMethods.getTwofaMethods();
        setMethods(data.two_fa_methods || []);
        setActiveMethods(data.two_fa_active_methods || []);
        console.log(data);
      } catch (e) {
        // gestisci errore
      }
    };
    fetchMethods();
  }, []);

  const handleDeleteMethod = async (method) => {
    const { two_fa_remove_method, token } = await APIMethods.removeTwofaMethod(
      method
    );

    try {
      if (two_fa_remove_method) {
        router.navigate({
          pathname: "./verify-method",
          params: {
            verificationType: method,
            token: token,
          },
        });
      } else {
        console.log("Error");
        return;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddMethod = async (method) => {
    const { two_fa_add_method, token, secret, otpauth } =
      await APIMethods.addTwofaMethod(method);

    console.log(method, secret, otpauth);

    try {
      if (two_fa_add_method) {
        if (method == "authenticator") {
          router.navigate({
            pathname: "./verify-method",
            params: {
              verificationType: method,
              token: token,
              secret: secret,
              otpauth: otpauth,
            },
          });
        } else {
          router.navigate({
            pathname: "./verify-method",
            params: {
              verificationType: method,
              token: token,
            },
          });
        }
      } else {
        console.log("Error");
        return;
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="/settings/privacy-and-security" />

        <View style={styles.methodsContainer}>
          {methods.map((method) => {
            const isActive = activeMethods.includes(method);
            return (
              <Pressable key={method} style={styles.themeButton}>
                <View style={styles.themeButtonContent}>
                  <Text style={styles.themeText}>{method}</Text>
                  {isActive ? (
                    <>
                      <Text style={{ color: "lime", marginLeft: 8 }}>
                        Attivo
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteMethod(method)}
                        style={{
                          backgroundColor: "gray",
                          borderRadius: 5,
                          padding: 3,
                        }}
                      >
                        <HugeiconsIcon icon={Delete02Icon} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleAddMethod(method)}
                      style={{
                        backgroundColor: "gray",
                        borderRadius: 5,
                        padding: 3,
                      }}
                    >
                      <HugeiconsIcon icon={PlusSignCircleIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
    methodsContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    themeButton: {
      padding: 14,
      marginVertical: 7,
      borderRadius: 8,
      backgroundColor: "#202024",
    },
    themeButtonContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    themeText: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default TwoFAMethods;
