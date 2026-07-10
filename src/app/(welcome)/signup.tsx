import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import AppText from "@/src/components/AppText";

import { useScreen } from "@/src/context/ScreenContext";
import { LoginColors } from "@/constants/LoginColors";
import { useSignup } from "@/src/hooks/welcome/useSignup";

import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";
import WelcomeButton from "@/src/components/welcome/WelcomeButton";
import WelcomeButtonText from "@/src/components/welcome/WelcomeButtonText";
import SignupTimeline from "@/src/components/welcome/signup/SignupTimeline";
import SignupStepField from "@/src/components/welcome/signup/SignupStepField";
import SignupCheckboxes from "@/src/components/welcome/signup/SignupCheckboxes";
import TurnstileCaptcha from "@/src/components/auth/TurnstileCaptcha";

const STEPS = [{ id: 1 }, { id: 2 }, { id: 3 }];

const LOGIN_THEME = "default";

export default function Signup() {
  const { isSmallScreen } = useScreen();
  const styles = createStyle(isSmallScreen);
  const [captchaKey, setCaptchaKey] = useState(0);
  const {
    form,
    showPassword,
    showConfirmPassword,
    currentStep,
    completedSteps,
    privacyAccepted,
    ageConfirmed,
    handleAvailable,
    handleError,
    isLoading,
    error,
    slideAnim,
    fadeAnim,
    isFormValid,
    setShowPassword,
    setShowConfirmPassword,
    setPrivacyAccepted,
    setAgeConfirmed,
    setError,
    handleChange,
    handleNext,
    handleBack,
    goToStep,
    validateStep,
    setCaptchaToken,
  } = useSignup();

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <KeyboardAvoidingView behavior="position">
          <ScrollView contentContainerStyle={styles.cardContent}>
            {/* <Image style={styles.logo} source={logoNovyse} /> */}
            <AppText style={styles.title} translationKey="auth.signup.title" />

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
                  <>
                    <TurnstileCaptcha
                      key={captchaKey}
                      onVerify={setCaptchaToken}
                    />
                    <SignupCheckboxes
                      privacyAccepted={privacyAccepted}
                      tosAccepted={privacyAccepted}
                      ageConfirmed={ageConfirmed}
                      onTogglePrivacyTos={() =>
                        setPrivacyAccepted((p: boolean) => !p)
                      }
                      onToggleAge={() => setAgeConfirmed((p: boolean) => !p)}
                      loginTheme={LOGIN_THEME}
                    />
                  </>
                )}
              </Animated.View>

              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <WelcomeButton onPress={handleBack} type="back">
                    {currentStep === 0 ? (
                      <WelcomeButtonText
                        type="back"
                        translationKey="auth.signup.back"
                      />
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
                    disabled={
                      (isLastStep && !isFormValid) ||
                      (!isLastStep && isLoading) ||
                      (!isLastStep && !validateStep(currentStep))
                    }
                    onPress={() => {
                      handleNext();
                      if (currentStep === 2) {
                        setCaptchaToken(null);
                        setCaptchaKey((prev) => prev + 1);
                      }
                    }}
                    type="submit"
                  >
                    {isLoading && isLastStep ? (
                      <ActivityIndicator
                        size="small"
                        color={LoginColors[LOGIN_THEME].iconLoading}
                      />
                    ) : isLastStep ? (
                      <WelcomeButtonText
                        type="submit"
                        translationKey="auth.signup.signupBtn"
                      />
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
                content={error ? [error] : []}
                visible={!!error}
                onClose={() => setError(null)}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
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
    },
    logo: { height: 150, width: 150, marginBottom: 20 },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[LOGIN_THEME].title as any,
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
      marginHorizontal: 4,
    },
  });
}
