import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Message, Conversation } from '../entities';

/**
 * Redis Pub/Sub event types for messaging
 */
export enum MessagingEventType {
    // Conversation events
    CONVERSATION_CREATED = 'conversation.created',
    CONVERSATION_UPDATED = 'conversation.updated',
    MEMBER_ADDED = 'conversation.member_added',
    MEMBER_REMOVED = 'conversation.member_removed',

    // Message events
    MESSAGE_CREATED = 'message.created',
    MESSAGE_EDITED = 'message.edited',
    MESSAGE_DELETED = 'message.deleted',
    MESSAGE_DELIVERED = 'message.delivered',
    MESSAGE_READ = 'message.read',

    // Reaction events
    REACTION_ADDED = 'message.reaction_added',
    REACTION_REMOVED = 'message.reaction_removed',

    // Typing events
    TYPING_STARTED = 'user.typing_started',
    TYPING_STOPPED = 'user.typing_stopped',
}

export interface MessagingEvent {
    type: MessagingEventType;
    payload: Record<string, any>;
    timestamp: Date;
    meta?: Record<string, any>;
}

const REDIS_CHANNEL = 'messaging:events';

@Injectable()
export class MessagingEventsService {
    private readonly logger = new Logger(MessagingEventsService.name);

    constructor(
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) { }

    /**
     * Publish event to Redis Pub/Sub
     */
    private async publish(event: MessagingEvent): Promise<void> {
        try {
            // Access the Redis client from cache manager
            const store = (this.cacheManager as any).store;
            if (store?.client) {
                await store.client.publish(REDIS_CHANNEL, JSON.stringify(event));
                this.logger.debug(`Published event: ${event.type}`);
            } else {
                this.logger.warn('Redis client not available for pub/sub');
            }
        } catch (error) {
            this.logger.error(`Failed to publish event ${event.type}: ${error.message}`);
        }
    }

    // ==================== Conversation Events ====================

    async publishConversationCreated(conversation: Conversation, memberIds: string[]): Promise<void> {
        await this.publish({
            type: MessagingEventType.CONVERSATION_CREATED,
            payload: {
                conversationId: conversation.id,
                type: conversation.type,
                memberIds,
                metadata: conversation.metadata,
            },
            timestamp: new Date(),
        });
    }

    async publishConversationUpdated(conversationId: string, updates: Record<string, any>): Promise<void> {
        await this.publish({
            type: MessagingEventType.CONVERSATION_UPDATED,
            payload: {
                conversationId,
                updates,
            },
            timestamp: new Date(),
        });
    }

    async publishMemberAdded(conversationId: string, userId: string, addedBy: string): Promise<void> {
        await this.publish({
            type: MessagingEventType.MEMBER_ADDED,
            payload: {
                conversationId,
                userId,
                addedBy,
            },
            timestamp: new Date(),
        });
    }

    async publishMemberRemoved(conversationId: string, userId: string, removedBy: string): Promise<void> {
        await this.publish({
            type: MessagingEventType.MEMBER_REMOVED,
            payload: {
                conversationId,
                userId,
                removedBy,
            },
            timestamp: new Date(),
        });
    }

    // ==================== Message Events ====================

    async publishMessageCreated(message: Message, recipientIds: string[]): Promise<void> {
        await this.publish({
            type: MessagingEventType.MESSAGE_CREATED,
            payload: {
                messageId: message.id,
                conversationId: message.conversationId,
                senderId: message.senderId,
                content: message.content,
                messageType: message.messageType,
                metadata: message.metadata,
                replyToId: message.replyToId,
                sentAt: message.sentAt,
                recipientIds,
            },
            timestamp: new Date(),
        });
    }

    async publishMessageEdited(message: Message): Promise<void> {
        await this.publish({
            type: MessagingEventType.MESSAGE_EDITED,
            payload: {
                messageId: message.id,
                conversationId: message.conversationId,
                content: message.content,
                editedAt: message.editedAt,
            },
            timestamp: new Date(),
        });
    }

    async publishMessageDeleted(
        messageId: string,
        conversationId: string,
        forEveryone: boolean,
    ): Promise<void> {
        await this.publish({
            type: MessagingEventType.MESSAGE_DELETED,
            payload: {
                messageId,
                conversationId,
                forEveryone,
            },
            timestamp: new Date(),
        });
    }

    async publishMessageDelivered(messageId: string, userId: string): Promise<void> {
        await this.publish({
            type: MessagingEventType.MESSAGE_DELIVERED,
            payload: {
                messageId,
                userId,
                deliveredAt: new Date(),
            },
            timestamp: new Date(),
        });
    }

    async publishMessageRead(messageId: string, userId: string): Promise<void> {
        await this.publish({
            type: MessagingEventType.MESSAGE_READ,
            payload: {
                messageId,
                userId,
                readAt: new Date(),
            },
            timestamp: new Date(),
        });
    }

    // ==================== Reaction Events ====================

    async publishReactionAdded(
        messageId: string,
        conversationId: string,
        userId: string,
        reaction: string,
    ): Promise<void> {
        await this.publish({
            type: MessagingEventType.REACTION_ADDED,
            payload: {
                messageId,
                conversationId,
                userId,
                reaction,
            },
            timestamp: new Date(),
        });
    }

    async publishReactionRemoved(
        messageId: string,
        conversationId: string,
        userId: string,
        reaction: string,
    ): Promise<void> {
        await this.publish({
            type: MessagingEventType.REACTION_REMOVED,
            payload: {
                messageId,
                conversationId,
                userId,
                reaction,
            },
            timestamp: new Date(),
        });
    }

    // ==================== Typing Events ====================

    async publishTypingStarted(conversationId: string, userId: string): Promise<void> {
        await this.publish({
            type: MessagingEventType.TYPING_STARTED,
            payload: {
                conversationId,
                userId,
            },
            timestamp: new Date(),
        });
    }

    async publishTypingStopped(conversationId: string, userId: string): Promise<void> {
        await this.publish({
            type: MessagingEventType.TYPING_STOPPED,
            payload: {
                conversationId,
                userId,
            },
            timestamp: new Date(),
        });
    }
}
