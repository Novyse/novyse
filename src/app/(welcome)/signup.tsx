import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useScreen } from "@/context/ScreenContext";
import { validate } from "@/src/utils/welcome/validator";
import gateway from "@/src/utils/backend-services/api-gateway";
import { LoginColors } from "@/constants/LoginColors";
import { PRIVACY_POLICY_URL, TOS_URL } from "@/app.config";

import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import SignupTimeline from "@/src/components/welcome/signup/SignupTimeline";
import SignupStepField from "@/src/components/welcome/signup/SignupStepField";
import SignupCheckboxes from "@/src/components/welcome/signup/SignupCheckboxes";

import logoNovyse from "@/assets/images/logo-novyse.png";

const STEPS = [{ id: 1 }, { id: 2 }, { id: 3 }];

const LOGIN_THEME = "default";

export default function Signup() {
  const router = useRouter();
  const { isSmallScreen } = useScreen();
  const styles = createStyle(isSmallScreen);

  const [form, setForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
    handle: "",
  });
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set<number>());
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const directionRef = useRef(1);

  const animateStep = (next: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -40 * directionRef.current,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      next();
      slideAnim.setValue(40 * directionRef.current);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goToStep = (next: number) => {
    directionRef.current = next > currentStep ? 1 : -1;
    animateStep(() => setCurrentStep(next));
  };

  const isFormValid =
    !!form.password &&
    !!form.name &&
    !!form.handle &&
    form.password === form.confirmPassword &&
    handleAvailable === true &&
    !handleError &&
    !isLoading &&
    privacyAccepted &&
    ageConfirmed;

  const validateStep = (step: number) => {
    if (step === 0)
      return (
        validate.user.name(form.name)
      );
    if (step === 1)
      return (
        validate.user.password(form.password) &&
        form.password === form.confirmPassword
      );
    if (step === 2)
      return (
        !!form.handle.trim() &&
        validate.handle(form.handle) &&
        handleAvailable === true &&
        !handleError
      );
    return false;
  };

  const handleChange = (field: string, value: string) => {
    const v = field === "handle" ? value.toLowerCase() : value;
    setForm((prev) => ({ ...prev, [field]: v }));
    if (error) setError(null);

    if (field !== "handle") return;

    setHandleAvailable(null);
    setHandleError(null);
    if (handleTimer.current) clearTimeout(handleTimer.current);
    if (!v.trim()) {
      setIsLoading(false);
      return;
    }
    if (!validate.handle(v)) {
      setHandleError("Invalid format. Use a-z, 0-9, and single '_'.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    handleTimer.current = setTimeout(async () => {
      const { free } = await gateway.check.handle(v);
      setHandleAvailable(free);
      if (!free) setHandleError("This handle is already in use.");
      setIsLoading(false);
    }, 1000);
  };

  const handleSignup = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { password, name, handle } = form;
      const ok = await gateway.auth.register(
        password,
        name,
        handle,
        privacyAccepted,
        privacyAccepted,
        ageConfirmed,
      );
      if (ok)
        router.navigate(`/(welcome)/welcome?signedup=true&handle=${handle}`);
      else setError("Signup failed. Please try again.");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const canNext = isLastStep ? isFormValid : validateStep(currentStep);

  const handleNext = () => {
    if (!canNext) return;
    if (isLastStep) {
      handleSignup();
      return;
    }
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) {
      router.navigate("/");
      return;
    }
    goToStep(currentStep - 1);
  };

  return (
    <LinearGradient
      colors={LoginColors[LOGIN_THEME].background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.card}>
        <KeyboardAvoidingView behavior="position">
          <ScrollView contentContainerStyle={styles.cardContent}>
            <Image style={styles.logo} source={logoNovyse} />
            <Text style={styles.title}>Sign Up</Text>

            <SignupTimeline
              steps={STEPS}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepPress={(i) => goToStep(i)}
              loginTheme={LOGIN_THEME}
            />

            <View style={styles.formWrapper}>
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <SignupStepField
                  currentStep={currentStep}
                  form={form}
                  showPassword={showPassword}
                  showConfirmPassword={showConfirmPassword}
                  isLoading={isLoading}
                  handleAvailable={handleAvailable}
                  handleError={handleError}
                  onChangeField={handleChange}
                  onTogglePassword={() => setShowPassword((p) => !p)}
                  onToggleConfirmPassword={() =>
                    setShowConfirmPassword((p) => !p)
                  }
                  loginTheme={LOGIN_THEME}
                />
                {isLastStep && (
                  <SignupCheckboxes
                    privacyAccepted={privacyAccepted}
                    tosAccepted={privacyAccepted}
                    ageConfirmed={ageConfirmed}
                    onTogglePrivacyTos={() => setPrivacyAccepted((p) => !p)}
                    onToggleAge={() => setAgeConfirmed((p) => !p)}
                    loginTheme={LOGIN_THEME}
                  />
                )}
              </Animated.View>

              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <WelcomeButton onPress={handleBack} type="back">
                    {currentStep === 0 ? (
                      <WelcomeButtonText type="back" label="Back" />
                    ) : (
                      <Icon
                        name="ArrowLeft02Icon"
                        color={LoginColors[LOGIN_THEME].iconBackButton}
                      />
                    )}
                  </WelcomeButton>
                </View>
                <View style={styles.buttonWrapper}>
                  <WelcomeButton
                    disabled={!canNext || (isLastStep && isLoading)}
                    onPress={handleNext}
                    type="submit"
                  >
                    {isLoading && isLastStep ? (
                      <ActivityIndicator
                        size="small"
                        color={LoginColors[LOGIN_THEME].iconLoading}
                      />
                    ) : isLastStep ? (
                      <WelcomeButtonText type="submit" label="Sign up" />
                    ) : (
                      <Icon
                        name="ArrowRight02Icon"
                        color={LoginColors[LOGIN_THEME].icon}
                      />
                    )}
                  </WelcomeButton>
                </View>
              </View>

              <StatusMessage
                type="error"
                content={[error]}
                visible={!!error}
                onClose={() => setError(null)}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>
  );
}

function createStyle(isSmallScreen: boolean) {
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
      backgroundColor: LoginColors[LOGIN_THEME].backgroundCard,
      width: isSmallScreen ? "100%" : "auto",
      minWidth: isSmallScreen ? "100%" : 600,
      maxWidth: isSmallScreen ? "100%" : 800,
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
    },
    cardContent: {
      width: "100%",
      alignItems: "center",
      paddingVertical: 32,
    },
    logo: { height: 150, width: 150, marginBottom: 20 },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[LOGIN_THEME].title,
      textAlign: "center",
      marginBottom: 16,
    },
    formWrapper: {
      width: "100%",
      maxWidth: isSmallScreen ? 300 : 400,
      alignItems: "center",
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      width: "100%",
      maxWidth: 300,
      marginTop: 20,
    },
    buttonWrapper: {
      flex: 1,
    },
  });
}
