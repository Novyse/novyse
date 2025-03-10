import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { PanGestureHandler } from "react-native-gesture-handler";

const VocalContent = () => {
  const [drawerWidth, setdrawerWidth] = useState(200);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, { dx }) => {
      const newDrawerWidth = drawerWidth + dx;
      setdrawerWidth(newDrawerWidth);
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.drawer, { width: drawerWidth }]}>
        <Text>Content of the resizable drawer</Text>
      </View>
      <PanGestureHandler>
        <Animated.View
          style={[styles.drawerHandle]}
          {...panResponder.panHandlers}
        ></Animated.View>
      </PanGestureHandler>
      <View style={styles.screen}>
        <Text>Content of Screen</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  drawer: {
    backgroundColor: "#F2F2F2",
    borderRightWidth: 1,
    borderRightColor: "#CCCCCC",
    zIndex: 1,
  },
  drawerHandle: {
    height: 50,
    width: 10,
    marginTop: 100,
    marginLeft: -5,
    backgroundColor: "#000",
    borderRightWidth: 1,
    borderRightColor: "#000",
    zIndex: 2,
    cursor: "col-resize",
  },
  screen: {
    flex: 1,
  },
});

export default VocalContent;
