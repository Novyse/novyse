import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
  Image,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";

import validate from "@/src/utils/welcome/validator";
import gateway from "@/src/utils/backend-services/api-gateway";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";

import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";

import { PRIVACY_POLICY_URL, TOS_URL } from "@/app.config.js";
import logoNovyse from "@/assets/images/logo-novyse.png";

const Signup = () => {
  const { email } = useLocalSearchParams();

  const router = useRouter();
  const { width } = useWindowDimensions();

  const loginTheme = "default";

  const [privacy_policy_accepted, SetPrivacy_policy_accepted] = useState(false);
  const [terms_of_service_accepted, setTerms_of_service_accepted] =
    useState(false);

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
    { id: 3, label: "Username", field: "handle", placeholder: "Username" },
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
  const [completedSteps, setCompletedSteps] = useState(new Set());

  useEffect(() => {
    const backAction = () => {
      router.navigate("/welcome");
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
      return validate.name(form.name) && validate.surname(form.surname);
    }
    if (stepIndex === 1) {
      return validate.password(form.password);
    }
    if (stepIndex === 2) {
      return (
        form.handle.trim() !== "" &&
        validate.handle(form.handle) &&
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

      if (!validate.handle(processedValue)) {
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
    if (!validate.name(name))
      return "Name can only contain letters and spaces.";
    if (!validate.surname(surname))
      return "Surname can only contain letters and spaces.";
    if (!name.trim()) return "Please enter your name.";
    if (!surname.trim()) return "Please enter your surname.";
    if (!password) return "Please enter your password.";
    if (!validate.password(password)) {
      return "Password must be 8-128 chars, include upper/lowercase, a number and a special character (@, $, !, %, *, ?, &)";
    }
    if (!handle.trim()) return "Please enter your handle.";
    if (!validate.handle(handle)) {
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
        email,
        password,
        name,
        surname,
        handle,
        privacy_policy_accepted,
        terms_of_service_accepted
      );

      if (signupResponse) {
        router.navigate("/welcome");
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
        const isCompleted = completedSteps.has(index) && index !== currentStep;
        const isCurrent = index === currentStep;
        const isAccessible = completedSteps.has(index) || isCurrent;
        return (
          <React.Fragment key={step.id}>
            <View style={styles.timelineDotContainer}>
              <Pressable
                style={[
                  styles.timelineCircle,
                  isCompleted
                    ? styles.timelineCompleted
                    : isCurrent
                      ? styles.timelineCurrent
                      : styles.timelinePending,
                ]}
                onPress={isAccessible ? () => setCurrentStep(index) : undefined}
                disabled={!isAccessible}
              >
                <Text style={styles.timelineNumber}>{step.id}</Text>
              </Pressable>
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
            <View
              style={[
                styles.inputContainer,
                form.name.length > 0 && !validate.name(form.name)
                  ? styles.inputError
                  : form.name.length > 0 && validate.name(form.name)
                    ? styles.inputSuccess
                    : null,
              ]}
            >
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
            <View
              style={[
                styles.inputContainer,
                form.surname.length > 0 && !validate.surname(form.surname)
                  ? styles.inputError
                  : form.surname.length > 0 && validate.surname(form.surname)
                    ? styles.inputSuccess
                    : null,
              ]}
            >
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
          <View style={styles.requirements}>
            <View style={styles.reqItem}>
              <Text
                style={[
                  styles.reqIcon,
                  validate.name(form.name) ? styles.reqGreen : styles.reqRed,
                ]}
              >
                {validate.name(form.name) ? "✓" : "✗"}
              </Text>
              <Text style={styles.reqText}>Name: Only letters and spaces</Text>
            </View>
            <View style={styles.reqItem}>
              <Text
                style={[
                  styles.reqIcon,
                  validate.surname(form.surname)
                    ? styles.reqGreen
                    : styles.reqRed,
                ]}
              >
                {validate.surname(form.surname) ? "✓" : "✗"}
              </Text>
              <Text style={styles.reqText}>
                Surname: Only letters and spaces
              </Text>
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
        const valid = validate.password(value);
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
        field === "handle" && value.trim() && validate.handle(value);

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
                color={LoginColors[loginTheme].iconLoading}
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
                {isLoading ? "⟳" : handleAvailable ? "✓" : "✗"}
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
          alignItems: "flex-start",
        }}
      >
        <Pressable
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
            marginTop: 1,
          }}
        >
          {privacy_policy_accepted && (
            <Text
              style={{
                color: LoginColors[loginTheme].checkboxTick,
                fontWeight: "bold",
                fontSize: 12,
              }}
            >
              ✓
            </Text>
          )}
        </Pressable>
        <Text style={{ fontSize: 14, textAlign: "left", lineHeight: 20 }}>
          I accept{" "}
          <Text
            style={[styles.link, { textDecorationLine: "underline" }]}
            onPress={() =>
              Platform.OS === "web"
                ? window.open(PRIVACY_POLICY_URL, "_blank")
                : Linking.openURL(PRIVACY_POLICY_URL)
            }
          >
            privacy policy
          </Text>{" "}
          and{" "}
          <Text
            style={[styles.link, { textDecorationLine: "underline" }]}
            onPress={() =>
              Platform.OS === "web"
                ? window.open(TOS_URL, "_blank")
                : Linking.openURL(TOS_URL)
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
        router.navigate("/welcome");
      } else {
        setCurrentStep(currentStep - 1);
      }
    };

    const nextHandler = () => {
      if (!canNext) return;
      if (isLastStep) {
        handleSignup();
      } else {
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
      }
    };

    return (
      <View style={styles.buttonContainer}>
        <WelcomeButton onPress={prevHandler} type={"back"}>
          {isFirstStep ? (
            <WelcomeButtonText type={"back"} />
          ) : (
            <Icon
              name={"ArrowLeft02Icon"}
              color={LoginColors[loginTheme].iconBackButton}
            />
          )}
        </WelcomeButton>
        <WelcomeButton
          disabled={isDisabled}
          onPress={nextHandler}
          type={"submit"}
        >
          {isLoading && isLastStep ? (
            <ActivityIndicator
              size="small"
              color={LoginColors[loginTheme].iconLoading}
            />
          ) : isLastStep ? (
            <WelcomeButtonText type={"submit"} />
          ) : (
            <Icon
              name={"ArrowRight02Icon"}
              color={LoginColors[loginTheme].icon}
            />
          )}
        </WelcomeButton>
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
              source={logoNovyse}
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
    timelineCircle: {
      width: 45,
      height: 45,
      borderRadius: "50%",
      justifyContent: "center",
      alignItems: "center",
    },
    timelineDotContainer: {
      alignItems: "center",
    },
    timelineCompleted: {
      borderColor: LoginColors[loginTheme].completedBorder,
      backgroundColor: LoginColors[loginTheme].completedBackground,
      borderWidth: 4,
    },
    timelineCurrent: {
      backgroundColor: LoginColors[loginTheme].currentBackground,
      borderColor: LoginColors[loginTheme].currentBorder,
      borderWidth: 4,
    },
    timelinePending: {
      borderColor: LoginColors[loginTheme].pendingBorder,
      backgroundColor: LoginColors[loginTheme].pendingBackground,
      borderWidth: 4,
    },
    timelineNumber: {
      color: LoginColors[loginTheme].timelineNumber,
      fontWeight: "bold",
      fontSize: 16,
    },
    timelineLine: {
      flex: 1,
      height: 2,
      backgroundColor: LoginColors[loginTheme].backgroundTimeline,
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
      maxWidth: 300,
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
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
      minHeight: 45,
    },
    inputError: {
      borderColor: LoginColors[loginTheme].errorBorder,
      backgroundColor: LoginColors[loginTheme].errorBackground,
    },
    inputSuccess: {
      borderColor: LoginColors[loginTheme].successBorder,
      backgroundColor: LoginColors[loginTheme].successBackground,
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
    },
    requirements: {
      marginTop: 10,
      width: "100%",
      maxWidth: 300
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
      color: LoginColors[loginTheme].signupReqGreen,
    },
    reqRed: {
      color: LoginColors[loginTheme].signupReqRed,
    },
    reqGray: {
      color: LoginColors[loginTheme].signupReqGray,
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
    handleErrorText: {
      color: LoginColors[loginTheme].textError,
      fontSize: 12,
      marginTop: 4,
    },
    link: {
      color: LoginColors[loginTheme].link,
    },
  });
}
