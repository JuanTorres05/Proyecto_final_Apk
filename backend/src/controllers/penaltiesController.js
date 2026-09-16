const { db } = require('../config/db');

function getPenaltiesByUser(req, res) {
  try {
    const userId = req.user.id;

    const penalties = db.prepare(`
      SELECT p.*, l.book_id, b.title as book_title
      FROM penalties p
      LEFT JOIN loans l ON p.loan_id = l.id
      LEFT JOIN books b ON l.book_id = b.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);

    const totalDebt = penalties
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      success: true,
      totalDebt,
      pendingCount: penalties.filter(p => p.status === 'PENDING').length,
      penalties
    });
  } catch (error) {
    console.error('Error en getPenaltiesByUser:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar sanciones' });
  }
}

function payPenalty(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const penalty = db.prepare('SELECT * FROM penalties WHERE id = ? AND user_id = ?').get(id, userId);
    if (!penalty) {
      return res.status(404).json({ success: false, message: 'Sanción no encontrada' });
    }

    if (penalty.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Esta sanción ya está pagada' });
    }

    db.prepare(`
      UPDATE penalties 
      SET status = 'PAID', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    return res.json({
      success: true,
      message: `Sanción de $${penalty.amount} pagada exitosamente. Tu cuenta está al día.`
    });
  } catch (error) {
    console.error('Error en payPenalty:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar el pago de la sanción' });
  }
}

module.exports = {
  getPenaltiesByUser,
  payPenalty
};
