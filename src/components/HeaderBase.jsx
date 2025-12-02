import React from 'react';
import { View, StyleSheet } from 'react-native';
import BlurredView from './BlurredView';

const HeaderBase = ({ children, style }) => {
  return (
    <BlurredView style={[styles.container, style]}>
      {children}
    </BlurredView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: "absolute",
    zIndex: 999
  },
});

export default HeaderBase;