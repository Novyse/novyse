// import React, { useState, useContext, useEffect, useCallback } from "react";
// import {
//   View,
//   useWindowDimensions,
//   StyleSheet,
//   Animated,
//   Text,
//   TouchableOpacity,
// } from "react-native";
// import { Slot, useRouter, useLocalSearchParams } from "expo-router";
// import MyStatusBar from "@/src/components/MyStatusBar";
// import ScreenLayout from "@/src/components/ScreenLayout";
// import Sidebar from "@/src/components/Sidebar";
// import ChatList from "@/src/app/(protected)/ChatList";
// import CreateChatModal from "@/src/components/modals/createChat";
// import BigFloatingCommsMenu from "@/src/components/comms/BigFloatingCommsMenu";
// import SmallCommsMenu from "@/src/components/comms/SmallCommsMenu";
// import auth from "@/src/utils/welcome/auth";
// import methods from "@/src/utils/webrtc/methods";
// import chatUtils from "@/src/utils/chat";
// import queueManager from "@/src/utils/chat/queueManager";
// import { ThemeContext } from "@/context/ThemeContext";
// import { ChatContext } from "@/context/ChatContext";
// import { LocalUserContext } from "@/context/LocalUserContext";
// import { NetworkContext } from "@/context/NetworkContext";
// import useAppInit from "@/src/hooks/auth/useAppInit";

// import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
// import database from "@/src/utils/storage/database/";
// import { useScreen } from "@/context/ScreenContext";
// import Settings from "../settings";
// import Profile from "@/src/components/Profile";
// import { TabView, SceneMap } from 'react-native-tab-view';
// import { BackHandler } from 'react-native';

// const { get, check } = methods;

// export default function ChatLayout() {
//   useAppInit(true);
//   const { width } = useWindowDimensions();
//   const { isSmallScreen } = useScreen();
//   const router = useRouter();
//   const params = useLocalSearchParams();
//   const { theme } = useContext(ThemeContext);
//   const { isConnected } = useContext(NetworkContext);
//   const {
//     setSelectedChatUUID,
//     setSelectedHandle,
//     setSelectedChatName,
//     setSelectedChatPictureUUID,
//     selectedChatUUID,
//   } = useContext(ChatContext);

//   const [isSidebarVisible, setIsSidebarVisible] = useState(false);
//   const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
//     useState(false);
//   const [sidebarPosition] = useState(new Animated.Value(-250));

//   useEffect(() => {
//     const handleParams = async () => {
//       if (params.chatUUIDorHandle) {
//         const { chatUUID, chatHandle, chatName, chatPictureUUID } =
//           await chatUtils.getChatData(params.chatUUIDorHandle);
//         setSelectedChatUUID(chatUUID);
//         setSelectedHandle(chatHandle);
//         setSelectedChatName(chatName);
//         setSelectedChatPictureUUID(chatPictureUUID);
//       }
//     };
//     handleParams();
//   }, [params.chatUUIDorHandle]);

//   useEffect(() => {
//     queueManager.initialize(() => isConnected);
//   }, [isConnected]);

//   const toggleSidebar = useCallback(
//     () => setIsSidebarVisible((prev) => !prev),
//     [],
//   );

//   const renderCommsMenu = () => {
//     return;
//     const isInComms = check.isInComms();
//     if (!isInComms) return null;
//     const commsUUID = get.commUUID();
//     const chatUUID = commsUUID?.split("_")[0];
//     if (selectedChatUUID !== chatUUID) {
//       return isSmallScreen ? <SmallCommsMenu /> : <BigFloatingCommsMenu />;
//     }
//     return null;
//   };

//   const { currentTab, setCurrentTab } = useTabContext();
//   const { currentSettingsPage, setCurrentSettingsPage } = useSettingsContext();
//   const { name, surname, handle, profilePictureUUID } =
//     useContext(LocalUserContext);

//   const styles = createStyle(theme);

//   let masterContent;
//   if (currentTab === "chat") {
//     masterContent = (
//       <View style={styles.chatListWrapper}>
//         {renderCommsMenu()}
//         <ChatList
//           onChatSelect={(id) => {
//             router.push(`/chat/${id}`);
//             setCurrentSettingsPage("main");
//           }}
//           toggleSidebar={toggleSidebar}
//         />
//       </View>
//     );
//   } else if (currentTab === "settings") {
//     masterContent = <Settings mode="menu" />;
//   } else if (currentTab === "profile") {
//     masterContent = (
//       <Profile
//         name={name}
//         surname={surname}
//         username={handle}
//         profilePictureUUID={profilePictureUUID}
//         isOnline={true}
//       />
//     );
//   }

//   return (
//     <ScreenLayout>
//       {!isSmallScreen && (
//         <Sidebar
//           isSidebarVisible={isSidebarVisible}
//           toggleSidebar={toggleSidebar}
//           setIsCreateChatModalVisible={setIsCreateChatModalVisible}
//           handleSettingsPress={() => router.navigate("/settings")}
//           logout={() => auth.logout(router, false)}
//           sidebarPosition={sidebarPosition}
//           theme={theme}
//         />
//       )}
//       <View style={styles.mainContainer}>
//         {isSmallScreen ? (
//           <View style={styles.fullScreen}>
//             {currentTab === "chat" ? (
//               <View style={styles.chatListWrapper}>
//                 {renderCommsMenu()}
//                 <ChatList
//                   onChatSelect={(id) => {
//                     router.push(`/chat/${id}`);
//                     setCurrentSettingsPage("main");
//                   }}
//                   toggleSidebar={toggleSidebar}
//                 />
//               </View>
//             ) : currentTab === "settings" ? (
//               <Settings
//                 mode={currentSettingsPage === "main" ? "menu" : "content"}
//               />
//             ) : currentTab === "profile" ? (
//               <Profile
//                 name={name}
//                 surname={surname}
//                 username={handle}
//                 profilePictureUUID={profilePictureUUID}
//                 isOnline={true}
//               />
//             ) : null}
//           </View>
//         ) : (
//           <View style={styles.splitView}>
//             <View style={styles.master}>
//               {masterContent}
//             </View>
//             <View style={styles.detail}>
//               {currentSettingsPage === "main" ? (
//                 params.chatUUIDorHandle ? (
//                   <Slot />
//                 ) : (
//                   <View style={styles.centered}>
//                     <Text style={{ color: theme.text, fontSize: 18 }}>
//                       No chat selected
//                     </Text>
//                   </View>
//                 )
//               ) : (
//                 <Settings mode="content" />
//               )}
//             </View>
//           </View>
//         )}
//       </View>
//       {!isSmallScreen && (
//         <CreateChatModal
//           visible={isCreateChatModalVisible}
//           onClose={() => setIsCreateChatModalVisible(false)}
//         />
//       )}
//     </ScreenLayout>
//   );
// }

// function createStyle(theme) {
//   return StyleSheet.create({
//     mainContainer: { flex: 1 },
//     fullScreen: { flex: 1 },
//     splitView: { flex: 1, flexDirection: "row" },
//     master: {
//       width: 330,
//     },
//     detail: { flex: 1, backgroundColor: theme.backgroundChatContentGradient },
//     chatListWrapper: { flex: 1, position: "relative" },
//     centered: { flex: 1, justifyContent: "center", alignItems: "center" },
//   });
// }
