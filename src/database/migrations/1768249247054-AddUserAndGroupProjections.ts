import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAndGroupProjections1768249247054 implements MigrationInterface {
    name = 'AddUserAndGroupProjections1768249247054'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "messaging"."user_projections" ("user_id" uuid NOT NULL, "username" character varying(50) NOT NULL, "first_name" character varying(50), "last_name" character varying(50), "profile_picture_url" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "last_synced_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2c3f653b29852d3655db0c41cc6" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0a28fb9612b90c6a212478ebc" ON "messaging"."user_projections" ("last_synced_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_d4d67d9aa5fade147a97244740" ON "messaging"."user_projections" ("is_active") `);
        await queryRunner.query(`CREATE TABLE "messaging"."group_projections" ("group_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "picture_url" text, "is_active" boolean NOT NULL DEFAULT true, "member_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "last_synced_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3b77b6bff8fca1fec934e4d951" PRIMARY KEY ("group_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_82e10bedd291db6af16770ec9b" ON "messaging"."group_projections" ("last_synced_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_a06e0f3a273badd60e951c7409" ON "messaging"."group_projections" ("is_active") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "messaging"."IDX_a06e0f3a273badd60e951c7409"`);
        await queryRunner.query(`DROP INDEX "messaging"."IDX_82e10bedd291db6af16770ec9b"`);
        await queryRunner.query(`DROP TABLE "messaging"."group_projections"`);
        await queryRunner.query(`DROP INDEX "messaging"."IDX_d4d67d9aa5fade147a97244740"`);
        await queryRunner.query(`DROP INDEX "messaging"."IDX_c0a28fb9612b90c6a212478ebc"`);
        await queryRunner.query(`DROP TABLE "messaging"."user_projections"`);
    }

}
