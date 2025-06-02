import { User } from 'src/core/users/entities/user.entity';

declare module 'express' {
  export interface AuthentificatedRequest {
    user: Partial<User>;
  }
}
