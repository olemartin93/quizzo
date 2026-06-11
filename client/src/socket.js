import { io } from 'socket.io-client';

// Same-origin connection: Vite proxies /socket.io to the server in dev,
// and Express serves the client in production.
export const socket = io();
