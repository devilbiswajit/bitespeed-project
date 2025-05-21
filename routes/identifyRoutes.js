import express from 'express';
import { identify } from '../controllers/identifyController.js';

const router = express.Router();
router.post('/identify', identify);

export default router;
