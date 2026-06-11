import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { seedQuizzes } from './seedQuizzes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const dataFile = path.join(dataDir, 'quizzes.json');

let quizzes = load();

function load() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(seedQuizzes, null, 2));
    return structuredClone(seedQuizzes);
  }
}

function persist() {
  fs.writeFileSync(dataFile, JSON.stringify(quizzes, null, 2));
}

export function listQuizzes() {
  return quizzes.map(({ id, title, emoji, questions }) => ({
    id,
    title,
    emoji,
    questionCount: questions.length,
  }));
}

export function getQuiz(id) {
  return quizzes.find((q) => q.id === id) ?? null;
}

export function validateQuiz(body) {
  if (!body || typeof body !== 'object') return 'Invalid payload';
  if (typeof body.title !== 'string' || !body.title.trim()) return 'Title is required';
  if (!Array.isArray(body.questions) || body.questions.length === 0)
    return 'At least one question is required';
  for (const [i, q] of body.questions.entries()) {
    const label = `Question ${i + 1}`;
    if (typeof q.text !== 'string' || !q.text.trim()) return `${label}: text is required`;
    if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 4)
      return `${label}: needs 2-4 answers`;
    if (q.answers.some((a) => typeof a !== 'string' || !a.trim()))
      return `${label}: answers cannot be empty`;
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.answers.length)
      return `${label}: correctIndex is out of range`;
    if (!Number.isInteger(q.timeLimit) || q.timeLimit < 5 || q.timeLimit > 120)
      return `${label}: timeLimit must be 5-120 seconds`;
  }
  return null;
}

function sanitizeQuiz(body) {
  return {
    title: body.title.trim(),
    emoji: typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : '❓',
    questions: body.questions.map((q) => ({
      text: q.text.trim(),
      answers: q.answers.map((a) => a.trim()),
      correctIndex: q.correctIndex,
      timeLimit: q.timeLimit,
    })),
  };
}

export function createQuiz(body) {
  const quiz = { id: crypto.randomUUID(), ...sanitizeQuiz(body) };
  quizzes.push(quiz);
  persist();
  return quiz;
}

export function updateQuiz(id, body) {
  const index = quizzes.findIndex((q) => q.id === id);
  if (index === -1) return null;
  quizzes[index] = { id, ...sanitizeQuiz(body) };
  persist();
  return quizzes[index];
}

export function deleteQuiz(id) {
  const index = quizzes.findIndex((q) => q.id === id);
  if (index === -1) return false;
  quizzes.splice(index, 1);
  persist();
  return true;
}
