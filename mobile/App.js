import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { initLocalDatabase } from './src/database/sqlite';
import { NetworkProvider, useNetwork } from './src/context/NetworkContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { THEME } from './src/theme/theme';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      console.log('Inicializando SQLite local para Bibliotheca Nocturna...');
      initLocalDatabase();
      setDbReady(true);
    } catch (e) {
      console.error('Error inicializando base de datos SQLite:', e);
      setError(e.message);
    }
  }, []);

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Error al cargar el archivo local SQLite</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
        <Text style={styles.loadingText}>Desplegando el mapa estelar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthWrapper />
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

function AuthWrapper() {
  const { isOnline } = useNetwork();

  return (
    <AuthProvider isOnline={isOnline}>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.alert,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
