import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users_auth')
export class UserAuth {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'phone_number', type: 'varchar', length: 20, unique: true })
	phoneNumber: string;

	@Column({
		name: 'two_factor_secret',
		type: 'varchar',
		length: 255,
		nullable: true,
	})
	twoFactorSecret: string;

	@Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
	twoFactorEnabled: boolean;

	@Column({
		name: 'last_authenticated_at',
		nullable: true,
	})
	lastAuthenticatedAt: Date;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
