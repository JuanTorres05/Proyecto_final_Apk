import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SyncBanner() {
  const {
    isOnline,
    simulatedOffline,
    pendingCount,
    isSyncing,
    triggerSync,
    toggleSimulatedOffline
  } = useNetwork();
  const { token } = useAuth();

  const handleSyncPress = () => {
    if (isOnline && !isSyncing) {
      triggerSync(token);
    }
  };

  return (
    <View style={[styles.container, !isOnline ? styles.containerOffline : styles.containerOnline]}>
      <View style={styles.leftSection}>
        <Ionicons
          name={!isOnline ? 'cloud-offline-outline' : 'sparkles-outline'}
          size={16}
          color={!isOnline ? THEME.colors.warning : THEME.colors.accent}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, !isOnline ? styles.textOffline : styles.textOnline]}>
            {!isOnline
              ? (simulatedOffline ? 'Modo Offline (Simulado)' : 'Sin Conexión (SQLite Activo)')
              : 'Enlace Estelar Activo (API en línea)'}
          </Text>
          {pendingCount > 0 && (
            <Text style={styles.subText}>
              {pendingCount} {pendingCount === 1 ? 'cambio en cola' : 'cambios en cola'} para sincronizar
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {isOnline && (
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={handleSyncPress}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#0F1B2D" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="sync" size={12} color="#0F1B2D" />
                <Text style={styles.syncButtonText}>Sincronizar</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.toggleButton, simulatedOffline && styles.toggleButtonActive]}
          onPress={toggleSimulatedOffline}
        >
          <Ionicons
            name={simulatedOffline ? 'moon' : 'planet-outline'}
            size={12}
            color={simulatedOffline ? THEME.colors.accent : THEME.colors.textSecondary}
          />
          <Text style={[styles.toggleText, simulatedOffline && styles.toggleTextActive]}>
            {simulatedOffline ? 'En Línea' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  containerOnline: {
    backgroundColor: '#112239',
    borderBottomColor: '#1E3554',
  },
  containerOffline: {
    backgroundColor: '#1E251A',
    borderBottomColor: '#3A331A',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textOnline: {
    color: THEME.colors.textPrimary,
  },
  textOffline: {
    color: '#FDE68A',
  },
  subText: {
    fontSize: 10,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncButton: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncButtonText: {
    color: '#0F1B2D',
    fontSize: 11,
    fontWeight: '800',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#182842',
    borderWidth: 1,
    borderColor: '#263D61',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(232, 163, 61, 0.15)',
    borderColor: THEME.colors.accent,
  },
  toggleText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: THEME.colors.accent,
  },
});
