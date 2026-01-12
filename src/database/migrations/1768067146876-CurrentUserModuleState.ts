import { MigrationInterface, QueryRunner } from "typeorm";

export class CurrentUserModuleState1768067146876 implements MigrationInterface {
    name = 'CurrentUserModuleState1768067146876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "username" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "username" DROP NOT NULL`);
    }

}
