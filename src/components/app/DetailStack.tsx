import { createStackNavigator } from "@react-navigation/stack";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { detailNavigationRef } from "@/src/utils/navigation/ref";

import { useThemeContext } from "@/context/ThemeContext";
import { useDetailStackContext } from "@/context/DetailStackContext";

import EmptyDetail from "@/src/components/app/EmptyDetail";
import ChatContainer from "@/src/components/chat/container";

import Account from "@/src/components/settings/Account";
import AccountModify from "@/src/components/settings/Account/ModifyProfile";

import Customization from "@/src/components/settings/Customization";
import CustomizationThemes from "@/src/components/settings/Customization/Theme";

import PrivacyAndSecurity from "@/src/components/settings/PrivacyAndSecurity";
import PrivacyAndSecurityChangePassword from "@/src/components/settings/PrivacyAndSecurity/ChangePassword";
import PrivacyAndSecurityTwoFAMethods from "@/src/components/settings/PrivacyAndSecurity/TwoFAMethods";

import Storage from "@/src/components/settings/Storage";
import StorageLocalStorage from "@/src/components/settings/Storage/LocalStorage";
import StorageCloudStorage from "@/src/components/settings/Storage/CloudStorage";

import Comms from "@/src/components/settings/Comms";

import Info from "@/src/components/settings/Info";

import Qrscanner from "@/src/components/settings/QRScanner";

import Shortcuts from "@/src/components/settings/Shortcuts";

const Stack = createStackNavigator();

export default function DetailStack() {
  const { theme } = useThemeContext();

  // Needed to trigger re-render of DetailStack when detail navigator changes to update the header and other options based on the current screen
  const { saveState } = useDetailStackContext();

  return (
    <NavigationIndependentTree>
      <NavigationContainer
        ref={detailNavigationRef}
        onStateChange={saveState}
        documentTitle={{
          formatter: (options, route) => `App - Novyse`,
        }}
      >
        <Stack.Navigator
          screenOptions={{
            cardStyle: { backgroundColor: theme.backgroundMainGradient[0] },
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
