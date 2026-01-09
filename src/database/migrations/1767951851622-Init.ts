import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1767951851622 implements MigrationInterface {
    name = 'Init1767951851622'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."privacy_settings_profilepictureprivacy_enum" AS ENUM('everyone', 'contacts', 'nobody')`);
        await queryRunner.query(`CREATE TYPE "public"."privacy_settings_firstnameprivacy_enum" AS ENUM('everyone', 'contacts', 'nobody')`);
        await queryRunner.query(`CREATE TYPE "public"."privacy_settings_lastnameprivacy_enum" AS ENUM('everyone', 'contacts', 'nobody')`);
        await queryRunner.query(`CREATE TYPE "public"."privacy_settings_biographyprivacy_enum" AS ENUM('everyone', 'contacts', 'nobody')`);
        await queryRunner.query(`CREATE TYPE "public"."privacy_settings_lastseenprivacy_enum" AS ENUM('everyone', 'contacts', 'nobody')`);
        await queryRunner.query(`CREATE TABLE "privacy_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "profilePicturePrivacy" "public"."privacy_settings_profilepictureprivacy_enum" NOT NULL DEFAULT 'everyone', "firstNamePrivacy" "public"."privacy_settings_firstnameprivacy_enum" NOT NULL DEFAULT 'everyone', "lastNamePrivacy" "public"."privacy_settings_lastnameprivacy_enum" NOT NULL DEFAULT 'contacts', "biographyPrivacy" "public"."privacy_settings_biographyprivacy_enum" NOT NULL DEFAULT 'everyone', "lastSeenPrivacy" "public"."privacy_settings_lastseenprivacy_enum" NOT NULL DEFAULT 'contacts', "searchByPhone" boolean NOT NULL DEFAULT true, "searchByUsername" boolean NOT NULL DEFAULT true, "readReceipts" boolean NOT NULL DEFAULT true, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_5a034c1f221feb7afcda664078" UNIQUE ("userId"), CONSTRAINT "PK_e31cc479f8c3267c86511223ea0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "contactId" uuid NOT NULL, "nickname" character varying(100), "isFavorite" boolean NOT NULL DEFAULT false, "addedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_01f3fb3c74eac4e08afe8e26b3" ON "contacts" ("userId", "contactId") `);
        await queryRunner.query(`CREATE TABLE "blocked_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "blockedUserId" uuid NOT NULL, "reason" character varying(255), "blockedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_93760d788a31b7546c5424f42cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4dba0a4aa2fa74b1d2828e00ea" ON "blocked_users" ("userId", "blockedUserId") `);
        await queryRunner.query(`CREATE TYPE "public"."group_members_role_enum" AS ENUM('admin', 'moderator', 'member')`);
        await queryRunner.query(`CREATE TABLE "group_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."group_members_role_enum" NOT NULL DEFAULT 'member', "isActive" boolean NOT NULL DEFAULT true, "joinedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_53f644f66a416c1542b743c029" ON "group_members" ("groupId", "userId") `);
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "pictureUrl" character varying(500), "createdById" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_search_index" ("userId" uuid NOT NULL, "phoneNumberHash" character varying(64), "usernameNormalized" character varying(50) NOT NULL, "firstNameNormalized" character varying(100) NOT NULL, "lastNameNormalized" character varying(100), CONSTRAINT "PK_a7f38a762e8259438ed47232531" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0f2d0ec90f2260704b66276424" ON "user_search_index" ("phoneNumberHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_4bb31143d2edc5bc5fe35821d6" ON "user_search_index" ("usernameNormalized") `);
        await queryRunner.query(`CREATE INDEX "IDX_1ed604075daa372959efe3abf9" ON "user_search_index" ("firstNameNormalized") `);
        await queryRunner.query(`CREATE INDEX "IDX_78c103ba822c3b619305d516ed" ON "user_search_index" ("lastNameNormalized") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phoneNumber" character varying(20) NOT NULL, "username" character varying(50) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100), "biography" text, "profilePictureUrl" character varying(500), "lastSeen" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1e3d0240b49c40521aaeb953293" UNIQUE ("phoneNumber"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "privacy_settings" ADD CONSTRAINT "FK_5a034c1f221feb7afcda664078f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_30ef77942fc8c05fcb829dcc61d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_2f2eeb268dcaf6e7f1c2176949f" FOREIGN KEY ("contactId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blocked_users" ADD CONSTRAINT "FK_1af4fb14dc336fbdf578d171d4c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blocked_users" ADD CONSTRAINT "FK_7c4a96e4f9f5adc7b22cf521d79" FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_fdef099303bcf0ffd9a4a7b18f5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "groups" ADD CONSTRAINT "FK_e0522c4be8bab20520896919da0" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_search_index" ADD CONSTRAINT "FK_a7f38a762e8259438ed47232531" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_search_index" DROP CONSTRAINT "FK_a7f38a762e8259438ed47232531"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP CONSTRAINT "FK_e0522c4be8bab20520896919da0"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_fdef099303bcf0ffd9a4a7b18f5"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b"`);
        await queryRunner.query(`ALTER TABLE "blocked_users" DROP CONSTRAINT "FK_7c4a96e4f9f5adc7b22cf521d79"`);
        await queryRunner.query(`ALTER TABLE "blocked_users" DROP CONSTRAINT "FK_1af4fb14dc336fbdf578d171d4c"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_2f2eeb268dcaf6e7f1c2176949f"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_30ef77942fc8c05fcb829dcc61d"`);
        await queryRunner.query(`ALTER TABLE "privacy_settings" DROP CONSTRAINT "FK_5a034c1f221feb7afcda664078f"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78c103ba822c3b619305d516ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ed604075daa372959efe3abf9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4bb31143d2edc5bc5fe35821d6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f2d0ec90f2260704b66276424"`);
        await queryRunner.query(`DROP TABLE "user_search_index"`);
        await queryRunner.query(`DROP TABLE "groups"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53f644f66a416c1542b743c029"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
        await queryRunner.query(`DROP TYPE "public"."group_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4dba0a4aa2fa74b1d2828e00ea"`);
        await queryRunner.query(`DROP TABLE "blocked_users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01f3fb3c74eac4e08afe8e26b3"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`DROP TABLE "privacy_settings"`);
        await queryRunner.query(`DROP TYPE "public"."privacy_settings_lastseenprivacy_enum"`);
        await queryRunner.query(`DROP TYPE "public"."privacy_settings_biographyprivacy_enum"`);
        await queryRunner.query(`DROP TYPE "public"."privacy_settings_lastnameprivacy_enum"`);
        await queryRunner.query(`DROP TYPE "public"."privacy_settings_firstnameprivacy_enum"`);
        await queryRunner.query(`DROP TYPE "public"."privacy_settings_profilepictureprivacy_enum"`);
    }

}
