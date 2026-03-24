import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import { useRouter } from "expo-router";
import { validate } from "@/src/utils/welcome/validator";
import gateway from "@/src/utils/backend-services/api-gateway";
import auth from "@/src/utils/backend-services/auth";

export const useSignup = () => {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
    handle: "",
  });

  //true showPassword means password hidden by default
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set<number>());
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const directionRef = useRef(1);

  const animateStep = useCallback(
    (next: () => void) => {
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
    },
    [fadeAnim, slideAnim],
  );

  const goToStep = useCallback(
    (next: number) => {
      directionRef.current = next > currentStep ? 1 : -1;
      animateStep(() => setCurrentStep(next));
    },
    [currentStep, animateStep],
  );

  const validateStep = useCallback(
    (step: number) => {
      if (step === 0) return validate.user.name(form.name);
      if (step === 1)
        return (
          !!form.handle.trim() &&
          validate.handle(form.handle) &&
          handleAvailable === true &&
          !handleError
        );
      if (step === 2)
        return (
          validate.user.password(form.password) &&
          form.password === form.confirmPassword
        );
      return false;
    },
    [form, handleAvailable, handleError],
  );

  const isFormValid =
    validateStep(0) &&
    validateStep(1) &&
    validateStep(2) &&
    privacyAccepted &&
    ageConfirmed &&
    !!captchaToken &&
    !isLoading;

  const isPasskeyValid = validateStep(0) && validateStep(1) && privacyAccepted && ageConfirmed && !!captchaToken;

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
      try {
        const res = (await gateway.check.handle(v)) as any;
        const free = res.free;
        setHandleAvailable(free);
        if (!free) setHandleError("This handle is already in use.");
      } catch (e) {
        setHandleError("Error checking handle availability.");
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleOpaqueSignup = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { password, name, handle } = form;
        const ok = await auth.signup.opaque(handle, password, name, {
          privacy: privacyAccepted,
          tos: privacyAccepted,
        }, captchaToken!);
      if (ok.success) {
        router.navigate(`/(welcome)/login?signedup=true&username=${handle}&type=opaque`);
      } else {
        setError(ok.error || "Signup failed. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignup = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { name, handle } = form;
      const ok = await auth.signup.passkey(handle, name, captchaToken!);
      if (ok?.success) {
        router.navigate(`/(welcome)/login?signedup=true&username=${handle}&type=passkey`);
      } else {
        setError(ok?.error || "Passkey signup failed.");
      }
    } catch (e) {
      setError("An unexpected error occurred during passkey signup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    const canNext = currentStep === 2 ? isFormValid : validateStep(currentStep);
    if (!canNext) return;

    if (currentStep === 2) {
      handleOpaqueSignup();
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

  return {
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
    isPasskeyValid,
    setShowPassword,
    setShowConfirmPassword,
    setPrivacyAccepted,
    setAgeConfirmed,
    setError,
    handleChange,
    handleNext,
    handleBack,
    handlePasskeySignup,
    goToStep,
    validateStep,
    setCaptchaToken,
  };
};
