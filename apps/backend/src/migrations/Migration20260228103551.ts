import { Migration } from '@mikro-orm/migrations';

export class Migration20260228103551 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "forms" drop column "title";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "forms" add column "title" text not null;`);
  }

}
