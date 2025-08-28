// config.js - Configuration des URLs de backend
import { Platform } from 'react-native';

// Configuration selon l'environnement
const isDevelopment = __DEV__;
const isAndroid = Platform.OS === 'android';

// URLs de backend
export const BACKEND_CONFIG = {
  // Ancien backend (fallback)
  legacy: 'https://video-extractor-wqlx.onrender.com',
  
  // Nouveau backend (votre backend Render)
  new: 'https://video-extractor-wqlx.onrender.com', // TODO: Remplacer par votre vraie URL Render
  
  // URL principale à utiliser
  primary: 'https://video-extractor-wqlx.onrender.com' // URL de votre serveur Render principal
  
  // Timeouts
  timeout: {
    health: 5000,
    extract: 15000,
    stream: 20000
  }
};

// Fonction pour obtenir l'URL du nouveau backend
export function getNewBackendUrl() {
  return BACKEND_CONFIG.new;
}

// Fonction pour obtenir l'URL de l'ancien backend
export function getLegacyBackendUrl() {
  return BACKEND_CONFIG.legacy;
}

// Fonction pour obtenir l'URL principale du backend
export function getPrimaryBackendUrl() {
  return BACKEND_CONFIG.primary;
}

// Configuration des headers par défaut
export const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Shinime/1.0'
};

// Configuration des extracteurs supportés
export const SUPPORTED_HOSTS = [
  'sibnet.ru',
  'sendvid.com', 
  'vk.com',
  'streamable.com',
  'myvi.tv',
  'myvi.ru',
  'youtube.com',
  'youtu.be'
];
