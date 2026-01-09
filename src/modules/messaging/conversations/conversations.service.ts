import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Conversation,
    ConversationType,
    ConversationMember,
} from '../entities';
import { MessagingEventsService } from '../events/messaging-events.service';

export interface CreateConversationDto {
    type: ConversationType;
    memberIds: string[];
    externalGroupId?: string;
    metadata?: Record<string, any>;
}

export interface ConversationWithUnreadCount extends Conversation {
    unreadCount?: number;
}

@Injectable()
export class ConversationsService {
    private readonly logger = new Logger(ConversationsService.name);

    constructor(
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(ConversationMember)
        private readonly memberRepository: Repository<ConversationMember>,
        private readonly eventsService: MessagingEventsService,
    ) { }

    /**
     * Create a new conversation
     */
    async createConversation(dto: CreateConversationDto, creatorId: string): Promise<Conversation> {
        const { type, memberIds, externalGroupId, metadata } = dto;

        // Validate member IDs
        if (!memberIds.includes(creatorId)) {
            memberIds.push(creatorId);
        }

        if (type === ConversationType.DIRECT && memberIds.length !== 2) {
            throw new BadRequestException('Direct conversations must have exactly 2 members');
        }

        // Check for existing direct conversation
        if (type === ConversationType.DIRECT) {
            const existing = await this.findDirectConversation(memberIds[0], memberIds[1]);
            if (existing) {
                return existing;
            }
        }

        // Create conversation
        const conversation = this.conversationRepository.create({
            type,
            externalGroupId,
            metadata: metadata || {},
        });

        const savedConversation = await this.conversationRepository.save(conversation);

        // Add members
        const members = memberIds.map((userId, index) =>
            this.memberRepository.create({
                conversationId: savedConversation.id,
                userId,
                settings: {
                    role: index === 0 ? 'admin' : 'member',
                    notifications: true,
                    muted: false,
                },
            }),
        );

        await this.memberRepository.save(members);

        // Load full conversation with members
        const fullConversation = await this.findById(savedConversation.id);

        // Emit event
        await this.eventsService.publishConversationCreated(fullConversation, memberIds);

        this.logger.log(`Created ${type} conversation ${savedConversation.id}`);
        return fullConversation;
    }

    /**
     * Find conversation by ID
     */
    async findById(id: string): Promise<Conversation> {
        const conversation = await this.conversationRepository.findOne({
            where: { id },
            relations: ['members'],
        });

        if (!conversation) {
            throw new NotFoundException(`Conversation ${id} not found`);
        }

        return conversation;
    }

    /**
     * Find direct conversation between two users
     */
    async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
        const result = await this.conversationRepository
            .createQueryBuilder('c')
            .innerJoin('c.members', 'm1', 'm1.userId = :userId1', { userId1 })
            .innerJoin('c.members', 'm2', 'm2.userId = :userId2', { userId2 })
            .where('c.type = :type', { type: ConversationType.DIRECT })
            .andWhere('c.isActive = true')
            .getOne();

        return result;
    }

    /**
     * List all conversations for a user
     */
    async listUserConversations(
        userId: string,
        options: { limit?: number; offset?: number } = {},
    ): Promise<ConversationWithUnreadCount[]> {
        const { limit = 50, offset = 0 } = options;

        const conversations = await this.conversationRepository
            .createQueryBuilder('c')
            .innerJoin('c.members', 'm', 'm.userId = :userId AND m.isActive = true', { userId })
            .leftJoinAndSelect('c.members', 'allMembers')
            .where('c.isActive = true')
            .orderBy('c.updatedAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();

        return conversations;
    }

    /**
     * Add member to conversation
     */
    async addMember(
        conversationId: string,
        userId: string,
        addedBy: string,
        role: 'admin' | 'member' = 'member',
    ): Promise<ConversationMember> {
        const conversation = await this.findById(conversationId);

        if (conversation.type === ConversationType.DIRECT) {
            throw new BadRequestException('Cannot add members to direct conversations');
        }

        // Check if already a member
        const existing = await this.memberRepository.findOne({
            where: { conversationId, userId },
        });

        if (existing) {
            if (existing.isActive) {
                throw new BadRequestException('User is already a member');
            }
            // Reactivate membership
            existing.isActive = true;
            existing.settings = { ...existing.settings, role };
            return this.memberRepository.save(existing);
        }

        const member = this.memberRepository.create({
            conversationId,
            userId,
            settings: { role, notifications: true, muted: false },
        });

        const saved = await this.memberRepository.save(member);

        // Emit event
        await this.eventsService.publishMemberAdded(conversationId, userId, addedBy);

        return saved;
    }

    /**
     * Remove member from conversation
     */
    async removeMember(
        conversationId: string,
        userId: string,
        removedBy: string,
    ): Promise<void> {
        const member = await this.memberRepository.findOne({
            where: { conversationId, userId, isActive: true },
        });

        if (!member) {
            throw new NotFoundException('Member not found');
        }

        member.isActive = false;
        await this.memberRepository.save(member);

        // Emit event
        await this.eventsService.publishMemberRemoved(conversationId, userId, removedBy);

        this.logger.log(`Removed user ${userId} from conversation ${conversationId}`);
    }

    /**
     * Update member settings
     */
    async updateMemberSettings(
        conversationId: string,
        userId: string,
        settings: Partial<ConversationMember['settings']>,
    ): Promise<ConversationMember> {
        const member = await this.memberRepository.findOne({
            where: { conversationId, userId, isActive: true },
        });

        if (!member) {
            throw new NotFoundException('Member not found');
        }

        member.settings = { ...member.settings, ...settings };
        return this.memberRepository.save(member);
    }

    /**
     * Mark conversation as read for user
     */
    async markAsRead(conversationId: string, userId: string): Promise<void> {
        await this.memberRepository.update(
            { conversationId, userId },
            { lastReadAt: new Date() },
        );
    }

    /**
     * Deactivate conversation
     */
    async deactivateConversation(conversationId: string): Promise<void> {
        await this.conversationRepository.update(conversationId, { isActive: false });
        this.logger.log(`Deactivated conversation ${conversationId}`);
    }

    /**
     * Get conversation members
     */
    async getMembers(conversationId: string): Promise<ConversationMember[]> {
        return this.memberRepository.find({
            where: { conversationId, isActive: true },
        });
    }

    /**
     * Check if user is member of conversation
     */
    async isMember(conversationId: string, userId: string): Promise<boolean> {
        const count = await this.memberRepository.count({
            where: { conversationId, userId, isActive: true },
        });
        return count > 0;
    }

    /**
     * Alias for isMember - used by WebSocket Gateway
     */
    async isUserMember(conversationId: string, userId: string): Promise<boolean> {
        return this.isMember(conversationId, userId);
    }
}
