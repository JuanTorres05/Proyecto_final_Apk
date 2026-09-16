import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { getAllBooksLocal } from '../database/sqlite';
import BookCard from '../components/BookCard';
import SyncBanner from '../components/SyncBanner';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  'Todos',
  'Literatura',
  'Ingeniería de Software',
  'Clásicos',
  'Computación',
  'Filosofía',
  'Historia'
];

export default function BooksCatalogScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { isOnline, triggerSync } = useNetwork();
  const { token } = useAuth();

  const loadBooks = useCallback(() => {
    try {
      const results = getAllBooksLocal(search, selectedCategory, availableOnly);
      setBooks(results);
    } catch (e) {
      console.error('Error cargando libros locales:', e);
    }
  }, [search, selectedCategory, availableOnly]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isOnline && token) {
      await triggerSync(token);
    }
    loadBooks();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SyncBanner />

      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={17} color={THEME.colors.accent} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar en el archivo nocturno..."
            placeholderTextColor={THEME.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Filter bar */}
        <View style={styles.filterRow}>
          <Text style={styles.resultsCountText}>
            {books.length} {books.length === 1 ? 'volumen disponible' : 'volúmenes disponibles'}
          </Text>
          <View style={styles.switchWrapper}>
            <Text style={styles.switchLabel}>Solo ejemplares en sala</Text>
            <Switch
              value={availableOnly}
              onValueChange={setAvailableOnly}
              trackColor={{ false: '#263D61', true: 'rgba(232, 163, 61, 0.4)' }}
              thumbColor={availableOnly ? THEME.colors.accent : '#6B82A6'}
            />
          </View>
        </View>

        {/* Books List */}
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.accent}
              colors={[THEME.colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={44} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>Ningún volumen coincide</Text>
              <Text style={styles.emptySubtitle}>Explora otras constelaciones o términos de búsqueda.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  categoryPillActive: {
    backgroundColor: THEME.colors.accent,
    borderColor: THEME.colors.accent,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#0F1B2D',
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  resultsCountText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
