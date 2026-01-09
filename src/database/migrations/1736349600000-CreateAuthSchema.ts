import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSchema1736349600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create auth schema
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);

        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Grant permissions to the current database user
        const currentUser = await queryRunner.query(`SELECT current_user`);
        const username = currentUser[0].current_user;

        await queryRunner.query(`GRANT ALL PRIVILEGES ON SCHEMA auth TO ${username}`);
        await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO ${username}`);
        await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO ${username}`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all tables in auth schema first
        await queryRunner.query(`DROP SCHEMA IF EXISTS auth CASCADE`);
    }
}
