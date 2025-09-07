// AccountScreen.js - Interface de compte utilisateur ultra-moderne avec animations

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  PanGesturer,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Couleurs theme anime
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
  legendary: '#9C27B0',
  epic: '#FF5722',
  rare: '#2196F3',
};

// Avatar par défaut
const DEFAULT_AVATAR = 'https://i.pravatar.cc/200?img=68';

// Données utilisateur mockées
const USER_DATA = {
  username: 'Otaku_Master',
  email: 'otaku.master@shinime.app',
  memberSince: '2023',
  avatar: DEFAULT_AVATAR,
  level: 47,
  xp: 23850,
  maxXp: 25000,
  premium: true,
  stats: {
    animeWatched: 1247,
    episodesWatched: 12847,
    hoursWatched: 2847,
    favorites: 156,
    completed: 892,
    planToWatch: 234,
    dropped: 23,
    currentlyWatching: 12,
  },
  achievements: [
    { id: 1, name: 'Otaku Legend', description: '1000+ animes regardés', icon: 'trophy', color: COLORS.legendary, unlocked: true },
    { id: 2, name: 'Marathon King', description: '24h de visionnage d\'affilée', icon: 'clock-fast', color: COLORS.epic, unlocked: true },
    { id: 3, name: 'Collector', description: '100+ favoris', icon: 'heart-multiple', color: COLORS.rare, unlocked: true },
    { id: 4, name: 'Early Bird', description: 'Membre depuis 2023', icon: 'account-star', color: COLORS.success, unlocked: true },
    { id: 5, name: 'Perfectionist', description: '500+ animes terminés', icon: 'check-all', color: COLORS.premium, unlocked: false },
  ],
  recentActivity: [
    { type: 'watched', anime: 'Attack on Titan', episode: 'S4 E28', time: '2 heures' },
    { type: 'added', anime: 'Demon Slayer', time: '1 jour' },
    { type: 'completed', anime: 'Death Note', time: '3 jours' },
    { type: 'rated', anime: 'One Piece', rating: 5, time: '1 semaine' },
  ]
};

export default function AccountScreen() {
  const navigation = useNavigation();
  
  // États
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('profile');
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animation parallax pour le header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150, 200],
    outputRange: [1, 0.7, 0.3],
    extrapolate: 'clamp',
  });
  
  const avatarScale = scrollY.interpolate({
    inputRange: [0, 100, 200],
    outputRange: [1, 0.8, 0.6],
    extrapolate: 'clamp',
  });
  
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Initialisation des animations
  useEffect(() => {
    // Animation d'entrée en séquence
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Animation de rotation continue
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
    
    // Animation de pulsation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Fonctions
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simuler le chargement
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleEditProfile = () => {
    Alert.alert('Modification du profil', 'Fonctionnalité bientôt disponible!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: () => navigation.navigate('Login') },
      ]
    );
  };

  // Composants de rendu
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }]
        }
      ]}
    >
      {/* Background animé */}
      <Animated.View
        style={[
          styles.headerBackground,
          {
            transform: [{
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary, COLORS.legendary]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      
      {/* Blur overlay */}
      <BlurView intensity={80} style={styles.blurOverlay} />
      
      {/* Header content */}
      <View style={styles.headerContent}>
        {/* Avatar avec animation */}
        <Animated.View 
          style={[
            styles.avatarContainer,
            {
              transform: [
                { scale: Animated.multiply(avatarScale, pulseAnim) },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <Image source={{ uri: USER_DATA.avatar }} style={styles.avatar} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{USER_DATA.level}</Text>
          </View>
          {USER_DATA.premium && (
            <View style={styles.premiumBadge}>
              <MaterialIcons name="diamond" size={16} color={COLORS.premium} />
            </View>
          )}
        </Animated.View>
        
        {/* Infos utilisateur */}
        <Animated.View 
          style={[
            styles.userInfo,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.username}>{USER_DATA.username}</Text>
          <Text style={styles.email}>{USER_DATA.email}</Text>
          <Text style={styles.memberSince}>Membre depuis {USER_DATA.memberSince}</Text>
          
          {/* Barre XP */}
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <Animated.View 
                style={[
                  styles.xpFill,
                  { 
                    width: `${(USER_DATA.xp / USER_DATA.maxXp) * 100}%`,
                    transform: [{ scaleX: fadeAnim }]
                  }
                ]} 
              />
            </View>
            <Text style={styles.xpText}>{USER_DATA.xp}/{USER_DATA.maxXp} XP</Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { key: 'profile', label: 'Profil', icon: 'account' },
        { key: 'stats', label: 'Stats', icon: 'chart-line' },
        { key: 'achievements', label: 'Succès', icon: 'trophy' },
        { key: 'settings', label: 'Paramètres', icon: 'cog' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
          onPress={() => setSelectedTab(tab.key)}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={20}
            color={selectedTab === tab.key ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[
            styles.tabText,
            selectedTab === tab.key && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Statistiques de visionnage</Text>
      
      <View style={styles.statsGrid}>
        {[
          { label: 'Animes regardés', value: USER_DATA.stats.animeWatched, icon: 'television-play', color: COLORS.primary },
          { label: 'Épisodes vus', value: USER_DATA.stats.episodesWatched, icon: 'play-circle', color: COLORS.secondary },
          { label: 'Heures regardées', value: USER_DATA.stats.hoursWatched, icon: 'clock', color: COLORS.success },
          { label: 'Favoris', value: USER_DATA.stats.favorites, icon: 'heart', color: COLORS.error },
          { label: 'Terminés', value: USER_DATA.stats.completed, icon: 'check-circle', color: COLORS.premium },
          { label: 'À regarder', value: USER_DATA.stats.planToWatch, icon: 'bookmark', color: COLORS.rare },
        ].map((stat, index) => (
          <Animated.View
            key={stat.label}
            style={[
              styles.statCard,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 50 + index * 10]
                  })
                }]
              }
            ]}
          >
            <LinearGradient
              colors={[stat.color + '20', stat.color + '10']}
              style={styles.statCardGradient}
            />
            <MaterialCommunityIcons name={stat.icon} size={24} color={stat.color} />
            <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsContainer}>
      <Text style={styles.sectionTitle}>Succès débloqés</Text>
      
      <View style={styles.achievementsList}>
        {USER_DATA.achievements.map((achievement, index) => (
          <Animated.View
            key={achievement.id}
            style={[
              styles.achievementCard,
              {
                opacity: achievement.unlocked ? 1 : 0.5,
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}
          >
            <LinearGradient
              colors={achievement.unlocked 
                ? [achievement.color + '30', achievement.color + '10']
                : [COLORS.border, COLORS.surface]
              }
              style={styles.achievementGradient}
            />
            
            <View style={[styles.achievementIcon, { backgroundColor: achievement.color + '20' }]}>
              <MaterialCommunityIcons
                name={achievement.icon}
                size={28}
                color={achievement.unlocked ? achievement.color : COLORS.textMuted}
              />
            </View>
            
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementName, !achievement.unlocked && styles.lockedText]}>
                {achievement.name}
              </Text>
              <Text style={[styles.achievementDescription, !achievement.unlocked && styles.lockedText]}>
                {achievement.description}
              </Text>
            </View>
            
            {achievement.unlocked && (
              <MaterialIcons name="verified" size={20} color={achievement.color} />
            )}
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.activityContainer}>
      <Text style={styles.sectionTitle}>Activité récente</Text>
      
      {USER_DATA.recentActivity.map((activity, index) => (
        <Animated.View
          key={index}
          style={[
            styles.activityItem,
            {
              opacity: fadeAnim,
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [-50, 0]
                })
              }]
            }
          ]}
        >
          <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.type) + '20' }]}>
            <MaterialCommunityIcons
              name={getActivityIcon(activity.type)}
              size={20}
              color={getActivityColor(activity.type)}
            />
          </View>
          
          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>
              {getActivityText(activity)}
            </Text>
            <Text style={styles.activityTime}>{activity.time}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>Paramètres</Text>
      
      {[
        { title: 'Modifier le profil', icon: 'account-edit', onPress: handleEditProfile },
        { title: 'Préférences de lecture', icon: 'play-circle-outline', onPress: () => {} },
        { title: 'Notifications', icon: 'bell-outline', onPress: () => {} },
        { title: 'Langue et région', icon: 'translate', onPress: () => {} },
        { title: 'Confidentialité', icon: 'shield-account', onPress: () => {} },
        { title: 'À propos', icon: 'information-outline', onPress: () => {} },
        { title: 'Déconnexion', icon: 'logout', onPress: handleLogout, color: COLORS.error },
      ].map((setting, index) => (
        <TouchableOpacity
          key={setting.title}
          style={styles.settingItem}
          onPress={setting.onPress}
        >
          <MaterialCommunityIcons
            name={setting.icon}
            size={24}
            color={setting.color || COLORS.textSecondary}
          />
          <Text style={[styles.settingText, setting.color && { color: setting.color }]}>
            {setting.title}
          </Text>
          <MaterialIcons name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'profile':
        return (
          <View>
            {renderStats()}
            {renderRecentActivity()}
          </View>
        );
      case 'stats':
        return renderStats();
      case 'achievements':
        return renderAchievements();
      case 'settings':
        return renderSettings();
      default:
        return null;
    }
  };

  // Fonctions utilitaires
  const getActivityIcon = (type) => {
    switch (type) {
      case 'watched': return 'play';
      case 'added': return 'plus';
      case 'completed': return 'check';
      case 'rated': return 'star';
      default: return 'circle';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'watched': return COLORS.primary;
      case 'added': return COLORS.success;
      case 'completed': return COLORS.premium;
      case 'rated': return COLORS.secondary;
      default: return COLORS.textMuted;
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'watched':
        return `A regardé ${activity.anime} - ${activity.episode}`;
      case 'added':
        return `A ajouté ${activity.anime} à sa liste`;
      case 'completed':
        return `A terminé ${activity.anime}`;
      case 'rated':
        return `A noté ${activity.anime} ${activity.rating}/5 ⭐`;
      default:
        return 'Activité inconnue';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Particles d'arrière-plan */}
      <View style={styles.particlesContainer}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: [{
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${360 + Math.random() * 180}deg`]
                  })
                }]
              }
            ]}
          />
        ))}
      </View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {renderHeader()}
        {renderTabs()}
        {renderContent()}
        
        {/* Footer avec logo */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Shinime • Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Particles
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: COLORS.primary + '30',
    borderRadius: 1.5,
  },
  
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  
  // Header
  headerContainer: {
    height: 300,
    position: 'relative',
  },
  headerBackground: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    height: 500,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  
  // Avatar
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  levelText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  premiumBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: COLORS.background,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.premium,
  },
  
  // User Info
  userInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  
  // XP Bar
  xpContainer: {
    alignItems: 'center',
    width: 200,
  },
  xpBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  xpText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.primary + '20',
  },
  tabText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  
  // Sections
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  
  // Stats
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Achievements
  achievementsContainer: {
    marginBottom: 24,
  },
  achievementsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  achievementGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lockedText: {
    color: COLORS.textMuted,
  },
  
  // Activity
  activityContainer: {
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // Settings
  settingsContainer: {
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 16,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});