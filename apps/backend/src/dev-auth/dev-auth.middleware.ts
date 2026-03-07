import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EntityManager } from '@mikro-orm/core';
import { MOCK_USERS } from '@formrig/dev-fixtures';
import { User } from './entities/user.entity';

@Injectable()
export class DevAuthMiddleware implements NestMiddleware {
  constructor(private readonly em: EntityManager) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const header = req.headers['x-dev-user-id'];

    if (!header) {
      req.currentUser = null;
      next();
      return;
    }

    const mockUser = MOCK_USERS.find(u => u.id === header);

    if (!mockUser) {
      req.currentUser = null;
      next();
      return;
    }

    let user = await this.em.findOne(User, { sub: header as string });

    if (!user) {
      try {
        user = this.em.create(User, { sub: header as string, claims: mockUser.claims, createdAt: new Date(), updatedAt: new Date() });
        await this.em.persist(user).flush();
      } catch {
        // unique-constraint race: another request just inserted the same row
        user = await this.em.findOneOrFail(User, { sub: header as string });
      }
    }

    req.currentUser = user;
    next();
  }
}
