import { Migration } from '@mikro-orm/migrations';

export class Migration20260301225732 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "forms" add column "submitted_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "forms" drop column "submitted_at";`);
  }

}
