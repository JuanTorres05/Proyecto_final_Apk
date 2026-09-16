const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const DAILY_PENALTY_RATE = 1000; // $1,000 COP por cada día de retraso

function getLoansByUser(req, res) {
  try {
    const userId = req.user.id;

    // First auto-check overdue status for active loans
    checkAndApplyOverduePenalties(userId);

    const loans = db.prepare(`
      SELECT l.*, 
             b.title as book_title, 
             b.author as book_author, 
             b.cover_url as book_cover_url,
             b.category as book_category
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(userId);

    return res.json({ success: true, loans });
  } catch (error) {
    console.error('Error en getLoansByUser:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar préstamos' });
  }
}

function createLoan(req, res) {
  try {
    const userId = req.user.id;
    const { bookId, days = 7, notes = '', loanId } = req.body;

    if (!bookId) {
      return res.status(400).json({ success: false, message: 'El ID del libro es requerido' });
    }

    // Check if user has active unpaid penalties
    const unpaidPenalties = db.prepare(`
      SELECT COUNT(*) as count FROM penalties WHERE user_id = ? AND status = 'PENDING'
    `).get(userId);

    if (unpaidPenalties && unpaidPenalties.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tiene sanciones/multas pendientes. Debe pagarlas antes de solicitar un nuevo préstamo.' 
      });
    }

    // Check book availability
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Libro no encontrado' });
    }

    if (book.available_stock <= 0) {
      return res.status(400).json({ success: false, message: 'No hay ejemplares disponibles de este libro' });
    }

    // Check if user already has an active loan for this book
    const existingLoan = db.prepare(`
      SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status IN ('ACTIVE', 'OVERDUE')
    `).get(userId, bookId);

    if (existingLoan) {
      return res.status(400).json({ success: false, message: 'Ya tienes un préstamo activo para este libro' });
    }

    const id = loanId || ('loan-' + uuidv4().substring(0, 8));
    const now = new Date();
    const dueDate = new Date(now.getTime() + (parseInt(days, 10) || 7) * 24 * 60 * 60 * 1000);

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO loans (id, user_id, book_id, loan_date, due_date, status, notes)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).run(id, userId, bookId, now.toISOString(), dueDate.toISOString(), notes);

      db.prepare(`
        UPDATE books SET available_stock = available_stock - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(bookId);
    });

    transaction();

    const createdLoan = db.prepare(`
      SELECT l.*, b.title as book_title, b.author as book_author, b.cover_url as book_cover_url
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.id = ?
    `).get(id);

    return res.status(201).json({
      success: true,
      message: 'Préstamo solicitado exitosamente',
      loan: createdLoan
    });
  } catch (error) {
    console.error('Error en createLoan:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar préstamo' });
  }
}

function returnLoan(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(id, userId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Préstamo no encontrado' });
    }

    if (loan.status === 'RETURNED') {
      return res.status(400).json({ success: false, message: 'Este préstamo ya fue devuelto' });
    }

    const now = new Date();
    const dueDate = new Date(loan.due_date);
    let penaltyCreated = null;

    const transaction = db.transaction(() => {
      // Check if late
      if (now > dueDate) {
        const diffMs = now.getTime() - dueDate.getTime();
        const daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const amount = daysLate * DAILY_PENALTY_RATE;

        // Check if penalty exists
        const existingPen = db.prepare('SELECT id FROM penalties WHERE loan_id = ?').get(loan.id);
        if (!existingPen) {
          const penId = 'pen-' + uuidv4().substring(0, 8);
          db.prepare(`
            INSERT INTO penalties (id, user_id, loan_id, amount, reason, days_late, status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
          `).run(
            penId,
            userId,
            loan.id,
            amount,
            `Devolución con retraso de ${daysLate} día(s) ($${DAILY_PENALTY_RATE} por día)`,
            daysLate
          );
          penaltyCreated = { id: penId, amount, daysLate };
        }
      }

      // Mark loan returned
      db.prepare(`
        UPDATE loans 
        SET status = 'RETURNED', return_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(now.toISOString(), id);

      // Increment available stock
      db.prepare(`
        UPDATE books SET available_stock = available_stock + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(loan.book_id);
    });

    transaction();

    return res.json({
      success: true,
      message: penaltyCreated 
        ? `Libro devuelto con retraso. Se ha generado una sanción de $${penaltyCreated.amount}.` 
        : 'Libro devuelto exitosamente a tiempo.',
      penalty: penaltyCreated
    });
  } catch (error) {
    console.error('Error en returnLoan:', error);
    return res.status(500).json({ success: false, message: 'Error al devolver el libro' });
  }
}

function checkAndApplyOverduePenalties(userId) {
  const now = new Date().toISOString();
  const overdueLoans = db.prepare(`
    SELECT * FROM loans 
    WHERE user_id = ? AND status = 'ACTIVE' AND due_date < ?
  `).all(userId, now);

  for (const loan of overdueLoans) {
    db.prepare(`UPDATE loans SET status = 'OVERDUE' WHERE id = ?`).run(loan.id);

    const existingPen = db.prepare('SELECT id FROM penalties WHERE loan_id = ?').get(loan.id);
    if (!existingPen) {
      const nowMs = new Date().getTime();
      const dueMs = new Date(loan.due_date).getTime();
      const daysLate = Math.max(1, Math.ceil((nowMs - dueMs) / (1000 * 60 * 60 * 24)));
      const amount = daysLate * DAILY_PENALTY_RATE;

      const penId = 'pen-' + uuidv4().substring(0, 8);
      db.prepare(`
        INSERT INTO penalties (id, user_id, loan_id, amount, reason, days_late, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        penId,
        userId,
        loan.id,
        amount,
        `Retraso acumulado de ${daysLate} día(s) en préstamo activo`,
        daysLate
      );
    }
  }
}

module.exports = {
  getLoansByUser,
  createLoan,
  returnLoan
};
