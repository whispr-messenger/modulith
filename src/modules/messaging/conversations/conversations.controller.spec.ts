import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './conversations.service';
import { ConversationType } from '../entities';

describe('ConversationsController', () => {
    let controller: ConversationsController;
    let service: ConversationsService;

    const mockConversationsService = {
        createConversation: jest.fn(),
        listUserConversations: jest.fn(),
        findById: jest.fn(),
        getMembers: jest.fn(),
        addMember: jest.fn(),
        removeMember: jest.fn(),
        updateMemberSettings: jest.fn(),
        markAsRead: jest.fn(),
        findDirectConversation: jest.fn(),
    };

    const mockUser = { id: 'test-user-id' };
    const mockRequest = { user: mockUser };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ConversationsController],
            providers: [
                {
                    provide: ConversationsService,
                    useValue: mockConversationsService,
                },
            ],
        }).compile();

        controller = module.get<ConversationsController>(ConversationsController);
        service = module.get<ConversationsService>(ConversationsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create a conversation', async () => {
            const dto: CreateConversationDto = {
                type: ConversationType.GROUP,
                name: 'Test Group',
                memberIds: ['user2'],
            };
            const expectedResult = { id: 'conv-id', ...dto };

            mockConversationsService.createConversation.mockResolvedValue(expectedResult);

            const result = await controller.create(dto, mockRequest);

            expect(service.createConversation).toHaveBeenCalledWith(dto, mockUser.id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('list', () => {
        it('should list user conversations with default pagination', async () => {
            const expectedResult = [{ id: 'conv-id', name: 'Test Group' }];
            mockConversationsService.listUserConversations.mockResolvedValue(expectedResult);

            const result = await controller.list(mockRequest);

            expect(service.listUserConversations).toHaveBeenCalledWith(mockUser.id, { limit: 50, offset: 0 });
            expect(result).toEqual(expectedResult);
        });

        it('should list user conversations with custom pagination', async () => {
            const expectedResult = [];
            mockConversationsService.listUserConversations.mockResolvedValue(expectedResult);

            const result = await controller.list(mockRequest, 10, 5);

            expect(service.listUserConversations).toHaveBeenCalledWith(mockUser.id, { limit: 10, offset: 5 });
            expect(result).toEqual(expectedResult);
        });
    });

    describe('findOne', () => {
        it('should return a conversation by id', async () => {
            const id = 'conv-id';
            const expectedResult = { id, name: 'Test Group' };
            mockConversationsService.findById.mockResolvedValue(expectedResult);

            const result = await controller.findOne(id);

            expect(service.findById).toHaveBeenCalledWith(id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('getMembers', () => {
        it('should return conversation members', async () => {
            const id = 'conv-id';
            const expectedResult = [{ userId: 'user1', role: 'admin' }];
            mockConversationsService.getMembers.mockResolvedValue(expectedResult);

            const result = await controller.getMembers(id);

            expect(service.getMembers).toHaveBeenCalledWith(id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('addMember', () => {
        it('should add a member to the conversation', async () => {
            const convId = 'conv-id';
            const body = { userId: 'new-user', role: 'member' as const };
            const expectedResult = { id: 'member-id', ...body };

            mockConversationsService.addMember.mockResolvedValue(expectedResult);

            const result = await controller.addMember(convId, body, mockRequest);

            expect(service.addMember).toHaveBeenCalledWith(convId, body.userId, mockUser.id, body.role);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('removeMember', () => {
        it('should remove a member from the conversation', async () => {
            const convId = 'conv-id';
            const userId = 'user-to-remove';

            mockConversationsService.removeMember.mockResolvedValue(undefined);

            const result = await controller.removeMember(convId, userId, mockRequest);

            expect(service.removeMember).toHaveBeenCalledWith(convId, userId, mockUser.id);
            expect(result).toEqual({ success: true });
        });
    });

    describe('updateMemberSettings', () => {
        it('should update member settings', async () => {
            const convId = 'conv-id';
            const userId = 'user-id';
            const settings = { muted: true };
            const expectedResult = { userId, ...settings };

            mockConversationsService.updateMemberSettings.mockResolvedValue(expectedResult);

            const result = await controller.updateMemberSettings(convId, userId, settings);

            expect(service.updateMemberSettings).toHaveBeenCalledWith(convId, userId, settings);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('markAsRead', () => {
        it('should mark conversation as read', async () => {
            const convId = 'conv-id';

            mockConversationsService.markAsRead.mockResolvedValue(undefined);

            const result = await controller.markAsRead(convId, mockRequest);

            expect(service.markAsRead).toHaveBeenCalledWith(convId, mockUser.id);
            expect(result).toEqual({ success: true });
        });
    });

    describe('findOrCreateDirect', () => {
        it('should return existing direct conversation', async () => {
            const otherUserId = 'other-user';
            const expectedResult = { id: 'existing-conv', type: ConversationType.DIRECT };

            mockConversationsService.findDirectConversation.mockResolvedValue(expectedResult);

            const result = await controller.findOrCreateDirect(otherUserId, mockRequest);

            expect(service.findDirectConversation).toHaveBeenCalledWith(mockUser.id, otherUserId);
            expect(service.createConversation).not.toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });

        it('should create new direct conversation if not found', async () => {
            const otherUserId = 'other-user';
            const expectedResult = { id: 'new-conv', type: ConversationType.DIRECT };

            mockConversationsService.findDirectConversation.mockResolvedValue(null);
            mockConversationsService.createConversation.mockResolvedValue(expectedResult);

            const result = await controller.findOrCreateDirect(otherUserId, mockRequest);

            expect(service.findDirectConversation).toHaveBeenCalledWith(mockUser.id, otherUserId);
            expect(service.createConversation).toHaveBeenCalledWith(
                {
                    type: ConversationType.DIRECT,
                    memberIds: [mockUser.id, otherUserId],
                },
                mockUser.id,
            );
            expect(result).toEqual(expectedResult);
        });
    });
});
