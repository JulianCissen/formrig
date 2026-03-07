import { User } from '../dev-auth/entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      currentUser: User | null;
    }
  }
}
