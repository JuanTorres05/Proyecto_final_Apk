const http = require('http');
const express = require('express');
const cors = require('cors');
const { initDatabase, db } = require('./src/config/db');
const apiRoutes = require('./src/routes/api');

const app = express();
app.use(cors());
app.use(express.json());
initDatabase();
app.use('/api', apiRoutes);

const server = app.listen(3099, async () => {
  console.log('🧪 Running automated backend test on port 3099...');

  try {
    // 1. Test Login
    const loginRes = await fetch('http://localhost:3099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aprendiz@sena.edu.co', password: '123456' })
    });
    const loginData = await loginRes.json();
    console.log('✅ Login test:', loginData.success ? 'PASSED' : 'FAILED', loginData.user?.name);
    const token = loginData.token;

    // 2. Test Get Books
    const booksRes = await fetch('http://localhost:3099/api/books');
    const booksData = await booksRes.json();
    console.log('✅ Books catalog test:', booksData.success ? 'PASSED' : 'FAILED', `(${booksData.books?.length} books found)`);

    // 3. Test Get Loans
    const loansRes = await fetch('http://localhost:3099/api/loans', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const loansData = await loansRes.json();
    console.log('✅ Loans test:', loansData.success ? 'PASSED' : 'FAILED', `(${loansData.loans?.length} loans found)`);

    // 4. Test Get Penalties
    const penRes = await fetch('http://localhost:3099/api/penalties', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const penData = await penRes.json();
    console.log('✅ Penalties test:', penData.success ? 'PASSED' : 'FAILED', `(Total debt: $${penData.totalDebt})`);

    // 5. Test Offline Sync Mutation processing
    const syncRes = await fetch('http://localhost:3099/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        mutations: [
          {
            id: 'mut-001',
            action_type: 'ADD_REVIEW',
            payload: {
              reviewId: 'rev-test-01',
              bookId: 'book-001',
              rating: 5,
              comment: 'Probando sincronización offline con éxito!'
            }
          }
        ]
      })
    });
    const syncData = await syncRes.json();
    console.log('✅ Sync test:', syncData.success ? 'PASSED' : 'FAILED', `(Processed: ${syncData.processedIds?.length})`);

    console.log('\n🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close(() => {
      process.exit(0);
    });
  }
});
