// HomeScreen.jsx
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import LogoImage from '../assets/LogoB.png';
// import BrowseScreen from "./BrowseScreen"; // pas utilisé ici

import colorsTheme from "../theme/colors";
import {
  fetchTrendingGrouped,
  fetchTopRatedGrouped,
  fetchCurrentSeasonGrouped,
  fetchFeaturedJikan,
  fetchAniListImageCached,
  fetchMustWatch,
  fetchAnimes, // <- fallback catalogue local
} from "../api/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const POSTER_RATIO = 2 / 3;

const colors = {
  background: colorsTheme?.background || "#000",
  text: colorsTheme?.text || "#fff",
  textMuted: colorsTheme?.textLight || "#cfcfcf",
  card: colorsTheme?.card || "#121212",
  accent: colorsTheme?.accent || "#f47521",
  border: colorsTheme?.border || "#1f1f1f",
};

/* ---------- Helpers couleur ---------- */
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

/* =========================================================
   👇👇  NOUVEAUX HELPERS: forcer le HERO à prendre la S1  👇👇
   ========================================================= */
function stripDiacritics(s = "") {
  return s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "") ?? s;
}
function normalizeTitleForSeasonKey(title) {
  if (!title) return "";
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/[\[\]\(\)]/g, " ")
    .replace(/\b(tv|ona|ova|special|movie|edition|uncut|uncensored)\b/gi, " ")
    .replace(/\b(the\s*)?final\s*season\b/gi, " ")
    .replace(/\b(s(eason|aison)|part|cour|cours)\s*\d+\b/gi, " ")
    .replace(/\b(\d+)(st|nd|rd|th)\s*(season|saison|part|cour)\b/gi, " ")
    .replace(/\b(2nd|3rd|4th)\b/gi, " ")
    .replace(/\b(i{1,3}|iv|v|vi{0,3}|x)\b(?=\s*$)/gi, " ")
    .replace(/[:\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function getBestTitle(item = {}) {
  return item.title || item.title_en || item.title_romaji || "";
}
function isSeasonTwoPlusTitle(t = "") {
  const s = String(t).toLowerCase();
  return /\b(s(?:eason|aison)?\s*[2-9]\b|2nd\s*season|part\s*[2-9]\b|cour\s*[2-9]\b|ii\b|iii\b|iv\b|v\b|vi\b|x\b)/i.test(s);
}
function scoreAsBaseForHero(item = {}) {
  const t = (getBestTitle(item) || "").toLowerCase();
  const fmt = (item.format || item.subtype || item.type || "").toUpperCase();

  // plus le score est BAS, plus c'est "base" (S1)
  let s = 0;
  if (isSeasonTwoPlusTitle(t)) s += 50;           // pénalise S2+
  if (/\b(s(?:eason|aison)?\s*1|part\s*1|cour\s*1)\b/i.test(t)) s -= 20; // favorise S1 explicite
  if (fmt === "TV") s -= 10;                      // favorise TV vs OVA/ONA/MOVIE quand c'est le socle
  return s;
}
function pickBaseFromFranchise(items = []) {
  return items.slice().sort((a, b) => scoreAsBaseForHero(a) - scoreAsBaseForHero(b))[0];
}
function dedupeFranchisesPreferBase(list = []) {
  const byKey = new Map();
  for (const it of list) {
    const key = normalizeTitleForSeasonKey(getBestTitle(it));
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  }
  return Array.from(byKey.values()).map(pickBaseFromFranchise);
}
/* ========================================================= */

/* ---------- Filtre "vrai anime" (pas trop strict) ---------- */
const allowedFormats = ["TV", "TV_SHORT", "OVA", "ONA", "MOVIE"];
const filterAnime = (list = []) =>
  (list || []).filter((a) => {
    if (!a) return false;
    const hasImg = !!(a.posterImage || a.coverImage || a.image);
    if (!hasImg) return false;
    const f = a.format || a.subtype || a.type || null;
    if (f && !allowedFormats.includes(String(f).toUpperCase())) return false;
    const t = (a.title || a.title_en || a.title_romaji || "").toLowerCase();
    if (/(live action|drama)/i.test(t)) return false;
    return true;
  });

/* ---------- buildFeatured (MAJ: déduplique par franchise & privilégie S1) ---------- */
const buildFeatured = (pool = [], n = 5) => {
  // 1) filtre contenu valide
  const base = filterAnime(pool);

  // 2) déduplique par franchise et choisit un "représentant base" (S1 TV si possible)
  const onePerFranchise = dedupeFranchisesPreferBase(base);

  // 3) mélange léger
  const shuffled = onePerFranchise.sort(() => Math.random() - 0.5);

  // 4) prend n éléments
  const pick = shuffled.slice(0, n).map((a) => ({
    id: a.id,
    title: a.title || a.title_en || a.title_romaji || "Sans titre",
    desc: String(a.description || "").replace(/<\/?[^>]+(>|$)/g, ""),
    poster: a.posterImage || a.coverImage || a.image,
    banner: a.bannerImage || a.posterImage || a.coverImage || a.image,
    color: a.coverColor || null,
    raw: a,
  }));
  return pick;
};

/* ---------- Card composant (mémo) ---------- */
const AnimeCard = memo(function AnimeCard({ item, onPress, cardWidth }) {
  const [loading, setLoading] = useState(true);
  const uri = item.posterImage || item.poster || item.coverImage || item.image;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item.raw || item)}
      style={[styles.card, { width: cardWidth }]}
    >
      <View style={{ flex: 1, backgroundColor: colors.card }}>
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={styles.cardImage}
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <View style={styles.cardPlaceholder}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title || item.title_en || item.title_fr || item.title_romaji || "Sans titre"}
      </Text>
    </TouchableOpacity>
  );
});

/* ---------- SectionRow: FlatList horizontal ---------- */
function SectionRow({ title, data = [], navigation }) {
  const clean = filterAnime(data);
  if (!clean?.length) return null;
  const cardWidth = Math.round(SCREEN_WIDTH * 0.34);

  const renderItem = ({ item }) => (
    <AnimeCard
      item={item}
      onPress={(anime) => navigation.navigate("AnimeDetails", { anime })}
      cardWidth={cardWidth}
    />
  );

  return (
    <View style={{ paddingTop: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={clean}
        renderItem={renderItem}
        keyExtractor={(it) => String(it.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      />
    </View>
  );
}

/* ---------- Composant principal ---------- */
export default function HomeScreen({ navigation }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [currentSeason, setCurrentSeason] = useState([]);
  const [mustWatch, setMustWatch] = useState([]);

  const heroRef = useRef(null);
  const idxRef = useRef(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const autoRef = useRef(null);

  const goDetails = useCallback((anime) => {
    navigation?.navigate?.("AnimeDetails", { anime }); // unifié
  }, [navigation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // 1) Tente toutes les sources en parallèle (ne casse pas si l’une échoue)
        const [
          resTrending,
          resTop,
          resSeason,
          resMust,
        ] = await Promise.allSettled([
          fetchTrendingGrouped(30),
          fetchTopRatedGrouped(30),
          fetchCurrentSeasonGrouped(30),
          fetchMustWatch(30),
        ]);

        const safeVal = (r) => (r?.status === "fulfilled" && Array.isArray(r.value)) ? r.value : [];

        let cleanTrend = filterAnime(safeVal(resTrending));
        let cleanTop   = filterAnime(safeVal(resTop));
        let cleanSeason= filterAnime(safeVal(resSeason));
        let cleanMust  = filterAnime(safeVal(resMust));

        // 2) Fallback local si tout est vide : prend le catalogue Firestore brut
        if (!cleanTrend.length && !cleanTop.length && !cleanSeason.length && !cleanMust.length) {
          try {
            const backup = await fetchAnimes(30); // tableau d’animes de ton catalogue
            const b = filterAnime(backup);
            cleanTrend = b.slice(0, 10);
            cleanTop   = b.slice(10, 20);
            cleanSeason= b.slice(20, 30);
            cleanMust  = b.slice(0, 10);
          } catch (e) {
            console.warn("fallback fetchAnimes failed:", e);
          }
        }

        // 3) Build HERO à partir de tout ce qu’on a
        let poolForHero = [...cleanSeason, ...cleanTrend];
        if (poolForHero.length < 5) poolForHero = [...poolForHero, ...cleanTop, ...cleanMust];

        // 👉 NEW: le HERO déduplique par franchise et privilégie S1
        let gems = buildFeatured(poolForHero, 5);

        // 4) Fallback Jikan si HERO < 4 (on complète)
        if (gems.length < 4) {
          try {
            const jikan = await fetchFeaturedJikan(12);
            const add = [];
            // on passe aussi par le dédupe/franchise pour éviter les "2nd Season"
            const jikanBase = dedupeFranchisesPreferBase(jikan);
            for (const j of jikanBase) {
              if (add.length + gems.length >= 5) break;
              let img;
              try { img = await fetchAniListImageCached(j.title); } catch {}
              add.push({
                id: `jikan-${j.id}`,
                title: j.title,
                desc: j.description || j.synopsis || j.title,
                poster: img?.poster || j.cover || j.image,
                banner: img?.banner || j.cover || j.image,
                color: img?.color || null,
                raw: j,
              });
            }
            gems = [...gems, ...add].slice(0, 5);
          } catch (e) {
            // ignore
          }
        }

        // 5) Évite de dupliquer les featured en tête des sections
        const featuredIds = new Set(gems.map((g) => String(g.raw?.id || g.id)));
        const strip = (arr) => (arr || []).filter((x) => !featuredIds.has(String(x.id)));

        if (!mounted) return;

        setFeatured(gems);
        setTrending(strip(cleanTrend));
        setTopRated(strip(cleanTop));
        setCurrentSeason(strip(cleanSeason));
        setMustWatch(strip(cleanMust));

        // 6) Prefetch posters/banners du HERO
        try {
          const urls = [];
          gems.forEach((g) => {
            if (g.poster) urls.push(g.poster);
            if (g.banner) urls.push(g.banner);
          });
          await Promise.all(urls.map((u) => Image.prefetch(u).catch(() => null)));
        } catch (_) {}
      } catch (e) {
        console.error("HomeScreen load error:", e);
        Alert.alert("Erreur", "Impossible de charger les animes. Vérifie ta connexion.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      clearInterval(autoRef.current);
    };
  }, []);

  // Auto-slide HERO
  useEffect(() => {
    if (!featured.length) return;
    clearInterval(autoRef.current);
    idxRef.current = 0;
    setHeroIdx(0);
    autoRef.current = setInterval(() => {
      if (!featured.length || !heroRef.current) return;
      idxRef.current = (idxRef.current + 1) % featured.length;
      try {
        heroRef.current?.scrollToOffset({ offset: idxRef.current * SCREEN_WIDTH, animated: true });
      } catch (_) {}
      setHeroIdx(idxRef.current);
    }, 4500);
    return () => clearInterval(autoRef.current);
  }, [featured.length]);

  const onHeroScroll = (ev) => {
    const x = ev.nativeEvent.contentOffset.x;
    const ix = Math.round(x / SCREEN_WIDTH);
    if (ix !== heroIdx) {
      idxRef.current = ix;
      setHeroIdx(ix);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: "center", justifyContent: "center" }] }>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const allEmpty = !featured.length && !trending.length && !topRated.length && !currentSeason.length && !mustWatch.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.logoDot}>
            <Image source={LogoImage} style={{ width: 24, height: 24, resizeMode: "contain", opacity: 1 }} />
          </View>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginLeft: 8 }}>Shinime</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity>
            <Ionicons name="search-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ombre top */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 180, zIndex: 15, opacity: 1 }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Gradient principal derrière header */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.headerGradientWrap,
          {
            height: 100,
            opacity: scrollY.interpolate({
              inputRange: [0, 650],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={[styles.headerGradient, { height: 100 }]}
        />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* HERO */}
        {!!featured.length && (
          <View>
            <FlatList
              data={featured}
              horizontal
              pagingEnabled
              ref={heroRef}
              keyExtractor={(it) => String(it.id)}
              renderItem={({ item }) => {
                const rawColor = item.color || item.raw?.coverColor || item.raw?.coverImage?.color || null;
                const hex = normalizeHex(rawColor) || "#0D1117";
                const c1 = hexToRgba(hex, 0.18);
                const c2 = hexToRgba(darkenHex(hex, 35), 0.95);
                const blurBg = Platform.OS === "android" ? 20 : 14;

                return (
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => navigation.navigate("AnimeDetails", { anime: item.raw || item })}
                  >
                    <ImageBackground
                      source={{ uri: item.banner || item.poster }}
                      style={styles.heroBg}
                      resizeMode="cover"
                      blurRadius={blurBg}
                    >
                      <BlurView intensity={Platform.OS === "android" ? 55 : 65} tint="dark" style={StyleSheet.absoluteFill} />
                      <LinearGradient colors={[c1, c2]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                      <LinearGradient
                        colors={["rgba(0,0,0,0)", colors.background]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 0.75 }}
                        style={styles.bottomHeroGradient}
                        pointerEvents="none"
                      />
                      <View style={styles.heroStack}>
                        <View style={styles.posterWrap}>
                          <Image source={{ uri: item.poster }} style={styles.posterImg} resizeMode="cover" />
                        </View>
                        <View style={styles.heroTextArea}>
                          <Text style={styles.heroMeta} numberOfLines={1}>16+ • Doublage | Sous-titres</Text>
                          <Text style={styles.heroTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.heroDesc} numberOfLines={3}>{item.desc}</Text>
                          <View style={styles.heroActions}>
                            <TouchableOpacity
                              style={styles.playBtn}
                              onPress={() => navigation.navigate("AnimeDetails", { anime: item.raw || item })}
                            >
                              <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
                              <Text style={styles.playBtnText}>COMMENCER À REGARDER S1 E1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn}>
                              <Ionicons name="bookmark-outline" size={22} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              }}
              onScroll={onHeroScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Segments (dots) */}
        {!!featured.length && (
          <View style={styles.heroSegmentsDock}>
            {featured.map((_, i) => (
              <View key={`seg-${i}`} style={styles.segmentTrack}>
                <View style={[styles.segmentFill, { opacity: i === heroIdx ? 1 : 0.35 }]} />
              </View>
            ))}
          </View>
        )}

        {/* Message si vraiment rien */}
        {allEmpty && (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, textAlign: "center" }}>
              Aucun anime à afficher pour le moment. Vérifie ta connexion ou ton catalogue Firestore.
            </Text>
          </View>
        )}

        {/* Sections */}
        <SectionRow title="Notre sélection pour vous" data={trending} navigation={navigation} />
        <SectionRow title="Les mieux notés" data={topRated} navigation={navigation} />
        <SectionRow title="Nouveautés de la saison" data={currentSeason} navigation={navigation} />
        <SectionRow title="À ne pas manquer" data={mustWatch} navigation={navigation} />

        {/* Bloc "Voir tout" */}
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 12 }}>
            Vous cherchez encore quelque chose à regarder ?{"\n"}Découvrez notre bibliothèque complète
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Browse' })}
            style={{ backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>Voir tout</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const TEXT = { metaLH: 16, titleLH: 32, descLH: 18, descLines: 3 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerGradientWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 140, zIndex: 15 },
  headerGradient: { flex: 1 },
  headerBar: {
    position: "absolute",
    top: Platform.OS === "android" ? 36 : 44,
    left: 14,
    right: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoDot: { width: 34, height: 34, borderRadius: 34, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  heroBg: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.82, justifyContent: "flex-end" },
  heroStack: { flex: 1, justifyContent: "flex-end", paddingBottom: 10 },
  posterWrap: {
    alignSelf: "center",
    width: SCREEN_WIDTH * 0.72,
    height: (SCREEN_WIDTH * 0.72) / POSTER_RATIO,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.card,
    marginTop: 44,
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  posterImg: { width: "100%", height: "100%" },
  bottomHeroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 180 },
  heroTextArea: { paddingHorizontal: 16, paddingTop: 12 },
  heroMeta: { color: "#e5e5e5", fontSize: 12, lineHeight: TEXT.metaLH, height: TEXT.metaLH, textAlign: "center", marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "bold", lineHeight: TEXT.titleLH, height: TEXT.titleLH, textAlign: "center", marginBottom: 8 },
  heroDesc: { color: "#ddd", fontSize: 14, lineHeight: TEXT.descLH, height: TEXT.descLH * TEXT.descLines, textAlign: "center", marginBottom: 12 },
  heroActions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  playBtn: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", flexGrow: 1 },
  playBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  saveBtn: { marginLeft: 12, width: 48, height: 48, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  heroSegmentsDock: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 10, backgroundColor: colors.background },
  segmentTrack: { width: 34, height: 4, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(244,117,33,0.25)", marginHorizontal: 6 },
  segmentFill: { width: "100%", height: "100%", backgroundColor: colors.accent },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", paddingHorizontal: 12, marginBottom: 10 },
  card: { marginRight: 12, borderRadius: 10, overflow: "hidden", backgroundColor: colors.card, width: Math.round(SCREEN_WIDTH * 0.34) },
  cardImage: { width: "100%", height: Math.round(SCREEN_WIDTH * 0.34 * (3 / 2)) },
  cardPlaceholder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#eaeaea", fontSize: 12, marginTop: 6, paddingHorizontal: 4, textAlign: "center", height: 40 },
});
