import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm';
import { UserAuth } from '../../common/entities/user-auth.entity';

@Entity({ name: 'identity_keys', schema: 'auth' })
@Unique(['userId', 'deviceId'])
export class IdentityKey {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'device_id', type: 'uuid' })
	deviceId: string;

	@Column({ name: 'public_key', type: 'text' })
	publicKey: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: UserAuth;
}
