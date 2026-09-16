const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Books table
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      isbn TEXT UNIQUE,
      published_year INTEGER,
      stock INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Loans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      loan_date DATETIME NOT NULL,
      due_date DATETIME NOT NULL,
      return_date DATETIME,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RETURNED, OVERDUE
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );
  `);

  // Penalties / Sanctions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS penalties (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      loan_id TEXT,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      days_late INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );
  `);

  // Reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );
  `);

  // Sync log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed sample data if empty
  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('🌱 Seeding initial users...');
    const hashedPassword = bcrypt.hashSync('123456', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'user-sena-001',
      'Aprendiz SENA',
      'aprendiz@sena.edu.co',
      hashedPassword,
      '+57 300 123 4567',
      'student'
    );

    insertUser.run(
      'user-admin-001',
      'Bibliotecario Administrador',
      'admin@biblioteca.com',
      hashedPassword,
      '+57 311 987 6543',
      'admin'
    );
  }

  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  if (bookCount === 0) {
    console.log('🌱 Seeding catalog books...');
    const insertBook = db.prepare(`
      INSERT INTO books (id, title, author, category, isbn, published_year, stock, available_stock, description, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const books = [
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
        cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'
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
        cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&q=80&w=400'
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
        cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400'
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
        cover_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=400'
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
        cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=400'
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
        cover_url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=400'
      }
    ];

    for (const b of books) {
      insertBook.run(
        b.id,
        b.title,
        b.author,
        b.category,
        b.isbn,
        b.published_year,
        b.stock,
        b.available_stock,
        b.description,
        b.cover_url
      );
    }
  }

  // Seed sample loan and penalty for testing
  const loanCount = db.prepare('SELECT COUNT(*) as count FROM loans').get().count;
  if (loanCount === 0) {
    console.log('🌱 Seeding sample loan and penalty...');
    const now = new Date();
    const pastDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const dueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago (overdue)

    db.prepare(`
      INSERT INTO loans (id, user_id, book_id, loan_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'loan-001',
      'user-sena-001',
      'book-001',
      pastDate.toISOString(),
      dueDate.toISOString(),
      'OVERDUE',
      'Préstamo para lectura del módulo de literatura'
    );

    db.prepare(`
      INSERT INTO penalties (id, user_id, loan_id, amount, reason, days_late, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pen-001',
      'user-sena-001',
      'loan-001',
      5000.0,
      'Retraso de 5 días en la devolución del libro "Cien Años de Soledad" ($1.000 por día)',
      5,
      'PENDING'
    );

    // Initial review
    db.prepare(`
      INSERT INTO reviews (id, user_id, book_id, rating, comment, user_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'rev-001',
      'user-sena-001',
      'book-002',
      5,
      'Excelente libro para aprender buenas prácticas de programación. Muy recomendado para todo aprendiz de ADSO.',
      'Aprendiz SENA'
    );
  }
}

module.exports = {
  db,
  initDatabase
};
