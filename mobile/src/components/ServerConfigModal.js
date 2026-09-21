import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { getBaseUrl, setBaseUrl, DEFAULT_API_URL } from '../config/api';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ServerConfigModal({ visible, onClose, onSaved }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (visible) {
      getBaseUrl().then(setUrl);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'La dirección del servidor no puede estar vacía.');
      return;
    }
    const cleanUrl = url.trim().replace(/\/$/, '');
    await setBaseUrl(cleanUrl);
    if (onSaved) onSaved(cleanUrl);
    Alert.alert('Enlace Actualizado', `Servidor configurado a:\n${cleanUrl}`);
    onClose();
  };

  const handleReset = () => {
    setUrl(DEFAULT_API_URL);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="server" size={20} color={THEME.colors.accent} />
            <Text style={styles.title}>Enlace con Servidor</Text>
          </View>

          <Text style={styles.desc}>
            Para conectar con el servidor desde tu celular físico en la misma red Wi-Fi, ingresa la IP local de tu computador:
          </Text>

          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.X:3000"
            placeholderTextColor={THEME.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={13} color={THEME.colors.accent} />
            <Text style={styles.resetText}>Restablecer IP actual (10.206.198.97:3000)</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 18, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
  },
  desc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#111F33',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  resetText: {
    fontSize: 11,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: THEME.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveText: {
    color: '#0F1B2D',
    fontWeight: '800',
    fontSize: 12,
  },
});
