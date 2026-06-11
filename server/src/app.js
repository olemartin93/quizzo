import express from 'express';
import { quizRouter } from './quizRoutes.js';
import { gameRouter } from './gameRoutes.js';

export const app = express();

app.use(express.json());
app.use('/api/quizzes', quizRouter);
app.use('/api/game', gameRouter);
