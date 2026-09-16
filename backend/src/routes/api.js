const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const authController = require('../controllers/authController');
const booksController = require('../controllers/booksController');
const loansController = require('../controllers/loansController');
const penaltiesController = require('../controllers/penaltiesController');
const reviewsController = require('../controllers/reviewsController');
const syncController = require('../controllers/syncController');

// Public Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Public Books routes (can browse without login if needed)
router.get('/books', booksController.getAllBooks);
router.get('/books/:id', booksController.getBookById);
router.post('/books', authMiddleware, booksController.createBook);

// Protected User routes
router.get('/user/profile', authMiddleware, authController.getProfile);
router.put('/user/profile', authMiddleware, authController.updateProfile);

// Protected Loans routes
router.get('/loans', authMiddleware, loansController.getLoansByUser);
router.post('/loans', authMiddleware, loansController.createLoan);
router.put('/loans/:id/return', authMiddleware, loansController.returnLoan);

// Protected Penalties routes
router.get('/penalties', authMiddleware, penaltiesController.getPenaltiesByUser);
router.post('/penalties/:id/pay', authMiddleware, penaltiesController.payPenalty);

// Reviews routes
router.get('/reviews/book/:bookId', reviewsController.getReviewsByBook);
router.post('/reviews', authMiddleware, reviewsController.addReview);

// Offline Synchronization route
router.post('/sync', authMiddleware, syncController.syncData);

module.exports = router;
