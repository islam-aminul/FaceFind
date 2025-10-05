import jwt from 'jsonwebtoken';
import { User, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class JWTService {
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }
}

export const jwtService = new JWTService();
