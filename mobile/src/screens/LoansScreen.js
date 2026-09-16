import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import {
  getLoansLocal,
  returnLoanLocal,
  enqueueSyncAction
} from '../database/sqlite';
import LoanCard from '../components/LoanCard';
import SyncBanner from '../components/SyncBanner';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { getBaseUrl } from '../config/api';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoansScreen({ navigation }) {
  const { user, token } = useAuth();
  const { isOnline, triggerSync, refreshPendingCount } = useNetwork();

  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' or 'HISTORY'
  const [loans, setLoans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLoans = useCallback(() => {
    if (!user) return;
    try {
      const allLoans = getLoansLocal(user.id);
      setLoans(allLoans);
    } catch (e) {
      console.error('Error cargando préstamos locales:', e);
    }
  }, [user]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isOnline && token) {
      await triggerSync(token);
    }
    loadLoans();
    setRefreshing(false);
  };

  const handleReturn = (loan) => {
    Alert.alert(
      'Confirmar Devolución',
      `¿Deseas devolver el volumen "${loan.book_title}" al santuario?`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Confirmar Devolución',
          onPress: async () => {
            const now = new Date().toISOString();
            const returnResult = returnLoanLocal(loan.id, now);

            if (!returnResult) {
              Alert.alert('Error', 'No se encontró el préstamo registrado.');
              return;
            }

            try {
              if (isOnline && token) {
                const baseUrl = await getBaseUrl();
                await axios.put(
                  `${baseUrl}/api/loans/${loan.id}/return`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } else {
                enqueueSyncAction('RETURN_LOAN', loan.id, {
                  loanId: loan.id,
                  returnDate: now
                });
                refreshPendingCount();
              }

              loadLoans();

              if (returnResult.penalty) {
                Alert.alert(
                  '⚠️ Entrega Fuera de Término',
                  `El volumen fue devuelto con retraso de ${returnResult.penalty.daysLate} día(s). Se ha registrado una sanción de $${returnResult.penalty.amount} en tu expediente de lector.`
                );
              } else {
                Alert.alert(
                  '✅ Volumen Devuelto a Tiempo',
                  'El ejemplar ha sido reincorporado a las estanterías de la noche. ¡Gracias!'
                );
              }
            } catch (error) {
              console.error('Error en devolución:', error);
              Alert.alert('Aviso', 'Se asentó la devolución localmente en SQLite.');
              loadLoans();
            }
          }
        }
      ]
    );
  };

  const filteredLoans = loans.filter((l) => {
    if (activeTab === 'ACTIVE') {
      return l.status === 'ACTIVE' || l.status === 'OVERDUE';
    }
    return l.status === 'RETURNED';
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <SyncBanner />

      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Ionicons
              name="moon"
              size={15}
              color={activeTab === 'ACTIVE' ? '#0F1B2D' : THEME.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
              Lecturas Activas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'HISTORY' && styles.tabButtonActive]}
            onPress={() => setActiveTab('HISTORY')}
          >
            <Ionicons
              name="archive-outline"
              size={15}
              color={activeTab === 'HISTORY' ? '#0F1B2D' : THEME.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
              Archivo Histórico
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loan list */}
        <FlatList
          data={filteredLoans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              onReturn={activeTab === 'ACTIVE' ? handleReturn : null}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.accent}
              colors={[THEME.colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === 'ACTIVE' ? 'book-outline' : 'checkmark-done-circle-outline'}
                size={44}
                color={THEME.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE'
                  ? 'No tienes volúmenes en préstamo'
                  : 'Sin historial previo registrado'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? 'Visita el catálogo nocturno para retirar tu próxima lectura.'
                  : 'Los tomos completados y devueltos aparecerán aquí.'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 5,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#0F1B2D',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
