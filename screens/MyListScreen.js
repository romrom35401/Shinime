// MyListScreen.js - Interface 3D Ultra-Moderne avec effets épiques
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
  Animated,
  Platform,
  StatusBar,
  ImageBackground,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  bg: '#0B0B0B',
  surface: '#141414',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  accent: '#FF6B1A',
  accent2: '#F47521',
  success: '#4CAF50',
  error: '#F44336',
  premium: '#FFD700',
  legendary: '#9C27B0',
  epic: '#FF5722',
  rare: '#2196F3',
  border: '#2A2A2A',
  glow: '#FF6B1A40',
};

// Système de particules 3D avancé
const ParticleField3D = memo(() => {
  const particles = useRef([]).current;
  const animationRef = useRef();

  useEffect(() => {
    // Créer des particules avec propriétés 3D
    for (let i = 0; i < 60; i++) {
      particles.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        z: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 1 + 0.3,
        opacity: Math.random() * 0.8 + 0.2,
        color: [COLORS.accent, COLORS.premium, COLORS.legendary, COLORS.rare][Math.floor(Math.random() * 4)],
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      particles.forEach(particle => {
        // Mouvement en spirale
        particle.y += particle.speed;
        particle.x += Math.sin(particle.angle + Date.now() * 0.001) * 0.5;
        particle.angle += particle.rotationSpeed;
        
        // Effet de pulsation
        const pulse = Math.sin(Date.now() * 0.003 + particle.pulsePhase) * 0.3 + 0.7;
        particle.currentOpacity = particle.opacity * pulse;
        
        // Reset position
        if (particle.y > SCREEN_HEIGHT + 50) {
          particle.y = -50;
          particle.x = Math.random() * SCREEN_WIDTH;
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.particleField} pointerEvents="none">
      {particles.map(particle => (
        <View
          key={particle.id}
          style={[
            styles.particle3D,
            {
              left: particle.x - particle.size/2,
              top: particle.y - particle.size/2,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.currentOpacity || particle.opacity,
              transform: [
                { scale: 1 + Math.sin(Date.now() * 0.005 + particle.id) * 0.2 },
                { rotate: `${particle.angle}rad` }
              ],
            }
          ]}
        />
      ))}
    </View>
  );
});

// Carte anime 3D ultra-avancée
const AnimeCard3D = memo(({ anime, onPress, onRemove, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Animation d'entrée avec délai basé sur l'index
    Animated.sequence([
      Animated.delay(index * 200),
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animation de lueur continue
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateY = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '8deg'],
  });

  const rotateX = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-3deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const poster = anime.posterImage || anime.image || anime.cover;
  const title = anime.title || anime.title_romaji || anime.title_en || 'Sans titre';

  return (
    <Animated.View
      style={[
        styles.card3DContainer,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
            { perspective: 1000 },
            { rotateY },
            { rotateX },
          ],
        },
      ]}
    >
      {/* Effet de lueur */}
      <Animated.View
        style={[
          styles.cardGlow3D,
          {
            opacity: glowOpacity,
          }
        ]}
      />

      <TouchableOpacity
        style={styles.card3D}
        onPress={() => onPress(anime)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Container d'image avec effets */}
        <View style={styles.imageContainer3D}>
          <Image
            source={{ uri: poster }}
            style={styles.cardImage3D}
            onLoad={() => setImageLoaded(true)}
            resizeMode="cover"
          />
          
          {!imageLoaded && (
            <View style={styles.imagePlaceholder3D}>
              <ActivityIndicator color={COLORS.accent} size="small" />
            </View>
          )}

          {/* Overlay gradient holographique */}
          <LinearGradient
            colors={[
              'transparent',
              COLORS.accent + '20',
              COLORS.legendary + '40',
              'rgba(0,0,0,0.9)'
            ]}
            locations={[0, 0.3, 0.7, 1]}
            style={styles.holographicOverlay}
          />

          {/* Badges flottants */}
          <View style={styles.floatingBadges}>
            <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
              <MaterialIcons name="check" size={12} color={COLORS.text} />
              <Text style={styles.badgeText}>DANS MA LISTE</Text>
            </View>
            
            {anime.episodes && (
              <View style={[styles.episodeBadge, { backgroundColor: COLORS.accent + 'CC' }]}>
                <Text style={styles.badgeText}>{anime.episodes} ép.</Text>
              </View>
            )}
          </View>

          {/* Icône de lecture avec effet néon */}
          <View style={styles.playIcon3D}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.accent2]}
              style={styles.playIconGradient}
            >
              <MaterialCommunityIcons name="play" size={28} color={COLORS.text} />
            </LinearGradient>
          </View>

          {/* Bouton de suppression */}
          <TouchableOpacity
            style={styles.removeButton3D}
            onPress={() => onRemove(anime)}
          >
            <LinearGradient
              colors={[COLORS.error, '#D32F2F']}
              style={styles.removeButtonGradient}
            >
              <MaterialIcons name="close" size={16} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Informations avec design futuriste */}
        <View style={styles.cardInfo3D}>
          <Text style={styles.cardTitle3D} numberOfLines={2}>
            {title}
          </Text>
          
          <View style={styles.cardMeta3D}>
            <View style={styles.ratingContainer3D}>
              <MaterialIcons name="star" size={14} color={COLORS.premium} />
              <Text style={styles.ratingText3D}>
                {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5'}
              </Text>
            </View>
            
            <Text style={styles.yearText3D}>
              {anime.year || anime.seasonYear || '2024'}
            </Text>
          </View>

          {/* Genres avec chips animées */}
          {anime.genres && anime.genres.length > 0 && (
            <View style={styles.genreContainer3D}>
              {anime.genres.slice(0, 2).map((genre, idx) => (
                <View key={idx} style={styles.genreChip3D}>
                  <LinearGradient
                    colors={[COLORS.accent + '40', COLORS.accent2 + '20']}
                    style={styles.genreChipGradient}
                  >
                    <Text style={styles.genreText3D}>{genre}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
          )}

          {/* Barre de progression futuriste */}
          <View style={styles.progressContainer3D}>
            <View style={styles.progressLabel}>
              <MaterialCommunityIcons name="television-play" size={12} color={COLORS.textMuted} />
              <Text style={styles.progressText}>Progression</Text>
            </View>
            <View style={styles.progressBar3D}>
              <LinearGradient
                colors={[COLORS.accent, COLORS.accent2, COLORS.premium]}
                style={[styles.progressFill3D, { width: `${Math.random() * 80 + 10}%` }]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Header avec effet de glass morphism
const GlassMorphHeader = memo(({ scrollY, myListCount, onSort, sortBy }) => {
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.8, 0.95],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1.05, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      style={[
        styles.glassMorphHeader,
        {
          opacity: headerOpacity,
          transform: [{ scale: headerScale }]
        }
      ]}
    >
      <BlurView intensity={100} tint="dark" style={styles.headerBlur}>
        <LinearGradient
          colors={[COLORS.bg + 'DD', COLORS.surface + 'AA']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[COLORS.legendary, COLORS.epic]}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="heart" size={24} color={COLORS.text} />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>Ma Liste</Text>
                <Text style={styles.headerSubtitle}>{myListCount} anime{myListCount > 1 ? 's' : ''}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.sortButton} onPress={onSort}>
              <LinearGradient
                colors={[COLORS.accent + '40', COLORS.accent2 + '20']}
                style={styles.sortButtonGradient}
              >
                <MaterialIcons name="sort" size={18} color={COLORS.accent} />
                <Text style={styles.sortButtonText}>{sortBy}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
});

// État vide épique
const EmptyState3D = memo(() => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation flottante
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -20,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de pulsation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation continue
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.emptyState3D}>
      <ParticleField3D />
      
      <Animated.View
        style={[
          styles.emptyIconContainer,
          {
            transform: [
              { translateY: floatAnim },
              { scale: pulseAnim },
              { rotate },
            ]
          }
        ]}
      >
        <LinearGradient
          colors={[COLORS.legendary, COLORS.epic, COLORS.accent]}
          style={styles.emptyIconGradient}
        >
          <MaterialCommunityIcons name="heart-outline" size={80} color={COLORS.text} />
        </LinearGradient>
      </Animated.View>

      <Text style={styles.emptyTitle}>Votre liste est vide</Text>
      <Text style={styles.emptySubtitle}>
        Découvrez de nouveaux animes et ajoutez-les à votre collection personnelle
      </Text>

      <LinearGradient
        colors={[COLORS.accent, COLORS.accent2]}
        style={styles.emptyButton}
      >
        <MaterialCommunityIcons name="compass-outline" size={20} color={COLORS.text} />
        <Text style={styles.emptyButtonText}>EXPLORER MAINTENANT</Text>
      </LinearGradient>
    </View>
  );
});

// Composant principal
export default function MyListScreen() {
  const navigation = useNavigation();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Récent');
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Charger la liste
  const loadMyList = useCallback(async () => {
    try {
      const storedList = await AsyncStorage.getItem('myAnimeList');
      const list = storedList ? JSON.parse(storedList) : [];
      setMyList(list);
    } catch (error) {
      console.error('Erreur lors du chargement de la liste:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Focus effect pour recharger quand on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      loadMyList();
    }, [loadMyList])
  );

  // Animations d'entrée
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Supprimer un anime
  const removeFromList = useCallback(async (animeToRemove) => {
    Alert.alert(
      'Supprimer de la liste',
      `Voulez-vous vraiment supprimer "${animeToRemove.title || 'cet anime'}" de votre liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = myList.filter(anime => anime.id !== animeToRemove.id);
              await AsyncStorage.setItem('myAnimeList', JSON.stringify(updatedList));
              setMyList(updatedList);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          }
        }
      ]
    );
  }, [myList]);

  // Trier la liste
  const sortList = useCallback(() => {
    const sortOptions = ['Récent', 'Alphabétique', 'Note', 'Année'];
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextSort = sortOptions[(currentIndex + 1) % sortOptions.length];
    
    let sortedList = [...myList];
    
    switch (nextSort) {
      case 'Alphabétique':
        sortedList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'Note':
        sortedList.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
        break;
      case 'Année':
        sortedList.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      default: // Récent
        // Garder l'ordre d'ajout original
        break;
    }
    
    setMyList(sortedList);
    setSortBy(nextSort);
  }, [myList, sortBy]);

  // Navigation vers les détails
  const navigateToDetails = useCallback((anime) => {
    navigation.navigate('AnimeDetails', { animeData: anime });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ParticleField3D />
        
        <LinearGradient
          colors={[COLORS.legendary, COLORS.epic]}
          style={styles.loadingIcon}
        >
          <MaterialCommunityIcons name="heart" size={40} color={COLORS.text} />
        </LinearGradient>
        
        <Text style={styles.loadingTitle}>Chargement de votre liste...</Text>
        
        <View style={styles.loadingBarContainer}>
          <LinearGradient
            colors={[COLORS.accent, COLORS.accent2]}
            style={styles.loadingBar}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      {/* Particules de fond */}
      <ParticleField3D />

      {/* Header flottant */}
      <GlassMorphHeader
        scrollY={scrollY}
        myListCount={myList.length}
        onSort={sortList}
        sortBy={sortBy}
      />

      {myList.length === 0 ? (
        <EmptyState3D />
      ) : (
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMyList();
            }}
          >
            {/* Hero section */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={[COLORS.legendary + '40', COLORS.epic + '20', 'transparent']}
                style={styles.heroGradient}
              >
                <Text style={styles.heroTitle}>VOTRE COLLECTION</Text>
                <Text style={styles.heroSubtitle}>
                  {myList.length} anime{myList.length > 1 ? 's' : ''} dans votre liste personnelle
                </Text>
              </LinearGradient>
            </View>

            {/* Stats rapides */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[COLORS.accent + '20', COLORS.accent2 + '10']}
                  style={styles.statGradient}
                >
                  <MaterialCommunityIcons name="television-play" size={24} color={COLORS.accent} />
                  <Text style={styles.statNumber}>{myList.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[COLORS.success + '20', COLORS.success + '10']}
                  style={styles.statGradient}
                >
                  <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
                  <Text style={styles.statNumber}>{Math.floor(myList.length * 0.7)}</Text>
                  <Text style={styles.statLabel}>Vus</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[COLORS.premium + '20', COLORS.premium + '10']}
                  style={styles.statGradient}
                >
                  <MaterialCommunityIcons name="star" size={24} color={COLORS.premium} />
                  <Text style={styles.statNumber}>8.5</Text>
                  <Text style={styles.statLabel}>Moyenne</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Grille d'animes */}
            <View style={styles.gridContainer}>
              {myList.map((anime, index) => (
                <AnimeCard3D
                  key={`${anime.id}-${index}`}
                  anime={anime}
                  onPress={navigateToDetails}
                  onRemove={removeFromList}
                  index={index}
                />
              ))}
            </View>

            {/* Espacement final */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  
  // Particules
  particleField: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  particle3D: {
    position: 'absolute',
    borderRadius: 50,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },

  // Header glass morph
  glassMorphHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sortButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sortButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Contenu principal
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
  },

  // Hero section
  heroSection: {
    marginBottom: 30,
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 30,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: COLORS.legendary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Stats container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // Grille d'animes
  gridContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  // Cartes 3D
  card3DContainer: {
    width: (SCREEN_WIDTH - 56) / 2,
    marginBottom: 20,
  },
  cardGlow3D: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    zIndex: -1,
  },
  card3D: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageContainer3D: {
    position: 'relative',
    height: 200,
  },
  cardImage3D: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder3D: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holographicOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  episodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  playIcon3D: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  playIconGradient: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton3D: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 15,
    overflow: 'hidden',
  },
  removeButtonGradient: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo3D: {
    padding: 16,
    gap: 8,
  },
  cardTitle3D: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },
  cardMeta3D: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer3D: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText3D: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.premium,
  },
  yearText3D: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  genreContainer3D: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  genreChip3D: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  genreChipGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  genreText3D: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '600',
  },
  progressContainer3D: {
    gap: 6,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressBar3D: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill3D: {
    height: '100%',
    borderRadius: 2,
  },

  // État vide 3D
  emptyState3D: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: Platform.OS === 'ios' ? 200 : 150,
  },
  emptyIconContainer: {
    marginBottom: 40,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: COLORS.legendary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    elevation: 10,
    shadowColor: COLORS.legendary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '70%',
    height: '100%',
    borderRadius: 2,
  },
});