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
import SyncBanner from '../components/SyncBanner';
import ServerConfigModal from '../components/ServerConfigModal';
import { getBaseUrl } from '../config/api';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const { register } = useAuth();

  useEffect(() => {
    getBaseUrl().then(setCurrentUrl);
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa el nombre, correo y contraseña.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim(), password, phone.trim());
      if (result.success) {
        if (result.isOffline) {
          Alert.alert(
            '¡Registro en SQLite Exitoso!',
            'Tu cuenta se creó localmente en el dispositivo. Puedes comenzar a explorar y usar la biblioteca sin conexión; tus datos se sincronizarán al conectar con el servidor.',
            [{ text: 'Comenzar', style: 'default' }]
          );
        }
      } else {
        Alert.alert('Aviso', result.message || 'No se pudo completar el registro.');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error en el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SyncBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inscripción de Lector</Text>
          <Text style={styles.cardSubtitle}>Crea tu expediente en Bibliotheca Nocturna</Text>

          {/* Server link badge */}
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
            <Text style={styles.label}>Nombre de Lector *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej. Jorge Luis Borges"
                placeholderTextColor={THEME.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="lector@nocturna.org"
                placeholderTextColor={THEME.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono de Contacto</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+57 300 000 0000"
                placeholderTextColor={THEME.colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clave Secreta *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={THEME.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Clave *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite la clave"
                placeholderTextColor={THEME.colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0F1B2D" />
            ) : (
              <Text style={styles.buttonText}>Registrar Expediente</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿Ya posees membresía? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Entrar</Text>
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
    fontSize: 20,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
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
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
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
    marginTop: 14,
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
