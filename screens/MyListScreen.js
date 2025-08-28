// MyListScreen.js - Ma Liste Premium avec animations
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Couleurs Crunchyroll + améliorations
const COLORS = {
  primary: '#FF6B1A',
  secondary: '#F47521',
  background: '#0B0B0B',
  surface: '#141414',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  border: '#2A2A2A',
  success: '#4CAF50',
  error: '#F44336',
  premium: '#FFD700',
  new: '#00BCD4',
  watching: '#4CAF50',
  completed: '#2196F3',
  paused: '#FF9800',
  dropped: '#F44336',
  planToWatch: '#9C27B0',
};

// ===============================
// 🗄️ STORAGE MANAGER
// ===============================
class MyListStorage {
  static KEYS = {
    LISTS: 'mylist_lists',
    CUSTOM_LISTS: 'mylist_custom',
    ANIME_STATUS: 'mylist_status',
    STATS: 'mylist_stats'
  };

  static async getLists() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.LISTS);
      return data ? JSON.parse(data) : this.getDefaultLists();
    } catch (error) {
      console.error('Error loading lists:', error);
      return this.getDefaultLists();
    }
  }

  static async saveLists(lists) {
    try {
      await AsyncStorage.setItem(this.KEYS.LISTS, JSON.stringify(lists));
    } catch (error) {
      console.error('Error saving lists:', error);
    }
  }

  static async getCustomLists() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CUSTOM_LISTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading custom lists:', error);
      return [];
    }
  }

  static async saveCustomLists(customLists) {
    try {
      await AsyncStorage.setItem(this.KEYS.CUSTOM_LISTS, JSON.stringify(customLists));
    } catch (error) {
      console.error('Error saving custom lists:', error);
    }
  }

  static async getAnimeStatus(animeId) {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.ANIME_STATUS);
      const statusData = data ? JSON.parse(data) : {};
      return statusData[animeId] || null;
    } catch (error) {
      console.error('Error loading anime status:', error);
      return null;
    }
  }

  static async setAnimeStatus(animeId, status) {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.ANIME_STATUS);
      const statusData = data ? JSON.parse(data) : {};
      statusData[animeId] = {
        ...status,
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.KEYS.ANIME_STATUS, JSON.stringify(statusData));
    } catch (error) {
      console.error('Error saving anime status:', error);
    }
  }

  static async removeAnimeFromAllLists(animeId) {
    try {
      const lists = await this.getLists();
      const customLists = await this.getCustomLists();
      
      // Remove from default lists
      Object.keys(lists).forEach(listKey => {
        lists[listKey] = lists[listKey].filter(anime => anime.id !== animeId);
      });

      // Remove from custom lists
      customLists.forEach(customList => {
        customList.animes = customList.animes.filter(anime => anime.id !== animeId);
      });

      await this.saveLists(lists);
      await this.saveCustomLists(customLists);

      // Remove status
      const data = await AsyncStorage.getItem(this.KEYS.ANIME_STATUS);
      const statusData = data ? JSON.parse(data) : {};
      delete statusData[animeId];
      await AsyncStorage.setItem(this.KEYS.ANIME_STATUS, JSON.stringify(statusData));
    } catch (error) {
      console.error('Error removing anime:', error);
    }
  }

  static getDefaultLists() {
    return {
      watching: [],
      completed: [],
      paused: [],
      dropped: [],
      planToWatch: []
    };
  }

  static async getStats() {
    try {
      const lists = await this.getLists();
      const customLists = await this.getCustomLists();
      
      const stats = {
        totalAnimes: 0,
        watching: lists.watching.length,
        completed: lists.completed.length,
        paused: lists.paused.length,
        dropped: lists.dropped.length,
        planToWatch: lists.planToWatch.length,
        customLists: customLists.length,
        totalEpisodes: 0,
        totalHours: 0
      };

      stats.totalAnimes = stats.watching + stats.completed + stats.paused + stats.dropped + stats.planToWatch;
      
      // Calculate episodes and hours (estimation)
      Object.values(lists).flat().forEach(anime => {
        const episodes = anime.episodes || anime.episodeCount || 12; // Default 12 episodes
        stats.totalEpisodes += episodes;
        stats.totalHours += episodes * 0.4; // 24min per episode
      });

      return stats;
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalAnimes: 0,
        watching: 0,
        completed: 0,
        paused: 0,
        dropped: 0,
        planToWatch: 0,
        customLists: 0,
        totalEpisodes: 0,
        totalHours: 0
      };
    }
  }
}

// ===============================
// 🎨 COMPOSANTS ANIMÉS
// ===============================
const AnimatedListItem = ({ anime, onPress, onLongPress, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateY }
          ]
        },
        style
      ]}
    >
      <TouchableOpacity
        style={styles.animeItem}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.animeImageContainer}>
          <Image
            source={{ uri: anime.posterImage || anime.image }}
            style={styles.animeImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.animeImageGradient}
          />
        </View>
        
        <View style={styles.animeInfo}>
          <Text style={styles.animeTitle} numberOfLines={2}>
            {anime.title || anime.title_en || anime.title_romaji}
          </Text>
          <Text style={styles.animeGenres} numberOfLines={1}>
            {Array.isArray(anime.genres) ? anime.genres.slice(0, 3).join(' • ') : 'Animation'}
          </Text>
          {anime.progress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(anime.progress.current / anime.progress.total) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {anime.progress.current}/{anime.progress.total}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.animeActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="play" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Stats Card Component
const StatsCard = ({ stats }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
      <Text style={styles.statsTitle}>📊 Mes Statistiques</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalAnimes}</Text>
          <Text style={styles.statLabel}>Animes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{Math.round(stats.totalHours)}h</Text>
          <Text style={styles.statLabel}>Visionnées</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.customLists}</Text>
          <Text style={styles.statLabel}>Listes</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: COLORS.watching + '20' }]}>
          <Text style={[styles.statCardNumber, { color: COLORS.watching }]}>{stats.watching}</Text>
          <Text style={styles.statCardLabel}>En cours</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.completed + '20' }]}>
          <Text style={[styles.statCardNumber, { color: COLORS.completed }]}>{stats.completed}</Text>
          <Text style={styles.statCardLabel}>Terminés</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.planToWatch + '20' }]}>
          <Text style={[styles.statCardNumber, { color: COLORS.planToWatch }]}>{stats.planToWatch}</Text>
          <Text style={styles.statCardLabel}>À voir</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ===============================
// 🎬 COMPOSANT PRINCIPAL
// ===============================
export default function MyListScreen() {
  const navigation = useNavigation();
  
  // États
  const [lists, setLists] = useState({});
  const [customLists, setCustomLists] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('watching');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showStats, setShowStats] = useState(true);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Catégories de listes
  const categories = [
    { key: 'watching', label: '📺 En cours', color: COLORS.watching },
    { key: 'planToWatch', label: '📋 À regarder', color: COLORS.planToWatch },
    { key: 'completed', label: '✅ Terminé', color: COLORS.completed },
    { key: 'paused', label: '⏸️ En pause', color: COLORS.paused },
    { key: 'dropped', label: '❌ Abandonné', color: COLORS.dropped },
  ];

  // ===============================
  // 📡 CHARGEMENT DES DONNÉES
  // ===============================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listsData, customListsData, statsData] = await Promise.all([
        MyListStorage.getLists(),
        MyListStorage.getCustomLists(),
        MyListStorage.getStats()
      ]);
      
      setLists(listsData);
      setCustomLists(customListsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger vos listes');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ===============================
  // 🎯 FONCTIONS UTILITAIRES
  // ===============================
  const addAnimeToList = useCallback(async (anime, listKey) => {
    try {
      const updatedLists = { ...lists };
      const animeData = {
        ...anime,
        addedAt: new Date().toISOString(),
        progress: anime.progress || { current: 0, total: anime.episodes || 12 }
      };

      // Remove from other lists first
      Object.keys(updatedLists).forEach(key => {
        if (key !== listKey) {
          updatedLists[key] = updatedLists[key].filter(item => item.id !== anime.id);
        }
      });

      // Add to selected list
      if (!updatedLists[listKey]) updatedLists[listKey] = [];
      const exists = updatedLists[listKey].find(item => item.id === anime.id);
      if (!exists) {
        updatedLists[listKey].unshift(animeData);
      }

      setLists(updatedLists);
      await Promise.all([
        MyListStorage.saveLists(updatedLists),
        MyListStorage.setAnimeStatus(anime.id, { 
          status: listKey, 
          addedAt: animeData.addedAt,
          progress: animeData.progress 
        })
      ]);

      // Refresh stats
      const newStats = await MyListStorage.getStats();
      setStats(newStats);
      
    } catch (error) {
      console.error('Error adding anime to list:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'anime à la liste');
    }
  }, [lists]);

  const removeAnimeFromList = useCallback(async (animeId, listKey) => {
    try {
      const updatedLists = { ...lists };
      updatedLists[listKey] = updatedLists[listKey].filter(anime => anime.id !== animeId);
      
      setLists(updatedLists);
      await MyListStorage.saveLists(updatedLists);
      
      // Refresh stats
      const newStats = await MyListStorage.getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error removing anime:', error);
    }
  }, [lists]);

  const createCustomList = useCallback(async () => {
    if (!newListName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la liste');
      return;
    }

    try {
      const newList = {
        id: Date.now().toString(),
        name: newListName.trim(),
        animes: [],
        createdAt: new Date().toISOString(),
        color: COLORS.primary
      };

      const updatedCustomLists = [...customLists, newList];
      setCustomLists(updatedCustomLists);
      await MyListStorage.saveCustomLists(updatedCustomLists);
      
      setNewListName('');
      setShowCreateModal(false);
      
      Alert.alert('Succès', `Liste "${newListName}" créée avec succès!`);
    } catch (error) {
      console.error('Error creating custom list:', error);
      Alert.alert('Erreur', 'Impossible de créer la liste');
    }
  }, [newListName, customLists]);

  const handleAnimePress = useCallback((anime) => {
    navigation.navigate('AnimeDetails', { anime });
  }, [navigation]);

  const handleAnimeLongPress = useCallback((anime, listKey) => {
    Alert.alert(
      anime.title || 'Anime',
      'Que voulez-vous faire?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Voir les détails', onPress: () => handleAnimePress(anime) },
        { 
          text: 'Retirer de la liste', 
          style: 'destructive',
          onPress: () => removeAnimeFromList(anime.id, listKey)
        },
      ]
    );
  }, [handleAnimePress, removeAnimeFromList]);

  // ===============================
  // 🎨 COMPOSANTS DE RENDU
  // ===============================
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.headerContent}>
        <Text style={styles.headerTitle}>Ma Liste</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowStats(!showStats)}
        >
          <Ionicons 
            name={showStats ? "stats-chart" : "stats-chart-outline"} 
            size={24} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => {
          const count = lists[category.key]?.length || 0;
          const isSelected = selectedCategory === category.key;
          
          return (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipActive,
                { borderColor: category.color }
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text 
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextActive,
                  { color: isSelected ? COLORS.background : category.color }
                ]}
              >
                {category.label}
              </Text>
              {count > 0 && (
                <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
                  <Text style={styles.categoryBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Custom Lists */}
      {customLists.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoriesContent, { marginTop: 10 }]}
        >
          {customLists.map((customList) => (
            <TouchableOpacity
              key={customList.id}
              style={[
                styles.categoryChip,
                styles.customListChip,
                { borderColor: customList.color }
              ]}
            >
              <Text style={[styles.categoryChipText, { color: customList.color }]}>
                📁 {customList.name}
              </Text>
              {customList.animes.length > 0 && (
                <View style={[styles.categoryBadge, { backgroundColor: customList.color }]}>
                  <Text style={styles.categoryBadgeText}>{customList.animes.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Add Custom List Button */}
      <TouchableOpacity 
        style={styles.addListButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={20} color={COLORS.primary} />
        <Text style={styles.addListText}>Créer une liste</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAnimeList = () => {
    const currentList = lists[selectedCategory] || [];
    
    if (currentList.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="film-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyStateTitle}>Aucun anime dans cette liste</Text>
          <Text style={styles.emptyStateText}>
            Ajoutez des animes depuis la page de détails ou parcourez le catalogue
          </Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Browse' })}
          >
            <Text style={styles.browseButtonText}>Parcourir le catalogue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <AnimatedListItem
            anime={item}
            onPress={() => handleAnimePress(item)}
            onLongPress={() => handleAnimeLongPress(item, selectedCategory)}
            style={{
              opacity: new Animated.Value(0),
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      />
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Créer une nouvelle liste</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="Nom de la liste"
            placeholderTextColor={COLORS.textMuted}
            value={newListName}
            onChangeText={setNewListName}
            autoFocus
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setShowCreateModal(false);
                setNewListName('');
              }}
            >
              <Text style={styles.modalButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={createCustomList}
            >
              <Text style={[styles.modalButtonText, { color: COLORS.background }]}>
                Créer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ===============================
  // 🎨 RENDU PRINCIPAL
  // ===============================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de vos listes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {renderHeader()}
      
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {showStats && <StatsCard stats={stats} />}
          {renderCategories()}
          {renderAnimeList()}
        </View>
      </Animated.ScrollView>
      
      {renderCreateModal()}
    </View>
  );
}

// Export des fonctions utilitaires pour les autres écrans
export { MyListStorage };

// ===============================
// 🎨 STYLES
// ===============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 100,
  },
  
  // Stats
  statsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statCardNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statCardLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },

  // Categories
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
    backgroundColor: COLORS.surface,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: COLORS.background,
  },
  categoryBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
  },
  customListChip: {
    borderStyle: 'dashed',
  },
  addListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addListText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Anime List
  listContainer: {
    paddingHorizontal: 20,
  },
  listSeparator: {
    height: 12,
  },
  animeItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  animeImageContainer: {
    width: 100,
    height: 140,
    position: 'relative',
  },
  animeImage: {
    width: '100%',
    height: '100%',
  },
  animeImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  animeInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  animeTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  animeGenres: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  animeActions: {
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  browseButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});