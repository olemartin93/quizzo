import { Router } from 'express';
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  validateQuiz,
} from './quizStore.js';

export const quizRouter = Router();

quizRouter.get('/', (req, res) => {
  res.json(listQuizzes());
});

quizRouter.get('/:id', (req, res) => {
  const quiz = getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

quizRouter.post('/', (req, res) => {
  const error = validateQuiz(req.body);
  if (error) return res.status(400).json({ error });
  res.status(201).json(createQuiz(req.body));
});

quizRouter.put('/:id', (req, res) => {
  const error = validateQuiz(req.body);
  if (error) return res.status(400).json({ error });
  const quiz = updateQuiz(req.params.id, req.body);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

quizRouter.delete('/:id', (req, res) => {
  if (!deleteQuiz(req.params.id)) return res.status(404).json({ error: 'Quiz not found' });
  res.status(204).end();
});
