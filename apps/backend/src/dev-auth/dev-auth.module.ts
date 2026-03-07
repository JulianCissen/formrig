import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './entities/user.entity';
import { DevAuthMiddleware } from './dev-auth.middleware';

@Module({
  imports: [MikroOrmModule.forFeature([User])],
})
export class DevAuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DevAuthMiddleware).forRoutes('*');
  }
}
