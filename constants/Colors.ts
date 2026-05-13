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
    scrollbar: "#d6d6d6",                         // TODO: usato in troppi punti, da unificare
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
    primary: "#f5f5f5",
    text: "black",
    backgroundClassic: "white",
    backgroundChatList: "#f5f5f5",
    backgroundChat: "#ffffff",
    backgroundSearchResultItem: "#e8e8e8",
    backgroundHeader: "#f0f0f0",
    backgroundTextField: "#ffffff",
    backgroundChatListCheckNetwork: "#e0e0e0",
    buttonBackground: "#f0f0f0",
    icon: "black",
    messagesLink: "#2399C3",
    // Colori aggiuntivi per componenti
    placeholderText: "#999999",
    backgroundDateSeparator: "#e9ecef",
    shadowColor: "#000000",
    borderColor: "#cccccc",
    floatingBarButtonBackground: "rgba(0, 0, 0, 0.1)",
    backgroundStatusBar: "#ffffff", // StatusBar chiara per Light Mode
    backgroundCard: "#ffffff",
    // Gradients
    backgroundMainGradient: ["#ffffff", "#f5f5f5"], // Gradiente principale dell'app
    backgroundCommsFloatingBarGradient: ["#e3f2fd", "#bbdefb", "#90caf9"],
    backgroundChatContentGradient: ["#ffffff", "#f5f5f5"],
    backgroundChatListGradient: ["#f8f9fa", "#e9ecef"],
    backgroundChatListItemGradient: ["#e9ecef", "#dee2e6"],
    backgroundChatListItemSelectedGradient: ["#d4edda", "#c3e6cb"],
    backgroundHeaderGradient: ["#f8f9fa", "#e9ecef"],
    backgroundChatTextInputGradient: ["#ffffff", "#f8f9fa"],
    backgroundMessageBaseGradient: ["#ffffff", "#f8f9fa"],
    backgroundSearchGradient: ["#e9ecef", "#dee2e6"],
    settingPagesGradient: ["#ffffff", "#f8f9fa", "#e9ecef"],
    badgeColor: "#2399C3",
  },
  dark: {
    primary: "#2d2d2d",
    text: "white",
    backgroundClassic: "#121212",
    backgroundChatList: "#1e1e1e",
    backgroundChat: "#121212",
    backgroundSearchResultItem: "#2d2d2d",
    backgroundHeader: "#1e1e1e",
    backgroundTextField: "#2d2d2d",
    backgroundChatListCheckNetwork: "#252525",
    buttonBackground: "#1e1e1e",
    icon: "white",
    messagesLink: "#bb86fc",
    // Colori aggiuntivi per componenti
    placeholderText: "#999999",
    backgroundDateSeparator: "#252525",
    shadowColor: "#000000",
    borderColor: "#555555",
    floatingBarButtonBackground: "rgba(255, 255, 255, 0.15)",
    backgroundStatusBar: "#121212", // StatusBar scura per Dark Mode
    backgroundCard: "#2d2d2d",
    // Gradients
    backgroundMainGradient: ["#0a0a0a", "#1e1e1e"], // Gradiente principale dell'app
    backgroundCommsFloatingBarGradient: ["#2d2d2d", "#404040", "#525252"],
    backgroundChatContentGradient: ["#0a0a0a", "#1e1e1e"],
    backgroundChatListGradient: ["#121212", "#1e1e1e"],
    backgroundChatListItemGradient: ["#1e1e1e", "#2d2d2d"],
    backgroundChatListItemSelectedGradient: ["#404040", "#525252"],
    backgroundHeaderGradient: ["#121212", "#1e1e1e"],
    backgroundChatTextInputGradient: ["#1e1e1e", "#2d2d2d"],
    backgroundMessageBaseGradient: ["#0a0a0a", "#1e1e1e"],
    backgroundSearchGradient: ["#2d2d2d", "#404040"],
    settingPagesGradient: ["#121212", "#1e1e1e", "#2d2d2d"],
    badgeColor: "#2d2d2d",
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
