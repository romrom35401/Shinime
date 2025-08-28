// Player.js
// Lecteur hybride : utilise expo-av Video pour les fichiers directs (mp4, m3u8)
// et WebView pour les pages d'embed (vk, sendvid, sibnet, youtube...).
// Le lecteur attend `route.params.episode` au format produit par AnimeDetailsScreen.js
// episode = { showTitle, number, season, url, languages: { VOSTFR: [url1,url2], VF: [...] } }

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
} from "react-native";
import { Video } from "expo-av";
import { useRoute, useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  bg: "#24150F",
  ink: "#E6D5C8",
  sub: "rgba(230,213,200,0.75)",
  dim: "rgba(0,0,0,0.25)",
  trackMin: "#F07C2E",
  trackMax: "rgba(255,255,255,0.22)",
  thumb: "#F07C2E",
};

// ------------ Helpers pour détecter le type d'URL ------------
function isDirectMediaUrl(u = "") {
  if (!u) return false;
  return /\.(mp4|m3u8|webm)(\?|$)/i.test(String(u));
}
function isEmbedHost(u = "") {
  if (!u) return false;
  const s = String(u).toLowerCase();
  return /vk\.com\/video_ext|sendvid\.com|video\.sibnet\.ru|myvi\.tv|streamable\.com|youtube\.com|youtu\.be|dailymotion\.com|ok\.ru/.test(s) || /\/embed\//.test(s);
}
function isLikelyWebView(u = "") {
  if (!u) return false;
  return isEmbedHost(u) && !isDirectMediaUrl(u);
}

function pickInitialUrlFromEpisode(ep = {}) {
  // prefer episode.url if provided
  if (ep?.url && typeof ep.url === "string") return ep.url;

  // if languages provided, prefer VOSTFR -> VF -> FR -> DEFAULT
  const langs = ep?.languages || {};
  const order = ["VOSTFR", "VF", "FR", "VOST", "SUB", "DEFAULT"];
  for (const k of order) {
    if (langs[k] && langs[k].length) {
      // pick first non-empty
      const pick = langs[k].find(Boolean);
      if (pick) return pick;
    }
  }
  // any language
  const keys = Object.keys(langs || {});
  for (const kk of keys) {
    const arr = langs[kk];
    if (Array.isArray(arr) && arr.length) return arr.find(Boolean);
  }

  return null;
}

export default function Player() {
  const navigation = useNavigation();
  const route = useRoute();

  const { episode = {}, anime = {}, onNext, onCast } = route.params || {};

  const videoRef = useRef(null);
  const webRef = useRef(null);

  const [status, setStatus] = useState({});
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isWebViewMode, setIsWebViewMode] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(() => pickInitialUrlFromEpisode(episode));
  const [streamHeaders, setStreamHeaders] = useState(episode?.streamHeaders || {});
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const keys = episode?.languages ? Object.keys(episode.languages || {}) : [];
    // prefer VOSTFR/VF
    if (keys.includes("VOSTFR")) return "VOSTFR";
    if (keys.includes("VF")) return "VF";
    return keys[0] || null;
  });
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [pegiDynamic, setPegiDynamic] = useState(episode?.pegi || { rating: "12+", reasons: [] });
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoKey, setVideoKey] = useState(0); // change to remount Video on url change

  // Lock landscape on mount, unlock on unmount
  useEffect(() => {
    const enableFullscreen = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      if (Platform.OS === "android") await NavigationBar.setVisibilityAsync("hidden");
    };
    enableFullscreen();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      if (Platform.OS === "android") NavigationBar.setVisibilityAsync("visible");
    };
  }, []);

  // infer mode when URL changes
  useEffect(() => {
    const url = currentUrl;
    const web = isLikelyWebView(url);
    setIsWebViewMode(!!web);
    // if switching to video, remount
    setVideoKey(k => k + 1);
  }, [currentUrl]);

  // set initial url from episode.languages if not provided
  useEffect(() => {
    if (!currentUrl) {
      const pick = pickInitialUrlFromEpisode(episode);
      setCurrentUrl(pick);
    }
  }, [episode]);

  // auto-hide controls after 3s when playing (video mode)
  useEffect(() => {
    if (controlsVisible && status?.isPlaying && !isWebViewMode) {
      const t = setTimeout(() => setControlsVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [controlsVisible, status?.isPlaying, isWebViewMode]);

  // ---------- Playback controls ----------
  const toggleControls = () => setControlsVisible(v => !v);

  const togglePlayPause = async () => {
    if (isWebViewMode) return; // can't control remote embed reliably
    if (!status?.isLoaded) return;
    try {
      if (status.isPlaying) await videoRef.current?.pauseAsync();
      else await videoRef.current?.playAsync();
    } catch (e) {}
  };

  const skipMs = async (ms) => {
    if (isWebViewMode) return;
    if (!status?.isLoaded) return;
    try {
      let next = (status.positionMillis || 0) + ms;
      if (next < 0) next = 0;
      const dur = status.durationMillis || 0;
      if (dur && next > dur) next = dur - 500;
      await videoRef.current?.setPositionAsync(next);
    } catch (e) {}
  };

  const onSeek = async (pos) => {
    if (isWebViewMode) return;
    try {
      await videoRef.current?.setPositionAsync(pos);
    } catch (e) {}
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
      setIsFullscreen(true);
    }
  };

  const handleNextEpisode = () => {
    if (typeof onNext === "function") return onNext();
    // otherwise nothing; could be wired to navigation/pop
  };

  const handleCast = () => {
    if (typeof onCast === "function") return onCast();
    Alert.alert("Cast", "Fonction de cast non configurée.");
  };

  const formatTime = (ms) => {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ---------- Language / source switching in settings ----------
  const languagesKeys = useMemo(() => Object.keys(episode.languages || {}), [episode]);

  const switchLanguage = (lang) => {
    if (!lang) return;
    setCurrentLanguage(lang);
    setCurrentSourceIndex(0);
    const arr = episode.languages?.[lang] || [];
    const pick = arr.find(Boolean);
    if (pick) setCurrentUrl(pick);
    else Alert.alert("Langue", "Aucun lien pour cette langue.");
    setShowSettings(false);
  };

  const switchSource = (idx) => {
    if (!currentLanguage) return;
    const arr = episode.languages?.[currentLanguage] || [];
    if (!arr || !arr[idx]) return Alert.alert("Source", "Source introuvable.");
    setCurrentSourceIndex(idx);
    setCurrentUrl(arr[idx]);
    setShowSettings(false);
  };

  const openInBrowser = async () => {
    const u = currentUrl;
    if (!u) return Alert.alert("Aucun lien");
    try {
      await Linking.openURL(u);
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'ouvrir le lien dans le navigateur.");
    }
  };

  // Set playback rate (video only)
  const setPlaybackRate = async (r) => {
    try {
      if (!isWebViewMode) await videoRef.current?.setRateAsync(r, true);
    } catch (e) {}
    setShowSettings(false);
  };

  // If currentUrl is null -> show error
  if (!currentUrl) {
    return (
      <View style={styles.errContainer}>
        <StatusBar hidden />
        <Text style={{ color: COLORS.ink, marginBottom: 12 }}>Aucun lien vidéo disponible pour cet épisode.</Text>
        <TouchableOpacity style={styles.errBtn} onPress={() => navigation.goBack()}>
          <Text style={{ fontWeight: "800" }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayTitle = episode?.showTitle || episode?.animeTitle || episode?.title || "Lecture";
  const displaySubtitle = episode?.subtitle || (typeof episode?.number === "number" ? `E${episode.number}` : (episode.number ? `E${episode.number}` : "")) + (episode?.season ? ` • Saison ${episode.season}` : "");

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video surface */}
      <View style={styles.videoWrapper}>
        {!isWebViewMode ? (
          <Video
            key={`vid-${videoKey}`}
            ref={videoRef}
            source={{ 
              uri: currentUrl,
              headers: streamHeaders
            }}
            style={styles.video}
            resizeMode="contain"
            shouldPlay
            useNativeControls={false}
            onPlaybackStatusUpdate={(s) => {
              setStatus(() => s);
              setIsBuffering(!!s.isBuffering);
            }}
          />
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: currentUrl }}
            style={styles.video}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            renderLoading={() => <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.ink} />}
          />
        )}

        {/* tap pour afficher UI */}
        {!controlsVisible && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setControlsVisible(true)} />
        )}

        {/* overlay dim */}
        {controlsVisible && <View style={styles.dimOverlay} />}

        {/* PEGI small when hidden (skipped for brevity) */}
      </View>

      {/* Controls overlay */}
      {controlsVisible && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setControlsVisible(false)} />

          {/* Top bar */}
          <View style={styles.topBar} pointerEvents="box-none">
            <View style={styles.topLeft} pointerEvents="auto">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back" size={20} color={COLORS.ink} />
              </TouchableOpacity>

              <View style={styles.titleWrap}>
                <Text numberOfLines={1} style={styles.title}>{displayTitle}</Text>
                {!!displaySubtitle && <Text numberOfLines={1} style={styles.subtitle}>{displaySubtitle}</Text>}
              </View>
            </View>

            <View style={styles.topRight} pointerEvents="auto">
              <TouchableOpacity onPress={handleNextEpisode} style={styles.iconBtn}>
                <MaterialCommunityIcons name="skip-next" size={22} color={COLORS.ink} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCast} style={styles.iconBtn}>
                <MaterialCommunityIcons name="cast" size={22} color={COLORS.ink} />
              </TouchableOpacity>

              {/* reuse settings button to show languages + sources + speeds */}
              <TouchableOpacity onPress={() => setShowSettings(v => !v)} style={styles.iconBtn}>
                <MaterialCommunityIcons name="cog" size={22} color={COLORS.ink} />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleFullscreen} style={styles.iconBtn}>
                <MaterialIcons name={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={22} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            {/* Settings menu */}
            {showSettings && (
              <View style={styles.settingsMenu} pointerEvents="auto">
                {/* Languages */}
                {languagesKeys.length > 0 && (
                  <View style={{ paddingBottom: 8 }}>
                    <Text style={styles.settingsHeader}>Langues</Text>
                    {languagesKeys.map((lk) => (
                      <TouchableOpacity key={lk} style={styles.menuItem} onPress={() => switchLanguage(lk)}>
                        <Text style={[styles.menuItemText, lk === currentLanguage ? { fontWeight: "800" } : {}]}>{lk}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Sources for current language */}
                {currentLanguage && Array.isArray(episode.languages?.[currentLanguage]) && (
                  <View style={{ paddingBottom: 8 }}>
                    <Text style={styles.settingsHeader}>Serveurs ({currentLanguage})</Text>
                    {episode.languages[currentLanguage].map((u, i) => (
                      <TouchableOpacity key={String(i)} style={styles.menuItem} onPress={() => switchSource(i)}>
                        <Text numberOfLines={1} style={[styles.menuItemText, i === currentSourceIndex ? { fontWeight: "800" } : {}]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* playback speeds */}
                <View>
                  <Text style={styles.settingsHeader}>Vitesse</Text>
                  {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((r) => (
                    <TouchableOpacity key={r} style={styles.menuItem} onPress={() => setPlaybackRate(r)}>
                      <Text style={styles.menuItemText}>{r}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* open in browser */}
                <TouchableOpacity style={[styles.menuItem, { marginTop: 6 }]} onPress={openInBrowser}><Text style={styles.menuItemText}>Ouvrir dans le navigateur</Text></TouchableOpacity>
              </View>
            )}
          </View>

          {/* center controls */}
          <View style={styles.centerRow} pointerEvents="box-none">
            <TouchableOpacity onPress={() => skipMs(-10000)} style={styles.sideCircle}>
              <MaterialCommunityIcons name="rewind-10" size={52} color={COLORS.ink} />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playCircle}>
              <MaterialCommunityIcons name={status?.isPlaying ? "pause" : "play"} size={58} color={COLORS.ink} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => skipMs(10000)} style={styles.sideCircle}>
              <MaterialCommunityIcons name="fast-forward-10" size={52} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          {/* bottom bar: show slider only in Video mode */}
          <View style={styles.bottomBar} pointerEvents="auto">
            <Text style={styles.time}>{formatTime(status?.positionMillis)}</Text>

            {!isWebViewMode ? (
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={status?.durationMillis || 1}
                value={status?.positionMillis || 0}
                minimumTrackTintColor={COLORS.trackMin}
                maximumTrackTintColor={COLORS.trackMax}
                thumbTintColor={COLORS.thumb}
                step={1000}
                onSlidingComplete={onSeek}
                onSlidingStart={() => setControlsVisible(true)}
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: COLORS.sub, fontSize: 12 }}>{isWebViewMode ? "Embed mode — contrôles limités" : ""}</Text>
              </View>
            )}

            <Text style={[styles.time, { textAlign: "right" }]}>{!isWebViewMode ? formatTime(status?.durationMillis) : "--:--"}</Text>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {isBuffering && <ActivityIndicator style={styles.loader} size="small" color={COLORS.ink} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  videoWrapper: { flex: 1 },
  video: { flex: 1, backgroundColor: COLORS.bg },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.dim },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  // top
  topBar: { paddingTop: 14, paddingHorizontal: 16 },
  topLeft: { flexDirection: "row", alignItems: "center" },
  titleWrap: { minWidth: 10, flexShrink: 1, marginLeft: 12 },
  title: { color: COLORS.ink, fontSize: 18, fontWeight: "700", includeFontPadding: false },
  subtitle: { color: COLORS.sub, fontSize: 12, marginTop: 2, includeFontPadding: false },
  topRight: { position: "absolute", right: 10, top: 10, flexDirection: "row", alignItems: "center" },
  iconBtn: { marginLeft: 14, padding: 6, borderRadius: 8, backgroundColor: "transparent" },

  // center
  centerRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  sideCircle: { padding: 8, marginHorizontal: 28, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  playCircle: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginHorizontal: 16, backgroundColor: "rgba(0,0,0,0.35)" },

  // bottom
  bottomBar: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 6, flexDirection: "row", alignItems: "center" },
  time: { color: COLORS.ink, fontSize: 12, width: 52 },
  slider: { flex: 1, height: 28, marginHorizontal: 10 },

  loader: { position: "absolute", left: 12, bottom: 18 + 28 },

  settingsMenu: { position: "absolute", top: 46, right: 8, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 8, padding: 8, maxWidth: Math.min(560, SCREEN_WIDTH - 40) },
  settingsHeader: { color: COLORS.ink, fontWeight: "800", marginBottom: 6 },
  menuItem: { paddingVertical: 6, paddingHorizontal: 8 },
  menuItemText: { color: COLORS.ink, fontSize: 13 },

  errContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  errBtn: { backgroundColor: COLORS.ink, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
