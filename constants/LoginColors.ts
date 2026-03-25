export interface ThemeColors {
  background: string[];
  backgroundCard: string;
  backgroundTextInput: string;
  backgroundQRCode: string;
  backgroundIcon: string;
  backgroundLineDivider: string;
  backgroundSubmitButton: string;
  backgroundBackButton: string;
  backgroundTimeline: string;
  submitButtonTextColor: string;
  backButtonTextColor: string;
  hoveredSubmitButton: string;
  pressedSubmitButton: string;
  hoveredBackButton: string;
  pressedBackButton: string;
  iconBackButton: string;
  iconSubmitButton: string;
  placeholderTextInput: string;
  borderTextInput: string;
  errorBorder: string;
  errorBackground: string;
  successBorder: string;
  successBackground: string;
  pendingBorder: string;
  pendingBackground: string;
  currentBorder: string;
  currentBackground: string;
  completedBorder: string;
  completedBackground: string;
  borderQRCode: string;
  QRCodeGradient: string[];
  QRCodeLogoBacground: string;
  text: string;
  selectedOptionText: string;
  link: string;
  title: string;
  subtitle: string;
  subtitle2: string;
  textError: string;
  checkboxTick: string;
  icon: string;
  iconLoading: string;
  iconShowHideField: string;
  timelineNumber: string;
  signupReqGreen: string;
  signupReqRed: string;
  signupReqGray: string;
}

export type LoginTheme =
  | "default"
  | "christmas"
  | "halloween"
  | "easter"
  | "valentineDay";

export const LoginColors: Record<
  LoginTheme,
  ThemeColors | Record<string, never>
> = {
  default: {
    // Background
    background: ["#013480", "#177FC0"],
    backgroundCard: "rgba(255, 255, 255, 0.6)",
    backgroundTextInput: "#fff",
    backgroundQRCode: "#fff",
    backgroundIcon: "#177FC0",
    backgroundLineDivider: "#696969",
    backgroundSubmitButton: "#013480",
    backgroundBackButton: "rgb(255, 255, 255)",
    backgroundTimeline: "#E0E0E0",

    // Bottoni
    submitButtonTextColor: "#fff",
    backButtonTextColor: "#000",
    hoveredSubmitButton: "#003f9eff",
    pressedSubmitButton: "#0049b8ff",
    hoveredBackButton: "#c7c7c7ff",
    pressedBackButton: "#b2b2b2ff",
    iconBackButton: "#000",
    iconSubmitButton: "#fff",

    // Input
    placeholderTextInput: "grey",
    borderTextInput: "#013480",
    errorBorder: "rgba(255, 99, 99, 0.8)",
    errorBackground: "rgba(255, 99, 99, 0.1)",
    successBorder: "rgba(0, 128, 0, 0.8)",
    successBackground: "rgba(0, 128, 0, 0.1)",
    pendingBorder: "#c4c4c4ff",
    pendingBackground: "#858585ff",
    currentBorder: "#c4c4c4ff",
    currentBackground: "#4e9effff",
    completedBorder: "#c4c4c4ff",
    completedBackground: "green",

    // QR Code
    borderQRCode: "#013480",
    QRCodeGradient: ["#2241d3", "#1fa6d3ff"],
    QRCodeLogoBacground: "#fff",

    // Testi
    text: "#2D2D2D",
    selectedOptionText: "#fff",
    link: "#013480",
    title: "#013480",
    subtitle: "#2D2D2D",
    subtitle2: "#5f5f5f",
    textError: "rgba(255, 99, 99, 0.9)",

    // Icone
    checkboxTick: "#fff",
    icon: "#fff",
    iconLoading: "#013480",
    iconShowHideField: "#013480",

    // Timeline & Signup
    timelineNumber: "#fff",
    signupReqGreen: "#27942f",
    signupReqRed: "red",
    signupReqGray: "gray",
  },

  christmas: {},
  halloween: {},
  easter: {},
  valentineDay: {},
};
