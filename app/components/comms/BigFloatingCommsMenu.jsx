import React from 'react';
import { StyleSheet, View } from 'react-native';
import VocalBottomBarButton from './VocalBottomBarButton';
import { 
  Mic02Icon,
  Video02Icon,
  ComputerScreenShareIcon,
} from "@hugeicons/core-free-icons";

const BigFloatingCommsMenu = ({ 
  onVoiceCall = () => {}, 
  onVideoCall = () => {}, 
  onScreenShare = () => {} 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.menuItems}>
        <VocalBottomBarButton 
          onPress={onVoiceCall}
          iconName={Mic02Icon}
          iconColor="#fff"
        />
        
        <VocalBottomBarButton 
          onPress={onVideoCall}
          iconName={Video02Icon}
          iconColor="#fff"
        />
        
        <VocalBottomBarButton 
          onPress={onScreenShare}
          iconName={ComputerScreenShareIcon}
          iconColor="#fff"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
    alignItems: 'center',
    width: "100%",
    bottom: 20,
    backgroundColor: "red"
  },
  menuItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});

export default BigFloatingCommsMenu;