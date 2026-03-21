import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'https://TON-PROJET.vercel.app',
    ],
  },
})
export class ObjectsGateway {
  @WebSocketServer()
  server: Server;

  notifyObjectCreated(object: any) {
    this.server.emit('object:created', object);
  }

  notifyObjectDeleted(id: string) {
    this.server.emit('object:deleted', { id });
  }
}
