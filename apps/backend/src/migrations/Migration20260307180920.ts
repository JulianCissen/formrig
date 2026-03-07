import { Migration } from '@mikro-orm/migrations';

export class Migration20260307180920 extends Migration {

  override async up(): Promise<void> {
    // Remove all existing forms — they pre-date the owner relation and cannot be associated.
    this.addSql(`delete from "forms";`);
    this.addSql(`alter table "forms" add column "owner_id" uuid not null;`);
    this.addSql(`alter table "forms" add constraint "forms_owner_id_foreign" foreign key ("owner_id") references "users" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "forms" drop constraint "forms_owner_id_foreign";`);

    this.addSql(`alter table "forms" drop column "owner_id";`);
  }

}
