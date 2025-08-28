// BrowseScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import colorsTheme from "../theme/colors";
import {
  fetchMustWatch,
  fetchByGenreGrouped,
} from "../api/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* ---------- Layout constants ---------- */
const COLS = 2;
const GAP = 12;
const SIDE = 12;

const CARD_W = Math.floor((SCREEN_WIDTH - SIDE * 2 - GAP * (COLS - 1)) / COLS);
const POSTER_RATIO = 2 / 3;
const POSTER_H = Math.round(CARD_W / POSTER_RATIO);
const TITLE_LH = 20;
const META_LH = 18;
const ROW_H = POSTER_H + TITLE_LH + META_LH + 18; // pour calcul “remplir l’écran”
const EXTRA_ROWS = 3; // +2-3 lignes

/* ---------- Theme ---------- */
const colors = {
  background: colorsTheme?.background || "#0f0b07",
  text: colorsTheme?.text || "#fff",
  textMuted: colorsTheme?.textLight || "#d0c7bd",
  card: colorsTheme?.card || "#1c140e",
  accent: colorsTheme?.accent || "#f47521",
  border: colorsTheme?.border || "#2a2019",
};

/* ---------- Tabs ---------- */
const TABS = ["TOUS LES ANIME", "GENRES"];

/* ---------- Genres (FR label -> AniList key + icon) ---------- */
const GENRES = [
  { label: "ACTION",            api: "Action",         icon: "flame-outline" },
  { label: "AVENTURE",          api: "Adventure",      icon: "navigate-outline" },
  { label: "COMÉDIE",           api: "Comedy",         icon: "happy-outline" },
  { label: "DRAMA",             api: "Drama",          icon: "sad-outline" },
  { label: "FANTASTIQUE",       api: "Fantasy",        icon: "color-wand-outline" },
  { label: "ROMANCE",           api: "Romance",        icon: "heart-outline" },
  { label: "SCIENCE FICTION",   api: "Sci-Fi",         icon: "planet-outline" },
  { label: "SEINEN",            api: "Seinen",         icon: "person-outline" },
  { label: "SHOJO",             api: "Shoujo",         icon: "female-outline" },
  { label: "SHONEN",            api: "Shounen",        icon: "flash-outline" },
  { label: "TRANCHE DE VIE",    api: "Slice of Life",  icon: "calendar-outline" },
  { label: "HORREUR",           api: "Horror",         icon: "skull-outline" },
  { label: "SPORT",             api: "Sports",         icon: "trophy-outline" },       // ajouté
  { label: "SURNATUREL",        api: "Supernatural",   icon: "moon-outline" },         // ajouté
  { label: "THRILLER",          api: "Thriller",       icon: "alert-circle-outline" }, // ajouté
];

/* ---------- Screen ---------- */
export default function BrowseScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);

  // state “Tous les anime”
  const [items, setItems] = useState([]);
  const [targetCount, setTargetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // state “Genres”
  const [mode, setMode] = useState("tiles"); // "tiles" | "results"
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreItems, setGenreItems] = useState([]);
  const [genreTarget, setGenreTarget] = useState(0);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreMore, setGenreMore] = useState(false);
  const [genreBg, setGenreBg] = useState({}); // apiKey -> bg url (fetch 1 anime/genre)

  /* ----- combien charger pour remplir l’écran + 2-3 lignes ----- */
  const initialCount = useMemo(() => {
    const headerBudget = Platform.OS === "android" ? 152 : 158; // titre + tabs + “Populaire”
    const visibleRows = Math.max(1, Math.ceil((SCREEN_HEIGHT - headerBudget) / ROW_H));
    return COLS * (visibleRows + EXTRA_ROWS);
  }, []);

  /* -------------------- Tous les anime -------------------- */
  const fetchAll = useCallback(async (count) => {
    return await fetchMustWatch(count);
  }, []);

  useEffect(() => {
    if (activeTab !== 0) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setTargetCount(initialCount);
        const data = await fetchAll(initialCount);
        if (!mounted) return;
        setItems(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab, fetchAll, initialCount]);

  const onLoadMoreAll = useCallback(async () => {
    if (loading || loadingMore || activeTab !== 0) return;
    try {
      setLoadingMore(true);
      const next = targetCount + COLS * (EXTRA_ROWS + 1);
      const data = await fetchAll(next);
      setTargetCount(next);
      setItems(data);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, targetCount, fetchAll, activeTab]);

  const onRefreshAll = useCallback(async () => {
    if (activeTab !== 0) return;
    try {
      setRefreshing(true);
      const data = await fetchAll(initialCount);
      setTargetCount(initialCount);
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchAll, initialCount]);

  /* -------------------- Genres : mosaïque -------------------- */
  // charge une image de fond par tuile (top 1 du genre)
  const loadGenreBg = useCallback(async (apiKey) => {
    if (genreBg[apiKey]) return;
    try {
      const [first] = await fetchByGenreGrouped(apiKey, 1);
      const uri = first?.bannerImage || first?.posterImage || first?.coverImage || null;
      if (uri) setGenreBg((m) => ({ ...m, [apiKey]: uri }));
    } catch (_) {}
  }, [genreBg]);

  /* -------------------- Genres : résultats -------------------- */
  const openGenre = useCallback(async (g) => {
    setSelectedGenre(g);
    setMode("results");
    setGenreLoading(true);
    setGenreTarget(initialCount);
    const data = await fetchByGenreGrouped(g.api, initialCount);
    setGenreItems(data);
    setGenreLoading(false);
  }, [initialCount]);

  const backToTiles = useCallback(() => {
    setMode("tiles");
    setSelectedGenre(null);
    setGenreItems([]);
  }, []);

  const onLoadMoreGenre = useCallback(async () => {
    if (mode !== "results" || genreLoading || genreMore) return;
    try {
      setGenreMore(true);
      const next = genreTarget + COLS * (EXTRA_ROWS + 1);
      const data = await fetchByGenreGrouped(selectedGenre.api, next);
      setGenreTarget(next);
      setGenreItems(data);
    } finally {
      setGenreMore(false);
    }
  }, [mode, genreLoading, genreMore, genreTarget, selectedGenre]);

  /* -------------------- RENDER : cartes d’anime -------------------- */
  const renderAnimeCard = ({ item }) => {
    const uri = item.posterImage || item.coverImage || item.poster || item.image;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation?.navigate?.("AnimeDetailsScreen", { anime: item })}
        style={styles.card}
      >
        <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
        <Text style={styles.title} numberOfLines={1}>
          {item.title || item.title_en || item.title_romaji || "Sans titre"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>Doublage | Sous-titres</Text>
      </TouchableOpacity>
    );
  };

  /* -------------------- Header commun -------------------- */
  const HeaderTop = () => (
    <View style={styles.topBar}>
      <Text style={styles.screenTitle}>Naviguer</Text>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Ionicons name="cast-outline" size={20} color="#fff" />
        <Ionicons name="search-outline" size={20} color="#fff" />
      </View>
    </View>
  );

  const Tabs = () => (
    <View style={styles.tabs}>
      {TABS.map((t, i) => {
        const active = i === activeTab;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => { setActiveTab(i); if (i === 1) setMode("tiles"); }}
            style={styles.tabBtn}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /* -------------------- UI -------------------- */
  // 1) Onglet TOUS LES ANIME (grid + infinite scroll)
  if (activeTab === 0) {
    if (loading) {
      return (
        <SafeAreaView style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>Chargement…</Text>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <HeaderTop />
        <Tabs />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Populaire</Text>
          <View style={styles.sectionActions}>
            <Ionicons name="swap-vertical-outline" size={20} color="#cfc2b6" />
            <Ionicons name="options-outline" size={20} color="#cfc2b6" />
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(it, idx) => String(it?.id ?? idx)}
          renderItem={renderAnimeCard}
          numColumns={COLS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={{ justifyContent: "space-between", marginBottom: GAP }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
          onEndReachedThreshold={0.4}
          onEndReached={onLoadMoreAll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefreshAll} tintColor="#fff" />
          }
          initialNumToRender={Math.min(8, initialCount)}
          removeClippedSubviews
          windowSize={11}
        />
      </SafeAreaView>
    );
  }

  // 2) Onglet GENRES
  return (
    <SafeAreaView style={styles.container}>
      <HeaderTop />
      <Tabs />

      {/* --- Mode mosaïque : tuiles de genres --- */}
      {mode === "tiles" && (
        <FlatList
          data={GENRES}
          keyExtractor={(g) => g.api}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: 28, paddingTop: 6 }}
          renderItem={({ item }) => {
            const TILE_W = CARD_W;
            const TILE_H = Math.round(TILE_W * 0.6) + 36; // comme capture (rectangle large)
            // Pré-charger l’image de fond (top 1 du genre)
            loadGenreBg(item.api);
            const bg = genreBg[item.api];

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openGenre(item)}
                style={[styles.tile, { width: TILE_W, height: TILE_H, marginBottom: GAP }]}
              >
                <ImageBackground
                  source={bg ? { uri: bg } : null}
                  style={StyleSheet.absoluteFill}
                  imageStyle={{ borderRadius: 10 }}
                  resizeMode="cover"
                >
                  <View style={styles.tileOverlay} />
                </ImageBackground>

                <View style={styles.tileCenter}>
                  <Ionicons name={item.icon} size={22} color="#e9e0d7" style={{ marginBottom: 8 }} />
                  <Text style={styles.tileLabel}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* --- Mode résultats : grid filtré par genre --- */}
      {mode === "results" && (
        <>
          <View style={[styles.sectionHeader, { paddingHorizontal: SIDE }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity onPress={backToTiles} style={styles.backPill}>
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>{selectedGenre?.label}</Text>
            </View>
          </View>

          {genreLoading ? (
            <View style={[styles.center, { paddingVertical: 24 }]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Chargement…</Text>
            </View>
          ) : (
            <FlatList
              data={genreItems}
              keyExtractor={(it, idx) => String(it?.id ?? idx)}
              renderItem={renderAnimeCard}
              numColumns={COLS}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={{ justifyContent: "space-between", marginBottom: GAP }}
              ListFooterComponent={
                genreMore ? (
                  <View style={{ paddingVertical: 16 }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : null
              }
              onEndReachedThreshold={0.4}
              onEndReached={onLoadMoreGenre}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },

  listContent: { paddingHorizontal: SIDE, paddingBottom: 28 },

  /* Header haut */
  topBar: {
    paddingHorizontal: SIDE,
    paddingTop: Platform.OS === "android" ? 18 : 6,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { color: "#fff", fontSize: 28, fontWeight: "700" },

  /* Tabs */
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: SIDE,
    paddingRight: SIDE,
    gap: 20,
    marginBottom: 8,
  },
  tabBtn: { paddingVertical: 8 },
  tabText: { color: "#cfc2b6", letterSpacing: 0.3, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  tabUnderline: { height: 2, backgroundColor: "transparent", marginTop: 6, borderRadius: 2 },
  tabUnderlineActive: { backgroundColor: colors.accent, width: 36 },

  /* Section header */
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: SIDE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sectionActions: { flexDirection: "row", gap: 18 },

  /* Anime Card */
  card: { width: CARD_W },
  poster: {
    width: CARD_W,
    height: POSTER_H,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  title: { color: "#fff", marginTop: 8, fontSize: 16, fontWeight: "700", lineHeight: TITLE_LH },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: META_LH },

  /* Genre tiles */
  tile: {
    borderRadius: 10,
    backgroundColor: "#24180f",
    overflow: "hidden",
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(22,12,6,0.55)",
    borderRadius: 10,
  },
  tileCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tileLabel: {
    color: "#e9e0d7",
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },

  /* Back pill */
  backPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "rgba(255,255,255,0.15)",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
