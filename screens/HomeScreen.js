// HomeScreen.js - Interface Crunchyroll ultra-moderne avec système de résolution anime de base

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Platform,
  ActivityIndicator,
  FlatList,
  Animated,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import LogoImage from '../assets/LogoB.png';
import colorsTheme from "../theme/colors";
import {
  fetchTrendingGrouped,
  fetchTopRatedGrouped,
  fetchCurrentSeasonGrouped,
  fetchMustWatch,
  fetchAnimes,
} from "../api/api";

// AJOUT: Import du système de résolution
import { useAnimeResolver } from "../api/animeResolver";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const POSTER_RATIO = 2 / 3;

const colors = {
  background: colorsTheme?.background || "#0B0B0B",
  text: colorsTheme?.text || "#FFFFFF",
  textMuted: colorsTheme?.textLight || "#B3B3B3",
  card: colorsTheme?.card || "#1A1A1A",
  accent: colorsTheme?.accent || "#FF6B1A",
  secondary: "#F47521",
  border: colorsTheme?.border || "#2A2A2A",
  surface: "#141414",
  premium: "#FFD700",
  success: "#4CAF50",
  legendary: "#9C27B0",
  epic: "#FF5722",
  rare: "#2196F3",
};

/* =========== HELPERS COULEUR AVANCÉS =========== */
function normalizeHex(hex) {
  if (!hex) return null;
  let h = String(hex).trim();
  if (h.startsWith("#")) {
    if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return h.length === 7 ? h.toUpperCase() : null;
  }
  const m = h.match(/(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})/);
  if (m) {
    const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
    return rgbToHex(r, g, b);
  }
  return null;
}

function rgbToHex(r, g, b) {
  const toHex = (n) => ("0" + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex) {
  const h = normalizeHex(hex) || "#000000";
  const bigint = parseInt(h.slice(1), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darkenHex(hex, percent = 30) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}
// Force English title helper (priority: title_en, title_english, title_romaji, title, "Untitled")
function getEnglishTitle(anime) {
  return anime?.title_en || anime?.title_english || anime?.title_romaji || anime?.title || "Untitled";
}

/* =========== SIMPLIFIED HERO BUILDER =========== */
const buildFeatured = (pool = [], n = 5) => {
  if (!Array.isArray(pool) || !pool.length) return [];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const pick = shuffled.slice(0, n).map((a) => ({
    id: a.id,
    // force english title
    title: getEnglishTitle(a),
    desc: String(a.description || "").replace(/<\/?[^>]+(>|$)/g, "").slice(0, 150) + "...",
    poster: a.posterImage || a.coverImage || a.image,
    banner: a.bannerImage || a.posterImage || a.coverImage || a.image,
    color: a.coverColor || null,
    raw: a,
  }));
  return pick;
};


/* =========== COMPOSANT DE PARTICULES ANIMÉES =========== */
const ParticleSystem = memo(() => {
  const particles = useRef([]);
  
  useEffect(() => {
    particles.current = [...Array(30)].map((_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.3 + 0.1,
      color: [colors.accent, colors.secondary, colors.premium, colors.rare][Math.floor(Math.random() * 4)],
    }));
  }, []);

  return (
    <View style={styles.particleContainer}>
      {particles.current.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color + '40',
            },
          ]}
        />
      ))}
    </View>
  );
});

/* =========== COMPOSANT CARTE ANIME AMÉLIORÉ =========== */
const AnimeCard = memo(function AnimeCard({ item, onPress, cardWidth, index }) {
  const [loading, setLoading] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  const uri = item.posterImage || item.poster || item.coverImage || item.image;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(item.raw || item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        activeOpacity={0.9}
      >
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri }}
            style={styles.cardImage}
            onLoad={() => setLoading(false)}
          />
          {loading && (
            <View style={styles.cardPlaceholder}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          />
          
          {item.premium && (
            <View style={[styles.cardBadge, { backgroundColor: colors.premium }]}>
              <MaterialIcons name="diamond" size={12} color="#000" />
            </View>
          )}
          
          <View style={styles.playIconContainer}>
            <MaterialCommunityIcons name="play" size={24} color={colors.text} />
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {getEnglishTitle(item.raw || item)}
          </Text>

          
          <View style={styles.cardMeta}>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={12} color={colors.premium} />
              <Text style={styles.ratingText}>
                {item.averageScore ? (item.averageScore / 10).toFixed(1) : '8.5'}
              </Text>
            </View>
            <Text style={styles.genreText}>
              {Array.isArray(item.genres) ? item.genres[0] : 'Animation'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* =========== SECTION ROW AMÉLIORÉE =========== */
function SectionRow({ title, data = [], navigation, icon, color = colors.accent }) {
  // MODIFICATION: Utilisation du hook de résolution
  const { navigateToAnimeDetails } = useAnimeResolver(navigation);

  if (!data?.length) return null;

  const cardWidth = Math.round(SCREEN_WIDTH * 0.32);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const renderItem = ({ item, index }) => (
    <AnimeCard
      item={item}
      onPress={navigateToAnimeDetails} // MODIFICATION: Utilisation de la fonction de résolution
      cardWidth={cardWidth}
      index={index}
    />
  );

  return (
    <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          {icon && (
            <MaterialCommunityIcons 
              name={icon} 
              size={24} 
              color={color} 
              style={styles.sectionIcon} 
            />
          )}
          <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        </View>
        
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Tout voir</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionList}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </Animated.View>
  );
}

/* =========== COMPOSANT PRINCIPAL =========== */
export default function HomeScreen({ navigation }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [currentSeason, setCurrentSeason] = useState([]);
  const [mustWatch, setMustWatch] = useState([]);
  
  // AJOUT: Hook de résolution pour le hero
  const { navigateToAnimeDetails } = useAnimeResolver(navigation);
  
  // Animations du hero
  const heroRef = useRef(null);
  const idxRef = useRef(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const autoRef = useRef(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100, 200],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 1.1],
    extrapolate: 'clamp',
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Chargement des données
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [resTrending, resTop, resSeason, resMust] = await Promise.allSettled([
          fetchTrendingGrouped(30),
          fetchTopRatedGrouped(30), 
          fetchCurrentSeasonGrouped(30),
          fetchMustWatch(30),
        ]);

        const safeVal = (r) => (r?.status === "fulfilled" && Array.isArray(r.value)) ? r.value : [];

        let cleanTrend = safeVal(resTrending);
        let cleanTop = safeVal(resTop);
        let cleanSeason = safeVal(resSeason);
        let cleanMust = safeVal(resMust);

        if (!cleanTrend.length && !cleanTop.length && !cleanSeason.length && !cleanMust.length) {
          try {
            const backup = await fetchAnimes(40);
            cleanTrend = backup.slice(0, 10);
            cleanTop = backup.slice(10, 20);
            cleanSeason = backup.slice(20, 30);
            cleanMust = backup.slice(30, 40);
          } catch (e) {
            console.warn("fallback fetchAnimes failed:", e);
          }
        }

        let poolForHero = [...cleanSeason, ...cleanTrend];
        if (poolForHero.length < 5) poolForHero = [...poolForHero, ...cleanTop, ...cleanMust];
        let gems = buildFeatured(poolForHero, 6);

        if (gems.length < 2) {
          try {
            console.log("Using simple fallback for hero section");
            const simpleHero = poolForHero.slice(0, 6).map(item => ({
              id: item.id,
              title: getEnglishTitle(item),
              desc: "Découvrez cet anime populaire et ses aventures captivantes.",
              poster: item.posterImage || item.coverImage || item.image,
              banner: item.bannerImage || item.posterImage || item.coverImage || item.image,
              color: item.coverColor || colors.accent,
              raw: item,
            }));
            gems = simpleHero;
          } catch (e) {
            console.warn("Hero fallback failed:", e);
          }
        }

        if (mounted) {
          setFeatured(buildFeatured(poolForHero, 6));
          setTrending(cleanTrend);
          setTopRated(cleanTop);
          setCurrentSeason(cleanSeason);
          setMustWatch(cleanMust);
          setLoading(false);
          
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
      } catch (e) {
        console.error("loadData error:", e);
        if (mounted) setLoading(false);
      }
    };
    
    loadData();
    
    return () => { mounted = false; };
  }, []);

  // Auto-rotation hero
  useEffect(() => {
    if (featured.length > 1 && !loading) {
      autoRef.current = setInterval(() => {
        const newIdx = (heroIdx + 1) % featured.length;
        idxRef.current = newIdx;
        setHeroIdx(newIdx);
        
        heroRef.current?.scrollToOffset({
          offset: newIdx * SCREEN_WIDTH,
          animated: true,
        });
      }, 8000);
    }
    return () => clearInterval(autoRef.current);
  }, [featured, loading, heroIdx]);

  const onHeroScroll = ({ nativeEvent }) => {
    const newIdx = Math.round(nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIdx !== heroIdx) {
      setHeroIdx(newIdx);
      idxRef.current = newIdx;
    }
  };

  // Rendu header animé
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        { opacity: headerOpacity }
      ]}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.headerGradient}
      />
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.accent, colors.secondary]}
            style={styles.logoBg}
          >
            <Image source={LogoImage} style={styles.logo} />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Shinime</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
          >
            <MaterialIcons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
          >
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  // Rendu du hero section
  const renderHeroSection = () => (
    <Animated.View
      style={[
        styles.heroContainer,
        {
          transform: [
            { scale: heroScale },
            { translateY: heroTranslateY }
          ]
        }
      ]}
    >
      {featured.length > 0 && (
        <FlatList
          ref={heroRef}
          data={featured}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => {
            const rawColor = item.color || item.raw?.coverColor || null;
            const hex = normalizeHex(rawColor) || colors.accent;
            const gradientColors = [
              'transparent',
              hexToRgba(hex, 0.3),
              hexToRgba(darkenHex(hex, 40), 0.9),
              colors.background
            ];

            return (
              <TouchableOpacity
                style={styles.heroItem}
                onPress={() => navigateToAnimeDetails(item.raw || item)} // MODIFICATION: Utilisation de la fonction de résolution
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: item.banner || item.poster }}
                  style={styles.heroBg}
                  resizeMode="cover"
                >
                  <BlurView intensity={50} tint="dark" style={styles.posterBlur} />
                  <ParticleSystem />
                  
                  <LinearGradient
                    colors={gradientColors}
                    style={styles.heroGradient}
                    locations={[0, 0.3, 0.7, 1]}
                  />
                  
                  <View style={styles.heroContent}>
                    <View style={styles.trendingBadge}>
                      <MaterialCommunityIcons name="trending-up" size={16} color={colors.background} />
                      <Text style={styles.trendingText}>TENDANCE #{index + 1}</Text>
                    </View>
                    
                    <View style={styles.heroPosterContainer}>
                      <Image
                        source={{ uri: item.poster }}
                        style={styles.heroPoster}
                      />
                      <LinearGradient
                         colors={[colors.accent + '40', colors.secondary + '60']}
                        style={styles.posterBorder}
                      />
                    </View>
 
                    <View style={styles.heroInfo}>
                      <View style={styles.heroMeta}>
                        <Text style={styles.heroMetaText}>16+ • Animation • HD</Text>
                      </View>
                      
                      <Text style={styles.heroTitle} numberOfLines={2}>
                        {getEnglishTitle(item.raw || item)}
                      </Text>
                      
                      <Text style={styles.heroDesc} numberOfLines={3}>
                        {item.desc}
                      </Text>
                      
                      <View style={styles.heroActions}>
                        <TouchableOpacity
                          style={styles.playButton}
                          onPress={() => navigateToAnimeDetails(item.raw || item)} // MODIFICATION: Utilisation de la fonction de résolution
                        >
                          <MaterialCommunityIcons name="play" size={20} color={colors.background} />
                          <Text style={styles.playButtonText}>REGARDER S1 E1</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.infoButton}>
                          <MaterialCommunityIcons name="information-outline" size={20} color={colors.text} />
                          <Text style={styles.infoButtonText}>INFOS</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            );
          }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onHeroScroll}
          scrollEventThrottle={16}
        />
      )}
      
      <View style={styles.heroIndicators}>
        {featured.map((_, i) => (
          <View
            key={i}
            style={[
              styles.indicator,
              i === heroIdx && styles.activeIndicator
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );

  // Rendu du contenu principal
  const renderContent = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>1.3K+</Text>
          <Text style={styles.statLabel}>Animes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>43K+</Text>
          <Text style={styles.statLabel}>Épisodes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>24/7</Text>
          <Text style={styles.statLabel}>Streaming</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>HD</Text>
          <Text style={styles.statLabel}>Qualité</Text>
        </View>
      </View>

      <SectionRow
        title="En ce moment"
        data={trending}
        navigation={navigation}
        icon="fire"
        color={colors.epic}
      />
      
      <SectionRow
        title="Saison actuelle"
        data={currentSeason}
        navigation={navigation}
        icon="calendar-clock"
        color={colors.success}
      />
      
      <SectionRow
        title="Mieux notés"
        data={topRated}
        navigation={navigation}
        icon="star"
        color={colors.premium}
      />
      
      <SectionRow
        title="Incontournables"
        data={mustWatch}
        navigation={navigation}
        icon="crown"
        color={colors.legendary}
      />

      <View style={styles.ctaContainer}>
        <LinearGradient
          colors={[colors.accent, colors.secondary]}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaTitle}>Découvrez encore plus</Text>
          <Text style={styles.ctaSubtitle}>
            Explorez notre bibliothèque complète d'animes
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Browse' })}
          >
            <Text style={styles.ctaButtonText}>PARCOURIR TOUT</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.simpleLoadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const allEmpty = !featured.length && !trending.length && !topRated.length && !currentSeason.length && !mustWatch.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {renderHeroSection()}
        {renderContent()}
        
        {allEmpty && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="wifi-off" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun contenu disponible</Text>
            <Text style={styles.emptySubtitle}>
              Vérifiez votre connexion internet ou réessayez plus tard
            </Text>
          </View>
        )}
      </ScrollView>
      
      {renderHeader()}
    </View>
  );
}

/* =========== STYLES ULTRA-AVANCÉS =========== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  // Particules
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.6,
  },
  
  // Header
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 100,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 30,
    paddingBottom: 10,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 20,
    height: 20,
    tintColor: colors.background,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Hero Section  
  heroContainer: {
    height: SCREEN_HEIGHT * 0.75,
    position: 'relative',
  },
  heroItem: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  heroBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    padding: 20,
    paddingBottom: 60,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  trendingText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  heroPosterContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  heroPoster: {
    width: SCREEN_WIDTH * 0.4,
    height: (SCREEN_WIDTH * 0.4) / POSTER_RATIO,
    borderRadius: 12,
  },
  posterBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    zIndex: -1,
  },
  heroInfo: {
    alignItems: 'center',
  },
  heroMeta: {
    marginBottom: 8,
  },
  heroMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  playButton: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 5,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  infoButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  heroIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeIndicator: {
    backgroundColor: colors.accent,
    width: 20,
  },
  
  // Contenu
  contentContainer: {
    paddingTop: 20,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  
  // Sections
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionList: {
    paddingHorizontal: 20,
  },
  
  // Cartes
  cardContainer: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  cardPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  playIconContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  genreText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  
  // CTA
  ctaContainer: {
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: 32,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: colors.background + 'CC',
    marginBottom: 24,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  posterBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  simpleLoadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});