import { Migration } from '@mikro-orm/migrations';

export class Migration20260318185949 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "form_conversations" drop constraint "form_conversations_form_id_foreign";`);

    this.addSql(`alter table "form_conversations" add constraint "form_conversations_form_id_foreign" foreign key ("form_id") references "forms" ("id") ON UPDATE CASCADE ON DELETE CASCADE;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "form_conversations" drop constraint "form_conversations_form_id_foreign";`);

    this.addSql(`alter table "form_conversations" add constraint "form_conversations_form_id_foreign" foreign key ("form_id") references "forms" ("id") on update cascade;`);
  }

}
