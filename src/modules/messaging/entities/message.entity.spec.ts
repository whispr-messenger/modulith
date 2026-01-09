import { Message, MessageType } from './message.entity';

describe('Message Entity', () => {
    const createMessage = (overrides: Partial<Message> = {}): Message => {
        const message = new Message();
        message.id = 'msg-id';
        message.conversationId = 'conv-id';
        message.senderId = 'user-id';
        message.content = 'Hello';
        message.messageType = MessageType.TEXT;
        message.metadata = {};
        message.sentAt = new Date();
        message.isDeleted = false;
        message.deletedForEveryone = false;
        Object.assign(message, overrides);
        return message;
    };

    describe('isEditable', () => {
        it('should return false if message is deleted', () => {
            const message = createMessage({ isDeleted: true });
            expect(message.isEditable()).toBe(false);
        });

        it('should return true if message was sent within 24 hours', () => {
            const message = createMessage({ sentAt: new Date() });
            expect(message.isEditable()).toBe(true);
        });

        it('should return false if message is older than 24 hours', () => {
            const message = createMessage({
                sentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            });
            expect(message.isEditable()).toBe(false);
        });
    });

    describe('isDeletable', () => {
        it('should return false if message is deleted', () => {
            const message = createMessage({ isDeleted: true });
            expect(message.isDeletable()).toBe(false);
        });

        it('should return true if message was sent within 48 hours', () => {
            const message = createMessage({ sentAt: new Date() });
            expect(message.isDeletable()).toBe(true);
        });

        it('should return false if message is older than 48 hours', () => {
            const message = createMessage({
                sentAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
            });
            expect(message.isDeletable()).toBe(false);
        });
    });

    describe('markAsEdited', () => {
        it('should update content and set editedAt', () => {
            const message = createMessage();
            message.markAsEdited('New content');

            expect(message.content).toBe('New content');
            expect(message.editedAt).toBeInstanceOf(Date);
        });
    });

    describe('markAsDeleted', () => {
        it('should mark message as deleted for self only', () => {
            const message = createMessage();
            message.markAsDeleted();

            expect(message.isDeleted).toBe(true);
            expect(message.deletedForEveryone).toBe(false);
        });

        it('should mark message as deleted for everyone', () => {
            const message = createMessage();
            message.markAsDeleted(true);

            expect(message.isDeleted).toBe(true);
            expect(message.deletedForEveryone).toBe(true);
        });
    });
});
