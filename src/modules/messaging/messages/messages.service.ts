import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
    Message,
    MessageType,
    DeliveryStatus,
    MessageReaction,
} from '../entities';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagingEventsService } from '../events/messaging-events.service';

export interface CreateMessageDto {
    conversationId: string;
    content: string;
    messageType?: MessageType;
    metadata?: Record<string, any>;
    replyToId?: string;
    clientRandom?: number;
}

export interface MessageWithDeliveryInfo extends Message {
    deliveredCount?: number;
    readCount?: number;
}

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);

    constructor(
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
        @InjectRepository(DeliveryStatus)
        private readonly deliveryStatusRepository: Repository<DeliveryStatus>,
        @InjectRepository(MessageReaction)
        private readonly reactionRepository: Repository<MessageReaction>,
        private readonly conversationsService: ConversationsService,
        private readonly eventsService: MessagingEventsService,
    ) { }

    /**
     * Create a new message
     */
    async createMessage(dto: CreateMessageDto, senderId: string): Promise<Message> {
        const { conversationId, content, messageType, metadata, replyToId, clientRandom } = dto;

        // Verify sender is member
        const isMember = await this.conversationsService.isMember(conversationId, senderId);
        if (!isMember) {
            throw new ForbiddenException('User is not a member of this conversation');
        }

        // Create message
        const message = this.messageRepository.create({
            conversationId,
            senderId,
            content,
            messageType: messageType || MessageType.TEXT,
            metadata: metadata || {},
            replyToId,
            clientRandom,
            sentAt: new Date(),
        });

        const savedMessage = await this.messageRepository.save(message);

        // Load with relations
        const fullMessage = await this.findById(savedMessage.id);

        // Get conversation members for delivery tracking
        const members = await this.conversationsService.getMembers(conversationId);
        const recipientIds = members.filter((m) => m.userId !== senderId).map((m) => m.userId);

        // Create pending delivery statuses
        const deliveryStatuses = recipientIds.map((userId) =>
            this.deliveryStatusRepository.create({
                messageId: savedMessage.id,
                userId,
            }),
        );
        await this.deliveryStatusRepository.save(deliveryStatuses);

        // Emit event
        await this.eventsService.publishMessageCreated(fullMessage, recipientIds);

        this.logger.log(`Created message ${savedMessage.id} in conversation ${conversationId}`);
        return fullMessage;
    }

    /**
     * Find message by ID
     */
    async findById(id: string): Promise<Message> {
        const message = await this.messageRepository.findOne({
            where: { id },
            relations: ['replyTo', 'deliveryStatuses', 'reactions'],
        });

        if (!message) {
            throw new NotFoundException(`Message ${id} not found`);
        }

        return message;
    }

    /**
     * Get messages in conversation with pagination
     */
    async getConversationMessages(
        conversationId: string,
        userId: string,
        options: { limit?: number; before?: Date; after?: Date } = {},
    ): Promise<Message[]> {
        const { limit = 50, before, after } = options;

        // Verify user is member
        const isMember = await this.conversationsService.isMember(conversationId, userId);
        if (!isMember) {
            throw new ForbiddenException('User is not a member of this conversation');
        }

        const query = this.messageRepository
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.replyTo', 'replyTo')
            .leftJoinAndSelect('m.reactions', 'reactions')
            .where('m.conversationId = :conversationId', { conversationId })
            .andWhere('m.isDeleted = false OR m.deletedForEveryone = false')
            .orderBy('m.sentAt', 'DESC')
            .take(limit);

        if (before) {
            query.andWhere('m.sentAt < :before', { before });
        }

        if (after) {
            query.andWhere('m.sentAt > :after', { after });
        }

        const messages = await query.getMany();
        return messages.reverse(); // Return in chronological order
    }

    /**
     * Edit a message
     */
    async editMessage(messageId: string, newContent: string, userId: string): Promise<Message> {
        const message = await this.findById(messageId);

        if (message.senderId !== userId) {
            throw new ForbiddenException('Only the sender can edit this message');
        }

        if (!message.isEditable()) {
            throw new ForbiddenException('Message can no longer be edited');
        }

        message.markAsEdited(newContent);
        const saved = await this.messageRepository.save(message);

        // Emit event
        await this.eventsService.publishMessageEdited(saved);

        return saved;
    }

    /**
     * Delete a message
     */
    async deleteMessage(
        messageId: string,
        userId: string,
        forEveryone: boolean = false,
    ): Promise<void> {
        const message = await this.findById(messageId);

        if (message.senderId !== userId) {
            throw new ForbiddenException('Only the sender can delete this message');
        }

        if (forEveryone && !message.isDeletable()) {
            throw new ForbiddenException('Message can no longer be deleted for everyone');
        }

        message.markAsDeleted(forEveryone);
        await this.messageRepository.save(message);

        // Emit event
        await this.eventsService.publishMessageDeleted(messageId, message.conversationId, forEveryone);

        this.logger.log(`Deleted message ${messageId} (forEveryone: ${forEveryone})`);
    }

    /**
     * Mark message as delivered
     */
    async markAsDelivered(messageId: string, userId: string): Promise<void> {
        const status = await this.deliveryStatusRepository.findOne({
            where: { messageId, userId },
        });

        if (!status) {
            throw new NotFoundException('Delivery status not found');
        }

        if (!status.deliveredAt) {
            status.markAsDelivered();
            await this.deliveryStatusRepository.save(status);

            // Emit event
            await this.eventsService.publishMessageDelivered(messageId, userId);
        }
    }

    /**
     * Mark message as read
     */
    async markAsRead(messageId: string, userId: string): Promise<void> {
        const status = await this.deliveryStatusRepository.findOne({
            where: { messageId, userId },
        });

        if (!status) {
            throw new NotFoundException('Delivery status not found');
        }

        if (!status.readAt) {
            status.markAsRead();
            await this.deliveryStatusRepository.save(status);

            // Emit event
            await this.eventsService.publishMessageRead(messageId, userId);
        }
    }

    /**
     * Mark multiple messages as read
     */
    async markMultipleAsRead(messageIds: string[], userId: string): Promise<void> {
        await this.deliveryStatusRepository.update(
            { messageId: In(messageIds), userId, readAt: undefined },
            { readAt: new Date(), deliveredAt: new Date() },
        );

        // Emit events
        for (const messageId of messageIds) {
            await this.eventsService.publishMessageRead(messageId, userId);
        }
    }

    /**
     * Add reaction to message
     */
    async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageReaction> {
        const message = await this.findById(messageId);

        // Check if reaction exists
        const existing = await this.reactionRepository.findOne({
            where: { messageId, userId, reaction },
        });

        if (existing) {
            return existing;
        }

        const newReaction = this.reactionRepository.create({
            messageId,
            userId,
            reaction,
        });

        const saved = await this.reactionRepository.save(newReaction);

        // Emit event
        await this.eventsService.publishReactionAdded(messageId, message.conversationId, userId, reaction);

        return saved;
    }

    /**
     * Remove reaction from message
     */
    async removeReaction(messageId: string, userId: string, reaction: string): Promise<void> {
        const message = await this.findById(messageId);

        const result = await this.reactionRepository.delete({
            messageId,
            userId,
            reaction,
        });

        if (result.affected && result.affected > 0) {
            // Emit event
            await this.eventsService.publishReactionRemoved(messageId, message.conversationId, userId, reaction);
        }
    }

    /**
     * Get delivery status for message
     */
    async getDeliveryStatus(messageId: string): Promise<DeliveryStatus[]> {
        return this.deliveryStatusRepository.find({
            where: { messageId },
        });
    }

    /**
     * Get reactions for message
     */
    async getReactions(messageId: string): Promise<MessageReaction[]> {
        return this.reactionRepository.find({
            where: { messageId },
        });
    }

    // ===== Aliases for WebSocket Gateway =====

    /**
     * Alias for createMessage - used by WebSocket Gateway
     */
    async create(dto: CreateMessageDto, senderId: string): Promise<Message> {
        return this.createMessage(dto, senderId);
    }

    /**
     * Alias for editMessage - used by WebSocket Gateway
     */
    async update(messageId: string, updateDto: { content: string }, userId: string): Promise<Message> {
        return this.editMessage(messageId, updateDto.content, userId);
    }

    /**
     * Alias for deleteMessage - used by WebSocket Gateway
     */
    async delete(messageId: string, userId: string, forEveryone: boolean = false): Promise<Message> {
        const message = await this.findById(messageId);
        await this.deleteMessage(messageId, userId, forEveryone);
        return message;
    }

    /**
     * Alias for findById - used by WebSocket Gateway
     */
    async findOne(messageId: string): Promise<Message> {
        return this.findById(messageId);
    }
}
