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
     * Pinned conversations appear first, sorted by update time
     * Archived conversations are excluded by default
     */
    async listUserConversations(
        userId: string,
        options: { limit?: number; offset?: number; includeArchived?: boolean } = {},
    ): Promise<ConversationWithUnreadCount[]> {
        const { limit = 50, offset = 0, includeArchived = false } = options;

        const queryBuilder = this.conversationRepository
            .createQueryBuilder('c')
            .innerJoin('c.members', 'm', 'm.userId = :userId AND m.isActive = true', { userId })
            .leftJoinAndSelect('c.members', 'allMembers')
            .where('c.isActive = true');

        // Exclude archived conversations by default
        if (!includeArchived) {
            queryBuilder.andWhere('m.isArchived = false');
        }

        const conversations = await queryBuilder
            .orderBy('m.isPinned', 'DESC')  // Pinned conversations first
            .addOrderBy('c.updatedAt', 'DESC')  // Then by update time
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

    /**
     * Pin a conversation for a user
     * Maximum 5 conversations can be pinned per user
     * If the conversation is archived, it will be unarchived automatically
     */
    async pinConversation(conversationId: string, userId: string): Promise<ConversationMember> {
        // Check if user is member
        const member = await this.memberRepository.findOne({
            where: { conversationId, userId, isActive: true },
        });

        if (!member) {
            throw new NotFoundException('You are not a member of this conversation');
        }

        // Check if already pinned
        if (member.isPinned) {
            return member;
        }

        // Check pin limit (maximum 5)
        const pinnedCount = await this.countPinnedConversations(userId);
        if (pinnedCount >= 5) {
            throw new BadRequestException('Maximum 5 conversations can be pinned. Please unpin another conversation first.');
        }

        // Pin the conversation and unarchive if necessary
        member.isPinned = true;
        if (member.isArchived) {
            member.isArchived = false;
            member.archivedAt = null;
        }

        const saved = await this.memberRepository.save(member);
        this.logger.log(`User ${userId} pinned conversation ${conversationId}`);

        return saved;
    }

    /**
     * Unpin a conversation for a user
     */
    async unpinConversation(conversationId: string, userId: string): Promise<ConversationMember> {
        const member = await this.memberRepository.findOne({
            where: { conversationId, userId, isActive: true },
        });

        if (!member) {
            throw new NotFoundException('You are not a member of this conversation');
        }

        if (!member.isPinned) {
            return member;
        }

        member.isPinned = false;
        const saved = await this.memberRepository.save(member);
        this.logger.log(`User ${userId} unpinned conversation ${conversationId}`);

        return saved;
    }

    /**
     * Get all pinned conversations for a user
     */
    async getPinnedConversations(userId: string): Promise<Conversation[]> {
        const conversations = await this.conversationRepository
            .createQueryBuilder('c')
            .innerJoin(
                'c.members',
                'm',
                'm.userId = :userId AND m.isActive = true AND m.isPinned = true',
                { userId }
            )
            .leftJoinAndSelect('c.members', 'allMembers')
            .where('c.isActive = true')
            .orderBy('c.updatedAt', 'DESC')
            .getMany();

        return conversations;
    }

    /**
     * Count pinned conversations for a user
     */
    async countPinnedConversations(userId: string): Promise<number> {
        return this.memberRepository.count({
            where: {
                userId,
                isActive: true,
                isPinned: true,
            },
        });
    }

    /**
     * Archive a conversation for a user
     * Automatically unpins the conversation if it was pinned
     */
    async archiveConversation(conversationId: string, userId: string): Promise<ConversationMember> {
        const member = await this.memberRepository.findOne({
            where: { conversationId, userId, isActive: true },
        });

        if (!member) {
            throw new NotFoundException('You are not a member of this conversation');
        }

        if (member.isArchived) {
            return member;
        }

        // Archive and unpin if necessary
        member.isArchived = true;
        member.archivedAt = new Date();
        if (member.isPinned) {
            member.isPinned = false;
        }

        const saved = await this.memberRepository.save(member);
        this.logger.log(`User ${userId} archived conversation ${conversationId}`);

        return saved;
    }

    /**
     * Unarchive a conversation for a user
     */
    async unarchiveConversation(conversationId: string, userId: string): Promise<ConversationMember> {
        const member = await this.memberRepository.findOne({
            where: { conversationId, userId, isActive: true },
        });

        if (!member) {
            throw new NotFoundException('You are not a member of this conversation');
        }

        if (!member.isArchived) {
            return member;
        }

        member.isArchived = false;
        member.archivedAt = null;

        const saved = await this.memberRepository.save(member);
        this.logger.log(`User ${userId} unarchived conversation ${conversationId}`);

        return saved;
    }

    /**
     * Get all archived conversations for a user
     */
    async getArchivedConversations(
        userId: string,
        options: { limit?: number; offset?: number } = {},
    ): Promise<Conversation[]> {
        const { limit = 50, offset = 0 } = options;

        const conversations = await this.conversationRepository
            .createQueryBuilder('c')
            .innerJoin(
                'c.members',
                'm',
                'm.userId = :userId AND m.isActive = true AND m.isArchived = true',
                { userId }
            )
            .leftJoinAndSelect('c.members', 'allMembers')
            .where('c.isActive = true')
            .orderBy('m.archivedAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();

        return conversations;
    }
}
