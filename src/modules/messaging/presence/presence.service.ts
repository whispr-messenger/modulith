import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface UserPresence {
    socketId: string;
    userId: string;
    connectedAt: Date;
    lastSeen: Date;
    status: 'online' | 'away' | 'offline';
}

interface ConversationPresence {
    conversationId: string;
    users: Map<string, { joinedAt: Date; typing: boolean }>;
}

@Injectable()
export class PresenceService {
    private readonly logger = new Logger(PresenceService.name);

    // userId -> Set of socket IDs (user can have multiple connections)
    private userSockets = new Map<string, Set<string>>();

    // socketId -> userId
    private socketToUser = new Map<string, string>();

    // conversationId -> { userId -> presence data }
    private conversationPresence = new Map<string, Map<string, { joinedAt: Date; typing: boolean }>>();

    // Track user connection
    trackUserConnection(socket: Socket, userId: string): void {
        // Add socket to user's socket set
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);
        this.socketToUser.set(socket.id, userId);

        this.logger.debug(`User ${userId} connected with socket ${socket.id}`);
    }

    // Remove user connection
    removeUserConnection(socketId: string): string | undefined {
        const userId = this.socketToUser.get(socketId);
        if (!userId) return undefined;

        // Remove socket from user's socket set
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
            userSocketSet.delete(socketId);
            if (userSocketSet.size === 0) {
                this.userSockets.delete(userId);
            }
        }

        // Cleanup socket mapping
        this.socketToUser.delete(socketId);

        // Remove from all conversation presence
        this.conversationPresence.forEach((users, convId) => {
            if (users.has(userId) && !this.isUserOnline(userId)) {
                users.delete(userId);
            }
        });

        this.logger.debug(`Socket ${socketId} disconnected for user ${userId}`);
        return userId;
    }

    // Check if user is online (has at least one active socket)
    isUserOnline(userId: string): boolean {
        const sockets = this.userSockets.get(userId);
        return sockets !== undefined && sockets.size > 0;
    }

    // Get all socket IDs for a user
    getUserSockets(userId: string): string[] {
        return Array.from(this.userSockets.get(userId) || []);
    }

    // Get user ID from socket
    getUserFromSocket(socketId: string): string | undefined {
        return this.socketToUser.get(socketId);
    }

    // Join conversation
    joinConversation(userId: string, conversationId: string): void {
        if (!this.conversationPresence.has(conversationId)) {
            this.conversationPresence.set(conversationId, new Map());
        }

        this.conversationPresence.get(conversationId)!.set(userId, {
            joinedAt: new Date(),
            typing: false,
        });

        this.logger.debug(`User ${userId} joined conversation ${conversationId}`);
    }

    // Leave conversation
    leaveConversation(userId: string, conversationId: string): void {
        const convPresence = this.conversationPresence.get(conversationId);
        if (convPresence) {
            convPresence.delete(userId);
            if (convPresence.size === 0) {
                this.conversationPresence.delete(conversationId);
            }
        }

        this.logger.debug(`User ${userId} left conversation ${conversationId}`);
    }

    // Get users in conversation
    getConversationUsers(conversationId: string): string[] {
        const convPresence = this.conversationPresence.get(conversationId);
        return convPresence ? Array.from(convPresence.keys()) : [];
    }

    // Set typing status
    setTypingStatus(userId: string, conversationId: string, typing: boolean): void {
        const convPresence = this.conversationPresence.get(conversationId);
        if (convPresence && convPresence.has(userId)) {
            convPresence.get(userId)!.typing = typing;
        }
    }

    // Get who is typing in a conversation
    getTypingUsers(conversationId: string): string[] {
        const convPresence = this.conversationPresence.get(conversationId);
        if (!convPresence) return [];

        return Array.from(convPresence.entries())
            .filter(([_, data]) => data.typing)
            .map(([userId, _]) => userId);
    }

    // Get online users count
    getOnlineUsersCount(): number {
        return this.userSockets.size;
    }

    // Get all online user IDs
    getOnlineUserIds(): string[] {
        return Array.from(this.userSockets.keys());
    }
}
