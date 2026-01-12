import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUsernameNullable1768068630300 implements MigrationInterface {
    name = 'MakeUsernameNullable1768068630300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "username" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."users" ALTER COLUMN "username" SET NOT NULL`);
    }

}
