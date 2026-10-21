import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

interface AuthedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('No token provided');

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      client.userId = payload.sub;

      client.join(`user:${client.userId}`);

      const conversations = await this.messagingService.listMyConversations(
        client.userId!,
      );
      for (const convo of conversations) {
        client.join(`conversation:${convo.conversationId}`);
      }

      this.server.emit('presence:online', { userId: client.userId });
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.userId) {
      this.server.emit('presence:offline', { userId: client.userId });
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    const message = await this.messagingService.createMessage(
      data.conversationId,
      client.userId!,
      data.content,
    );
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('message:new', message);
    return message;
  }

  @SubscribeMessage('conversation:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('conversation:typing', {
        conversationId: data.conversationId,
        userId: client.userId,
      });
  }

  @SubscribeMessage('conversation:read')
  async handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.messagingService.markRead(data.conversationId, client.userId!);
    client.to(`conversation:${data.conversationId}`).emit('conversation:read', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const call = await this.messagingService.initiateCall(
      data.conversationId,
      client.userId!,
    );

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('call:incoming', {
        callId: call.id,
        conversationId: data.conversationId,
        initiatorId: client.userId,
      });

    return call;
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { callId: string; conversationId: string },
  ) {
    const participant = await this.messagingService.respondToCall(
      data.callId,
      client.userId!,
      true,
    );
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('call:participant-updated', { callId: data.callId, participant });
    return participant;
  }

  @SubscribeMessage('call:decline')
  async handleCallDecline(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { callId: string; conversationId: string },
  ) {
    const participant = await this.messagingService.respondToCall(
      data.callId,
      client.userId!,
      false,
    );
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('call:participant-updated', { callId: data.callId, participant });
    return participant;
  }

  @SubscribeMessage('call:leave')
  async handleCallLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { callId: string; conversationId: string },
  ) {
    const result = await this.messagingService.leaveCall(
      data.callId,
      client.userId!,
    );
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('call:participant-left', {
        callId: data.callId,
        userId: client.userId,
      });
    return result;
  }

  // WebRTC signaling relay — the actual audio/video stream negotiation,
  // passed through untouched once you wire in a real media provider
  @SubscribeMessage('call:signal')
  handleCallSignal(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; signal: any },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('call:signal', {
      callId: data.callId,
      fromUserId: client.userId,
      signal: data.signal,
    });
  }
}
