import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';

export default function StarRating({ rating = 0, size = 16, interactive = false, onRate, showValue = false }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {stars.map((star) => {
          const isFilled = star <= Math.round(rating);
          const icon = (
            <Ionicons
              key={star}
              name={isFilled ? 'star' : 'star-outline'}
              size={size}
              color={isFilled ? THEME.colors.accent : THEME.colors.surfaceBorder}
              style={styles.star}
            />
          );

          if (interactive && onRate) {
            return (
              <TouchableOpacity key={star} onPress={() => onRate(star)} activeOpacity={0.7}>
                {icon}
              </TouchableOpacity>
            );
          }
          return icon;
        })}
      </View>
      {showValue && (
        <Text style={[styles.ratingText, { fontSize: size * 0.85 }]}>
          {parseFloat(rating).toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 6,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
});
