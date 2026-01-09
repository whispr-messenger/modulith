import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('message_reactions', { schema: 'messaging' })
@Unique(['messageId', 'userId', 'reaction'])
@Index(['messageId'])
export class MessageReaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'message_id' })
    messageId: string;

    @Column({ type: 'uuid', name: 'user_id' })
    @Index()
    userId: string;

    @Column({ type: 'varchar', length: 50 })
    reaction: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Message, (message) => message.reactions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'message_id' })
    message: Message;
}
