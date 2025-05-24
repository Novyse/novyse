import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { extractDominantColors, getFirstLetter } from '../utils/colorUtils';

const UserProfileAvatar = ({ 
  userHandle, 
  profileImageUri = null, 
  containerWidth, 
  containerHeight 
}) => {
  const [gradientColors, setGradientColors] = useState(['#667eea', '#764ba2']);
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  // Estrai colori dall'immagine del profilo
  useEffect(() => {
    const loadColors = async () => {
      setIsLoading(true);
      
      try {
        if (profileImageUri) {
          const colors = await extractDominantColors(profileImageUri, userHandle);
          setGradientColors(colors);
          setShowFallback(false);
        } else {
          const colors = await extractDominantColors(null, userHandle);
          setGradientColors(colors);
          setShowFallback(true);
        }
      } catch (error) {
        // Fallback con colori basati sul nome utente
        const colors = await extractDominantColors(null, userHandle);
        setGradientColors(colors);
        setShowFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadColors();
  }, [profileImageUri, userHandle]);

  // Calcola le dimensioni dell'avatar (circa 35% della dimensione del container)
  const avatarSize = Math.min(containerWidth, containerHeight) * 0.35;
  const fontSize = avatarSize * 0.4; // Dimensione del testo relativa all'avatar

  return (    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >        <View style={styles.contentContainer}>
          <View style={[styles.avatarContainer, { 
            width: avatarSize, 
            height: avatarSize,
            borderRadius: avatarSize / 2
          }]}>
            <View style={[styles.fallbackAvatar, { 
              width: avatarSize, 
              height: avatarSize,
              borderRadius: avatarSize / 2
            }]}>
              <Text style={[styles.fallbackText, { fontSize }]}>
                {getFirstLetter(userHandle)}
              </Text>
            </View>

            {profileImageUri && !showFallback && (
              <View style={styles.profileImageContainer}>
                <Image
                  source={{ uri: profileImageUri }}
                  style={[styles.profileImage, { 
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize
                  }]}
                  resizeMode="cover"
                  onError={() => {
                    setShowFallback(true);
                  }}
                />
              </View>
            )}
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {userHandle || 'Unknown User'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 10,
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  fallbackAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },    textShadowRadius: 2,
  },
  nameContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '70%', // Limita la larghezza massima al 70% del container
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default UserProfileAvatar;
