import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Switch
} from 'react-native';
import axios from 'axios';
import {
  getPenaltiesLocal,
  payPenaltyLocal,
  enqueueSyncAction
} from '../database/sqlite';
import SyncBanner from '../components/SyncBanner';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { getBaseUrl, setBaseUrl, DEFAULT_API_URL } from '../config/api';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, token, updateProfile, logout } = useAuth();
  const {
    isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    triggerSync,
    pendingCount,
    isSyncing,
    lastSynced,
    refreshPendingCount
  } = useNetwork();

  const [penalties, setPenalties] = useState([]);
  const [totalDebt, setTotalDebt] = useState(0);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // API Config Modal
  const [apiUrlModalVisible, setApiUrlModalVisible] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState('');
  const [currentApiUrl, setCurrentApiUrlState] = useState('');

  const loadPenalties = useCallback(() => {
    if (!user) return;
    try {
      const data = getPenaltiesLocal(user.id);
      setPenalties(data);
      const sum = data
        .filter((p) => p.status === 'PENDING')
        .reduce((acc, p) => acc + p.amount, 0);
      setTotalDebt(sum);
    } catch (e) {
      console.error('Error cargando sanciones:', e);
    }
  }, [user]);

  useEffect(() => {
    loadPenalties();
    getBaseUrl().then((url) => {
      setCurrentApiUrlState(url);
      setApiUrlInput(url);
    });
  }, [loadPenalties]);

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile(editName.trim(), editPhone.trim());
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Expediente de lector actualizado.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la información.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveApiUrl = async () => {
    if (!apiUrlInput.trim()) {
      Alert.alert('Error', 'La URL no puede estar vacía.');
      return;
    }
    const cleanUrl = apiUrlInput.trim().replace(/\/$/, '');
    await setBaseUrl(cleanUrl);
    setCurrentApiUrlState(cleanUrl);
    setApiUrlModalVisible(false);
    Alert.alert('Configuración guardada', `API URL configurada a: ${cleanUrl}`);
  };

  const handlePayPenalty = (penalty) => {
    Alert.alert(
      'Saldar Multa de Retraso',
      `¿Deseas registrar el pago de la multa por $${penalty.amount}?\n(${penalty.reason})`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar Sanción',
          onPress: async () => {
            try {
              payPenaltyLocal(penalty.id);

              if (isOnline && token) {
                const baseUrl = await getBaseUrl();
                await axios.post(
                  `${baseUrl}/api/penalties/${penalty.id}/pay`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } else {
                enqueueSyncAction('PAY_PENALTY', penalty.id, {
                  penaltyId: penalty.id
                });
                refreshPendingCount();
              }

              loadPenalties();
              Alert.alert('Pago Asentado', 'La sanción ha sido saldada. Tu derecho a retirar libros está activo.');
            } catch (error) {
              console.error('Error pagando multa:', error);
              Alert.alert('Aviso', 'Se registró el pago localmente.');
              loadPenalties();
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SyncBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="sparkles" size={24} color={THEME.colors.accent} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user?.role === 'admin' ? 'Bibliotecario Mayor' : 'Lector Miembro'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editIconBtn} onPress={openEditModal}>
              <Ionicons name="create-outline" size={18} color={THEME.colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Ionicons name="call-outline" size={15} color={THEME.colors.textMuted} />
            <Text style={styles.profileRowText}>
              {user?.phone ? user.phone : 'Teléfono no configurado'}
            </Text>
          </View>

          <View style={styles.profileRow}>
            <Ionicons name="key-outline" size={15} color={THEME.colors.textMuted} />
            <Text style={styles.profileRowText}>Registro: {user?.id}</Text>
          </View>
        </View>

        {/* Penalties / Sanctions Card */}
        <View style={styles.card}>
          <View style={styles.penaltiesHeader}>
            <View style={styles.penaltiesTitleRow}>
              <Ionicons
                name={totalDebt > 0 ? 'alert-circle' : 'shield-checkmark-outline'}
                size={20}
                color={totalDebt > 0 ? THEME.colors.alert : THEME.colors.success}
              />
              <Text style={styles.cardTitle}>Sanciones y Multas</Text>
            </View>
            <View
              style={[
                styles.debtBadge,
                totalDebt > 0 ? styles.debtBadgePending : styles.debtBadgeClean
              ]}
            >
              <Text
                style={[
                  styles.debtBadgeText,
                  totalDebt > 0 ? styles.debtTextPending : styles.debtTextClean
                ]}
              >
                {totalDebt > 0 ? `Deuda: ${formatCurrency(totalDebt)}` : 'Expediente al día'}
              </Text>
            </View>
          </View>

          <Text style={styles.penaltiesSubtext}>
            Tarifa de retraso: $1.000 COP por día en volúmenes no retornados antes de su fecha límite.
          </Text>

          {penalties.length === 0 ? (
            <View style={styles.emptyPenalties}>
              <Ionicons name="checkmark-done-circle-outline" size={34} color={THEME.colors.success} />
              <Text style={styles.emptyPenaltiesTitle}>Sin Infracciones Registradas</Text>
              <Text style={styles.emptyPenaltiesSubtitle}>
                Tus devoluciones han sido puntuales en el archivo.
              </Text>
            </View>
          ) : (
            penalties.map((pen) => {
              const isPaid = pen.status === 'PAID';
              return (
                <View key={pen.id} style={styles.penaltyItem}>
                  <View style={styles.penaltyTopRow}>
                    <View style={styles.penaltyInfoCol}>
                      <Text style={styles.penaltyReason}>{pen.reason}</Text>
                      {pen.book_title && (
                        <Text style={styles.penaltyBook}>Volumen: {pen.book_title}</Text>
                      )}
                      <Text style={styles.penaltyAmountText}>
                        Monto: <Text style={styles.bold}>{formatCurrency(pen.amount)}</Text>
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.penaltyStatusBadge,
                        isPaid ? styles.statusPaid : styles.statusPending
                      ]}
                    >
                      <Text
                        style={[
                          styles.penaltyStatusText,
                          isPaid ? styles.textPaid : styles.textPending
                        ]}
                      >
                        {isPaid ? 'PAGADA' : 'PENDIENTE'}
                      </Text>
                    </View>
                  </View>

                  {!isPaid && (
                    <TouchableOpacity
                      style={styles.payButton}
                      onPress={() => handlePayPenalty(pen)}
                    >
                      <Ionicons name="card-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.payButtonText}>Registrar Pago de Sanción</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Network & Offline Diagnostics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diagnóstico y Modo Nocturno Offline</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Simular Modo Fuera de Línea</Text>
              <Text style={styles.settingDesc}>
                Permite verificar cómo SQLite persiste préstamos y notas sin internet
              </Text>
            </View>
            <Switch
              value={simulatedOffline}
              onValueChange={toggleSimulatedOffline}
              trackColor={{ false: '#263D61', true: 'rgba(232, 163, 61, 0.4)' }}
              thumbColor={simulatedOffline ? THEME.colors.accent : '#6B82A6'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Cambios pendientes en SQLite:</Text>
            <Text style={[styles.syncStatusValue, pendingCount > 0 && styles.syncPending]}>
              {pendingCount}
            </Text>
          </View>

          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Última sincronización:</Text>
            <Text style={styles.syncStatusValue}>
              {lastSynced ? new Date(lastSynced).toLocaleTimeString('es-CO') : 'Nunca'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.manualSyncButton, (!isOnline || isSyncing) && styles.syncBtnDisabled]}
            onPress={() => triggerSync(token)}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#0F1B2D" />
            ) : (
              <>
                <Ionicons name="sync" size={15} color="#0F1B2D" />
                <Text style={styles.manualSyncText}>Forzar Sincronización Estelar</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.apiUrlButton}
            onPress={() => setApiUrlModalVisible(true)}
          >
            <Ionicons name="server-outline" size={15} color={THEME.colors.textSecondary} />
            <Text style={styles.apiUrlText} numberOfLines={1}>
              API: {currentApiUrl}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={THEME.colors.alert} />
          <Text style={styles.logoutText}>Cerrar Sesión del Santuario</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Expediente</Text>

            <Text style={styles.modalLabel}>Nombre del Lector:</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre"
              placeholderTextColor={THEME.colors.textMuted}
            />

            <Text style={styles.modalLabel}>Teléfono de Contacto:</Text>
            <TextInput
              style={styles.modalInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+57 300..."
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, savingProfile && styles.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#0F1B2D" />
                ) : (
                  <Text style={styles.modalConfirmText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit API URL Modal */}
      <Modal visible={apiUrlModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enlace con el Servidor</Text>
            <Text style={styles.modalDesc}>
              Si pruebas en un dispositivo físico vía Wi-Fi, ingresa la IP local de tu computador:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              placeholder="http://192.168.1.X:3000"
              placeholderTextColor={THEME.colors.textMuted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.defaultUrlBtn}
              onPress={() => setApiUrlInput(DEFAULT_API_URL)}
            >
              <Text style={styles.defaultUrlBtnText}>Restablecer URL por defecto</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setApiUrlModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSaveApiUrl}
              >
                <Text style={styles.modalConfirmText}>Guardar Enlace</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 14,
    backgroundColor: THEME.colors.background,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#122035',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.3)',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: THEME.colors.accentSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.25)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  editIconBtn: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.surfaceBorder,
    marginVertical: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  profileRowText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
  },
  penaltiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  penaltiesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  debtBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  debtBadgeClean: {
    backgroundColor: THEME.colors.successBg,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  debtBadgePending: {
    backgroundColor: THEME.colors.alertBg,
    borderWidth: 1,
    borderColor: THEME.colors.alertBorder,
  },
  debtBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  debtTextClean: {
    color: THEME.colors.success,
  },
  debtTextPending: {
    color: THEME.colors.alert,
  },
  penaltiesSubtext: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
    marginBottom: 10,
  },
  emptyPenalties: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyPenaltiesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.success,
    marginTop: 4,
  },
  emptyPenaltiesSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  penaltyItem: {
    backgroundColor: '#122035',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  penaltyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  penaltyInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  penaltyReason: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  penaltyBook: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  penaltyAmountText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  bold: {
    fontWeight: '700',
    color: THEME.colors.alert,
  },
  penaltyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPaid: {
    backgroundColor: THEME.colors.successBg,
  },
  statusPending: {
    backgroundColor: THEME.colors.alertBg,
  },
  penaltyStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textPaid: {
    color: THEME.colors.success,
  },
  textPending: {
    color: THEME.colors.alert,
  },
  payButton: {
    backgroundColor: THEME.colors.alert,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  settingDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  syncStatusLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  syncStatusValue: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  syncPending: {
    color: THEME.colors.accent,
    fontWeight: '800',
  },
  manualSyncButton: {
    backgroundColor: THEME.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  manualSyncText: {
    color: '#0F1B2D',
    fontSize: 12,
    fontWeight: '800',
  },
  apiUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#122035',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  apiUrlText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginHorizontal: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.alertBg,
    borderWidth: 1,
    borderColor: THEME.colors.alertBorder,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  logoutText: {
    color: THEME.colors.alert,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 18, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 6,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#111F33',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  defaultUrlBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  defaultUrlBtnText: {
    fontSize: 11,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCancelText: {
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: THEME.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    color: '#0F1B2D',
    fontWeight: '800',
  },
});
