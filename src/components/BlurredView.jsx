import React from "react";
import { BlurView } from "expo-blur";

const BlurredView = ({ children, style, intensity = 75, tint }) => {
  return (
    <BlurView
      style={style}
      intensity={intensity}
      experimentalBlurMethod="dimezisBlurView"
      tint={tint}
    >
      {children}
    </BlurView>
  );
};

// const styles = StyleSheet.create({
//   container: {
//     padding: 10,
//     height: 60,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between'
//   },
// });

export default BlurredView;
