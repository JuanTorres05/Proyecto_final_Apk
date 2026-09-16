import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../config/api';
import {
  getPendingSyncActions,
  markSyncActionsCompleted,
  applyServerState,
  getPendingCount
} from '../database/sqlite';

const LAST_SYNCED_KEY = '@biblioteca_last_synced';

export async function getLastSyncedTime() {
  try {
    return await AsyncStorage.getItem(LAST_SYNCED_KEY);
  } catch (e) {
    return null;
  }
}

export async function syncWithServer(token) {
  try {
    const baseUrl = await getBaseUrl();
    const pendingActions = getPendingSyncActions();
    const lastSyncedAt = await getLastSyncedTime();

    console.log(`[SyncService] Iniciando sincronización. Acciones pendientes: ${pendingActions.length}`);

    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${baseUrl}/api/sync`,
      {
        mutations: pendingActions,
        lastSyncedAt
      },
      {
        headers,
        timeout: 8000 // 8s timeout
      }
    );

    if (response.data && response.data.success) {
      const { processedIds, serverState, syncedAt } = response.data;

      // 1. Remove processed items from local SQLite sync_queue
      if (processedIds && processedIds.length > 0) {
        markSyncActionsCompleted(processedIds);
      }

      // 2. Apply fresh server data to local SQLite
      if (serverState) {
        applyServerState(serverState);
      }

      // 3. Save timestamp
      if (syncedAt) {
        await AsyncStorage.setItem(LAST_SYNCED_KEY, syncedAt);
      }

      console.log(`[SyncService] Sincronización exitosa. Procesadas: ${processedIds?.length || 0}`);
      return {
        success: true,
        processedCount: processedIds?.length || 0,
        pendingCount: getPendingCount(),
        syncedAt
      };
    } else {
      return { success: false, message: response.data?.message || 'Error en respuesta' };
    }
  } catch (error) {
    console.warn('[SyncService] Error al conectar con servidor:', error.message);
    return {
      success: false,
      isNetworkError: true,
      message: 'No fue posible contactar el servidor. Los datos se mantienen seguros en SQLite local.'
    };
  }
}
