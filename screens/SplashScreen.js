// SplashScreen.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image, Dimensions } from 'react-native';
import LogoImage from '../assets/Logo.png';

const { width, height } = Dimensions.get('window');

const PARTICLE_COUNT = 25;

const SplashScreen = ({ onAnimationComplete }) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation animation (infinite)
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation (infinite)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particles slow horizontal movement loop
    Animated.loop(
      Animated.timing(particlesAnim, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Sequence fade in + progress + text animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: 3500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
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

  // Particles horizontal translation from -10 to +10 px
  const particlesTranslateX = particlesAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  // Text fade + translateY up effect
  const textOpacity = textAnim;
  const textTranslateY = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  // Generate particles with random positions and sizes
  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const size = Math.random() * 6 + 3;
    const top = Math.random() * height;
    const left = Math.random() * width;
    const opacity = Math.random() * 0.5 + 0.2;
    return { size, top, left, opacity, key: `particle-${i}` };
  });

  return (
    <View style={styles.container}>
      {/* Animated background particles */}
      <Animated.View
        style={[
          styles.particlesContainer,
          { transform: [{ translateX: particlesTranslateX }] },
        ]}
        pointerEvents="none"
      >
        {particles.map(({ size, top, left, opacity, key }) => (
          <View
            key={key}
            style={[
              styles.particle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                top,
                left,
                opacity,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Logo with rotation + pulse */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ rotate: spin }, { scale: pulseValue }],
          },
        ]}
      >
        <Image source={LogoImage} style={styles.logo} />
      </Animated.View>

      {/* Title and subtitle with fade + translateY */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>SHINIME</Text>
        <Text style={styles.subtitle}>DÉCOUVRIR ET REGARDER</Text>
      </Animated.View>

      {/* Progress bar with gradient */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressInterpolate,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressGradient,
              {
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      </View>

      {/* Loading text */}
      <Animated.Text
        style={[
          styles.loadingText,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        Chargement des animes...
      </Animated.Text>

      {/* Signature */}
      <Animated.Text
        style={[
          styles.signature,
          {
            opacity: fadeAnim,
          },
        ]}
      >
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
    overflow: 'hidden',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#f47521',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    shadowColor: '#f47521',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 5,
    textShadowColor: 'rgba(244, 117, 33, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    letterSpacing: 3,
    fontWeight: '600',
  },
  progressContainer: {
    width: '65%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f47521',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.4,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    marginBottom: 20,
    fontWeight: '600',
  },
  signature: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '400',
  },
});

export default SplashScreen;