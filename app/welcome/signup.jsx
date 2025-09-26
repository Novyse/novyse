import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
  Image,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import gateway from "../utils/backend-services/api-gateway";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import StatusMessage from "../components/StatusMessage";
import Icon from "../components/Icon";

const Signup = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const loginTheme = "default";
  const privacyPolicyLink = "https://www.novyse.com/legal/privacy-policy";
  const tosLink = "https://www.novyse.com/legal/terms-of-service";
  const [privacy_policy_accepted, SetPrivacy_policy_accepted] = useState(false);
  const [terms_of_service_accepted, setTerms_of_service_accepted] =
    useState(false);

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[a-zA-Z0-9@$!%*?&]{8,128}$/;
  const handleRegex = /^(?!.*_{2,})[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/;

  const isPasswordValid = (pwd) => passwordRegex.test(pwd);
  const isHandleValid = (handle) => handleRegex.test(handle);

  const passwordRequirements = [
    { label: "At least 8 characters", check: (pwd) => pwd.length >= 8 },
    { label: "One uppercase letter", check: (pwd) => /[A-Z]/.test(pwd) },
    { label: "One lowercase letter", check: (pwd) => /[a-z]/.test(pwd) },
    { label: "One number", check: (pwd) => /[0-9]/.test(pwd) },
    {
      label: "One special character (@$!%*?&)",
      check: (pwd) => /[@$!%*?&]/.test(pwd),
    },
    {
      label: "Only allowed characters (a-z A-Z 0-9 @$!%*?&)",
      check: (pwd) => /^[a-zA-Z0-9@$!%*?&]+$/.test(pwd),
    },
  ];

  const handleRequirements = [
    {
      label: "Starts with a letter or number",
      check: (h) => /^[a-z0-9]/.test(h),
    },
    {
      label: "Ends with a letter or number",
      check: (h) => /[a-z0-9]$/.test(h),
    },
    {
      label: "Only letters, numbers, and underscores",
      check: (h) => /^[a-z0-9_]+$/.test(h),
    },
    { label: "No consecutive underscores", check: (h) => !/__/.test(h) },
  ];

  const steps = [
    { id: 1, label: "Personal Info" },
    { id: 2, label: "Password", field: "password", placeholder: "Password" },
    { id: 3, label: "Handle", field: "handle", placeholder: "Handle" },
  ];

  const isSmallScreen = width < 936;
  const styles = createStyle(loginTheme, isSmallScreen);

  const [form, setForm] = useState({
    password: "",
    name: "",
    surname: "",
    handle: "",
  });

  const [showPassword, setShowPassword] = useState({
    password: true,
  });

  const [handleAvailable, setHandleAvailable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handleTimer, setHandleTimer] = useState(null);
  const [error, setError] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [handleError, setHandleError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  useEffect(() => {
    const backAction = () => {
      router.navigate("/welcome/email-check");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const { password, name, surname, handle } = form;
    const allFieldsFilled = password && name && surname && handle;
    setIsFormValid(
      !!allFieldsFilled &&
        handleAvailable === true &&
        !handleError &&
        !isLoading &&
        privacy_policy_accepted &&
        terms_of_service_accepted
    );
  }, [
    form,
    handleAvailable,
    isLoading,
    handleError,
    privacy_policy_accepted,
    terms_of_service_accepted,
  ]);

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      return form.name.trim() !== "" && form.surname.trim() !== "";
    }
    if (stepIndex === 1) {
      return isPasswordValid(form.password);
    }
    if (stepIndex === 2) {
      return (
        form.handle.trim() !== "" &&
        isHandleValid(form.handle) &&
        handleAvailable === true &&
        !handleError
      );
    }
    return false;
  };

  const handleChange = (field, value) => {
    const processedValue = field === "handle" ? value.toLowerCase() : value;
    setForm({ ...form, [field]: processedValue });

    if (error) setError(null);

    if (field === "handle") {
      setHandleAvailable(null);
      setHandleError(null);
      if (handleTimer) clearTimeout(handleTimer);

      if (!processedValue.trim()) {
        setIsLoading(false);
        return;
      }

      if (!isHandleValid(processedValue)) {
        setHandleError("Invalid format. Use a-z, 0-9, and single '_'.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const timer = setTimeout(async () => {
        const { success, free } = await gateway.check.handle(processedValue);
        setHandleAvailable(free);
        if (!free) {
          setHandleError("This handle is already in use.");
        }
        setIsLoading(false);
      }, 1000);

      setHandleTimer(timer);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    const { password, name, surname, handle } = form;
    if (!name.trim()) return "Please enter your name.";
    if (!surname.trim()) return "Please enter your surname.";
    if (!password) return "Please enter your password.";
    if (!isPasswordValid(password)) {
      return "Password must be 8-128 chars, include upper/lowercase, a number and a special character (@, $, !, %, *, ?, &)";
    }
    if (!handle.trim()) return "Please enter your handle.";
    if (!isHandleValid(handle)) {
      return "Handle format is invalid. Use a-z, 0-9, and single '_'.";
    }
    if (handleAvailable === false) return "Handle is already in use.";
    if (!privacy_policy_accepted || !terms_of_service_accepted)
      return "Please accept privacy policy and terms of service.";

    return null;
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { password, name, surname, handle } = form;
      const signupResponse = await gateway.auth.register(
        emailValue,
        password,
        name,
        surname,
        handle,
        privacy_policy_accepted,
        terms_of_service_accepted
      );

      if (signupResponse) {
        router.navigate("/welcome/email-check");
      } else {
        setError("Signup failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeline = () => (
    <View style={styles.timeline}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isAccessible = index <= maxStep;
        const isCompleted = isAccessible && index !== currentStep;
        return (
          <React.Fragment key={step.id}>
            <View style={styles.timelineDotContainer}>
              <TouchableOpacity
                style={[
                  styles.timelineCircle,
                  isCompleted
                    ? styles.timelineCompleted
                    : index === currentStep
                      ? styles.timelineCurrent
                      : styles.timelinePending,
                ]}
                onPress={isAccessible ? () => setCurrentStep(index) : undefined}
                disabled={!isAccessible}
              >
                <Text style={styles.timelineNumber}>{step.id}</Text>
              </TouchableOpacity>
            </View>
            {!isLast && <View style={styles.timelineLine} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderCurrentField = () => {
    if (currentStep === 0) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                onChangeText={(text) => handleChange("name", text)}
                placeholder="Name"
                placeholderTextColor={
                  LoginColors[loginTheme].placeholderTextInput
                }
                value={form.name}
                autoCapitalize="sentences"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Surname</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                onChangeText={(text) => handleChange("surname", text)}
                placeholder="Surname"
                placeholderTextColor={
                  LoginColors[loginTheme].placeholderTextInput
                }
                value={form.surname}
                autoCapitalize="sentences"
              />
            </View>
          </View>
        </>
      );
    } else {
      const step = steps[currentStep];
      const field = step.field;
      const value = form[field];
      let inputStyle = styles.inputContainer;

      if (field === "password") {
        const valid = isPasswordValid(value);
        if (value.length > 0 && !valid) {
          inputStyle = [inputStyle, styles.inputError];
        } else if (value.length > 0 && valid) {
          inputStyle = [inputStyle, styles.inputSuccess];
        }
      } else if (field === "handle") {
        if (handleError) {
          inputStyle = [inputStyle, styles.inputError];
        } else if (handleAvailable === true && value.trim()) {
          inputStyle = [inputStyle, styles.inputSuccess];
        }
      }

      const showAvailability =
        field === "handle" && value.trim() && isHandleValid(value);

      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{step.label}</Text>
          <View style={inputStyle}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={field === "password" && showPassword.password}
              onChangeText={(text) => handleChange(field, text)}
              placeholder={step.placeholder}
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              value={value}
              autoCapitalize={
                field === "handle" || field === "password"
                  ? "none"
                  : "sentences"
              }
            />
            {field === "handle" && isLoading && (
              <ActivityIndicator
                size="small"
                color="#999"
                style={{ marginRight: 10 }}
              />
            )}
            {field === "password" && (
              <Icon
                name={showPassword.password ? "ViewIcon" : "ViewOffIcon"}
                color={LoginColors[loginTheme].iconShowHideField}
                style={styles.eyeButton}
                onPress={() => toggleShowPassword("password")}
              />
            )}
          </View>

          {field === "password" && (
            <View style={styles.requirements}>
              {passwordRequirements.map((req) => (
                <View key={req.label} style={styles.reqItem}>
                  <Text
                    style={[
                      styles.reqIcon,
                      req.check(value) ? styles.reqGreen : styles.reqRed,
                    ]}
                  >
                    {req.check(value) ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.reqText}>{req.label}</Text>
                </View>
              ))}
            </View>
          )}

          {field === "handle" && (
            <View style={styles.requirements}>
              {handleRequirements.map((req) => (
                <View key={req.label} style={styles.reqItem}>
                  <Text
                    style={[
                      styles.reqIcon,
                      req.check(value) ? styles.reqGreen : styles.reqRed,
                    ]}
                  >
                    {req.check(value) ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.reqText}>{req.label}</Text>
                </View>
              ))}
            </View>
          )}

          {showAvailability && (
            <View style={styles.reqItem}>
              <Text
                style={[
                  styles.reqIcon,
                  isLoading
                    ? styles.reqGray
                    : handleAvailable === true
                      ? styles.reqGreen
                      : styles.reqRed,
                ]}
              >
                {isLoading ? "⏳" : handleAvailable ? "✓" : "✗"}
              </Text>
              <Text style={styles.reqText}>
                {isLoading
                  ? "Checking availability..."
                  : handleAvailable
                    ? "Available"
                    : "Already in use"}
              </Text>
            </View>
          )}

          {field === "handle" && handleError && (
            <Text style={styles.handleErrorText}>{handleError}</Text>
          )}
        </View>
      );
    }
  };

  const renderCheckbox = () => (
    <View style={{ marginBottom: 16, maxWidth: 300 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start", // Allinea alla cima per poter centrare solo sulla prima riga
        }}
      >
        <TouchableOpacity
          onPress={() => {
            const newVal = !privacy_policy_accepted;
            SetPrivacy_policy_accepted(newVal);
            setTerms_of_service_accepted(newVal);
          }}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: privacy_policy_accepted
              ? LoginColors[loginTheme].backgroundSubmitButton
              : "#ccc",
            backgroundColor: privacy_policy_accepted
              ? LoginColors[loginTheme].backgroundSubmitButton
              : "#fff",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 5,
            marginTop: 1, // Aggiusta per centrare verticalmente al centro della prima riga (assumendo lineHeight ~20)
          }}
        >
          {privacy_policy_accepted && (
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
              ✓
            </Text>
          )}
        </TouchableOpacity>
        <Text style={{ fontSize: 14, textAlign: "left", lineHeight: 20 }}>
          I accept{" "}
          <Text
            style={[styles.link, { textDecorationLine: "underline" }]}
            onPress={() =>
              Platform.OS === "web"
                ? window.open(privacyPolicyLink, "_blank")
                : Linking.openURL(privacyPolicyLink)
            }
          >
            privacy policy
          </Text>{" "}
          and{" "}
          <Text
            style={[styles.link, { textDecorationLine: "underline" }]}
            onPress={() =>
              Platform.OS === "web"
                ? window.open(tosLink, "_blank")
                : Linking.openURL(tosLink)
            }
          >
            terms of service
          </Text>
        </Text>
      </View>
    </View>
  );

  const renderNavButtons = () => {
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;
    const canNext = isLastStep ? isFormValid : validateStep(currentStep);
    const isDisabled = !canNext || (isLastStep && isLoading);

    const prevHandler = () => {
      if (isFirstStep) {
        router.navigate("/welcome/email-check");
      } else {
        setCurrentStep(currentStep - 1);
      }
    };

    const nextHandler = () => {
      if (!canNext) return;
      if (isLastStep) {
        handleSignup();
      } else {
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
        setMaxStep(Math.max(maxStep, newStep));
      }
    };

    return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={prevHandler}>
          <View style={styles.backButtonText}>
            {isFirstStep ? (
              <Text>Back</Text>
            ) : (
              <Icon
                name={"ArrowLeft02Icon"}
                color={LoginColors[loginTheme].icon}
              />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, { opacity: isDisabled ? 0.6 : 1 }]}
          disabled={isDisabled}
          onPress={nextHandler}
        >
          {isLoading && isLastStep ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isLastStep ? (
                <Text>Confirm</Text>
              ) : (
                <Icon
                  name={"ArrowRight02Icon"}
                  color={LoginColors[loginTheme].icon}
                />
              )}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={LoginColors[loginTheme].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar
        style="dark"
        backgroundColor={LoginColors[loginTheme].backgroundCard}
        translucent={false}
        hidden={false}
      />

      <View style={styles.card}>
        <KeyboardAvoidingView behavior={"position"}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <Image
              style={styles.logo}
              source={require("../../assets/images/logo-novyse.png")}
            />

            <Text style={styles.title}>Sign Up</Text>

            {renderTimeline()}

            <View style={styles.formWrapper}>
              {renderCurrentField()}
              {currentStep === steps.length - 1 && renderCheckbox()}
              {renderNavButtons()}
              <StatusMessage type="error" text={error} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>
  );
};

export default Signup;

// Funzione per creare stili dinamici
function createStyle(loginTheme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 0 : 24,
      borderRadius: isSmallScreen ? 0 : 20,
      overflow: "hidden",
      backgroundColor: LoginColors[loginTheme].backgroundCard,
      width: isSmallScreen ? "100%" : "auto",
      minWidth: isSmallScreen ? "100%" : 600,
      maxWidth: isSmallScreen ? "100%" : 800,
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
    },
    cardContent: {
      width: "100%",
      justifyContent: "center",
      alignContent: "center",
      alignItems: "center",
      paddingVertical: 32,
    },
    logo: {
      alignSelf: "center",
      height: 150,
      width: 150,
      marginBottom: 20,
    },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: 16,
    },
    timeline: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      width: "100%",
      marginBottom: 32,
      maxWidth: 300,
    },
    timelineDotContainer: {
      alignItems: "center",
    },
    timelineCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "red",
      justifyContent: "center",
      alignItems: "center",
    },
    timelineCompleted: {
      backgroundColor: "green",
      borderColor: "#c4c4c4ff",
      borderWidth: 4,
    },
    timelineCurrent: {
      backgroundColor: "#007AFF",
      borderColor: "#c4c4c4ff",
      borderWidth: 4,
    },
    timelinePending: {
      backgroundColor: "#858585ff",
      borderColor: "#c4c4c4ff",
      borderWidth: 4,
    },
    timelineNumber: {
      color: "white",
      fontWeight: "bold",
      fontSize: 16,
    },
    timelineLine: {
      flex: 1,
      height: 2,
      backgroundColor: "#E0E0E0",
      marginHorizontal: 10,
    },
    formWrapper: {
      width: "100%",
      maxWidth: isSmallScreen ? 300 : 400,
      alignItems: "center",
    },
    inputGroup: {
      marginBottom: 20,
      width: "100%",
    },
    label: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      marginBottom: 8,
      fontWeight: "500",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 6,
      backgroundColor: "white",
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
      minHeight: 44,
    },
    inputError: {
      borderColor: "rgba(255, 99, 99, 0.8)",
      backgroundColor: "rgba(255, 99, 99, 0.1)",
    },
    inputSuccess: {
      borderColor: "rgba(0, 128, 0, 0.8)",
      backgroundColor: "rgba(0, 128, 0, 0.1)",
    },
    textInput: {
      flex: 1,
      padding: 10,
      fontSize: 16,
      color: LoginColors[loginTheme].text,
      outlineStyle: "none",
    },
    eyeButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
    },
    requirements: {
      marginTop: 10,
      width: "100%",
    },
    reqItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    reqIcon: {
      fontSize: 12,
      fontWeight: "bold",
      marginRight: 8,
    },
    reqGreen: {
      color: "green",
    },
    reqRed: {
      color: "red",
    },
    reqGray: {
      color: "gray",
    },
    reqText: {
      fontSize: 12,
      color: LoginColors[loginTheme].subtitle,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 300,
      marginTop: 20,
    },
    backButton: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      backgroundColor: LoginColors[loginTheme].backgroundBackButton,
      marginRight: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonText: {
      fontSize: 16,
      color: LoginColors[loginTheme].backButtonTextColor,
      fontWeight: "500",
    },
    submitButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
    submitButtonText: {
      fontSize: 16,
      color: "white",
      fontWeight: "500",
      textAlign: "center",
    },
    handleErrorText: {
      color: "rgba(255, 99, 99, 0.9)",
      fontSize: 12,
      marginTop: 4,
    },
    link: {
      color: LoginColors[loginTheme].link,
    },
  });
}
