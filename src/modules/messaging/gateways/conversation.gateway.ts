import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { PresenceService } from '../presence/presence.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

// DTOs for WebSocket events
interface JoinConversationPayload {
    conversationId: string;
}

import { MessageType } from '../entities/message.entity';

interface NewMessagePayload {
    conversationId: string;
    content: string;
    messageType: MessageType;
    metadata?: Record<string, any>;
    replyToId?: string;
}

interface EditMessagePayload {
    messageId: string;
    content: string;
}

interface DeleteMessagePayload {
    messageId: string;
    deleteForEveryone: boolean;
}

interface TypingPayload {
    conversationId: string;
    isTyping: boolean;
}

interface ReactionPayload {
    messageId: string;
    reaction: string;
}

interface MessageReadPayload {
    messageId: string;
}

@WebSocketGateway({
    namespace: '/messaging',
    cors: {
        origin: '*',
        credentials: true,
    },
})
@Injectable()
export class ConversationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ConversationGateway.name);

    constructor(
        private readonly presenceService: PresenceService,
        private readonly conversationsService: ConversationsService,
        private readonly messagesService: MessagesService,
    ) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            // Extract user ID from handshake auth or query
            const userId = client.handshake.auth?.userId || client.handshake.query?.userId;

            if (!userId) {
                this.logger.warn(`Connection rejected: No userId provided`);
                client.disconnect();
                return;
            }

            // Track user connection
            this.presenceService.trackUserConnection(client, userId as string);
            client.data.userId = userId;

            // Join user's personal room for direct notifications
            client.join(`user:${userId}`);

            this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

            // Notify other users about this user coming online
            this.server.emit('user:online', { userId, timestamp: new Date() });
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = this.presenceService.removeUserConnection(client.id);

        if (userId && !this.presenceService.isUserOnline(userId)) {
            // User has no more active connections, notify others
            this.server.emit('user:offline', { userId, timestamp: new Date() });
        }

        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // Join a conversation room
    @SubscribeMessage('conversation:join')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinConversationPayload,
    ) {
        const userId = client.data.userId;
        const { conversationId } = payload;

        try {
            // Verify user is a member of this conversation
            const isMember = await this.conversationsService.isUserMember(conversationId, userId);

            if (!isMember) {
                return { success: false, error: 'Not a member of this conversation' };
            }

            // Join the conversation room
            client.join(`conversation:${conversationId}`);
            this.presenceService.joinConversation(userId, conversationId);

            // Notify others in the conversation
            client.to(`conversation:${conversationId}`).emit('user:joined', {
                userId,
                conversationId,
                timestamp: new Date(),
            });

            // Get current presence in this conversation
            const usersInConversation = this.presenceService.getConversationUsers(conversationId);

            this.logger.debug(`User ${userId} joined conversation ${conversationId}`);

            return {
                success: true,
                usersOnline: usersInConversation,
            };
        } catch (error) {
            this.logger.error(`Error joining conversation: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Leave a conversation room
    @SubscribeMessage('conversation:leave')
    handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinConversationPayload,
    ) {
        const userId = client.data.userId;
        const { conversationId } = payload;

        client.leave(`conversation:${conversationId}`);
        this.presenceService.leaveConversation(userId, conversationId);

        // Notify others
        client.to(`conversation:${conversationId}`).emit('user:left', {
            userId,
            conversationId,
            timestamp: new Date(),
        });

        return { success: true };
    }

    // Send a new message
    @SubscribeMessage('message:send')
    async handleNewMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: NewMessagePayload,
    ) {
        const userId = client.data.userId;
        const { conversationId, content, messageType, metadata, replyToId } = payload;

        try {
            // Create message via service
            const message = await this.messagesService.create(
                { conversationId, content, messageType, metadata, replyToId },
                userId,
            );

            // Broadcast to all users in the conversation (including sender)
            this.server.to(`conversation:${conversationId}`).emit('message:new', {
                message,
                timestamp: new Date(),
            });

            this.logger.debug(`Message sent in conversation ${conversationId} by ${userId}`);

            return { success: true, message };
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Edit a message
    @SubscribeMessage('message:edit')
    async handleEditMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: EditMessagePayload,
    ) {
        const userId = client.data.userId;
        const { messageId, content } = payload;

        try {
            const message = await this.messagesService.update(messageId, { content }, userId);

            // Broadcast update to conversation
            this.server.to(`conversation:${message.conversationId}`).emit('message:updated', {
                message,
                timestamp: new Date(),
            });

            return { success: true, message };
        } catch (error) {
            this.logger.error(`Error editing message: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Delete a message
    @SubscribeMessage('message:delete')
    async handleDeleteMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: DeleteMessagePayload,
    ) {
        const userId = client.data.userId;
        const { messageId, deleteForEveryone } = payload;

        try {
            const message = await this.messagesService.delete(messageId, userId, deleteForEveryone);

            if (deleteForEveryone) {
                // Broadcast deletion to all users in conversation
                this.server.to(`conversation:${message.conversationId}`).emit('message:deleted', {
                    messageId,
                    conversationId: message.conversationId,
                    deleteForEveryone: true,
                    timestamp: new Date(),
                });
            }

            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting message: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Typing indicator
    @SubscribeMessage('typing:start')
    handleTypingStart(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: TypingPayload,
    ) {
        const userId = client.data.userId;
        const { conversationId } = payload;

        this.presenceService.setTypingStatus(userId, conversationId, true);

        client.to(`conversation:${conversationId}`).emit('typing:update', {
            userId,
            conversationId,
            isTyping: true,
            timestamp: new Date(),
        });

        return { success: true };
    }

    @SubscribeMessage('typing:stop')
    handleTypingStop(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: TypingPayload,
    ) {
        const userId = client.data.userId;
        const { conversationId } = payload;

        this.presenceService.setTypingStatus(userId, conversationId, false);

        client.to(`conversation:${conversationId}`).emit('typing:update', {
            userId,
            conversationId,
            isTyping: false,
            timestamp: new Date(),
        });

        return { success: true };
    }

    // Add reaction
    @SubscribeMessage('reaction:add')
    async handleAddReaction(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: ReactionPayload,
    ) {
        const userId = client.data.userId;
        const { messageId, reaction } = payload;

        try {
            const result = await this.messagesService.addReaction(messageId, userId, reaction);

            // Get the message to find the conversation
            const message = await this.messagesService.findOne(messageId);

            this.server.to(`conversation:${message.conversationId}`).emit('reaction:added', {
                messageId,
                userId,
                reaction,
                timestamp: new Date(),
            });

            return { success: true, reaction: result };
        } catch (error) {
            this.logger.error(`Error adding reaction: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Remove reaction
    @SubscribeMessage('reaction:remove')
    async handleRemoveReaction(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: ReactionPayload,
    ) {
        const userId = client.data.userId;
        const { messageId, reaction } = payload;

        try {
            await this.messagesService.removeReaction(messageId, userId, reaction);

            const message = await this.messagesService.findOne(messageId);

            this.server.to(`conversation:${message.conversationId}`).emit('reaction:removed', {
                messageId,
                userId,
                reaction,
                timestamp: new Date(),
            });

            return { success: true };
        } catch (error) {
            this.logger.error(`Error removing reaction: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Mark message as read
    @SubscribeMessage('message:read')
    async handleMessageRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: MessageReadPayload,
    ) {
        const userId = client.data.userId;
        const { messageId } = payload;

        try {
            await this.messagesService.markAsRead(messageId, userId);

            const message = await this.messagesService.findOne(messageId);

            // Notify the sender
            this.server.to(`user:${message.senderId}`).emit('message:read', {
                messageId,
                readBy: userId,
                timestamp: new Date(),
            });

            return { success: true };
        } catch (error) {
            this.logger.error(`Error marking message as read: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Utility method to broadcast to a conversation (can be called from services)
    broadcastToConversation(conversationId: string, event: string, data: any) {
        this.server.to(`conversation:${conversationId}`).emit(event, data);
    }

    // Utility method to send to a specific user
    sendToUser(userId: string, event: string, data: any) {
        this.server.to(`user:${userId}`).emit(event, data);
    }
}
