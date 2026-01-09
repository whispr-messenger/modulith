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

@Entity({ name: 'signed_prekeys', schema: 'auth' })
@Index(['userId', 'deviceId'])
@Unique(['userId', 'deviceId', 'keyId'])
export class SignedPreKey {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'device_id', type: 'uuid' })
	deviceId: string;

	@Column({ name: 'key_id', type: 'integer' })
	keyId: number;

	@Column({ name: 'public_key', type: 'text' })
	publicKey: string;

	@Column({ name: 'signature', type: 'text' })
	signature: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@Column({ name: 'expires_at', type: 'timestamp' })
	expiresAt: Date;

	@ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: UserAuth;
}
