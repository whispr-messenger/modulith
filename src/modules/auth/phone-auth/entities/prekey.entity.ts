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
import { UserAuth } from '../../common/entities/user-auth.entity';

@Entity('prekeys')
@Index(['userId'])
@Unique(['userId', 'keyId'])
export class PreKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'key_id', type: 'integer' })
    keyId: number;

    @Column({ name: 'public_key', type: 'text' })
    publicKey: string;

    @Column({ name: 'is_one_time', type: 'boolean', default: true })
    isOneTime: boolean;

    @Column({ name: 'is_used', type: 'boolean', default: false })
    isUsed: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserAuth;
}