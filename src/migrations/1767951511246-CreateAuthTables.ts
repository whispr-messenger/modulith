import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthTables1767951511246 implements MigrationInterface {
    name = 'CreateAuthTables1767951511246'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "auth"."users_auth" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phone_number" character varying(20) NOT NULL, "two_factor_secret" character varying(255), "two_factor_enabled" boolean NOT NULL DEFAULT false, "last_authenticated_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6c007a7e6e36a8a08aaf93ad7c6" UNIQUE ("phone_number"), CONSTRAINT "PK_32ddc1ae708e8261a870a6eb3e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "auth"."backup_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "code_hash" character varying(255) NOT NULL, "used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "used_at" TIMESTAMP, CONSTRAINT "PK_34ab957382dbc57e8fb53f1638f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_70066ea80d2f4b871beda32633" ON "auth"."backup_codes" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "auth"."prekeys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "device_id" uuid NOT NULL, "key_id" integer NOT NULL, "public_key" text NOT NULL, "is_one_time" boolean NOT NULL DEFAULT true, "is_used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7ccd468c83ffa76bda04632ba78" UNIQUE ("user_id", "device_id", "key_id"), CONSTRAINT "PK_a21fef14afb09f1eda3f8841e86" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b922b04daabe2c5aed6c5d465c" ON "auth"."prekeys" ("user_id", "device_id", "is_used") WHERE is_used = false`);
        await queryRunner.query(`CREATE INDEX "IDX_40b416a0cee931eaf2ab856850" ON "auth"."prekeys" ("user_id", "device_id") `);
        await queryRunner.query(`CREATE TABLE "auth"."signed_prekeys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "device_id" uuid NOT NULL, "key_id" integer NOT NULL, "public_key" text NOT NULL, "signature" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP NOT NULL, CONSTRAINT "UQ_8a48d224cb59a363e825b279f35" UNIQUE ("user_id", "device_id", "key_id"), CONSTRAINT "PK_4ed882812c30ac9cd9287b1cbc2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e11a100864d170f5b6d67f92db" ON "auth"."signed_prekeys" ("user_id", "device_id") `);
        await queryRunner.query(`CREATE TABLE "auth"."identity_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "device_id" uuid NOT NULL, "public_key" text NOT NULL, "private_key_encrypted" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b5aabe2cc4267701a75d355334b" UNIQUE ("user_id", "device_id"), CONSTRAINT "PK_90fc3cac4458dc14643621096d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "auth"."devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "device_name" character varying(100) NOT NULL, "device_type" character varying(20) NOT NULL, "device_fingerprint" character varying(255) NOT NULL, "model" character varying(100), "os_version" character varying(50), "app_version" character varying(20), "fcm_token" character varying(255), "apns_token" character varying(255), "public_key" text NOT NULL, "last_active" TIMESTAMP NOT NULL DEFAULT now(), "ip_address" character varying(45), "is_verified" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b7c1a1b1d1eff0d845ae768113f" UNIQUE ("device_fingerprint"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_32ad28d706d855cf84922c3395" ON "auth"."devices" ("is_active") `);
        await queryRunner.query(`CREATE INDEX "IDX_5d3bce74e601e20e2b1eef4af2" ON "auth"."devices" ("last_active") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e9bee993b4ce35c3606cda194" ON "auth"."devices" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "auth"."login_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "device_id" uuid, "ip_address" character varying(45) NOT NULL, "user_agent" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying(20) NOT NULL, CONSTRAINT "PK_fe377f36d49c39547cb6b9f0727" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_008a7582bcd8b53bba575e424a" ON "auth"."login_history" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_192bedb1c372c2eb71fc61ad39" ON "auth"."login_history" ("device_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad9ce49cb73c0b33746a56b6bd" ON "auth"."login_history" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "FK_70066ea80d2f4b871beda32633b" FOREIGN KEY ("user_id") REFERENCES "auth"."users_auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."prekeys" ADD CONSTRAINT "FK_add27ed72ba5fe9a0fb76b576c3" FOREIGN KEY ("user_id") REFERENCES "auth"."users_auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."signed_prekeys" ADD CONSTRAINT "FK_9c4efc0bdba3a988e1d02207fc7" FOREIGN KEY ("user_id") REFERENCES "auth"."users_auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" ADD CONSTRAINT "FK_db826dd4430e0a7e4a59982f5bc" FOREIGN KEY ("user_id") REFERENCES "auth"."users_auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."devices" ADD CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c" FOREIGN KEY ("user_id") REFERENCES "auth"."users_auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."login_history" ADD CONSTRAINT "FK_ad9ce49cb73c0b33746a56b6bd1" FOREIGN KEY ("user_id") REFERENCES "auth"."users_auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth"."login_history" ADD CONSTRAINT "FK_192bedb1c372c2eb71fc61ad394" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."login_history" DROP CONSTRAINT "FK_192bedb1c372c2eb71fc61ad394"`);
        await queryRunner.query(`ALTER TABLE "auth"."login_history" DROP CONSTRAINT "FK_ad9ce49cb73c0b33746a56b6bd1"`);
        await queryRunner.query(`ALTER TABLE "auth"."devices" DROP CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c"`);
        await queryRunner.query(`ALTER TABLE "auth"."identity_keys" DROP CONSTRAINT "FK_db826dd4430e0a7e4a59982f5bc"`);
        await queryRunner.query(`ALTER TABLE "auth"."signed_prekeys" DROP CONSTRAINT "FK_9c4efc0bdba3a988e1d02207fc7"`);
        await queryRunner.query(`ALTER TABLE "auth"."prekeys" DROP CONSTRAINT "FK_add27ed72ba5fe9a0fb76b576c3"`);
        await queryRunner.query(`ALTER TABLE "auth"."backup_codes" DROP CONSTRAINT "FK_70066ea80d2f4b871beda32633b"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_ad9ce49cb73c0b33746a56b6bd"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_192bedb1c372c2eb71fc61ad39"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_008a7582bcd8b53bba575e424a"`);
        await queryRunner.query(`DROP TABLE "auth"."login_history"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_5e9bee993b4ce35c3606cda194"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_5d3bce74e601e20e2b1eef4af2"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_32ad28d706d855cf84922c3395"`);
        await queryRunner.query(`DROP TABLE "auth"."devices"`);
        await queryRunner.query(`DROP TABLE "auth"."identity_keys"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_e11a100864d170f5b6d67f92db"`);
        await queryRunner.query(`DROP TABLE "auth"."signed_prekeys"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_40b416a0cee931eaf2ab856850"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_b922b04daabe2c5aed6c5d465c"`);
        await queryRunner.query(`DROP TABLE "auth"."prekeys"`);
        await queryRunner.query(`DROP INDEX "auth"."IDX_70066ea80d2f4b871beda32633"`);
        await queryRunner.query(`DROP TABLE "auth"."backup_codes"`);
        await queryRunner.query(`DROP TABLE "auth"."users_auth"`);
    }

}
