import React, { useState, useContext, useRef } from "react";
import { View, StyleSheet, Text, FlatList } from "react-native";
import BlurredView from "@/src/components/BlurredView";
import { ThemeContext } from "@/context/ThemeContext";

// 1. Due componenti semplici per testare
const ComponenteA = () => <Text style={{color: 'white', fontWeight: 'bold'}}>IO SONO A</Text>;
const ComponenteB = () => <Text style={{color: 'white', fontWeight: 'bold'}}>IO SONO B</Text>;

const AudioHeaderContainer = ({ isSmallScreen }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSmallScreen);

  const [listWidth, setListWidth] = useState(0);        // Stato per sapere la larghezza esatta disponibile
  const [activeIndex, setActiveIndex] = useState(0);    // Stato per i pallini

  const data = [
    { id: 'A', component: <ComponenteA /> },
    { id: 'B', component: <ComponenteB /> },
  ];

  // Logica per aggiornare i pallini quando cambi pagina
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <BlurredView style={styles.container}>
      <FlatList
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Quando la lista viene disegnata, salviamo la sua larghezza esatta
        onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ alignItems: 'center' }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // Il contenitore del singolo elemento DEVE avere la larghezza della lista
          <View style={{ 
            width: listWidth, // Larghezza dinamica calcolata
            justifyContent: 'center', 
            alignItems: 'center', 
          }}>
            {item.component}
          </View>
        )}
      />

      {/* Pallini */}
      <View style={styles.dotsContainer}>
        {data.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { opacity: activeIndex === index ? 1 : 0.3, backgroundColor: theme.text }
            ]}
          />
        ))}
      </View>
    </BlurredView>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      height: 50, 
      marginTop: 9,
      width: "100%",
      alignSelf: "center",
      maxWidth: isSmallScreen ? "100%" : "50%",
      borderRadius: 10,
      overflow: 'hidden',
      paddingVertical: 5,
      borderRadius: 100,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      position: 'absolute',
      bottom: 5,
      width: '100%',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginHorizontal: 4,
    }
  });
}

export default React.memo(AudioHeaderContainer);