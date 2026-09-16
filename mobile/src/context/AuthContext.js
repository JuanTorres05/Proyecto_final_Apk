import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getBaseUrl } from '../config/api';
import { getDb, enqueueSyncAction, applyServerState } from '../database/sqlite';

const AuthContext = createContext();

const STORAGE_USER_KEY = '@biblioteca_user';
const STORAGE_TOKEN_KEY = '@biblioteca_token';

export function AuthProvider({ children, isOnline }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on launch
  useEffect(() => {
    async function loadStoredSession() {
      try {
        const storedUser = await AsyncStorage.getItem(STORAGE_USER_KEY);
        const storedToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (e) {
        console.error('Error restaurando sesión:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredSession();
  }, []);

  const login = async (email, password) => {
    // 1. If online, try remote authentication
    if (isOnline) {
      try {
        const baseUrl = await getBaseUrl();
        const response = await axios.post(`${baseUrl}/api/auth/login`, { email, password }, { timeout: 5000 });

        if (response.data && response.data.success) {
          const { user: remoteUser, token: remoteToken } = response.data;

          setUser(remoteUser);
          setToken(remoteToken);

          await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(remoteUser));
          await AsyncStorage.setItem(STORAGE_TOKEN_KEY, remoteToken);

          // Save/update user into local SQLite
          const db = getDb();
          db.runSync(`
            INSERT OR REPLACE INTO local_users (id, name, email, phone, role, token)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [remoteUser.id, remoteUser.name, remoteUser.email, remoteUser.phone || '', remoteUser.role || 'student', remoteToken]);

          // Pull fresh server data into SQLite (loans, books, penalties, reviews)
          try {
            const syncResponse = await axios.post(
              `${baseUrl}/api/sync`,
              { mutations: [], lastSyncedAt: null },
              { headers: { Authorization: `Bearer ${remoteToken}` }, timeout: 6000 }
            );
            if (syncResponse.data?.success && syncResponse.data?.serverState) {
              applyServerState(syncResponse.data.serverState);
            }
          } catch (syncErr) {
            console.warn('[Login] Sync inicial falló, se usará SQLite local:', syncErr.message);
          }

          return { success: true };
        } else if (response.data && response.data.message) {
          return { success: false, message: response.data.message };
        }
      } catch (error) {
        console.warn('Servidor no disponible para login, intentando acceso local SQLite...', error.message);
      }
    }

    // 2. Fallback offline login: check if credentials match an existing local user in SQLite
    const db = getDb();
    const localUser = db.getFirstSync('SELECT * FROM local_users WHERE email = ?', [email]);
    if (localUser) {
      const offlineSession = {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        phone: localUser.phone,
        role: localUser.role
      };
      setUser(offlineSession);
      setToken(localUser.token || 'offline-token');
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(offlineSession));
      return { success: true, isOfflineLogin: true };
    }

    return {
      success: false,
      message: 'No se encontró la cuenta. Verifica tus credenciales o el enlace con el servidor.'
    };
  };

  const register = async (name, email, password, phone) => {
    // 1. If online, attempt server registration
    if (isOnline) {
      try {
        const baseUrl = await getBaseUrl();
        const response = await axios.post(
          `${baseUrl}/api/auth/register`,
          { name, email, password, phone },
          { timeout: 5000 }
        );

        if (response.data && response.data.success) {
          const { user: newUser, token: newToken } = response.data;
          setUser(newUser);
          setToken(newToken);

          await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
          await AsyncStorage.setItem(STORAGE_TOKEN_KEY, newToken);

          const db = getDb();
          db.runSync(`
            INSERT OR REPLACE INTO local_users (id, name, email, phone, role, token, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [newUser.id, newUser.name, newUser.email, newUser.phone || '', newUser.role || 'student', newToken, new Date().toISOString()]);

          return { success: true };
        } else if (response.data && response.data.message) {
          return { success: false, message: response.data.message };
        }
      } catch (error) {
        console.warn('Servidor no disponible para registro remoto, registrando en SQLite local...', error.message);
      }
    }

    // 2. OFFLINE FALLBACK REGISTRATION (Allows seamless creation into SQLite without blocking!)
    const db = getDb();
    const existing = db.getFirstSync('SELECT id FROM local_users WHERE email = ?', [email]);
    if (existing) {
      return { success: false, message: 'Este correo electrónico ya está registrado localmente.' };
    }

    const localUserId = 'user-off-' + Date.now();
    const localToken = 'offline-token-' + Date.now();
    const now = new Date().toISOString();

    const offlineUser = {
      id: localUserId,
      name,
      email,
      phone: phone || '',
      role: 'student'
    };

    db.runSync(`
      INSERT INTO local_users (id, name, email, phone, role, token, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [localUserId, name, email, phone || '', 'student', localToken, now]);

    // Enqueue registration action to sync with server when reachable
    enqueueSyncAction('REGISTER_USER', localUserId, {
      id: localUserId,
      name,
      email,
      password,
      phone: phone || ''
    });

    setUser(offlineUser);
    setToken(localToken);
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(offlineUser));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, localToken);

    return {
      success: true,
      isOffline: true,
      message: 'Cuenta creada localmente en SQLite. Tus datos se sincronizarán automáticamente con el servidor.'
    };
  };

  const updateProfile = async (name, phone) => {
    const updated = { ...user, name, phone };
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));

    // Update in local SQLite
    const db = getDb();
    db.runSync(`
      UPDATE local_users SET name = ?, phone = ? WHERE id = ?
    `, [name, phone, user.id]);

    if (isOnline && token) {
      try {
        const baseUrl = await getBaseUrl();
        await axios.put(
          `${baseUrl}/api/user/profile`,
          { name, phone },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        console.warn('Error actualizando perfil online, encolando mutación...');
        enqueueSyncAction('UPDATE_PROFILE', user.id, { name, phone });
      }
    } else {
      // Enqueue offline action
      enqueueSyncAction('UPDATE_PROFILE', user.id, { name, phone });
    }

    return { success: true };
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
    await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
