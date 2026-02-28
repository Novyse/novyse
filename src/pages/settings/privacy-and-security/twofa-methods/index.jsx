import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import gateway from "@/src/utils/backend-services/api-gateway";
import Icon from "@/src/components/Icon";
import SettingsButton from "@/src/components/settings/SettingsButton";
import ModalBackupCodes from "@/src/components/modalSheets/ModalBackupCodes";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import ModalVerifyMethod from "@/src/components/settings/account/privacy-and-security/verify-method";
import StatusMessage from "@/src/components/StatusMessage";

const TwoFAMethods = ({ navigation }) => {
  const onBack = () => navigation.goBack();

  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [methods, setMethods] = useState([]);
  const [activeMethods, setActiveMethods] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [verifyMethodData, setVerifyMethodData] = useState({
    token: null,
    verificationType: null,
    secret: null,
    otpauth: null,
  });

  const [isBackupCodesModalVisible, setBackupCodesModalVisible] =
    useState(false);
  const [isVerifyMethodModalVisible, setVerifyMethodModalVisible] =
    useState(false);

  const fetchMethods = async () => {
    try {
      const { success, methods, activeMethods } =
        await gateway.auth.getTwofaMethods();
      if (success) {
        setMethods(methods);
        setActiveMethods(activeMethods);
      }
    } catch (e) {
      setError("Failed to load 2FA methods. Please try again.");
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleAddMethod = async (method) => {
    const { success, twoFactorToken, secret, otpauth } =
      await gateway.auth.addTwofaMethod(method);
    if (success) {
      setVerifyMethodData({
        token: twoFactorToken,
        verificationType: method,
        secret,
        otpauth,
      });
      setVerifyMethodModalVisible(true);
    }
  };

  const handleDeleteMethod = async (method) => {
    const { success, twoFactorToken } =
      await gateway.auth.removeTwofaMethod(method);
    if (success) {
      setVerifyMethodData({
        token: twoFactorToken,
        verificationType: method,
      });
      setVerifyMethodModalVisible(true);
    }
  };

  const getMethodIcon = (method) => {
    switch (method.toLowerCase()) {
      case "authenticator":
        return "SecurityIcon";
      case "sms":
        return "SmartPhone01Icon";
      case "email":
        return "Mail01Icon";
      default:
        return "SecurityIcon";
    }
  };

  const capitalizeMethod = (method) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const handleShowBackupCodes = () => {
    setBackupCodesModalVisible(!isBackupCodesModalVisible);
  };

  const handleResetBackupCodes = async () => {
    const success = await gateway.auth.regenerateTwofaRecoverCodes();
    if (success) {
      setMessage("Backup codes have been reset successfully.");
    }
  };

  return (
    <>
      <HeaderWithBackArrow title={"2FA"} onBack={onBack} />
      <SettingsPageScrollview>
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
                      <Icon name={getMethodIcon(method)} color={"#fff"} />
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
                        >
                          <Icon name={"Delete02Icon"} color={"#fff"} />
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
                      >
                        <Icon name={"PlusSignCircleIcon"} color={"#fff"} />
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.buttonContainer}>
          <SettingsButton
            text={"Show Backup Codes"}
            onPress={handleShowBackupCodes}
          />
          <SettingsButton
            text={"Reset Backup Codes"}
            onPress={handleResetBackupCodes}
          />
        </View>
        <ModalBackupCodes
          visible={isBackupCodesModalVisible}
          onClose={handleShowBackupCodes}
          theme={theme}
        />
        <ModalVerifyMethod
          visible={isVerifyMethodModalVisible}
          onClose={() => {
            setVerifyMethodModalVisible(false);
            setTimeout(() => {
              fetchMethods();
            }, 1000);
          }}
          theme={theme}
          token={verifyMethodData.token}
          verificationType={verifyMethodData.verificationType}
          secret={verifyMethodData.secret}
          otpauth={verifyMethodData.otpauth}
        />
        <StatusMessage
          type="success"
          content={[message]}
          visible={!!message}
          onClose={() => {
            setMessage("");
          }}
        />
        <StatusMessage
          type="error"
          content={[error]}
          visible={!!error}
          onClose={() => {
            setError("");
          }}
        />
      </SettingsPageScrollview>
    </>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    headerSection: {
      marginBottom: 32,
      paddingTop: 20,
      alignItems: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.text,
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
      backgroundColor: theme.backgroundSettingsCards,
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
      backgroundColor: theme.backgroundSettingsCards,
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
      color: theme.text,
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
      color: theme.text,
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
      backgroundColor: theme.deleteHovered,
      cursor: "pointer",
    },
    deleteButtonPressed: {
      backgroundColor: theme.deletePressed,
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
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    addButtonHovered: {
      backgroundColor: theme.addHovered,
      cursor: "pointer",
    },
    addButtonPressed: {
      backgroundColor: theme.addPressed,
      opacity: 0.9,
    },
    buttonContainer: {
      flexDirection: "column",
      justifyContent: "center",
      minWidth: 50,
      maxWidth: 300,
      gap: 10,
      alignSelf: "center",
    },
  });

export default TwoFAMethods;
