import React, { useState, useContext, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Platform,
} from "react-native";
import BlurredView from "@/src/components/BlurredView";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";


const ComponenteA = () => (
  <Text style={{ color: "white", fontWeight: "bold" }}>IO SONO A</Text>
);
const ComponenteB = () => (
  <Text style={{ color: "white", fontWeight: "bold" }}>IO SONO B</Text>
);
const ComponenteC = () => (
  <Text style={{ color: "white", fontWeight: "bold" }}>IO SONO C</Text>
);

const AudioHeaderContainer = ({ isSmallScreen }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSmallScreen);

  const [listWidth, setListWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef(null);

  const data = [
    { id: "A", component: <ComponenteA /> },
    { id: "B", component: <ComponenteB /> },
    { id: "C", component: <ComponenteC /> },
  ];

  const isWeb = Platform.OS === "web";

  const handleScrollEnd = (event) => {
    if (listWidth === 0) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / listWidth);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  const scrollToIndex = (direction) => {
    let newIndex = activeIndex;

    if (direction === "prev" && activeIndex > 0) {
      newIndex -= 1;
    } else if (direction === "next" && activeIndex < data.length - 1) {
      newIndex += 1;
    } else {
      return;
    }

    flatListRef.current?.scrollToIndex({
      animated: true,
      index: newIndex,
    });

    setActiveIndex(newIndex);
  };

  return (
    <BlurredView style={styles.container}>
      <View style={styles.innerContainer}>
        {isWeb && data.length > 1 && activeIndex > 0 && (
          <HoverAndPressedButton
            style={styles.arrowButton}
            onPress={() => scrollToIndex("prev")}
          >
            <Icon name={"ArrowLeft02Icon"}/>
          </HoverAndPressedButton>
        )}

        {isWeb && data.length > 1 && activeIndex === 0 && <View style={styles.arrowPlaceholder} />}

        <FlatList
          ref={flatListRef}
          data={data}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.flatList}
          contentContainerStyle={{ alignItems: "center" }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                width: listWidth || "100%",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {item.component}
            </View>
          )}
        />

        {isWeb && data.length > 1 && activeIndex === data.length - 1 && <View style={styles.arrowPlaceholder} />}

        {isWeb && data.length > 1 && activeIndex < data.length - 1 && (
          <HoverAndPressedButton
            style={styles.arrowButton}
            onPress={() => scrollToIndex("next")}
          >
            <Icon name={"ArrowRight02Icon"}/>
          </HoverAndPressedButton>
        )}
      </View>

      {/* Dots */}
      {data.length > 1 && (
        <View style={styles.dotsContainer}>
          {data.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: activeIndex === index ? 1 : 0.3,
                  backgroundColor: theme.text,
                },
              ]}
            />
          ))}
        </View>
      )}
    </BlurredView>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      height: 50,
      marginTop: 29,
      width: "100%",
      alignSelf: "center",
      maxWidth: isSmallScreen ? "100%" : "50%",
      borderRadius: 100,
      overflow: "hidden",
      paddingVertical: 5,
    },
    innerContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    flatList: {
      flex: 1,
    },
    arrowButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 5,
    },
    arrowPlaceholder: {
      width: 40,
      marginHorizontal: 5,
    },
    dotsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      position: "absolute",
      bottom: 8,
      left: 0,
      right: 0,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginHorizontal: 4,
    },
  });
}

export default React.memo(AudioHeaderContainer);