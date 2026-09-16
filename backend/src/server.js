require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for mobile app requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Initialize SQLite schema and initial seed data
initDatabase();

// Mount API routes
app.use('/api', apiRoutes);

// Health check and root route
app.get('/', (req, res) => {
  res.json({
    name: 'API Sistema de Biblioteca SENA',
    status: 'ONLINE',
    version: '1.0.0',
    description: 'API REST con soporte Offline-First para aplicación móvil de biblioteca',
    endpoints: {
      auth: ['/api/auth/register', '/api/auth/login'],
      books: ['/api/books', '/api/books/:id'],
      loans: ['/api/loans', '/api/loans/:id/return'],
      penalties: ['/api/penalties', '/api/penalties/:id/pay'],
      reviews: ['/api/reviews/book/:bookId', '/api/reviews'],
      sync: ['/api/sync']
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`📚 Servidor Backend Biblioteca escuchando en puerto ${PORT}`);
  console.log(`📡 URL Local: http://localhost:${PORT}`);
  console.log(`📡 Red Móvil / Emulador: http://10.0.2.2:${PORT} o IP Local`);
  console.log(`===================================================`);
});
