require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '../../web/public')));

// Routes
app.use('/api', require('./modules/auth'));
app.use('/api/products', require('./modules/products'));
app.use('/api/sales', require('./modules/sales'));
app.use('/api/sessions', require('./modules/sessions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../web/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🏪 La Casita POS - API corriendo en http://localhost:${PORT}`);
});
