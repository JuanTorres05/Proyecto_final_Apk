const { db } = require('../config/db');

function syncData(req, res) {
  try {
    const userId = req.user.id;
    const { mutations = [], lastSyncedAt } = req.body;

    const processedIds = [];
    const errors = [];

    // Process offline mutations within a single transaction
    const processTransaction = db.transaction(() => {
      for (const mutation of mutations) {
        const { id, action_type, payload } = mutation;

        try {
          switch (action_type) {
            case 'REGISTER_USER': {
              const { id: regId, name, email, password, phone } = payload;
              const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
              if (!existing) {
                const bcrypt = require('bcryptjs');
                const hashed = bcrypt.hashSync(password || '123456', 10);
                db.prepare(`
                  INSERT INTO users (id, name, email, password, phone, role)
                  VALUES (?, ?, ?, ?, ?, 'student')
                `).run(regId || ('user-' + Date.now()), name, email, hashed, phone || '');
              }
              break;
            }

            case 'CREATE_LOAN': {
              const { loanId, bookId, days = 7, notes = '', loanDate, dueDate } = payload;
              
              // Verify book exists
              const book = db.prepare('SELECT available_stock FROM books WHERE id = ?').get(bookId);
              if (book) {
                // Check if loan already exists with this ID
                const existing = db.prepare('SELECT id FROM loans WHERE id = ?').get(loanId);
                if (!existing) {
                  const now = loanDate || new Date().toISOString();
                  const due = dueDate || new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

                  db.prepare(`
                    INSERT INTO loans (id, user_id, book_id, loan_date, due_date, status, notes)
                    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
                  `).run(loanId, userId, bookId, now, due, notes);

                  db.prepare(`
                    UPDATE books SET available_stock = MAX(0, available_stock - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?
                  `).run(bookId);
                }
              }
              break;
            }

            case 'RETURN_LOAN': {
              const { loanId, returnDate } = payload;
              const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(loanId, userId);
              if (loan && loan.status !== 'RETURNED') {
                const now = returnDate || new Date().toISOString();
                db.prepare(`
                  UPDATE loans 
                  SET status = 'RETURNED', return_date = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(now, loanId);

                db.prepare(`
                  UPDATE books SET available_stock = available_stock + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                `).run(loan.book_id);
              }
              break;
            }

            case 'ADD_REVIEW': {
              const { reviewId, bookId, rating, comment } = payload;
              const userName = req.user.name || 'Lector Anónimo';
              const existing = db.prepare('SELECT id FROM reviews WHERE id = ? OR (user_id = ? AND book_id = ?)').get(reviewId, userId, bookId);

              if (existing) {
                db.prepare(`
                  UPDATE reviews 
                  SET rating = ?, comment = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(rating, comment || '', userName, existing.id);
              } else {
                db.prepare(`
                  INSERT INTO reviews (id, user_id, book_id, rating, comment, user_name)
                  VALUES (?, ?, ?, ?, ?, ?)
                `).run(reviewId, userId, bookId, rating, comment || '', userName);
              }
              break;
            }

            case 'UPDATE_PROFILE': {
              const { name, phone } = payload;
              db.prepare(`
                UPDATE users 
                SET name = COALESCE(?, name), 
                    phone = COALESCE(?, phone),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(name, phone, userId);
              break;
            }

            case 'PAY_PENALTY': {
              const { penaltyId } = payload;
              db.prepare(`
                UPDATE penalties 
                SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
              `).run(penaltyId, userId);
              break;
            }

            default:
              console.warn(`Acción desconocida en sync: ${action_type}`);
          }

          // Record in sync log
          db.prepare(`
            INSERT INTO sync_logs (user_id, action_type, entity_id, details)
            VALUES (?, ?, ?, ?)
          `).run(userId, action_type, id || 'batch', JSON.stringify(payload || {}));

          processedIds.push(id);
        } catch (err) {
          console.error(`Error procesando mutación ${action_type}:`, err);
          errors.push({ id, error: err.message });
        }
      }
    });

    processTransaction();

    // Query full updated state to send back to client for local SQLite synchronization
    const books = db.prepare(`
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      GROUP BY b.id
    `).all();

    const loans = db.prepare(`
      SELECT l.*, b.title as book_title, b.author as book_author, b.cover_url as book_cover_url
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(userId);

    const penalties = db.prepare(`
      SELECT p.*, b.title as book_title
      FROM penalties p
      LEFT JOIN loans l ON p.loan_id = l.id
      LEFT JOIN books b ON l.book_id = b.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);

    const reviews = db.prepare(`SELECT * FROM reviews`).all();

    const user = db.prepare(`SELECT id, name, email, phone, role FROM users WHERE id = ?`).get(userId);

    const serverTimestamp = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Sincronización completada exitosamente',
      processedIds,
      errors,
      syncedAt: serverTimestamp,
      serverState: {
        books,
        loans,
        penalties,
        reviews,
        user
      }
    });
  } catch (error) {
    console.error('Error en syncData:', error);
    return res.status(500).json({ success: false, message: 'Error durante la sincronización' });
  }
}

module.exports = {
  syncData
};
