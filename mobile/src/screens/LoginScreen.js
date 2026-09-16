import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import SyncBanner from '../components/SyncBanner';
import ServerConfigModal from '../components/ServerConfigModal';
import { getBaseUrl } from '../config/api';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const { login } = useAuth();
  const { isOnline } = useNetwork();

  useEffect(() => {
    getBaseUrl().then(setCurrentUrl);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Datos incompletos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password.trim());
      if (!result.success) {
        Alert.alert('Aviso de Acceso', result.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado al conectar.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('aprendiz@sena.edu.co');
    setPassword('123456');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SyncBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.constellationGlow}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={28} color={THEME.colors.accent} />
              <Ionicons name="book" size={32} color={THEME.colors.accent} style={{ position: 'absolute' }} />
            </View>
          </View>
          <Text style={styles.title}>BIBLIOTHECA NOCTURNA</Text>
          <Text style={styles.subtitle}>El conocimiento como mapa de estrellas</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acceso al Santuario</Text>

          {/* Server badge */}
          <TouchableOpacity
            style={styles.serverBadge}
            onPress={() => setServerModalVisible(true)}
          >
            <Ionicons name="server-outline" size={12} color={THEME.colors.accent} />
            <Text style={styles.serverBadgeText} numberOfLines={1}>
              Servidor: {currentUrl || 'Configurar IP'}
            </Text>
            <Ionicons name="settings-outline" size={12} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo de Lector</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="lector@bibliotheca.com"
                placeholderTextColor={THEME.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clave Secreta</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu clave"
                placeholderTextColor={THEME.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0F1B2D" />
            ) : (
              <Text style={styles.buttonText}>Entrar al Santuario</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoButton} onPress={fillDemoAccount} activeOpacity={0.8}>
            <Ionicons name="star-outline" size={15} color={THEME.colors.accent} />
            <Text style={styles.demoButtonText}>Cargar Cuenta de Demostración</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿Primera vez en la noche? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Inscribirse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ServerConfigModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
        onSaved={setCurrentUrl}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  constellationGlow: {
    padding: 6,
    borderRadius: 50,
    backgroundColor: 'rgba(232, 163, 61, 0.08)',
    marginBottom: 12,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.35)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111F33',
    borderWidth: 1,
    borderColor: '#223856',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
    gap: 6,
  },
  serverBadgeText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111F33',
    borderWidth: 1,
    borderColor: '#223856',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  button: {
    backgroundColor: THEME.colors.accent,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0F1B2D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 163, 61, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  demoButtonText: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  footerLink: {
    fontSize: 12,
    color: THEME.colors.accent,
    fontWeight: '700',
  },
});
