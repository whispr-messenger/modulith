import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePrivateKeyFromIdentityKeys1768056968074 implements MigrationInterface {
    name = 'RemovePrivateKeyFromIdentityKeys1768056968074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" DROP CONSTRAINT "FK_c9223f986eddac7e14b157d4d6e"`);
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" DROP COLUMN "private_key_encrypted"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" ADD "private_key_encrypted" text`);
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" ADD CONSTRAINT "FK_c9223f986eddac7e14b157d4d6e" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
