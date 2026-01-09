import { Conversation, ConversationType } from './conversation.entity';

describe('Conversation Entity', () => {
    const createConversation = (overrides: Partial<Conversation> = {}): Conversation => {
        const conversation = new Conversation();
        conversation.id = 'conv-id';
        conversation.type = ConversationType.DIRECT;
        conversation.metadata = {};
        conversation.isActive = true;
        Object.assign(conversation, overrides);
        return conversation;
    };

    describe('isDirect', () => {
        it('should return true for DIRECT type', () => {
            const conversation = createConversation({ type: ConversationType.DIRECT });
            expect(conversation.isDirect()).toBe(true);
        });

        it('should return false for GROUP type', () => {
            const conversation = createConversation({ type: ConversationType.GROUP });
            expect(conversation.isDirect()).toBe(false);
        });
    });

    describe('isGroup', () => {
        it('should return true for GROUP type', () => {
            const conversation = createConversation({ type: ConversationType.GROUP });
            expect(conversation.isGroup()).toBe(true);
        });

        it('should return false for DIRECT type', () => {
            const conversation = createConversation({ type: ConversationType.DIRECT });
            expect(conversation.isGroup()).toBe(false);
        });
    });

    describe('getName', () => {
        it('should return name from metadata', () => {
            const conversation = createConversation({
                metadata: { name: 'Test Group' },
            });
            expect(conversation.getName()).toBe('Test Group');
        });

        it('should return null if no name in metadata', () => {
            const conversation = createConversation({ metadata: {} });
            expect(conversation.getName()).toBeNull();
        });

        it('should return null if metadata is empty', () => {
            const conversation = createConversation();
            expect(conversation.getName()).toBeNull();
        });
    });
});
