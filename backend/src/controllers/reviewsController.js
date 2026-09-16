const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function getReviewsByBook(req, res) {
  try {
    const { bookId } = req.params;

    const reviews = db.prepare(`
      SELECT * FROM reviews 
      WHERE book_id = ? 
      ORDER BY created_at DESC
    `).all(bookId);

    const stats = db.prepare(`
      SELECT COALESCE(AVG(rating), 0) as average_rating, COUNT(id) as total_reviews
      FROM reviews
      WHERE book_id = ?
    `).get(bookId);

    return res.json({
      success: true,
      averageRating: parseFloat(stats.average_rating).toFixed(1),
      totalReviews: stats.total_reviews,
      reviews
    });
  } catch (error) {
    console.error('Error en getReviewsByBook:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar reseñas' });
  }
}

function addReview(req, res) {
  try {
    const userId = req.user.id;
    const userName = req.user.name || 'Lector Anónimo';
    const { bookId, rating, comment, reviewId } = req.body;

    if (!bookId || !rating) {
      return res.status(400).json({ success: false, message: 'El libro y la calificación (1-5) son obligatorios' });
    }

    const numRating = parseInt(rating, 10);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'La calificación debe estar entre 1 y 5 estrellas' });
    }

    // Check if user already reviewed this book
    const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND book_id = ?').get(userId, bookId);

    const id = reviewId || ('rev-' + uuidv4().substring(0, 8));

    if (existing) {
      db.prepare(`
        UPDATE reviews 
        SET rating = ?, comment = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(numRating, comment || '', userName, existing.id);

      const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(existing.id);
      return res.json({ success: true, message: 'Reseña actualizada con éxito', review: updated });
    } else {
      db.prepare(`
        INSERT INTO reviews (id, user_id, book_id, rating, comment, user_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, bookId, numRating, comment || '', userName);

      const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
      return res.status(201).json({ success: true, message: 'Reseña agregada con éxito', review: created });
    }
  } catch (error) {
    console.error('Error en addReview:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar reseña' });
  }
}

module.exports = {
  getReviewsByBook,
  addReview
};
