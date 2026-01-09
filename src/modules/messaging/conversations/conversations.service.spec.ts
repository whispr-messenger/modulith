import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService, CreateConversationDto } from './conversations.service';
import { Conversation, ConversationMember, ConversationType } from '../entities';
import { MessagingEventsService } from '../events/messaging-events.service';
import { Repository } from 'typeorm';

describe('ConversationsService', () => {
    let service: ConversationsService;
    let conversationRepository: Repository<Conversation>;
    let memberRepository: Repository<ConversationMember>;
    let eventsService: MessagingEventsService;

    const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
    };

    const mockConversationRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockMemberRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    };

    const mockEventsService = {
        publishConversationCreated: jest.fn(),
        publishMemberAdded: jest.fn(),
        publishMemberRemoved: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConversationsService,
                {
                    provide: getRepositoryToken(Conversation),
                    useValue: mockConversationRepository,
                },
                {
                    provide: getRepositoryToken(ConversationMember),
                    useValue: mockMemberRepository,
                },
                {
                    provide: MessagingEventsService,
                    useValue: mockEventsService,
                },
            ],
        }).compile();

        service = module.get<ConversationsService>(ConversationsService);
        conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
        memberRepository = module.get<Repository<ConversationMember>>(getRepositoryToken(ConversationMember));
        eventsService = module.get<MessagingEventsService>(MessagingEventsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createConversation', () => {
        it('should create a group conversation', async () => {
            const dto: CreateConversationDto = {
                type: ConversationType.GROUP,
                name: 'Test Group',
                memberIds: ['user-2'],
            };
            const creatorId = 'user-1';
            const savedConversation = { id: 'conv-id', ...dto };

            mockConversationRepository.create.mockReturnValue(savedConversation);
            mockConversationRepository.save.mockResolvedValue(savedConversation);
            mockMemberRepository.create.mockReturnValue({});
            mockMemberRepository.save.mockResolvedValue([]);
            // Mock findById to return full conversation
            mockConversationRepository.findOne.mockResolvedValue(savedConversation);

            const result = await service.createConversation(dto, creatorId);

            expect(mockConversationRepository.save).toHaveBeenCalled();
            expect(mockMemberRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishConversationCreated).toHaveBeenCalled();
            expect(result).toEqual(savedConversation);
        });

        it('should create direct conversation', async () => {
            const dto: CreateConversationDto = {
                type: ConversationType.DIRECT,
                memberIds: ['user-2'],
            };
            const creatorId = 'user-1';
            const savedConversation = { id: 'conv-id', ...dto };

            // Mock findDirectConversation to return null
            mockQueryBuilder.getOne.mockResolvedValue(null);

            mockConversationRepository.create.mockReturnValue(savedConversation);
            mockConversationRepository.save.mockResolvedValue(savedConversation);
            mockConversationRepository.findOne.mockResolvedValue(savedConversation);

            const result = await service.createConversation(dto, creatorId);

            expect(mockConversationRepository.save).toHaveBeenCalled();
        });

        it('should return existing direct conversation if exists', async () => {
            const dto: CreateConversationDto = {
                type: ConversationType.DIRECT,
                memberIds: ['user-2'],
            };
            const creatorId = 'user-1';
            const existingConversation = { id: 'existing-id' };

            mockQueryBuilder.getOne.mockResolvedValue(existingConversation);

            const result = await service.createConversation(dto, creatorId);

            expect(result).toEqual(existingConversation);
            expect(mockConversationRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should return conversation if found', async () => {
            const conversation = { id: 'conv-id' };
            mockConversationRepository.findOne.mockResolvedValue(conversation);

            const result = await service.findById('conv-id');
            expect(result).toEqual(conversation);
        });

        it('should throw NotFoundException if not found', async () => {
            mockConversationRepository.findOne.mockResolvedValue(null);
            await expect(service.findById('conv-id')).rejects.toThrow();
        });
    });

    describe('listUserConversations', () => {
        it('should list conversations', async () => {
            const conversations = [{ id: 'conv-1' }];
            mockQueryBuilder.getMany.mockResolvedValue(conversations);

            const result = await service.listUserConversations('user-1');
            expect(result).toEqual(conversations);
            expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('c.members', 'm', 'm.userId = :userId AND m.isActive = true', { userId: 'user-1' });
        });
    });

    describe('addMember', () => {
        it('should add new member', async () => {
            const conversation = { id: 'conv-id', type: ConversationType.GROUP };
            mockConversationRepository.findOne.mockResolvedValue(conversation);
            mockMemberRepository.findOne.mockResolvedValue(null);

            const newMember = { id: 'member-id', userId: 'user-2' };
            mockMemberRepository.create.mockReturnValue(newMember);
            mockMemberRepository.save.mockResolvedValue(newMember);

            const result = await service.addMember('conv-id', 'user-2', 'user-1');

            expect(mockMemberRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishMemberAdded).toHaveBeenCalled();
            expect(result).toEqual(newMember);
        });

        it('should reactivate existing inactive member', async () => {
            const conversation = { id: 'conv-id', type: ConversationType.GROUP };
            mockConversationRepository.findOne.mockResolvedValue(conversation);
            const existingMember = { id: 'member-id', isActive: false };
            mockMemberRepository.findOne.mockResolvedValue(existingMember);
            mockMemberRepository.save.mockResolvedValue({ ...existingMember, isActive: true });

            await service.addMember('conv-id', 'user-2', 'user-1');

            expect(existingMember.isActive).toBe(true);
            expect(mockMemberRepository.save).toHaveBeenCalled();
        });
    });

    describe('removeMember', () => {
        it('should remove member', async () => {
            const member = { id: 'member-id', isActive: true, userId: 'user-2' };
            mockMemberRepository.findOne.mockResolvedValue(member);

            await service.removeMember('conv-id', 'user-2', 'user-1');

            expect(member.isActive).toBe(false);
            expect(mockMemberRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishMemberRemoved).toHaveBeenCalled();
        });
    });

    describe('markAsRead', () => {
        it('should update lastReadAt', async () => {
            await service.markAsRead('conv-id', 'user-1');
            expect(mockMemberRepository.update).toHaveBeenCalledWith(
                { conversationId: 'conv-id', userId: 'user-1' },
                { lastReadAt: expect.any(Date) }
            );
        });
    });

    describe('isMember', () => {
        it('should return true if count > 0', async () => {
            mockMemberRepository.count.mockResolvedValue(1);
            const result = await service.isMember('conv-id', 'user-1');
            expect(result).toBe(true);
        });

        it('should return false if count is 0', async () => {
            mockMemberRepository.count.mockResolvedValue(0);
            const result = await service.isMember('conv-id', 'user-1');
            expect(result).toBe(false);
        });
    });

    describe('createConversation edge cases', () => {
        it('should throw BadRequestException for direct chat with wrong member count', async () => {
            const dto: CreateConversationDto = {
                type: ConversationType.DIRECT,
                memberIds: ['user-2', 'user-3', 'user-4'],
            };
            const creatorId = 'user-1';

            // Even after adding creator, total > 2
            await expect(service.createConversation(dto, creatorId)).rejects.toThrow();
        });
    });

    describe('addMember edge cases', () => {
        it('should throw BadRequestException for direct conversations', async () => {
            const conversation = { id: 'conv-id', type: ConversationType.DIRECT };
            mockConversationRepository.findOne.mockResolvedValue(conversation);

            await expect(service.addMember('conv-id', 'user-3', 'user-1')).rejects.toThrow();
        });

        it('should throw BadRequestException if user is already active member', async () => {
            const conversation = { id: 'conv-id', type: ConversationType.GROUP };
            mockConversationRepository.findOne.mockResolvedValue(conversation);
            const existingMember = { id: 'member-id', isActive: true };
            mockMemberRepository.findOne.mockResolvedValue(existingMember);

            await expect(service.addMember('conv-id', 'user-2', 'user-1')).rejects.toThrow('already a member');
        });
    });

    describe('removeMember edge cases', () => {
        it('should throw NotFoundException if member not found', async () => {
            mockMemberRepository.findOne.mockResolvedValue(null);

            await expect(service.removeMember('conv-id', 'user-2', 'user-1')).rejects.toThrow();
        });
    });

    describe('updateMemberSettings', () => {
        it('should update member settings', async () => {
            const member = { id: 'member-id', settings: { notifications: true } };
            mockMemberRepository.findOne.mockResolvedValue(member);
            mockMemberRepository.save.mockResolvedValue({ ...member, settings: { notifications: false } });

            const result = await service.updateMemberSettings('conv-id', 'user-1', { notifications: false });

            expect(mockMemberRepository.save).toHaveBeenCalled();
            expect(result.settings.notifications).toBe(false);
        });

        it('should throw NotFoundException if member not found', async () => {
            mockMemberRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateMemberSettings('conv-id', 'user-1', { muted: true })
            ).rejects.toThrow('not found');
        });
    });

    describe('deactivateConversation', () => {
        it('should deactivate conversation', async () => {
            await service.deactivateConversation('conv-id');

            expect(mockConversationRepository.update).toHaveBeenCalledWith('conv-id', { isActive: false });
        });
    });

    describe('getMembers', () => {
        it('should return active members', async () => {
            const members = [{ id: 'm1' }, { id: 'm2' }];
            mockMemberRepository.find.mockResolvedValue(members);

            const result = await service.getMembers('conv-id');

            expect(result).toEqual(members);
            expect(mockMemberRepository.find).toHaveBeenCalledWith({
                where: { conversationId: 'conv-id', isActive: true },
            });
        });
    });

    describe('isUserMember', () => {
        it('should alias isMember', async () => {
            mockMemberRepository.count.mockResolvedValue(1);
            const result = await service.isUserMember('conv-id', 'user-1');
            expect(result).toBe(true);
        });
    });

    describe('listUserConversations with pagination', () => {
        it('should apply pagination options', async () => {
            mockQueryBuilder.getMany.mockResolvedValue([]);

            await service.listUserConversations('user-1', { offset: 10, limit: 20 });

            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
        });
    });
});

