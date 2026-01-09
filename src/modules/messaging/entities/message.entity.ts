import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { DeliveryStatus } from './delivery-status.entity';
import { MessageReaction } from './message-reaction.entity';

export enum MessageType {
    TEXT = 'text',
    MEDIA = 'media',
    SYSTEM = 'system',
    NOTIFICATION = 'notification',
}

@Entity('messages', { schema: 'messaging' })
@Index(['conversationId', 'sentAt'])
@Index(['senderId'])
@Index(['sentAt'])
@Index(['isDeleted'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'conversation_id' })
    @Index()
    conversationId: string;

    @Column({ type: 'uuid', name: 'sender_id' })
    senderId: string;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT,
        name: 'message_type',
    })
    messageType: MessageType;

    @Column({ type: 'text', nullable: true })
    content: string | null;

    @Column({ type: 'simple-json', default: {} })
    metadata: Record<string, any>;

    @Column({ type: 'bigint', nullable: true, name: 'client_random' })
    clientRandom: number | null;

    @Column({ type: 'uuid', nullable: true, name: 'reply_to_id' })
    replyToId: string | null;

    @Column({ type: 'timestamp', name: 'sent_at' })
    sentAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'edited_at' })
    editedAt: Date | null;

    @Column({ type: 'boolean', default: false, name: 'is_deleted' })
    isDeleted: boolean;

    @Column({ type: 'boolean', default: false, name: 'deleted_for_everyone' })
    deletedForEveryone: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Conversation, (conversation: Conversation) => conversation.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @ManyToOne(() => Message, { nullable: true })
    @JoinColumn({ name: 'reply_to_id' })
    replyTo: Message | null;

    @OneToMany(() => DeliveryStatus, (status: DeliveryStatus) => status.message, { cascade: true })
    deliveryStatuses: DeliveryStatus[];

    @OneToMany(() => MessageReaction, (reaction: MessageReaction) => reaction.message, { cascade: true })
    reactions: MessageReaction[];

    // Helper methods
    isEditable(): boolean {
        if (this.isDeleted) return false;
        // Messages can be edited within 24 hours
        const editWindow = 24 * 60 * 60 * 1000;
        return Date.now() - this.sentAt.getTime() < editWindow;
    }

    isDeletable(): boolean {
        if (this.isDeleted) return false;
        // Messages can be deleted within 48 hours
        const deleteWindow = 48 * 60 * 60 * 1000;
        return Date.now() - this.sentAt.getTime() < deleteWindow;
    }

    markAsEdited(newContent: string): void {
        this.content = newContent;
        this.editedAt = new Date();
    }

    markAsDeleted(forEveryone: boolean = false): void {
        this.isDeleted = true;
        this.deletedForEveryone = forEveryone;
    }
}
