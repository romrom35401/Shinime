// SplashScreen.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import LogoImage from '../assets/Logo.png'; // Assurez-vous que le chemin est correct



const SplashScreen = ({ onAnimationComplete }) => {
  const [progress] = useState(new Animated.Value(0));
  const spinValue = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  // Animation de rotation du logo
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animation d'apparition
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 2500,
        easing: Easing.quad,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setTimeout(onAnimationComplete, 500);
    });
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Fond animé */}
      <View style={styles.background}>
        {[...Array(20)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              { 
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
                transform: [{ scale: Math.random() * 0.8 + 0.2 }]
              }
            ]} 
          />
        ))}
      </View>

      {/* Logo animé */}
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Animated.Image 
          source={LogoImage} 
          style={{ width: 100, height: 100, resizeMode: 'contain', transform: [{ rotate: spin }] }} 
        />
      </Animated.View>


      {/* Nom de l'app */}
      <Animated.View style={[styles.titleContainer, { opacity: fadeAnim }]}>
        <Text style={styles.title}>SHINIME</Text>
        <Text style={styles.subtitle}>DECOUVRER ET REGARDER</Text>
      </Animated.View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar, 
            { 
              width: progressInterpolate,
              backgroundColor: '#f47521'
            }
          ]} 
        />
      </View>

      {/* Message de chargement animé */}
      <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
        Chargement des animes...
      </Animated.Text>

      {/* Signature */}
      <Animated.Text style={[styles.signature, { opacity: fadeAnim }]}>
        © 2025 Shinime App Team
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f47521',
  },
  logoContainer: {
    marginBottom: 30,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    letterSpacing: 2,
  },
  progressContainer: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 20,
  },
  signature: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});

export default SplashScreen;
