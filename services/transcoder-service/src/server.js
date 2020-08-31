import os from 'os';
import express from 'express';
import socket from 'socket.io';
import { nodeConfig } from './config';
import apis from './api';

const app = express();
const server = app.listen(nodeConfig.port, () => {
  console.log(`Server running on http://${os.hostname()}:${nodeConfig.port}`);
});

const io = socket.listen(server);

io.on('connection', async (client) => {
  apis(client);
});
