import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { UserAuth } from '../common/entities/user-auth.entity';

@Entity('devices')
@Index(['userId'])
@Index(['lastActive'])
@Index(['isActive'])
export class Device {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'device_name', type: 'varchar', length: 100 })
	deviceName: string;

	@Column({ name: 'device_type', type: 'varchar', length: 20 })
	deviceType: string;

	@Column({
		name: 'device_fingerprint',
		type: 'varchar',
		length: 255,
		unique: true,
	})
	deviceFingerprint: string;

	@Column({ name: 'model', type: 'varchar', length: 100, nullable: true })
	model: string;

	@Column({ name: 'os_version', type: 'varchar', length: 50, nullable: true })
	osVersion: string;

	@Column({
		name: 'app_version',
		type: 'varchar',
		length: 20,
		nullable: true,
	})
	appVersion: string;

	@Column({ name: 'fcm_token', type: 'varchar', length: 255, nullable: true })
	fcmToken: string;

	@Column({
		name: 'apns_token',
		type: 'varchar',
		length: 255,
		nullable: true,
	})
	apnsToken: string;

	@Column({ name: 'public_key', type: 'text' })
	publicKey: string;

	@Column({
		name: 'last_active',
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
	})
	lastActive: Date;

	@Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
	ipAddress: string;

	@Column({ name: 'is_verified', type: 'boolean', default: false })
	isVerified: boolean;

	@Column({ name: 'is_active', type: 'boolean', default: true })
	isActive: boolean;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: UserAuth;
}
