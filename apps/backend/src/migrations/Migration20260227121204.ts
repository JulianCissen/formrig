import { Migration } from '@mikro-orm/migrations';

export class Migration20260227121204 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "forms" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "plugin_id" text not null, "title" text not null, "values" jsonb not null default '{}', constraint "forms_pkey" primary key ("id"));`);

    this.addSql(`create table "file_records" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "form_id" uuid not null, "field_id" text not null, "filename" text not null, "storage_key" text not null, "mime_type" text not null, "size" integer not null, constraint "file_records_pkey" primary key ("id"));`);

    this.addSql(`alter table "file_records" add constraint "file_records_form_id_foreign" foreign key ("form_id") references "forms" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "file_records" drop constraint "file_records_form_id_foreign";`);

    this.addSql(`drop table if exists "forms" cascade;`);

    this.addSql(`drop table if exists "file_records" cascade;`);
  }

}
