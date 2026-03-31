require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', require('./modules/auth'));
app.use('/api/products', require('./modules/products'));
app.use('/api/sales', require('./modules/sales'));
app.use('/api/sessions', require('./modules/sessions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏪 La Casita POS - API corriendo en http://localhost:${PORT}`);
});
