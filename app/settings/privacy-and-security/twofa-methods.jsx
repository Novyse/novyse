import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import APIMethods from "@/app/utils/APImethods";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import {
  Delete02Icon,
  PlusSignCircleIcon,
  SmartPhone01Icon,
  Mail01Icon,
  SecurityIcon,
} from "@hugeicons/core-free-icons";

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

  const getMethodIcon = (method) => {
    switch (method.toLowerCase()) {
      case "authenticator":
        return SecurityIcon;
      case "sms":
        return SmartPhone01Icon;
      case "email":
        return Mail01Icon;
      default:
        return SecurityIcon;
    }
  };

  const capitalizeMethod = (method) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="/settings/privacy-and-security" />
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Authentication Methods</Text>
          <Text style={styles.subtitle}>
            Manage your 2FA Authentication methods
          </Text>
        </View>

        <View style={styles.methodsContainer}>
          {methods.map((method, index) => {
            const isActive = activeMethods.includes(method);
            return (
              <View
                key={method}
                style={[styles.methodCard, isActive && styles.methodCardActive]}
              >
                <View style={styles.methodHeader}>
                  <View style={styles.methodInfo}>
                    <View style={styles.iconContainer}>
                      <HugeiconsIcon
                        icon={getMethodIcon(method)}
                        size={24}
                        color="#ffffffff"
                      />
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodName}>
                        {capitalizeMethod(method)}
                      </Text>
                      <Text style={styles.methodDescription}>
                        {method === "authenticator" && "Authentication App"}
                        {method === "sms" && "Code via SMS"}
                        {method === "email" && "Code via Email"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionContainer}>
                    {isActive ? (
                      <View style={styles.activeSection}>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>Active</Text>
                        </View>
                        <Pressable
                          onPress={() => handleDeleteMethod(method)}
                          style={({ pressed, hovered }) => [
                            styles.deleteButton,
                            hovered && styles.deleteButtonHovered,
                            pressed && styles.deleteButtonPressed,
                          ]}
                          android_ripple={{
                            color:
                              theme.rippleColor || "rgba(255, 71, 87, 0.2)",
                          }}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            size={18}
                            color="#fff"
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleAddMethod(method)}
                        style={({ pressed, hovered }) => [
                          styles.addButton,
                          hovered && styles.addButtonHovered,
                          pressed && styles.addButtonPressed,
                        ]}
                        android_ripple={{
                          color: theme.rippleColor || "rgba(99, 102, 241, 0.2)",
                        }}
                      >
                        <HugeiconsIcon
                          icon={PlusSignCircleIcon}
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
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
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
    headerSection: {
      marginBottom: 32,
      paddingTop: 20,
      alignItems: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#ffffff",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: "#a0a0a0",
      lineHeight: 22,
    },
    methodsContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    methodCard: {
      backgroundColor: theme.backgroundSettingsCards || "#2A2A2E",
      borderRadius: 16,
      marginBottom: 16,
      padding: 20,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    methodCardActive: {
      borderColor: "#00C851",
      backgroundColor: theme.backgroundSettingsCards || "#2A2A2E",
    },
    methodHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    methodInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#6366f1",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    methodDetails: {
      flex: 1,
    },
    methodName: {
      fontSize: 18,
      fontWeight: "600",
      color: "#ffffff",
      marginBottom: 4,
    },
    methodDescription: {
      fontSize: 14,
      color: "#a0a0a0",
    },
    actionContainer: {
      alignItems: "center",
    },
    activeSection: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    statusBadge: {
      backgroundColor: "#00C851",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    deleteButton: {
      backgroundColor: "#FF4757",
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      transition: "background-color 0.2s ease",
    },
    deleteButtonHovered: {
      backgroundColor: theme.deleteHovered || "rgba(184, 28, 41, 0.85)",
      cursor: "pointer",
    },
    deleteButtonPressed: {
      backgroundColor: theme.deletePressed || "rgba(255, 71, 86, 1)",
      opacity: 0.9,
    },
    addButton: {
      backgroundColor: "#6366f1",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
      transition: "background-color 0.2s ease",
    },
    addButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    addButtonHovered: {
      backgroundColor: theme.addHovered || "rgba(88, 91, 235, 0.85)",
      cursor: "pointer",
    },
    addButtonPressed: {
      backgroundColor: theme.addPressed || "rgba(99, 102, 241, 0.7)",
      opacity: 0.9,
    },
  });

export default TwoFAMethods;
