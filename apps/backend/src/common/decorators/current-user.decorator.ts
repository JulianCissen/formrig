import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../dev-auth/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<Request>();
    // Non-null assertion: RequireAuthGuard guarantees currentUser is set before this runs.
    return request.currentUser!;
  },
);
