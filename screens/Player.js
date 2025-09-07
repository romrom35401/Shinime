// Player.js - Pour Expo Go avec design Crunchyroll
// Compatible 100% Expo Go - Aucune librairie native

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Couleurs Crunchyroll exactes
const CRUNCHYROLL_COLORS = {
  background: '#1a1a1a',
  surface: '#2a2a2a', 
  primary: '#ff8c00',        // Orange Crunchyroll
  secondary: '#ff6b00',
  text: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#999999',
  overlay: 'rgba(0, 0, 0, 0.4)',
  controls: 'rgba(255, 255, 255, 0.1)',
  progressTrack: 'rgba(255, 255, 255, 0.3)',
  progressThumb: '#ff8c00',
};

// VideoExtractor adapté pour Expo Go
class VideoExtractor {
  static getApiUrl() {
    // Pour Expo Go, utilisez votre IP locale
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/extract'; // Émulateur
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:5000/extract'; // Simulateur
    }
    // Pour device physique, remplacez par votre IP
    // return 'http://192.168.1.100:5000/extract';
    return 'http://localhost:5000/extract';
  }

  static async extractVideoUrl(url, options = {}) {
    const { timeout = 30000 } = options;
    const apiUrl = VideoExtractor.getApiUrl();

    console.log(`[VideoExtractor] Extraction: ${url.substring(0, 50)}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[VideoExtractor] Réponse:`, data.success ? 'Succès' : 'Échec');

      if (data.success) {
        return {
          url: data.stream_url,
          type: data.is_hls ? 'hls' : 'mp4',
          headers: data.headers || VideoExtractor.getDefaultHeaders(data.stream_url),
          title: data.title,
          quality: data.quality,
          method: data.method,
        };
      } else {
        throw new Error(data.error || 'Extraction échouée');
      }
    } catch (error) {
      console.log(`[VideoExtractor] Erreur: ${error.message}`);

      // Fallback sur URL directe
      if (VideoExtractor.isDirectVideoUrl(url)) {
        console.log(`[VideoExtractor] Fallback direct: ${url.substring(0, 50)}...`);
        return {
          url,
          type: url.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4',
          headers: VideoExtractor.getDefaultHeaders(url),
          title: 'Vidéo',
          method: 'direct_fallback',
        };
      }
      throw error;
    }
  }

  static isDirectVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return /\.(mp4|webm|m4v|mov|avi|mkv|m3u8)(\?.*)?$/i.test(lower);
  }

  static getDefaultHeaders(url) {
    if (!url) return {};

    try {
      const domain = new URL(url).hostname.toLowerCase();
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Range': 'bytes=0-',
        'Connection': 'keep-alive',
      };

      if (domain.includes('sendvid')) {
        headers['Referer'] = 'https://sendvid.com/';
        headers['Origin'] = 'https://sendvid.com';
      } else if (domain.includes('sibnet')) {
        headers['Referer'] = 'https://video.sibnet.ru/';
        headers['Origin'] = 'https://video.sibnet.ru';
      }

      return headers;
    } catch (e) {
      return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
    }
  }
}

// Fonction pour extraire l'URL initiale de l'épisode
function pickInitialUrlFromEpisode(ep = {}) {
  if (!ep) return null;
  if (typeof ep.url === "string" && ep.url) return ep.url;
  const langs = ep?.languages || {};
  const order = ["VOSTFR", "VF", "FR", "VOST", "SUB", "DEFAULT"];
  for (const k of order) {
    if (langs[k] && langs[k].length) {
      const pick = langs[k].find(Boolean);
      if (pick) return pick;
    }
  }
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
  const { episode = {}, anime = {} } = route.params || {};

  // États du player
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerSource, setPlayerSource] = useState(null);

  // Animation des contrôles
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const fadeTimer = useRef(null);

  // Player expo-video (compatible Expo Go)
  const player = useVideoPlayer({ uri: null });

  // Events
  const status = useEvent(player, "statusChange") || {};
  const time = useEvent(player, "timeUpdate") || {};
  const errorEvent = useEvent(player, "error") || {};

  const isLoaded = status.isLoaded ?? false;
  const currentTime = time.currentTime ?? 0;
  const duration = time.duration ?? 0;
  const isPlaying = player?.playing ?? false;

  console.log('🎬 [Expo Go] Player state:', { isLoaded, isPlaying, currentTime: Math.floor(currentTime), duration: Math.floor(duration) });

  // Initialisation vidéo
  useEffect(() => {
    const initializeVideo = async () => {
      const initialUrl = pickInitialUrlFromEpisode(episode);

      if (initialUrl) {
        console.log('🔍 [Expo Go] URL trouvée:', initialUrl.substring(0, 50) + '...');

        // Si URL directe, application immédiate
        if (VideoExtractor.isDirectVideoUrl(initialUrl)) {
          console.log('⚡ [Expo Go] URL directe détectée');
          applySource({
            uri: initialUrl,
            type: initialUrl.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4',
            headers: VideoExtractor.getDefaultHeaders(initialUrl),
          });
        }

        // Extraction API en arrière-plan
        try {
          setLoading(true);
          const extracted = await VideoExtractor.extractVideoUrl(initialUrl, { timeout: 30000 });
          console.log('✅ [Expo Go] Extraction réussie:', extracted.method);
          applySource({
            uri: extracted.url,
            type: extracted.type,
            headers: extracted.headers,
          });
        } catch (e) {
          console.log('⚠️ [Expo Go] Extraction échouée:', e.message);
          if (!playerSource && VideoExtractor.isDirectVideoUrl(initialUrl)) {
            applySource({
              uri: initialUrl,
              type: initialUrl.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4',
              headers: VideoExtractor.getDefaultHeaders(initialUrl),
            });
          }
        } finally {
          setLoading(false);
        }
      } else {
        console.log('❌ [Expo Go] Aucune URL trouvée');
        setError('Aucun lien vidéo disponible');
        setLoading(false);
      }
    };

    initializeVideo();
  }, [episode]);

  // Application de la source
  const applySource = (source) => {
    try {
      setPlayerSource(source);
      setError(null);
      console.log('🔧 [Expo Go] Application source:', source.uri?.substring(0, 50) + '...');
      console.log('📋 [Expo Go] Headers:', Object.keys(source.headers || {}).length);

      // Configuration expo-video
      player.source = {
        uri: source.uri,
        headers: source.headers || {},
      };

      // Auto-play avec délai pour Expo Go
      setTimeout(() => {
        try {
          player.play();
          console.log('▶️ [Expo Go] Lecture démarrée');
        } catch (e) {
          console.error('❌ [Expo Go] Erreur lecture:', e);
        }
      }, 1000); // Délai plus long pour Expo Go

    } catch (e) {
      console.error('❌ [Expo Go] Erreur application source:', e);
      setError('Erreur de configuration vidéo');
    }
  };

  // Configuration orientation (limitée dans Expo Go)
  useEffect(() => {
    const enableLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        console.log('🔄 [Expo Go] Orientation paysage');
      } catch (e) {
        console.log('⚠️ [Expo Go] Orientation error:', e.message);
      }
    };

    enableLandscape();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  // Gestion du chargement
  useEffect(() => {
    if (isLoaded) {
      setLoading(false);
      console.log('✅ [Expo Go] Vidéo chargée, durée:', Math.floor(duration), 's');
    }
  }, [isLoaded, duration]);

  // Gestion des erreurs
  useEffect(() => {
    if (errorEvent?.error) {
      console.error('❌ [Expo Go] Erreur player:', errorEvent.error);
      setError('Erreur de lecture: ' + (errorEvent.error.message || 'Inconnue'));
      setLoading(false);
    }
  }, [errorEvent]);

  // Auto-masquage des contrôles
  useEffect(() => {
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
    }

    if (controlsVisible && isPlaying && isLoaded && !loading) {
      fadeTimer.current = setTimeout(() => {
        hideControls();
      }, 4000);
    }

    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [controlsVisible, isPlaying, isLoaded, loading]);

  // Animations des contrôles
  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setControlsVisible(false);
    });
  };

  // Contrôles
  const togglePlayPause = () => {
    try {
      if (isPlaying) {
        player.pause();
        console.log('⏸️ [Expo Go] Pause');
      } else {
        player.play();
        console.log('▶️ [Expo Go] Play');
      }
      showControls();
    } catch (e) {
      console.error('[Expo Go] Erreur play/pause:', e);
    }
  };

  const seekTo = (time) => {
    try {
      const seekTime = Math.max(0, Math.min(time, duration));
      player.currentTime = seekTime;
      console.log('⏩ [Expo Go] Seek to:', Math.floor(seekTime), 's');
      showControls();
    } catch (e) {
      console.error('[Expo Go] Erreur seek:', e);
    }
  };

  const skipSeconds = (seconds) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    seekTo(newTime);
  };

  const formatTime = (seconds) => {
    const totalSecs = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Retry function
  const retryVideo = () => {
    setError(null);
    setLoading(true);
    const initialUrl = pickInitialUrlFromEpisode(episode);
    if (initialUrl) {
      console.log('🔄 [Expo Go] Retry vidéo');
      applySource({
        uri: initialUrl,
        type: initialUrl.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4',
        headers: VideoExtractor.getDefaultHeaders(initialUrl),
      });
    }
  };

  // Données d'affichage
  const displayTitle = episode?.showTitle || episode?.animeTitle || episode?.title || anime?.title || "Anime";
  const displaySubtitle = episode?.subtitle || 
    (episode?.number ? `E${episode.number}` + (episode?.subtitle ? ` - ${episode.subtitle}` : '') : 'Episode');

  // Interface d'erreur
  if (error && !playerSource) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar hidden />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={CRUNCHYROLL_COLORS.primary} />
          <Text style={styles.errorTitle}>Erreur de lecture</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorSubMessage}>Compatible Expo Go uniquement</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={retryVideo}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />

        {/* Zone tactile pour afficher contrôles */}
        <TouchableOpacity 
          style={styles.tapOverlay} 
          onPress={showControls}
          activeOpacity={1}
        />

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Chargement...</Text>
            <Text style={styles.loadingSubText}>Expo Go</Text>
          </View>
        )}

        {/* Contrôles style Crunchyroll - Interface exacte de l'image */}
        <Animated.View 
          style={[
            styles.controlsContainer,
            { opacity: controlsOpacity }
          ]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <View style={styles.controlsOverlay} />

          {/* Header - Titre + 4 icônes comme dans l'image */}
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.titleText} numberOfLines={1}>
                {displayTitle}
              </Text>
              <Text style={styles.subtitleText} numberOfLines={1}>
                {displaySubtitle}
              </Text>
            </View>

            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIconBtn}>
                <MaterialIcons name="bookmark-border" size={22} color={CRUNCHYROLL_COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn}>
                <MaterialIcons name="cast" size={22} color={CRUNCHYROLL_COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn}>
                <MaterialIcons name="settings" size={22} color={CRUNCHYROLL_COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconBtn} 
                onPress={() => navigation.goBack()}
              >
                <MaterialIcons name="fullscreen-exit" size={22} color={CRUNCHYROLL_COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contrôles centraux - Exactement comme dans l'image Crunchyroll */}
          <View style={styles.centerControls}>
            <TouchableOpacity 
              onPress={() => skipSeconds(-10)} 
              style={styles.skipButton}
            >
              <View style={styles.skipButtonCircle}>
                <MaterialCommunityIcons 
                  name="rewind-10" 
                  size={36} 
                  color={CRUNCHYROLL_COLORS.text} 
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={togglePlayPause} 
              style={styles.playButton}
            >
              <View style={styles.playButtonCircle}>
                <MaterialIcons 
                  name={isPlaying ? "pause" : "play-arrow"} 
                  size={48} 
                  color={CRUNCHYROLL_COLORS.text} 
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => skipSeconds(10)} 
              style={styles.skipButton}
            >
              <View style={styles.skipButtonCircle}>
                <MaterialCommunityIcons 
                  name="fast-forward-10" 
                  size={36} 
                  color={CRUNCHYROLL_COLORS.text} 
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer - Barre de progression exacte de l'image */}
          <View style={styles.footer}>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

              <Slider
                style={styles.progressSlider}
                value={currentTime}
                minimumValue={0}
                maximumValue={duration || 1}
                onValueChange={seekTo}
                onSlidingStart={showControls}
                minimumTrackTintColor={CRUNCHYROLL_COLORS.primary}
                maximumTrackTintColor={CRUNCHYROLL_COLORS.progressTrack}
                thumbTintColor={CRUNCHYROLL_COLORS.progressThumb}
                thumbStyle={styles.sliderThumb}
                trackStyle={styles.sliderTrack}
              />

              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CRUNCHYROLL_COLORS.background,
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: CRUNCHYROLL_COLORS.background,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: CRUNCHYROLL_COLORS.progressTrack,
    borderTopColor: CRUNCHYROLL_COLORS.primary,
    marginBottom: 16,
  },
  loadingText: {
    color: CRUNCHYROLL_COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  loadingSubText: {
    color: CRUNCHYROLL_COLORS.textMuted,
    fontSize: 12,
    opacity: 0.7,
  },

  // Erreur
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: CRUNCHYROLL_COLORS.background,
  },
  errorTitle: {
    color: CRUNCHYROLL_COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: CRUNCHYROLL_COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  errorSubMessage: {
    color: CRUNCHYROLL_COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: CRUNCHYROLL_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 6,
    marginBottom: 12,
  },
  retryButtonText: {
    color: CRUNCHYROLL_COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: CRUNCHYROLL_COLORS.surface,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 6,
  },
  backButtonText: {
    color: CRUNCHYROLL_COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },

  // Contrôles Crunchyroll - Layout exact de l'image
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CRUNCHYROLL_COLORS.overlay,
  },

  // Header - Titre + 4 icônes exactement comme dans l'image
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    zIndex: 2,
  },
  titleSection: {
    flex: 1,
    paddingRight: 20,
  },
  titleText: {
    color: CRUNCHYROLL_COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 4,
  },
  subtitleText: {
    color: CRUNCHYROLL_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: 12,
  },

  // Contrôles centraux - Rewind 10, Play triangulaire, Forward 10
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 32,
  },
  skipButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 32,
  },
  playButtonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer - Barre de progression style Crunchyroll avec temps
  footer: {
    paddingBottom: 8,
    zIndex: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timeText: {
    color: CRUNCHYROLL_COLORS.text,
    fontSize: 13,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'center',
  },
  progressSlider: {
    flex: 1,
    height: 32,
    marginHorizontal: 12,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  sliderTrack: {
    height: 3,
    borderRadius: 1.5,
  },
});