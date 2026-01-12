import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUserFieldsOptional1768059114847 implements MigrationInterface {
    name = 'MakeUserFieldsOptional1768059114847'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "username" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "firstName" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "firstName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "username" SET NOT NULL`);
    }

}
