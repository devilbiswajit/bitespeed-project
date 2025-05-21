import express from 'express';
import dotenv from 'dotenv';
import identifyRoutes from './routes/identifyRoutes.js';
import cors from 'cors';

dotenv.config();

const app = express();

// Middleware to parse JSON body
app.use(express.json());

//Handling CORS
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

// Routes
app.use('/api/v1', identifyRoutes);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.send('Bitespeed Identity Reconciliation API is running!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
