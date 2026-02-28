import { createStackNavigator } from "@react-navigation/stack";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { detailNavigationRef } from "@/src/utils/navigation/ref";

import { useThemeContext } from "@/context/ThemeContext";
import { useDetailStackContext } from "@/context/DetailStackContext";

import EmptyDetail from "@/src/pages/EmptyDetail";
import ChatContainer from "@/src/components/chat/container";

import Account from "@/src/pages/settings/account";
import AccountModify from "@/src/pages/settings/account/modify-profile";

import Customization from "@/src/pages/settings/customization";
import CustomizationThemes from "@/src/pages/settings/customization/theme";

import PrivacyAndSecurity from "@/src/pages/settings/privacy-and-security";
import PrivacyAndSecurityChangePassword from "@/src/pages/settings/privacy-and-security/change-password";
import PrivacyAndSecurityTwoFAMethods from "@/src/pages/settings/privacy-and-security/twofa-methods";

import Storage from "@/src/pages/settings/storage";
import StorageLocalStorage from "@/src/pages/settings/storage/local-storage";
import StorageCloudStorage from "@/src/pages/settings/storage/cloud-storage";

import Comms from "@/src/pages/settings/comms";

import Info from "@/src/pages/settings/info";

import Qrscanner from "@/src/pages/settings/qr-scanner";

import Shortcuts from "@/src/pages/settings/shortcuts";

const Stack = createStackNavigator();

export default function DetailStack() {
  // Needed to trigger re-render of DetailStack when detail navigator changes to update the header and other options based on the current screen
  const { saveState } = useDetailStackContext();

  const { theme } = useThemeContext();

  return (
    <NavigationIndependentTree>
      <NavigationContainer
        ref={detailNavigationRef}
        onStateChange={saveState}
        documentTitle={{
          formatter: (options, route) => `Novyse - App`,
        }}
      >
        <Stack.Navigator
          screenOptions={{
            cardStyle: { backgroundColor: theme.backgroundMainGradient[1] },
          }}
        >
          <Stack.Screen
            name="Empty"
            component={EmptyDetail}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="chat"
            component={ChatContainer}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="account"
            component={Account}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="account/modify-profile"
            component={AccountModify}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="customization"
            component={Customization}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="customization/themes"
            component={CustomizationThemes}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="privacy-and-security"
            component={PrivacyAndSecurity}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="privacy-and-security/change-password"
            component={PrivacyAndSecurityChangePassword}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="privacy-and-security/twofa-methods"
            component={PrivacyAndSecurityTwoFAMethods}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="storage"
            component={Storage}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="storage/local-storage"
            component={StorageLocalStorage}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="storage/cloud-storage"
            component={StorageCloudStorage}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="comms"
            component={Comms}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="info"
            component={Info}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="qrscanner"
            component={Qrscanner}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="shortcuts"
            component={Shortcuts}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
