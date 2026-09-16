import * as SQLite from 'expo-sqlite';

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('biblioteca_local.db');
  }
  return dbInstance;
}

export function initLocalDatabase() {
  const db = getDb();

  // Create tables
  db.execSync(`
    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT DEFAULT 'student',
      token TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      isbn TEXT,
      published_year INTEGER,
      stock INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      cover_url TEXT,
      average_rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      book_title TEXT,
      book_author TEXT,
      book_cover_url TEXT,
      loan_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RETURNED, OVERDUE
      notes TEXT,
      sync_status TEXT DEFAULT 'SYNCED', -- SYNCED, PENDING
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_penalties (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      loan_id TEXT,
      book_title TEXT,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      days_late INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID
      sync_status TEXT DEFAULT 'SYNCED',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      user_name TEXT,
      sync_status TEXT DEFAULT 'SYNCED',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' -- PENDING, FAILED
    );
  `);

  // Seed default books if local table is empty
  seedLocalBooksIfEmpty(db);
}

function seedLocalBooksIfEmpty(db) {
  const result = db.getFirstSync('SELECT COUNT(*) as count FROM local_books');
  if (!result || result.count === 0) {
    const initialBooks = [
      {
        id: 'book-001',
        title: 'Cien Años de Soledad',
        author: 'Gabriel García Márquez',
        category: 'Literatura / Realismo Mágico',
        isbn: '978-0307474728',
        published_year: 1967,
        stock: 5,
        available_stock: 4,
        description: 'La obra cumbre de la literatura hispanoamericana que narra la historia de la familia Buendía en el mítico pueblo de Macondo.',
        cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
        average_rating: 4.8,
        review_count: 1
      },
      {
        id: 'book-002',
        title: 'Clean Code: Manual de desarrollo ágil de software',
        author: 'Robert C. Martin (Uncle Bob)',
        category: 'Ingeniería de Software / Programación',
        isbn: '978-0132350884',
        published_year: 2008,
        stock: 4,
        available_stock: 3,
        description: 'Principios, patrones y prácticas para escribir código limpio, legible, mantenible y profesional.',
        cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&q=80&w=400',
        average_rating: 5.0,
        review_count: 1
      },
      {
        id: 'book-003',
        title: 'Don Quijote de la Mancha',
        author: 'Miguel de Cervantes',
        category: 'Clásicos de la Literatura',
        isbn: '978-8420412146',
        published_year: 1605,
        stock: 3,
        available_stock: 3,
        description: 'Aventuras y desventuras del célebre hidalgo don Quijote de la Mancha y su leal escudero Sancho Panza.',
        cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
        average_rating: 4.5,
        review_count: 0
      },
      {
        id: 'book-004',
        title: 'Estructuras de Datos y Algoritmos en JavaScript',
        author: 'Michael McMillan',
        category: 'Computación y Algoritmos',
        isbn: '978-1449364939',
        published_year: 2014,
        stock: 6,
        available_stock: 5,
        description: 'Guía práctica para implementar pilas, colas, listas enlazadas, grafos y árboles binarios eficientes.',
        cover_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=400',
        average_rating: 4.2,
        review_count: 0
      },
      {
        id: 'book-005',
        title: 'El Principito',
        author: 'Antoine de Saint-Exupéry',
        category: 'Fábula / Filosofía',
        isbn: '978-0156012195',
        published_year: 1943,
        stock: 8,
        available_stock: 7,
        description: 'Un relato poético e ilustrado que reflexiona sobre la amistad, el amor, el sentido de la vida y la naturaleza humana.',
        cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=400',
        average_rating: 4.9,
        review_count: 0
      },
      {
        id: 'book-006',
        title: 'Sapiens: De animales a dioses',
        author: 'Yuval Noah Harari',
        category: 'Historia y Divulgación',
        isbn: '978-0062316097',
        published_year: 2011,
        stock: 5,
        available_stock: 5,
        description: 'Una breve historia de la humanidad que explora cómo una especie insignificante de simios llegó a dominar el planeta Tierra.',
        cover_url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=400',
        average_rating: 4.7,
        review_count: 0
      }
    ];

    for (const b of initialBooks) {
      db.runSync(`
        INSERT INTO local_books (
          id, title, author, category, isbn, published_year, stock, available_stock,
          description, cover_url, average_rating, review_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        b.id, b.title, b.author, b.category, b.isbn, b.published_year,
        b.stock, b.available_stock, b.description, b.cover_url,
        b.average_rating, b.review_count
      ]);
    }
  }
}

// ---------------- LOCAL QUERIES ----------------

export function getAllBooksLocal(search = '', category = 'Todos', availableOnly = false) {
  const db = getDb();
  let query = 'SELECT * FROM local_books WHERE 1=1';
  const params = [];

  if (search && search.trim().length > 0) {
    query += ' AND (title LIKE ? OR author LIKE ? OR category LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (category && category !== 'Todos') {
    query += ' AND category LIKE ?';
    params.push(`%${category}%`);
  }

  if (availableOnly) {
    query += ' AND available_stock > 0';
  }

  query += ' ORDER BY title ASC';
  return db.getAllSync(query, params);
}

export function getBookByIdLocal(id) {
  const db = getDb();
  return db.getFirstSync('SELECT * FROM local_books WHERE id = ?', [id]);
}

export function getLoansLocal(userId) {
  const db = getDb();
  return db.getAllSync(`
    SELECT * FROM local_loans 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `, [userId]);
}

export function createLoanLocal(loan) {
  const db = getDb();
  db.runSync(`
    INSERT INTO local_loans (
      id, user_id, book_id, book_title, book_author, book_cover_url,
      loan_date, due_date, status, notes, sync_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    loan.id, loan.userId, loan.bookId, loan.bookTitle, loan.bookAuthor, loan.bookCoverUrl,
    loan.loanDate, loan.dueDate, 'ACTIVE', loan.notes || '', loan.syncStatus || 'PENDING', loan.createdAt
  ]);

  // Decrement local stock
  db.runSync(`
    UPDATE local_books SET available_stock = MAX(0, available_stock - 1) WHERE id = ?
  `, [loan.bookId]);
}

export function returnLoanLocal(loanId, returnDate) {
  const db = getDb();
  const loan = db.getFirstSync('SELECT * FROM local_loans WHERE id = ?', [loanId]);
  if (!loan) return null;

  db.runSync(`
    UPDATE local_loans 
    SET status = 'RETURNED', return_date = ?, sync_status = 'PENDING'
    WHERE id = ?
  `, [returnDate, loanId]);

  // Increment local stock
  db.runSync(`
    UPDATE local_books SET available_stock = available_stock + 1 WHERE id = ?
  `, [loan.book_id]);

  // Check if overdue to create local penalty
  const dueDate = new Date(loan.due_date);
  const retDate = new Date(returnDate);
  let penalty = null;

  if (retDate > dueDate) {
    const diffMs = retDate.getTime() - dueDate.getTime();
    const daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const amount = daysLate * 1000;
    const penaltyId = 'pen-' + Date.now();

    db.runSync(`
      INSERT INTO local_penalties (
        id, user_id, loan_id, book_title, amount, reason, days_late, status, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', ?)
    `, [
      penaltyId,
      loan.user_id,
      loan.id,
      loan.book_title || 'Libro devuelto con retraso',
      amount,
      `Retraso de ${daysLate} día(s) en devolución ($1.000/día)`,
      daysLate,
      returnDate
    ]);

    penalty = { id: penaltyId, amount, daysLate };
  }

  return { loan, penalty };
}

export function getPenaltiesLocal(userId) {
  const db = getDb();
  return db.getAllSync(`
    SELECT * FROM local_penalties 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `, [userId]);
}

export function payPenaltyLocal(penaltyId) {
  const db = getDb();
  db.runSync(`
    UPDATE local_penalties 
    SET status = 'PAID', sync_status = 'PENDING'
    WHERE id = ?
  `, [penaltyId]);
}

export function getReviewsByBookLocal(bookId) {
  const db = getDb();
  return db.getAllSync(`
    SELECT * FROM local_reviews 
    WHERE book_id = ? 
    ORDER BY created_at DESC
  `, [bookId]);
}

export function addReviewLocal(review) {
  const db = getDb();
  const existing = db.getFirstSync(`
    SELECT id FROM local_reviews WHERE user_id = ? AND book_id = ?
  `, [review.userId, review.bookId]);

  if (existing) {
    db.runSync(`
      UPDATE local_reviews 
      SET rating = ?, comment = ?, user_name = ?, sync_status = 'PENDING'
      WHERE id = ?
    `, [review.rating, review.comment, review.userName, existing.id]);
  } else {
    db.runSync(`
      INSERT INTO local_reviews (
        id, user_id, book_id, rating, comment, user_name, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `, [
      review.id, review.userId, review.bookId, review.rating,
      review.comment, review.userName, review.createdAt
    ]);
  }

  // Update book rating stats locally
  const stats = db.getFirstSync(`
    SELECT AVG(rating) as avg_rating, COUNT(id) as count
    FROM local_reviews WHERE book_id = ?
  `, [review.bookId]);

  if (stats) {
    db.runSync(`
      UPDATE local_books 
      SET average_rating = ?, review_count = ?
      WHERE id = ?
    `, [stats.avg_rating || 0, stats.count || 0, review.bookId]);
  }
}

// ---------------- SYNC QUEUE OPERATIONS ----------------

export function enqueueSyncAction(actionType, entityId, payload) {
  const db = getDb();
  const id = 'queue-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const createdAt = new Date().toISOString();

  db.runSync(`
    INSERT INTO sync_queue (id, action_type, entity_id, payload, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `, [id, actionType, entityId || '', JSON.stringify(payload), createdAt]);

  return id;
}

export function getPendingSyncActions() {
  const db = getDb();
  const rows = db.getAllSync(`
    SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC
  `);

  return rows.map(r => ({
    id: r.id,
    action_type: r.action_type,
    entity_id: r.entity_id,
    payload: JSON.parse(r.payload),
    created_at: r.created_at
  }));
}

export function markSyncActionsCompleted(ids) {
  if (!ids || ids.length === 0) return;
  const db = getDb();
  for (const id of ids) {
    db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
  }
}

export function getPendingCount() {
  const db = getDb();
  const result = db.getFirstSync(`SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'`);
  return result ? result.count : 0;
}

// ---------------- APPLY SERVER STATE ----------------

export function applyServerState(serverState) {
  const db = getDb();
  if (!serverState) return;

  // Sync books
  if (serverState.books && Array.isArray(serverState.books)) {
    for (const b of serverState.books) {
      db.runSync(`
        INSERT OR REPLACE INTO local_books (
          id, title, author, category, isbn, published_year, stock, available_stock,
          description, cover_url, average_rating, review_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        b.id, b.title, b.author, b.category, b.isbn, b.published_year,
        b.stock, b.available_stock, b.description, b.cover_url,
        b.average_rating || 0, b.review_count || 0, b.created_at, b.updated_at
      ]);
    }
  }

  // Sync loans
  if (serverState.loans && Array.isArray(serverState.loans)) {
    for (const l of serverState.loans) {
      db.runSync(`
        INSERT OR REPLACE INTO local_loans (
          id, user_id, book_id, book_title, book_author, book_cover_url,
          loan_date, due_date, return_date, status, notes, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)
      `, [
        l.id, l.user_id, l.book_id,
        l.book_title || l.title || '',
        l.book_author || l.author || '',
        l.book_cover_url || l.cover_url || '',
        l.loan_date, l.due_date, l.return_date || null,
        l.status, l.notes || '', l.created_at
      ]);
    }
  }

  // Sync penalties
  if (serverState.penalties && Array.isArray(serverState.penalties)) {
    for (const p of serverState.penalties) {
      db.runSync(`
        INSERT OR REPLACE INTO local_penalties (
          id, user_id, loan_id, book_title, amount, reason, days_late, status, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)
      `, [
        p.id, p.user_id, p.loan_id, p.book_title, p.amount, p.reason,
        p.days_late, p.status, p.created_at
      ]);
    }
  }

  // Sync reviews
  if (serverState.reviews && Array.isArray(serverState.reviews)) {
    for (const r of serverState.reviews) {
      db.runSync(`
        INSERT OR REPLACE INTO local_reviews (
          id, user_id, book_id, rating, comment, user_name, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'SYNCED', ?)
      `, [
        r.id, r.user_id, r.book_id, r.rating, r.comment, r.user_name, r.created_at
      ]);
    }
  }
}
