import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';
import { getPendingCount } from '../database/sqlite';
import { syncWithServer, getLastSyncedTime } from '../services/syncService';

const NetworkContext = createContext();

export function NetworkProvider({ children, token }) {
  const [isRealConnected, setIsRealConnected] = useState(true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const refreshPendingCount = useCallback(() => {
    try {
      const count = getPendingCount();
      setPendingCount(count);
    } catch (e) {
      console.warn('Error fetching pending count:', e);
    }
  }, []);

  const checkRealNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsRealConnected(state.isConnected && state.isInternetReachable !== false);
    } catch (e) {
      setIsRealConnected(true);
    }
  }, []);

  // Effective online status is false if real network is down OR user simulated offline
  const isOnline = isRealConnected && !simulatedOffline;

  const triggerSync = useCallback(async (authToken) => {
    if (!isOnline) {
      console.log('[NetworkContext] No se puede sincronizar en modo offline');
      return { success: false, message: 'La aplicación está actualmente en modo sin conexión.' };
    }

    setIsSyncing(true);
    try {
      const result = await syncWithServer(authToken || token);
      refreshPendingCount();
      const time = await getLastSyncedTime();
      setLastSynced(time);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, token, refreshPendingCount]);

  // Initial load and periodic network check
  useEffect(() => {
    checkRealNetwork();
    refreshPendingCount();
    getLastSyncedTime().then(setLastSynced);

    const interval = setInterval(() => {
      checkRealNetwork();
      refreshPendingCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [checkRealNetwork, refreshPendingCount]);

  // Auto-sync when transitioning from offline to online
  useEffect(() => {
    if (isOnline && token && pendingCount > 0 && !isSyncing) {
      console.log('[NetworkContext] Conexión detectada con cambios pendientes, auto-sincronizando...');
      triggerSync(token);
    }
  }, [isOnline, token, pendingCount, isSyncing, triggerSync]);

  const toggleSimulatedOffline = () => {
    setSimulatedOffline(prev => !prev);
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isRealConnected,
        simulatedOffline,
        pendingCount,
        isSyncing,
        lastSynced,
        refreshPendingCount,
        triggerSync,
        toggleSimulatedOffline
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork debe usarse dentro de un NetworkProvider');
  }
  return context;
}
