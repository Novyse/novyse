export const Colors = {
  default: {
    // ?USER CAN CHANGE

    // Text
    text: "#ffffff",
    textLink: "#55a8e1",                                                          //* 1
    subtitle: "#bababa",
    placeholderText: "#c9c9c9",

    // Icons
    icon: "#ffffff",
    iconSuccess: "#44b244",                                                       //* 2
    iconDanger: "#eb4444",                                                        //* 2
    iconWarning: "#e49f0c",
    iconHover: "#c9c9c9",                                                         //* 3
    iconHovered: "rgba(0, 0, 0, 0.1)",
    iconPressed: "rgba(0, 0, 0, 0.3)",                                            //* 1
    
    // Background
    backgroundCard: "#416a90",
    backgroundDateSeparator: "#17212b",                                           //* 3
    backgroundSearchResultItem: "#2b3e51",                                        //* 1
    backgroundTextField: "#415f81ff",                                             //* 2
    backgroundModalOverlay: "#00000080",                                          //* 1
    backgroundBackupCode: "#f0f0f0",                                              //* 1
    
    // Various
    primary: "#55a8e1",
    secondary: "#0f90e6",
    borderColor: "rgba(255,255,255,0.05)",
    badgeColor: "#20566e",                            // TODO: strano utilizzo, sistemarlo
    shadowColor: "#000000",

    // Gradients
    backgroundMain: "#013480",
    backgroundMainGradient: ["#013480", "#177FC0"],
    backgroundChatContent: "transparent",                                           //* 1
    backgroundChatListItemSelectedGradient: ["#2899cf", "#4fb3e1"],             //* 1

    // More
    ChatIconsPickerModalTabInactiveText: "#b1b1b1",                               //* 1
    settingsHoveredButton: "#4f8dffb9",                                           //* 1
    settingsPressedButton: "#2a68dc",                                             //* 1

    // Scrollbar
    scrollbar: "#013480",                         // TODO: usato in troppi punti, da unificare
    scrollbarHover: "#c7c7c7",                    // TODO: usato in troppi punti, da unificare

    // ?USER CAN'T CHANGE

    dangerText: "#eb4444",            // uguale a iconDanger
    warningText: "#e49f0c",           // uguale a iconWarning        
    successText: "#44b244",           // uguale a iconSuccess
    infoText: "#0c5f97",              // non c'è iconInfo (wtf perchè)
    backgroundDanger: "#ffc7c7a7",
    backgroundWarning: "#eef370c1",
    backgroundSuccess: "#90e190c2",
    backgroundInfo: "#27bef95b",
    backgroundScrollbar: "transparent",             // TODO: usato in troppi punti, da unificare
    badgeGlareFirstLast: "rgba(255,255,255,0)",
    badgeGlareMiddle: "rgba(255,255,255,0.7)"
  },
  light: {
    // ?USER CAN CHANGE

    // Text
    text: "#1a1a1a",
    textLink: "#2399C3",
    subtitle: "#666666",
    placeholderText: "#999999",

    // Icons
    icon: "#1a1a1a",
    iconSuccess: "#2e7d32",
    iconDanger: "#d32f2f",
    iconWarning: "#e49f0c",
    iconHover: "#666666",
    iconHovered: "rgba(0, 0, 0, 0.05)",
    iconPressed: "rgba(0, 0, 0, 0.1)",

    // Background
    backgroundCard: "#ffffff",
    backgroundDateSeparator: "#e9ecef",
    backgroundSearchResultItem: "#e8e8e8",
    backgroundTextField: "#ffffff",
    backgroundModalOverlay: "#00000080",
    backgroundBackupCode: "#f5f5f5",

    // Various
    primary: "#2399C3",
    secondary: "#1976a8",
    borderColor: "rgba(0, 0, 0, 0.12)",
    badgeColor: "#2399C3",
    shadowColor: "#000000",

    // Gradients
    backgroundMain: "#f5f5f5",
    backgroundMainGradient: ["#ffffff", "#f5f5f5"],
    backgroundChatContent: "transparent",
    backgroundChatListItemSelectedGradient: ["#e3f2fd", "#bbdefb"],

    // More
    ChatIconsPickerModalTabInactiveText: "#888888",
    settingsHoveredButton: "#2399C380",
    settingsPressedButton: "#1976a8",

    // Scrollbar
    scrollbar: "#c0c0c0",
    scrollbarHover: "#a0a0a0",

    // ?USER CAN'T CHANGE

    dangerText: "#d32f2f",
    warningText: "#e49f0c",
    successText: "#2e7d32",
    infoText: "#1976a8",
    backgroundDanger: "#ffc7c7a7",
    backgroundWarning: "#eef370c1",
    backgroundSuccess: "#90e190c2",
    backgroundInfo: "#27bef95b",
    backgroundScrollbar: "transparent",
    badgeGlareFirstLast: "rgba(255,255,255,0)",
    badgeGlareMiddle: "rgba(255,255,255,0.7)",

    // Alias usati da alcuni componenti
    border: "rgba(0, 0, 0, 0.12)",
    background: "#f5f5f5",
    backgroundInput: "#ffffff",
    backgroundHover: "rgba(0, 0, 0, 0.05)",
    backgroundMainSecondary: "#eeeeee",
    separator: "#e9ecef",
    backgroundError: "#ffc7c7a7",
    error: "#d32f2f",
  },
  dark: {
    // ?USER CAN CHANGE

    // Text
    text: "#ffffff",
    textLink: "#6eb5e0",
    subtitle: "#b0b0b0",
    placeholderText: "#888888",

    // Icons
    icon: "#ffffff",
    iconSuccess: "#44b244",
    iconDanger: "#eb4444",
    iconWarning: "#e49f0c",
    iconHover: "#c9c9c9",
    iconHovered: "rgba(255, 255, 255, 0.07)",
    iconPressed: "rgba(255, 255, 255, 0.04)",

    // Background
    backgroundCard: "#2d2d2d",
    backgroundDateSeparator: "#252525",
    backgroundSearchResultItem: "#2d2d2d",
    backgroundTextField: "#2d2d2d",
    backgroundModalOverlay: "#00000080",
    backgroundBackupCode: "#1e1e1e",

    // Various
    primary: "#6eb5e0",
    secondary: "#4a90c2",
    borderColor: "rgba(255, 255, 255, 0.1)",
    badgeColor: "#6eb5e0",
    shadowColor: "#000000",

    // Gradients
    backgroundMain: "#121212",
    backgroundMainGradient: ["#0a0a0a", "#1e1e1e"],
    backgroundChatContent: "transparent",
    backgroundChatListItemSelectedGradient: ["#1e3a4f", "#2d5a72"],

    // More
    ChatIconsPickerModalTabInactiveText: "#888888",
    settingsHoveredButton: "#6eb5e080",
    settingsPressedButton: "#4a90c2",

    // Scrollbar
    scrollbar: "#555555",
    scrollbarHover: "#777777",

    // ?USER CAN'T CHANGE

    dangerText: "#eb4444",
    warningText: "#e49f0c",
    successText: "#44b244",
    infoText: "#6eb5e0",
    backgroundDanger: "#ffc7c7a7",
    backgroundWarning: "#eef370c1",
    backgroundSuccess: "#90e190c2",
    backgroundInfo: "#27bef95b",
    backgroundScrollbar: "transparent",
    badgeGlareFirstLast: "rgba(255,255,255,0)",
    badgeGlareMiddle: "rgba(255,255,255,0.7)",

    // Alias usati da alcuni componenti
    border: "rgba(255, 255, 255, 0.1)",
    background: "#121212",
    backgroundInput: "#2d2d2d",
    backgroundHover: "rgba(255, 255, 255, 0.4)",
    backgroundMainSecondary: "#1a1a1a",
    separator: "#252525",
    backgroundError: "#ffc7c7a7",
    error: "#eb4444",
  },
  amoled: {
    primary: "#0d0d0d",
    text: "white",
    backgroundClassic: "#000000",
    backgroundChatList: "#000000",
    backgroundChat: "#000000",
    backgroundSearchResultItem: "#0d0d0d",
    backgroundHeader: "#000000",
    backgroundTextField: "#0d0d0d",
    backgroundChatListCheckNetwork: "#050505",
    buttonBackground: "#000000",
    icon: "white",
    messagesLink: "#00ff88",
    // Colori aggiuntivi per componenti
    placeholderText: "#666666",
    backgroundDateSeparator: "#000000",
    shadowColor: "#000000",
    borderColor: "#333333",
    floatingBarButtonBackground: "rgba(255, 255, 255, 0.1)",
    backgroundStatusBar: "#000000", // StatusBar completamente nera per AMOLED
    backgroundCard: "#0d0d0d",
    // Gradients
    backgroundMainGradient: ["#000000", "#000000"], // Gradiente principale dell'app AMOLED (puro nero)
    backgroundCommsFloatingBarGradient: ["#000000", "#0d0d0d", "#1a1a1a"],
    backgroundChatContentGradient: ["#000000", "#000000"],
    backgroundChatListGradient: ["#000000", "#000000"],
    backgroundChatListItemGradient: ["#000000", "#0d0d0d"],
    backgroundChatListItemSelectedGradient: ["#0d0d0d", "#1a1a1a"],
    backgroundHeaderGradient: ["#000000", "#000000"],
    backgroundChatTextInputGradient: ["#000000", "#0d0d0d"],
    backgroundMessageBaseGradient: ["#000000", "#222222"],
    backgroundSearchGradient: ["#000000", "#0d0d0d"],
    settingPagesGradient: ["#000000", "#000000", "#0d0d0d"],
    badgeColor: "#000000",
  },
  "Amoled Extreme": {
    primary: "#000000",
    text: "white",
    backgroundClassic: "#000000",
    backgroundChatList: "#000000",
    backgroundChat: "#000000",
    backgroundSearchResultItem: "#000000",
    backgroundHeader: "#000000",
    backgroundTextField: "#000000",
    backgroundChatListCheckNetwork: "#000000",
    buttonBackground: "#000000",
    icon: "white",
    messagesLink: "#00ff88",
    // Colori aggiuntivi per componenti
    placeholderText: "#555555",
    backgroundDateSeparator: "#000000",
    shadowColor: "#000000",
    borderColor: "#000000ff",
    floatingBarButtonBackground: "rgba(255, 255, 255, 0.05)",
    backgroundStatusBar: "#000000",
    backgroundCard: "#000000",
    // Gradients
    backgroundMainGradient: ["#000000", "#000000"],
    backgroundCommsFloatingBarGradient: ["#000000", "#000000", "#0a0a0a"],
    backgroundChatContentGradient: ["#000000", "#000000"],
    backgroundChatListGradient: ["#000000", "#000000"],
    backgroundChatListItemGradient: ["#000000", "#000000"],
    backgroundChatListItemSelectedGradient: ["#000000", "#0a0a0a"],
    backgroundHeaderGradient: ["#000000", "#000000"],
    backgroundChatTextInputGradient: ["#000000", "#000000"],
    backgroundMessageBaseGradient: ["#000000", "#000000"],
    backgroundSearchGradient: ["#000000", "#000000"],
    settingPagesGradient: ["#000000", "#000000", "#000000"],
    badgeColor: "#000000",
    // Scrollbar
    scrollbar: "#333333",
    backgroundScrollbar: "transparent",
    scrollbarHover: "#555555",
  },
};

export const ThemeRegistry: Record<
  string,
  { modes: ("light" | "dark")[]; colors: { light?: string; dark?: string } }
> = {
  classic: {
    modes: ["light", "dark"],
    colors: { light: "light", dark: "dark" },
  },
  default: {
    modes: ["dark"],
    colors: { dark: "default" },
  },
  amoled: {
    modes: ["dark"],
    colors: { dark: "amoled" },
  },
  "Amoled Extreme": {
    modes: ["dark"],
    colors: { dark: "Amoled Extreme" },
  },
};
