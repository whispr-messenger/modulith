import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeviceForeignKeys1768049690945 implements MigrationInterface {
    name = 'AddDeviceForeignKeys1768049690945'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."signed_prekeys" ADD CONSTRAINT "FK_83a0d7a26ff6e69b8527dbe9048" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."prekeys" ADD CONSTRAINT "FK_090c41ea65e9e35eccae09e3977" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" ADD CONSTRAINT "FK_c9223f986eddac7e14b157d4d6e" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" DROP CONSTRAINT "FK_c9223f986eddac7e14b157d4d6e"`);
        await queryRunner.query(`ALTER TABLE "auth"."prekeys" DROP CONSTRAINT "FK_090c41ea65e9e35eccae09e3977"`);
        await queryRunner.query(`ALTER TABLE "auth"."signed_prekeys" DROP CONSTRAINT "FK_83a0d7a26ff6e69b8527dbe9048"`);
    }

}
