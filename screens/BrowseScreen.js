import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
  SafeAreaView,
  ImageBackground,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  fetchTrendingGrouped,
  fetchTopRatedGrouped,
  fetchCurrentSeasonGrouped,
  fetchMustWatch,
  fetchAnimes,
} from "../api/api";


const COLORS = {
  bg: "#0B0B0B",
  surface: "#141414",
  card: "#1A1A1A",
  dim: "#cfcfcf",
  text: "#ffffff",
  textSecondary: "#B3B3B3",
  textMuted: "#808080",
  accent: "#FF6B1A",
  accent2: "#F47521",
  chip: "#262626",
  border: "#2b2b2b",
  success: "#4CAF50",
  premium: "#FFD700",
  legendary: "#9C27B0",
  epic: "#FF5722",
  rare: "#2196F3",
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Système de particules animées
const ParticleField = React.memo(() => {
  const particles = useRef([]).current;
  const animationRef = useRef();

  useEffect(() => {
    // Initialiser les particules
    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color: [COLORS.accent, COLORS.accent2, COLORS.premium, COLORS.rare][Math.floor(Math.random() * 4)],
        angle: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      particles.forEach(particle => {
        particle.y += particle.speed;
        particle.x += Math.sin(particle.angle) * 0.5;
        
        if (particle.y > SCREEN_HEIGHT) {
          particle.y = -10;
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
            styles.particle,
            {
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color + '40',
              opacity: particle.opacity,
            }
          ]}
        />
      ))}
    </View>
  );
});

// Carte anime ultra-moderne avec animations 3D
function EnhancedAnimeCard({ anime, onPress, index, cardWidth }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Animation d'entrée avec délai basé sur l'index
    Animated.sequence([
      Animated.delay(index * 150),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animation de lueur continue
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateY = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const uri = anime.posterImage || 
               anime.coverImage?.extraLarge || 
               anime.coverImage?.large || 
               anime.coverImage?.medium || 
               anime.cover || 
               anime.image || 
               anime.banner;

  const score = anime.averageScore || anime.score;
  const getScoreColor = (score) => {
    if (score >= 85) return COLORS.premium;
    if (score >= 75) return COLORS.success;
    if (score >= 65) return COLORS.accent;
    return COLORS.textMuted;
  };

  return (
    <Animated.View
      style={[
        styles.enhancedCard,
        {
          width: cardWidth,
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
            { rotateY: rotateY },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(anime)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.cardTouchable}
      >
        {/* Effet de lueur de fond */}
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowOpacity,
            }
          ]}
        />

        {/* Container principal */}
        <View style={styles.cardContent}>
          {/* Image avec overlay gradient */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri }}
              style={styles.cardImage}
              onLoad={() => setImageLoaded(true)}
              resizeMode="cover"
            />
            
            {!imageLoaded && (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator color={COLORS.accent} size="small" />
              </View>
            )}

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.imageGradient}
            />

            {/* Badge de score */}
            {score && (
              <View style={[styles.scoreBadge, { borderColor: getScoreColor(score) }]}>
                <MaterialIcons name="star" size={12} color={getScoreColor(score)} />
                <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>
                  {Math.round(score / 10)}
                </Text>
              </View>
            )}

            {/* Badge premium/nouveau */}
            {anime.isAdult && (
              <View style={styles.adultBadge}>
                <Text style={styles.adultText}>18+</Text>
              </View>
            )}

            {/* Icône de lecture avec effet holographique */}
            <View style={styles.playIconContainer}>
              <LinearGradient
                colors={[COLORS.accent, COLORS.accent2]}
                style={styles.playIconGradient}
              >
                <MaterialCommunityIcons name="play" size={24} color={COLORS.text} />
              </LinearGradient>
            </View>
          </View>

          {/* Informations */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {anime.title?.romaji || anime.title?.english || anime.title?.native || anime.title}
            </Text>
            
            <View style={styles.cardMeta}>
              <Text style={styles.cardYear}>
                {anime.year || anime.seasonYear || ""}
              </Text>
              {anime.episodes && (
                <Text style={styles.cardEpisodes}>
                  {anime.episodes} épisodes
                </Text>
              )}
            </View>

            {/* Genres avec chips colorées */}
            {anime.genres && anime.genres.length > 0 && (
              <View style={styles.genreContainer}>
                {anime.genres.slice(0, 2).map((genre, idx) => (
                  <View key={idx} style={styles.genreChip}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Barre de progression fictive */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[COLORS.accent, COLORS.accent2]}
                  style={[styles.progressFill, { width: `${Math.random() * 60 + 20}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.floor(Math.random() * 12) + 1}/12 vus
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Section avec animations fluides
function AnimatedSection({ title, animes, navigation, icon, color = COLORS.accent }) {
  const sectionAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sectionAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(titleAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!animes?.length) return null;

  const cardWidth = Math.round(SCREEN_WIDTH * 0.42);

  const renderCard = ({ item, index }) => (
    <EnhancedAnimeCard
      anime={item}
      onPress={(anime) => navigation.navigate("AnimeDetails", { anime })}
      index={index}
      cardWidth={cardWidth}
    />
  );

  return (
    <Animated.View 
      style={[
        styles.sectionContainer,
        {
          opacity: sectionAnim,
          transform: [{ translateY: titleAnim }]
        }
      ]}
    >
      {/* Header de section amélioré */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <LinearGradient
            colors={[color, color + '80']}
            style={styles.sectionIconBg}
          >
            <MaterialCommunityIcons name={icon} size={20} color={COLORS.text} />
          </LinearGradient>
          <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        </View>
        
        <TouchableOpacity style={styles.seeAllContainer}>
          <Text style={styles.seeAllText}>Tout voir</Text>
          <MaterialIcons name="arrow-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Liste horizontale */}
      <FlatList
        data={animes}
        renderItem={renderCard}
        keyExtractor={(item, index) => `${title}-${item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionList}
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
        decelerationRate="fast"
        snapToInterval={cardWidth + 16}
        snapToAlignment="start"
      />
    </Animated.View>
  );
}

// Header flottant avec effets
function FloatingHeader({ scrollY, query, setQuery, onSearch }) {
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 0.95],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1.1, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      style={[
        styles.floatingHeader,
        {
          opacity: headerOpacity,
          transform: [{ scale: headerScale }]
        }
      ]}
    >
      <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
        <LinearGradient
          colors={[COLORS.bg + 'CC', COLORS.surface + '99']}
          style={styles.headerGradient}
        >
          <SafeAreaView style={styles.headerSafeArea}>
            <View style={styles.headerContent}>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Rechercher des animes..."
                  placeholderTextColor={COLORS.textMuted}
                  onSubmitEditing={onSearch}
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <MaterialIcons name="clear" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

// Composant principal
export default function BrowseScreen({ navigation }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [animes, setAnimes] = useState({
    trending: [],
    top: [],
    season: [],
    must: [],
  });
  const [genres, setGenres] = useState([]);
  const [genre, setGenre] = useState(null);
  const [query, setQuery] = useState("");

  // Animations d'entrée
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    loadAll();
  }, []);

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

  const loadAll = async () => {
  setError(null);
  try {
    setLoading(true);
    const [trend, top, season, must] = await Promise.allSettled([
      fetchTrendingGrouped(40),
      fetchTopRatedGrouped(40),
      fetchCurrentSeasonGrouped(40),
      fetchMustWatch(40),
    ]);
    
    const getVal = (r) =>
      r && r.status === "fulfilled" && Array.isArray(r.value) ? r.value : [];
    
    let structure = {
      trending: getVal(trend), // Use directly, no extra dedupe
      top: getVal(top),
      season: getVal(season),
      must: getVal(must),
    };
    
    // Fallback si tout est vide
    if (!structure.trending.length && !structure.top.length && 
        !structure.season.length && !structure.must.length) {
      const fallback = await fetchAnimes(80); // fetchAnimes already dedups
      structure.trending = fallback.slice(0, 20);
      structure.top = fallback.slice(20, 40);
      structure.season = fallback.slice(40, 60);
      structure.must = fallback.slice(60, 80);
    }

    setAnimes(structure);

    // Extraction genres unique
    const allGenres = new Set();
    Object.values(structure).flat().forEach((a) => {
      (a.genres || []).forEach((g) => allGenres.add(g));
    });
    setGenres(Array.from(allGenres).sort());

    setLoading(false);
    setRefreshing(false);
  } catch (e) {
    setError("Impossible de charger les animes. Veuillez réessayer.");
    setLoading(false);
    setRefreshing(false);
  }
  };  

  const pool = useMemo(() => [
    ...animes.trending,
    ...animes.top,
    ...animes.season,
    ...animes.must
  ], [animes]);

  const poolFiltered = useMemo(() => {
    let arr = pool;
    const q = query.trim().toLowerCase();
    
    if (genre) {
      arr = arr.filter((anime) => anime.genres?.includes(genre));
    }
    
    if (q) {
      arr = arr.filter((anime) =>
        anime.title?.romaji?.toLowerCase().includes(q) ||
        anime.title?.english?.toLowerCase().includes(q) ||
        anime.title?.native?.toLowerCase().includes(q) ||
        (Array.isArray(anime.synonyms) && anime.synonyms.join(" ").toLowerCase().includes(q)) ||
        String(anime.title).toLowerCase().includes(q)
      );
    }
    return arr;
  }, [pool, genre, query]);

  const sections = [
    { key: "trending", label: "🔥 Tendances", icon: "fire", color: COLORS.epic },
    { key: "season", label: "📅 Saison actuelle", icon: "calendar-clock", color: COLORS.success },
    { key: "top", label: "⭐ Mieux notés", icon: "star", color: COLORS.premium },
    { key: "must", label: "👑 Incontournables", icon: "crown", color: COLORS.legendary },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ParticleField />
        
        <LinearGradient
          colors={[COLORS.accent, COLORS.accent2]}
          style={styles.loadingIcon}
        >
          <MaterialCommunityIcons name="television-play" size={40} color={COLORS.text} />
        </LinearGradient>
        
        <Text style={styles.loadingTitle}>Chargement des animes...</Text>
        
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
      
      {/* Champ de particules */}
      <ParticleField />

      {/* Header flottant */}
      <FloatingHeader
        scrollY={scrollY}
        query={query}
        setQuery={setQuery}
        onSearch={() => {}}
      />

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAll();
            }}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero section avec titre impressionnant */}
        <LinearGradient
          colors={[COLORS.bg, COLORS.surface + '80', COLORS.bg]}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>DÉCOUVREZ</Text>
            <Text style={styles.heroSubtitle}>Les meilleurs animes du moment</Text>
            
            {/* Barre de recherche principale */}
            <View style={styles.mainSearchContainer}>
              <MaterialIcons name="search" size={24} color={COLORS.accent} />
              <TextInput
                style={styles.mainSearchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher votre prochain anime..."
                placeholderTextColor={COLORS.textMuted}
                returnKeyType="search"
              />
            </View>
          </View>
        </LinearGradient>

        {/* Filtres de genres avec style moderne */}
        <View style={styles.genresSection}>
          <Text style={styles.genresSectionTitle}>Genres</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genresScroll}>
            <TouchableOpacity
              style={[styles.genreFilterChip, !genre && styles.genreFilterChipActive]}
              onPress={() => setGenre(null)}
            >
              <LinearGradient
                colors={!genre ? [COLORS.accent, COLORS.accent2] : ['transparent', 'transparent']}
                style={styles.genreChipGradient}
              >
                <Text style={[styles.genreFilterText, !genre && styles.genreFilterTextActive]}>
                  Tous
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {genres.slice(0, 10).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genreFilterChip, genre === g && styles.genreFilterChipActive]}
                onPress={() => setGenre(g)}
              >
                <LinearGradient
                  colors={genre === g ? [COLORS.accent, COLORS.accent2] : ['transparent', 'transparent']}
                  style={styles.genreChipGradient}
                >
                  <Text style={[styles.genreFilterText, genre === g && styles.genreFilterTextActive]}>
                    {g}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="wifi-off" size={64} color={COLORS.textMuted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAll}>
              <LinearGradient colors={[COLORS.accent, COLORS.accent2]} style={styles.retryGradient}>
                <Text style={styles.retryText}>Réessayer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Sections animées */}
            {sections.map((section) => {
              const data = genre 
                ? poolFiltered.filter((x) => animes[section.key].map((i) => i.id).includes(x.id))
                : animes[section.key];
              
              if (!data.length) return null;
              
              return (
                <AnimatedSection
                  key={section.key}
                  title={section.label}
                  animes={data}
                  navigation={navigation}
                  icon={section.icon}
                  color={section.color}
                />
              );
            })}

            {poolFiltered.length === 0 && query && (
              <View style={styles.noResultsContainer}>
                <MaterialCommunityIcons name="magnify-close" size={64} color={COLORS.textMuted} />
                <Text style={styles.noResultsTitle}>Aucun résultat</Text>
                <Text style={styles.noResultsSubtitle}>
                  Essayez avec d'autres mots-clés ou changez de genre
                </Text>
              </View>
            )}
          </>
        )}

        {/* Spacing pour éviter que le contenu soit masqué */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
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
  particle: {
    position: 'absolute',
    borderRadius: 50,
  },

  // Header flottant
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  headerSafeArea: {
    paddingBottom: 10,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    marginHorizontal: 12,
  },

  // ScrollView principal
  scrollView: {
    flex: 1,
  },

  // Hero section
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 100 : 120,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: COLORS.accent + '50',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  mainSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.accent + '30',
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mainSearchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 12,
  },

  // Section genres
  genresSection: {
    marginBottom: 30,
  },
  genresSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  genresScroll: {
    paddingHorizontal: 20,
  },
  genreFilterChip: {
    marginRight: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },
  genreFilterChipActive: {
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  genreChipGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 25,
  },
  genreFilterText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  genreFilterTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },

  // Sections
  sectionContainer: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  seeAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
  },
  seeAllText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  sectionList: {
    paddingHorizontal: 20,
  },

  // Cartes améliorées
  enhancedCard: {
    marginBottom: 12,
  },
  cardTouchable: {
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    zIndex: -1,
  },
  cardContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    position: 'relative',
    height: 240,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg + 'DD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  adultBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.epic,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adultText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  playIconContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardYear: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cardEpisodes: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  genreContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  genreChip: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  genreText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
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
    shadowColor: COLORS.accent,
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

  // Erreurs et états vides
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  retryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});