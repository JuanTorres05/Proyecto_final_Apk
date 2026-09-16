import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import {
  getBookByIdLocal,
  createLoanLocal,
  getReviewsByBookLocal,
  addReviewLocal,
  enqueueSyncAction,
  getPenaltiesLocal
} from '../database/sqlite';
import StarRating from '../components/StarRating';
import SyncBanner from '../components/SyncBanner';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { getBaseUrl } from '../config/api';
import { THEME } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export default function BookDetailScreen({ route, navigation }) {
  const { bookId } = route.params;
  const { user, token } = useAuth();
  const { isOnline, refreshPendingCount } = useNetwork();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loan Modal State
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [loanDays, setLoanDays] = useState(7);
  const [loanNotes, setLoanNotes] = useState('');
  const [isProcessingLoan, setIsProcessingLoan] = useState(false);

  // Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadBookData = useCallback(() => {
    try {
      const bookData = getBookByIdLocal(bookId);
      const reviewsData = getReviewsByBookLocal(bookId);
      setBook(bookData);
      setReviews(reviewsData);
    } catch (e) {
      console.error('Error cargando libro:', e);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBookData();
  }, [loadBookData]);

  // Request Loan
  const handleRequestLoan = async () => {
    if (!book || book.available_stock <= 0) {
      Alert.alert('No disponible', 'Actualmente no hay ejemplares disponibles de este libro en sala.');
      return;
    }

    // Check unpaid penalties
    const penalties = getPenaltiesLocal(user.id);
    const hasUnpaid = penalties.some(p => p.status === 'PENDING');
    if (hasUnpaid) {
      Alert.alert(
        'Sanción Pendiente',
        'Posees retrasos en devoluciones previas con multas activas. Debes ponerte al día en tu perfil antes de solicitar un nuevo ejemplar.'
      );
      return;
    }

    setIsProcessingLoan(true);
    const loanId = 'loan-' + Date.now();
    const now = new Date();
    const dueDate = new Date(now.getTime() + loanDays * 24 * 60 * 60 * 1000);

    const loanPayload = {
      id: loanId,
      userId: user.id,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookCoverUrl: book.cover_url,
      loanDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      notes: loanNotes.trim(),
      createdAt: now.toISOString()
    };

    try {
      if (isOnline && token) {
        const baseUrl = await getBaseUrl();
        await axios.post(
          `${baseUrl}/api/loans`,
          {
            loanId,
            bookId: book.id,
            days: loanDays,
            notes: loanNotes.trim()
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        createLoanLocal({ ...loanPayload, syncStatus: 'SYNCED' });
      } else {
        createLoanLocal({ ...loanPayload, syncStatus: 'PENDING' });
        enqueueSyncAction('CREATE_LOAN', loanId, {
          loanId,
          bookId: book.id,
          days: loanDays,
          notes: loanNotes.trim(),
          loanDate: now.toISOString(),
          dueDate: dueDate.toISOString()
        });
        refreshPendingCount();
      }

      setLoanModalVisible(false);
      setLoanNotes('');
      loadBookData();

      Alert.alert(
        'Préstamo Concedido',
        `Has retirado "${book.title}". Fecha límite de devolución: ${dueDate.toLocaleDateString('es-CO')}.\n${
          !isOnline ? '(Registrado en SQLite local; se sincronizará automáticamente)' : ''
        }`,
        [{ text: 'Ver Mis Préstamos', onPress: () => navigation.navigate('Loans') }, { text: 'Aceptar' }]
      );
    } catch (error) {
      console.error('Error al solicitar préstamo:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo procesar el préstamo.');
    } finally {
      setIsProcessingLoan(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async () => {
    if (userRating < 1 || userRating > 5) {
      Alert.alert('Calificación requerida', 'Por favor selecciona entre 1 y 5 estrellas.');
      return;
    }

    setIsSubmittingReview(true);
    const reviewId = 'rev-' + Date.now();
    const now = new Date().toISOString();

    const reviewPayload = {
      id: reviewId,
      userId: user.id,
      bookId: book.id,
      rating: userRating,
      comment: userComment.trim(),
      userName: user.name,
      createdAt: now
    };

    try {
      if (isOnline && token) {
        const baseUrl = await getBaseUrl();
        await axios.post(
          `${baseUrl}/api/reviews`,
          {
            reviewId,
            bookId: book.id,
            rating: userRating,
            comment: userComment.trim()
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addReviewLocal({ ...reviewPayload, syncStatus: 'SYNCED' });
      } else {
        addReviewLocal({ ...reviewPayload, syncStatus: 'PENDING' });
        enqueueSyncAction('ADD_REVIEW', reviewId, {
          reviewId,
          bookId: book.id,
          rating: userRating,
          comment: userComment.trim()
        });
        refreshPendingCount();
      }

      setReviewModalVisible(false);
      setUserComment('');
      loadBookData();

      Alert.alert(
        'Reseña Asentada',
        `Gracias por tu valoración de ${userRating} estrellas en el registro nocturno.\n${
          !isOnline ? '(Guardada en base de datos SQLite local)' : ''
        }`
      );
    } catch (error) {
      console.error('Error publicando reseña:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo asentar la reseña.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading || !book) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
      </View>
    );
  }

  const isAvailable = book.available_stock > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <SyncBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Book Header & Cover */}
        <View style={styles.headerCard}>
          <Image
            source={{
              uri: book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'
            }}
            style={styles.coverImage}
          />
          <View style={styles.headerInfo}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{book.category}</Text>
            </View>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>Por {book.author}</Text>

            <View style={styles.ratingBox}>
              <StarRating rating={book.average_rating || 0} size={15} showValue={true} />
              <Text style={styles.ratingSubtext}>
                ({reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'})
              </Text>
            </View>

            <View style={[styles.stockBadge, isAvailable ? styles.stockBadgeAvail : styles.stockBadgeDep]}>
              <Ionicons
                name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                size={13}
                color={isAvailable ? THEME.colors.success : THEME.colors.alert}
              />
              <Text style={[styles.stockBadgeText, isAvailable ? styles.stockTextAvail : styles.stockTextDep]}>
                {isAvailable ? `${book.available_stock} de ${book.stock} en sala` : 'Agotado en sala'}
              </Text>
            </View>
          </View>
        </View>

        {/* Technical Data */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ficha del Archivo</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ISBN:</Text>
            <Text style={styles.metaValue}>{book.isbn || 'No registrado'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Año de Impresión:</Text>
            <Text style={styles.metaValue}>{book.published_year || 'N/A'}</Text>
          </View>
        </View>

        {/* Description / Synopsis */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sinopsis Literaria</Text>
          <Text style={styles.descriptionText}>
            {book.description || 'No hay descripción asentada para este volumen.'}
          </Text>
        </View>

        {/* Action Button: Solicitar Préstamo */}
        <TouchableOpacity
          style={[styles.loanButton, !isAvailable && styles.loanButtonDisabled]}
          onPress={() => setLoanModalVisible(true)}
          disabled={!isAvailable}
          activeOpacity={0.85}
        >
          <Ionicons name="book-outline" size={18} color="#0F1B2D" />
          <Text style={styles.loanButtonText}>
            {isAvailable ? 'Solicitar Préstamo del Volumen' : 'Volumen No Disponible'}
          </Text>
        </TouchableOpacity>

        {/* Reviews Section */}
        <View style={styles.sectionCard}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Notas y Reseñas de Lectores</Text>
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={() => setReviewModalVisible(true)}
            >
              <Ionicons name="create-outline" size={13} color={THEME.colors.accent} />
              <Text style={styles.addReviewButtonText}>Asentar Nota</Text>
            </TouchableOpacity>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyReviewsText}>Sé el primer lector en dejar su huella sobre este libro.</Text>
            </View>
          ) : (
            reviews.map((rev, index) => (
              <View key={rev.id || index} style={styles.reviewItem}>
                <View style={styles.reviewUserRow}>
                  <Text style={styles.reviewUserName}>{rev.user_name || 'Lector Anónimo'}</Text>
                  <StarRating rating={rev.rating} size={12} />
                </View>
                {rev.comment ? (
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal: Solicitar Préstamo */}
      <Modal visible={loanModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar Préstamo Nocturno</Text>
            <Text style={styles.modalBookTitle}>{book.title}</Text>

            <Text style={styles.modalLabel}>Tiempo de lectura solicitado:</Text>
            <View style={styles.daysRow}>
              {[7, 14, 21].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayButton, loanDays === d && styles.dayButtonActive]}
                  onPress={() => setLoanDays(d)}
                >
                  <Text style={[styles.dayButtonText, loanDays === d && styles.dayButtonTextActive]}>
                    {d} días
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Anotaciones de préstamo (opcional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Lectura de investigación..."
              placeholderTextColor={THEME.colors.textMuted}
              value={loanNotes}
              onChangeText={setLoanNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setLoanModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Descartar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, isProcessingLoan && styles.modalConfirmDisabled]}
                onPress={handleRequestLoan}
                disabled={isProcessingLoan}
              >
                {isProcessingLoan ? (
                  <ActivityIndicator color="#0F1B2D" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Calificar */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Calificar este Volumen</Text>

            <View style={styles.ratingSelector}>
              <StarRating
                rating={userRating}
                size={30}
                interactive={true}
                onRate={(stars) => setUserRating(stars)}
              />
              <Text style={styles.ratingNumberText}>{userRating} de 5 estrellas</Text>
            </View>

            <Text style={styles.modalLabel}>Impresiones y comentarios:</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="¿Qué resonó en ti con esta obra?"
              placeholderTextColor={THEME.colors.textMuted}
              value={userComment}
              onChangeText={setUserComment}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, isSubmittingReview && styles.modalConfirmDisabled]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color="#0F1B2D" />
                ) : (
                  <Text style={styles.modalConfirmText}>Publicar</Text>
                )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 14,
    backgroundColor: THEME.colors.background,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  coverImage: {
    width: 105,
    height: 155,
    borderRadius: 6,
    backgroundColor: '#0A121E',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: THEME.colors.accentSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.25)',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    marginTop: 4,
    lineHeight: 22,
  },
  author: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingSubtext: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  stockBadgeAvail: {
    backgroundColor: THEME.colors.successBg,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  stockBadgeDep: {
    backgroundColor: THEME.colors.alertBg,
    borderWidth: 1,
    borderColor: THEME.colors.alertBorder,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stockTextAvail: {
    color: THEME.colors.success,
  },
  stockTextDep: {
    color: THEME.colors.alert,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyTitle,
    color: THEME.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  metaLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: THEME.colors.textSecondary,
  },
  loanButton: {
    backgroundColor: THEME.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  loanButtonDisabled: {
    backgroundColor: '#263D61',
  },
  loanButtonText: {
    color: '#0F1B2D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.accentSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.25)',
  },
  addReviewButtonText: {
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyReviews: {
    paddingVertical: 10,
  },
  emptyReviewsText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    paddingTop: 8,
    marginTop: 8,
  },
  reviewUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewUserName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  reviewComment: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
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
  },
  modalBookTitle: {
    fontSize: 12,
    color: THEME.colors.accent,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 6,
    marginBottom: 6,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: '#111F33',
  },
  dayButtonActive: {
    backgroundColor: THEME.colors.accent,
    borderColor: THEME.colors.accent,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  dayButtonTextActive: {
    color: '#0F1B2D',
    fontWeight: '800',
  },
  modalInput: {
    backgroundColor: '#111F33',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    textAlignVertical: 'top',
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
    fontSize: 12,
  },
  modalConfirmButton: {
    backgroundColor: THEME.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    color: '#0F1B2D',
    fontWeight: '800',
    fontSize: 12,
  },
  ratingSelector: {
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.accent,
    marginTop: 4,
  },
});
