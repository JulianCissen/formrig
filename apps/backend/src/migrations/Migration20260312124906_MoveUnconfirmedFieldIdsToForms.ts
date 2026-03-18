import { Migration } from '@mikro-orm/migrations';

export class Migration20260312124906_MoveUnconfirmedFieldIdsToForms extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "forms" add column "unconfirmed_field_ids" jsonb not null default '[]';`);

    this.addSql(`alter table "form_conversations" drop column if exists "unconfirmed_field_ids";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "forms" drop column if exists "unconfirmed_field_ids";`);

    this.addSql(`alter table "form_conversations" add column "unconfirmed_field_ids" jsonb not null default '[]';`);
  }

}
