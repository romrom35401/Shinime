// Player.js V2.0 - Compatible expo-video + VideoExtractor V5
// Migration depuis expo-av vers expo-video (recommandé)
// Support amélioré pour WebView + gestion d'erreurs robuste

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { VideoPlayer, useVideoPlayer } from 'expo-video'; // Nouveau: expo-video
import { useEvent } from 'expo';
import { useRoute, useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { VideoExtractorV5 } from "../api/VideoExtractorV5"; // Import du nouveau extractor

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

// ============================================================
// 🛠️ HELPERS POUR DÉTECTER LES TYPES D'URL
// ============================================================

function isDirectMediaUrl(u = "") {
  if (!u) return false;
  return /\.(mp4|m3u8|webm|mkv|avi|mov)(\?|$|#)/i.test(String(u));
}

function isEmbedHost(u = "") {
  if (!u) return false;
  const s = String(u).toLowerCase();
  return /vk\.com\/video_ext|sendvid\.com|video\.sibnet\.ru|myvi\.tv|streamable\.com|youtube\.com|youtu\.be|dailymotion\.com|ok\.ru|vidmoly\./.test(s) || /\/embed\//.test(s);
}

function isLikelyWebView(u = "") {
  if (!u) return false;
  return isEmbedHost(u) && !isDirectMediaUrl(u);
}

function pickInitialUrlFromEpisode(ep = {}) {
  // Priorité: episode.url d'abord
  if (ep?.url && typeof ep.url === "string") return ep.url;

  // Sinon chercher dans languages avec priorité VOSTFR -> VF -> FR -> DEFAULT
  const langs = ep?.languages || {};
  const order = ["VOSTFR", "VF", "FR", "VOST", "SUB", "DEFAULT"];
  
  for (const k of order) {
    if (langs[k] && langs[k].length) {
      const pick = langs[k].find(Boolean);
      if (pick) return pick;
    }
  }

  // Chercher dans n'importe quelle langue
  const keys = Object.keys(langs || {});
  for (const kk of keys) {
    const arr = langs[kk];
    if (Array.isArray(arr) && arr.length) return arr.find(Boolean);
  }

  return null;
}

// ============================================================
// 🎬 COMPOSANT PLAYER V2.0
// ============================================================

export default function PlayerV2() {
  const navigation = useNavigation();
  const route = useRoute();
  const { episode = {}, anime = {}, onNext, onCast } = route.params || {};

  // États principaux
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isWebViewMode, setIsWebViewMode] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(() => pickInitialUrlFromEpisode(episode));
  const [streamHeaders, setStreamHeaders] = useState(episode?.streamHeaders || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // États pour sélection langue/source
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const keys = episode?.languages ? Object.keys(episode.languages || {}) : [];
    if (keys.includes("VOSTFR")) return "VOSTFR";
    if (keys.includes("VF")) return "VF";
    return keys[0] || null;
  });
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  // Nouveau: expo-video player
  const player = useVideoPlayer(currentUrl, (player) => {
    if (currentUrl && !isWebViewMode) {
      console.log("🎬 Initialisation expo-video player V2 avec:", currentUrl.slice(0, 80));
      
      // Configuration du player
      player.loop = false;
      player.muted = false;
      player.allowsExternalPlayback = true;
      
      // Headers si nécessaires (limité dans expo-video)
      if (streamHeaders && Object.keys(streamHeaders).length > 0) {
        console.log("📋 Headers détectés:", streamHeaders);
        // expo-video gère les headers différemment
        // On peut essayer via source object mais c'est limité
      }
    }
  });

  // Événements du player expo-video
  const { isLoaded } = useEvent(player, 'statusChange');
  const { currentTime, duration } = useEvent(player, 'timeUpdate');
  const { error: playerError } = useEvent(player, 'error');

  // ============================================================
  // 🔄 EFFETS ET LIFECYCLE
  // ============================================================

  // Lock paysage au montage
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

  // Détection du mode (Video native vs WebView)
  useEffect(() => {
    const url = currentUrl;
    console.log("🎬 Player V2 URL:", url);
    console.log("📱 isDirectMediaUrl:", isDirectMediaUrl(url));
    console.log("🌐 isEmbedHost:", isEmbedHost(url));
    console.log("🔍 isLikelyWebView:", isLikelyWebView(url));

    const shouldUseWebView = isLikelyWebView(url);
    setIsWebViewMode(!!shouldUseWebView);
    
    console.log("📺 Mode V2 sélectionné:", shouldUseWebView ? "WebView" : "expo-video Native");

    // Reset erreur quand URL change
    setError(null);
  }, [currentUrl]);

  // Auto-hide contrôles
  useEffect(() => {
    if (controlsVisible && player?.playing && !isWebViewMode && !showSettings) {
      const timer = setTimeout(() => setControlsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible, player?.playing, isWebViewMode, showSettings]);

  // URL initiale depuis épisode si manquante
  useEffect(() => {
    if (!currentUrl) {
      const pick = pickInitialUrlFromEpisode(episode);
      if (pick) {
        console.log("🔄 V2 URL initiale récupérée:", pick.slice(0, 80));
        setCurrentUrl(pick);
      }
    }
  }, [episode]);

  // Gestion des erreurs du player
  useEffect(() => {
    if (playerError) {
      console.error("❌ Erreur expo-video player:", playerError);
      setError(`Erreur de lecture: ${playerError.message || 'Inconnue'}`);
    }
  }, [playerError]);

  // ============================================================
  // 🎮 CONTRÔLES DE LECTURE
  // ============================================================

  const toggleControls = () => setControlsVisible(v => !v);

  const togglePlayPause = () => {
    if (isWebViewMode) return;
    if (!isLoaded) return;

    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      console.error("❌ Erreur toggle play/pause:", e);
    }
  };

  const seekTo = (timeInSeconds) => {
    if (isWebViewMode) return;
    if (!isLoaded) return;

    try {
      player.currentTime = Math.max(0, Math.min(timeInSeconds, duration || 0));
    } catch (e) {
      console.error("❌ Erreur seek:", e);
    }
  };

  const skipSeconds = (seconds) => {
    if (!isLoaded) return;
    const newTime = (currentTime || 0) + seconds;
    seekTo(newTime);
  };

  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsFullscreen(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        setIsFullscreen(true);
      }
    } catch (e) {
      console.error("❌ Erreur toggle fullscreen:", e);
    }
  };

  const handleNextEpisode = () => {
    if (typeof onNext === "function") return onNext();
    console.log("🔄 Next episode non configuré");
  };

  const handleCast = () => {
    if (typeof onCast === "function") return onCast();
    Alert.alert("Cast", "Fonction de cast non configurée.");
  };

  // ============================================================
  // 🔄 GESTION LANGUES ET SOURCES
  // ============================================================

  const languagesKeys = useMemo(() => Object.keys(episode.languages || {}), [episode]);

  const switchLanguage = async (lang) => {
    if (!lang) return;

    console.log(`🌐 V2 Switch vers langue: ${lang}`);
    setCurrentLanguage(lang);
    setCurrentSourceIndex(0);
    setIsLoading(true);
    setError(null);

    const arr = episode.languages?.[lang] || [];
    const rawUrl = arr.find(Boolean);

    if (!rawUrl) {
      Alert.alert("Langue", "Aucun lien pour cette langue.");
      setIsLoading(false);
      return;
    }

    try {
      // Essayer d'extraire avec VideoExtractor V5
      if (!isDirectMediaUrl(rawUrl)) {
        console.log("🔧 V2 Extraction nécessaire avec VideoExtractor V5...");
        const extractionResult = await VideoExtractorV5.extractVideoUrl(rawUrl, {
          preferMp4: true,
          timeout: 60000
        });

        if (extractionResult && extractionResult.url) {
          setCurrentUrl(extractionResult.url);
          setStreamHeaders(extractionResult.headers || {});
          console.log("✅ V2 Extraction réussie, nouvelle URL:", extractionResult.url.slice(0, 80));
        } else {
          throw new Error("Extraction V5 failed - no URL returned");
        }
      } else {
        setCurrentUrl(rawUrl);
        setStreamHeaders({});
        console.log("✅ V2 URL directe utilisée:", rawUrl.slice(0, 80));
      }
    } catch (error) {
      console.error("❌ V2 Erreur switch langue:", error);
      setError(`Erreur changement langue: ${error.message}`);
      Alert.alert("Erreur", `Impossible de changer la langue: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowSettings(false);
    }
  };

  const switchSource = async (idx) => {
    if (!currentLanguage) return;

    const arr = episode.languages?.[currentLanguage] || [];
    if (!arr || !arr[idx]) {
      Alert.alert("Source", "Source introuvable.");
      return;
    }

    console.log(`🔄 V2 Switch vers source ${idx}: ${arr[idx].slice(0, 80)}`);
    setCurrentSourceIndex(idx);
    setIsLoading(true);
    setError(null);

    const rawUrl = arr[idx];

    try {
      if (!isDirectMediaUrl(rawUrl)) {
        console.log("🔧 V2 Extraction source avec VideoExtractor V5...");
        const extractionResult = await VideoExtractorV5.extractVideoUrl(rawUrl, {
          preferMp4: true,
          timeout: 60000
        });

        if (extractionResult && extractionResult.url) {
          setCurrentUrl(extractionResult.url);
          setStreamHeaders(extractionResult.headers || {});
          console.log("✅ V2 Source extraite:", extractionResult.url.slice(0, 80));
        } else {
          throw new Error("Source extraction failed");
        }
      } else {
        setCurrentUrl(rawUrl);
        setStreamHeaders({});
        console.log("✅ V2 Source directe:", rawUrl.slice(0, 80));
      }
    } catch (error) {
      console.error("❌ V2 Erreur switch source:", error);
      setError(`Erreur changement source: ${error.message}`);
      Alert.alert("Erreur", `Impossible de changer la source: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowSettings(false);
    }
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

  // ============================================================
  // 🎨 HELPERS D'AFFICHAGE
  // ============================================================

  const formatTime = (seconds) => {
    const totalSecs = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const displayTitle = episode?.showTitle || 
                      episode?.animeTitle || 
                      episode?.title || 
                      anime?.title ||
                      "Lecture";

  const displaySubtitle = episode?.subtitle || 
    (typeof episode?.number === "number" ? `E${episode.number}` : 
     (episode.number ? `E${episode.number}` : "")) + 
    (episode?.season ? ` • Saison ${episode.season}` : "");

  // ============================================================
  // 🚨 GESTION DES ERREURS
  // ============================================================

  if (!currentUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={COLORS.ink} />
          <Text style={styles.errorTitle}>Aucun lien vidéo disponible</Text>
          <Text style={styles.errorMessage}>
            Aucun lien vidéo disponible pour cet épisode.
          </Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={COLORS.ink} />
          <Text style={styles.errorTitle}>Erreur de lecture</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => {
              setError(null);
              const pick = pickInitialUrlFromEpisode(episode);
              if (pick) setCurrentUrl(pick);
            }}
          >
            <Text style={styles.errorButtonText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.errorButton, { backgroundColor: 'transparent', borderColor: COLORS.ink, borderWidth: 1, marginTop: 10 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.errorButtonText, { color: COLORS.ink }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // 🎬 RENDU PRINCIPAL
  // ============================================================

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Surface vidéo */}
      {!isWebViewMode ? (
        <View style={styles.videoWrapper}>
          <VideoPlayer
            player={player}
            style={styles.video}
            allowsFullscreen={false} // On gère manuellement
            showsTimecodes={false}
            requiresLinearPlayback={false}
          />
        </View>
      ) : (
        <WebView
          source={{ 
            uri: currentUrl,
            headers: streamHeaders 
          }}
          style={styles.video}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={COLORS.trackMin} />
            </View>
          )}
        />
      )}

      {/* Overlay tap pour montrer contrôles */}
      {!controlsVisible && (
        <TouchableOpacity
          style={styles.tapOverlay}
          onPress={() => setControlsVisible(true)}
          activeOpacity={1}
        />
      )}

      {/* Overlay sombre quand contrôles visibles */}
      {controlsVisible && <View style={styles.dimOverlay} />}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.trackMin} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {/* Contrôles overlay */}
      {controlsVisible && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setControlsVisible(false)}
          activeOpacity={1}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.topLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.ink} />
              </TouchableOpacity>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
                {!!displaySubtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>{displaySubtitle}</Text>
                )}
              </View>
            </View>

            <View style={styles.topRight}>
              <TouchableOpacity 
                onPress={() => setShowSettings(v => !v)} 
                style={styles.iconBtn}
              >
                <MaterialIcons name="settings" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Settings */}
          {showSettings && (
            <View style={styles.settingsMenu}>
              {/* Langues */}
              {languagesKeys.length > 0 && (
                <View>
                  <Text style={styles.settingsHeader}>Langues</Text>
                  {languagesKeys.map((lk) => (
                    <TouchableOpacity
                      key={lk}
                      onPress={() => switchLanguage(lk)}
                      style={[
                        styles.menuItem,
                        currentLanguage === lk && { backgroundColor: COLORS.trackMin }
                      ]}
                    >
                      <Text style={[
                        styles.menuItemText,
                        currentLanguage === lk && { fontWeight: 'bold' }
                      ]}>
                        {lk}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Sources pour langue courante */}
              {currentLanguage && Array.isArray(episode.languages?.[currentLanguage]) && (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.settingsHeader}>
                    Serveurs ({currentLanguage})
                  </Text>
                  {episode.languages[currentLanguage].map((u, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => switchSource(i)}
                      style={[
                        styles.menuItem,
                        currentSourceIndex === i && { backgroundColor: COLORS.trackMin }
                      ]}
                    >
                      <Text style={[
                        styles.menuItemText,
                        currentSourceIndex === i && { fontWeight: 'bold' }
                      ]} numberOfLines={1}>
                        Serveur {i + 1}: {new URL(u).hostname}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Ouvrir dans navigateur */}
              <TouchableOpacity onPress={openInBrowser} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Ouvrir dans le navigateur</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Centre: contrôles de lecture */}
          <View style={styles.centerRow}>
            <TouchableOpacity
              onPress={() => skipSeconds(-10)}
              style={styles.sideCircle}
            >
              <MaterialIcons name="replay-10" size={24} color={COLORS.ink} />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playCircle}>
              <MaterialIcons
                name={player?.playing ? "pause" : "play-arrow"}
                size={32}
                color={COLORS.ink}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => skipSeconds(10)}
              style={styles.sideCircle}
            >
              <MaterialIcons name="forward-10" size={24} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          {/* Bottom bar: timeline et temps */}
          <View style={styles.bottomBar}>
            <Text style={styles.time}>{formatTime(currentTime)}</Text>

            {!isWebViewMode ? (
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration || 1}
                value={currentTime || 0}
                onValueChange={seekTo}
                minimumTrackTintColor={COLORS.trackMin}
                maximumTrackTintColor={COLORS.trackMax}
                thumbStyle={{ backgroundColor: COLORS.thumb }}
                onSlidingStart={() => setControlsVisible(true)}
              />
            ) : (
              <View style={styles.slider}>
                <Text style={[styles.time, { textAlign: 'center' }]}>
                  Mode WebView - Contrôles limités
                </Text>
              </View>
            )}

            <Text style={styles.time}>
              {!isWebViewMode ? formatTime(duration) : "--:--"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================
// 🎨 STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  
  videoWrapper: { 
    flex: 1 
  },
  
  video: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },

  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  dimOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: COLORS.dim 
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.ink,
    fontSize: 16,
    marginTop: 10,
  },

  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },

  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: "space-between" 
  },

  // Top bar
  topBar: { 
    paddingTop: 14, 
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  topLeft: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1
  },
  
  titleWrap: { 
    minWidth: 10, 
    flexShrink: 1, 
    marginLeft: 12,
    flex: 1
  },
  
  title: { 
    color: COLORS.ink, 
    fontSize: 18, 
    fontWeight: "700", 
    includeFontPadding: false 
  },
  
  subtitle: { 
    color: COLORS.sub, 
    fontSize: 12, 
    marginTop: 2, 
    includeFontPadding: false 
  },
  
  topRight: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  
  iconBtn: { 
    padding: 6, 
    borderRadius: 8 
  },

  // Settings menu
  settingsMenu: {
    position: "absolute",
    top: 60,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 8,
    padding: 12,
    maxWidth: Math.min(400, SCREEN_WIDTH - 40),
    maxHeight: 400,
  },

  settingsHeader: {
    color: COLORS.ink,
    fontWeight: "800",
    marginBottom: 8,
    fontSize: 14,
  },

  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 4,
  },

  menuItemText: {
    color: COLORS.ink,
    fontSize: 13,
  },

  // Centre
  centerRow: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  
  sideCircle: { 
    padding: 12, 
    marginHorizontal: 24, 
    borderRadius: 999, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)"
  },
  
  playCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: "center", 
    justifyContent: "center", 
    marginHorizontal: 16, 
    backgroundColor: "rgba(0,0,0,0.4)" 
  },

  // Bottom bar
  bottomBar: { 
    paddingHorizontal: 16, 
    paddingBottom: 18, 
    paddingTop: 6, 
    flexDirection: "row", 
    alignItems: "center" 
  },
  
  time: { 
    color: COLORS.ink, 
    fontSize: 12, 
    width: 52,
    textAlign: 'center'
  },
  
  slider: { 
    flex: 1, 
    height: 28, 
    marginHorizontal: 10 
  },

  // Erreurs
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  errorTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },

  errorMessage: {
    color: COLORS.sub,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },

  errorButton: {
    backgroundColor: COLORS.trackMin,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },

  errorButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: 'bold',
  },
});