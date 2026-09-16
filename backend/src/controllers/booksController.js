const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function getAllBooks(req, res) {
  try {
    const { search, category, availableOnly } = req.query;

    let query = `
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.category LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (category && category !== 'Todos') {
      query += ` AND b.category LIKE ?`;
      params.push(`%${category}%`);
    }

    if (availableOnly === 'true') {
      query += ` AND b.available_stock > 0`;
    }

    query += ` GROUP BY b.id ORDER BY b.title ASC`;

    const books = db.prepare(query).all(...params);

    return res.json({ success: true, books });
  } catch (error) {
    console.error('Error en getAllBooks:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar libros' });
  }
}

function getBookById(req, res) {
  try {
    const { id } = req.params;

    const book = db.prepare(`
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE b.id = ?
      GROUP BY b.id
    `).get(id);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Libro no encontrado' });
    }

    const reviews = db.prepare(`
      SELECT * FROM reviews WHERE book_id = ? ORDER BY created_at DESC
    `).all(id);

    return res.json({ success: true, book, reviews });
  } catch (error) {
    console.error('Error en getBookById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener libro' });
  }
}

function createBook(req, res) {
  try {
    const { title, author, category, isbn, published_year, stock, description, cover_url } = req.body;

    if (!title || !author) {
      return res.status(400).json({ success: false, message: 'Título y autor son obligatorios' });
    }

    const id = 'book-' + uuidv4().substring(0, 8);
    const totalStock = parseInt(stock, 10) || 1;

    db.prepare(`
      INSERT INTO books (id, title, author, category, isbn, published_year, stock, available_stock, description, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      author,
      category || 'General',
      isbn || '',
      published_year || new Date().getFullYear(),
      totalStock,
      totalStock,
      description || '',
      cover_url || ''
    );

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id);

    return res.status(201).json({ success: true, book: newBook });
  } catch (error) {
    console.error('Error en createBook:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar libro' });
  }
}

module.exports = {
  getAllBooks,
  getBookById,
  createBook
};
