// screens/SearchScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { cleanAndGroupAnime } from '../components/Filters';
import { searchAniListGrouped } from '../api/api';

export default function SearchScreen({ route, navigation }) {
  const initialQuery = route?.params?.query || '';
  const [text, setText] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const canSearch = useMemo(() => (text || '').trim().length > 0, [text]);

  const doSearch = async () => {
    const q = text.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg('');
    try {
      // 1️⃣ Récupération des données depuis AniList
      const apiResults = await searchAniListGrouped(q, 36);

      // 2️⃣ Application du filtre + regroupement des saisons/films/OVA/ONA
      let filteredResults = cleanAndGroupAnime(apiResults);

      // 3️⃣ Tri par popularité décroissante
      filteredResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      // 4️⃣ Mise à jour du state pour l'affichage
      setResults(filteredResults);
    } catch (e) {
      setErrorMsg('Erreur de recherche. Réessaie.');
      console.error('Search error:', e);
    } finally {
      setLoading(false);
      Keyboard.dismiss();
    }
};


  useEffect(() => {
    if (initialQuery) {
      setTimeout(doSearch, 0);
    }
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('AnimeDetails', {
          animeId: item.id,
          anime: item,
        })
      }
    >
      <Image source={{ uri: item.posterImage }} style={styles.poster} />
      <Text numberOfLines={2} style={styles.title}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher un anime…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          returnKeyType="search"
          onSubmitEditing={doSearch}
          autoFocus={!initialQuery}
        />
        <TouchableOpacity
          onPress={() => {
            setText('');
            setResults([]);
          }}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {!loading && !!errorMsg && (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMsg}</Text>
        </View>
      )}

      {!loading && !errorMsg && results.length === 0 && !!text.trim() && (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucun résultat pour “{text.trim()}”.</Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(it) => String(it.id)}
          numColumns={3}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 10, paddingTop: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ff6666' },
  empty: { color: colors.textMuted },
  list: { paddingBottom: 20 },
  card: { flex: 1 / 3, margin: 6, alignItems: 'center' },
  poster: { width: 110, height: 160, borderRadius: 8, backgroundColor: '#1a1a1a' },
  title: { color: colors.text, fontSize: 12, marginTop: 4, textAlign: 'center' },
});
