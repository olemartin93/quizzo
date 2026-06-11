import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { quizRouter } from './quizRoutes.js';
import { createGameManager } from './gameManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use('/api/quizzes', quizRouter);

// In production, serve the built client. In dev, Vite serves the client
// on its own port and proxies /api and /socket.io here.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server);
const gameManager = createGameManager(io);
io.on('connection', (socket) => gameManager.handleConnection(socket));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Quiz server running on http://localhost:${PORT}`);
});
