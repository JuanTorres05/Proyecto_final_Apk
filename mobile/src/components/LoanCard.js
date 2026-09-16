import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';

export default function LoanCard({ loan, onReturn }) {
  const isReturned = loan.status === 'RETURNED';
  const dueDate = new Date(loan.due_date);
  const now = new Date();
  const isOverdue = !isReturned && (now > dueDate || loan.status === 'OVERDUE');

  // Calculate days remaining or days late
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Image
          source={{
            uri: loan.book_cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'
          }}
          style={styles.bookCover}
        />
        <View style={styles.infoCol}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {loan.book_title || 'Libro en préstamo'}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {loan.book_author || ''}
          </Text>

          <View style={styles.datesContainer}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Préstamo:</Text>
              <Text style={styles.dateValue}>{formatDate(loan.loan_date)}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Límite:</Text>
              <Text style={[styles.dateValue, isOverdue && styles.dateValueOverdue]}>
                {formatDate(loan.due_date)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statusFooter}>
        <View style={styles.badgeCol}>
          <View
            style={[
              styles.statusBadge,
              isReturned
                ? styles.badgeReturned
                : isOverdue
                ? styles.badgeOverdue
                : styles.badgeActive
            ]}
          >
            <Ionicons
              name={
                isReturned
                  ? 'checkmark-circle-outline'
                  : isOverdue
                  ? 'alert-circle'
                  : 'moon-outline'
              }
              size={13}
              color={
                isReturned
                  ? THEME.colors.success
                  : isOverdue
                  ? THEME.colors.alert
                  : THEME.colors.accent
              }
            />
            <Text
              style={[
                styles.statusText,
                isReturned
                  ? styles.textReturned
                  : isOverdue
                  ? styles.textOverdue
                  : styles.textActive
              ]}
            >
              {isReturned
                ? 'DEVUELTO'
                : isOverdue
                ? `VENCIDO (${Math.abs(diffDays)}d retraso)`
                : `ACTIVO (${diffDays} días restantes)`}
            </Text>
          </View>
        </View>

        {!isReturned && onReturn && (
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => onReturn(loan)}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-undo-outline" size={13} color="#0F1B2D" />
            <Text style={styles.returnButtonText}>Devolver</Text>
          </TouchableOpacity>
        )}
      </View>

      {loan.sync_status === 'PENDING' && (
        <View style={styles.syncPendingRow}>
          <Ionicons name="cloud-upload-outline" size={12} color={THEME.colors.accent} />
          <Text style={styles.syncPendingText}>Guardado en SQLite (pendiente de sincronizar)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
  },
  bookCover: {
    width: 60,
    height: 88,
    borderRadius: 6,
    backgroundColor: '#0A121E',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
  },
  bookAuthor: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    backgroundColor: '#122035',
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1C314E',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  dateValueOverdue: {
    color: THEME.colors.alert,
    fontWeight: '700',
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
  },
  badgeCol: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeActive: {
    backgroundColor: THEME.colors.accentSubtle,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.3)',
  },
  badgeOverdue: {
    backgroundColor: THEME.colors.alertBg,
    borderWidth: 1,
    borderColor: THEME.colors.alertBorder,
  },
  badgeReturned: {
    backgroundColor: THEME.colors.successBg,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textActive: {
    color: THEME.colors.accent,
  },
  textOverdue: {
    color: THEME.colors.alert,
  },
  textReturned: {
    color: THEME.colors.success,
  },
  returnButton: {
    backgroundColor: THEME.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  returnButtonText: {
    color: '#0F1B2D',
    fontSize: 12,
    fontWeight: '800',
  },
  syncPendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  syncPendingText: {
    fontSize: 10,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
});
