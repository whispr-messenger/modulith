import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { Message } from './message.entity';

export enum ConversationType {
    DIRECT = 'direct',
    GROUP = 'group',
}

@Entity('conversations', { schema: 'messaging' })
@Index(['type', 'isActive'])
@Index(['externalGroupId'])
@Index(['updatedAt'])
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ConversationType,
        default: ConversationType.DIRECT,
    })
    type: ConversationType;

    @Column({ type: 'uuid', nullable: true, name: 'external_group_id' })
    @Index()
    externalGroupId: string | null;

    @Column({ type: 'simple-json', default: {} })
    metadata: Record<string, any>;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @OneToMany('ConversationMember', (member) => member.conversation, { cascade: true })
    members: ConversationMember[];

    @OneToMany('Message', (message) => message.conversation, { cascade: true })
    messages: Message[];

    // Helper methods
    isDirect(): boolean {
        return this.type === ConversationType.DIRECT;
    }

    isGroup(): boolean {
        return this.type === ConversationType.GROUP;
    }

    getName(): string | null {
        return this.metadata?.name || null;
    }
}
