import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import StarRating from './StarRating';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';

export default function BookCard({ book, onPress }) {
  const isAvailable = book.available_stock > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{
          uri: book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'
        }}
        style={styles.cover}
      />
      <View style={styles.info}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText} numberOfLines={1}>{book.category}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>Por {book.author}</Text>

        <View style={styles.ratingRow}>
          <StarRating rating={book.average_rating || 0} size={13} showValue={true} />
          <Text style={styles.reviewCount}>({book.review_count || 0})</Text>
        </View>

        <View style={styles.footerRow}>
          <View style={[styles.stockPill, isAvailable ? styles.stockAvailable : styles.stockDepleted]}>
            <Ionicons
              name={isAvailable ? 'checkmark-circle' : 'alert-circle'}
              size={12}
              color={isAvailable ? THEME.colors.success : THEME.colors.alert}
            />
            <Text style={[styles.stockText, isAvailable ? styles.stockTextAvailable : styles.stockTextDepleted]}>
              {isAvailable ? `${book.available_stock} disponibles` : 'Sin ejemplares'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  cover: {
    width: 80,
    height: 115,
    borderRadius: 6,
    backgroundColor: '#0A121E',
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(232, 163, 61, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.25)',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accent,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
  },
  author: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  stockAvailable: {
    backgroundColor: THEME.colors.successBg,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  stockDepleted: {
    backgroundColor: THEME.colors.alertBg,
    borderWidth: 1,
    borderColor: THEME.colors.alertBorder,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockTextAvailable: {
    color: THEME.colors.success,
  },
  stockTextDepleted: {
    color: THEME.colors.alert,
  },
});
