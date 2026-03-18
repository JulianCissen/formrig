import { Migration } from '@mikro-orm/migrations';

export class Migration20260311100320 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "form_chat_prompts" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "key" text not null, "template" text not null, "description" text null, "context_window_size" integer null, constraint "form_chat_prompts_pkey" primary key ("id"));`);
    this.addSql(`alter table "form_chat_prompts" add constraint "form_chat_prompts_key_unique" unique ("key");`);

    this.addSql(`create table "form_conversations" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "form_id" uuid not null, "messages" jsonb not null default '[]', "skipped_field_ids" jsonb not null default '[]', "current_field_id" text null, "status" text not null default 'COLLECTING', constraint "form_conversations_pkey" primary key ("id"));`);
    this.addSql(`alter table "form_conversations" add constraint "form_conversations_form_id_unique" unique ("form_id");`);

    this.addSql(`alter table "form_conversations" add constraint "form_conversations_form_id_foreign" foreign key ("form_id") references "forms" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "form_chat_prompts" cascade;`);

    this.addSql(`drop table if exists "form_conversations" cascade;`);
  }

}
