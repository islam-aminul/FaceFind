import { db, TABLES } from '../aws/dynamodb';
import { cryptoService } from '../utils/crypto';
import { jwtService } from '../utils/jwt';
import { User, LoginRequest, LoginResponse, UserStatus } from '@/types';

export class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const users = await db.scan<any>(TABLES.USERS, 'email = :email', {
      ':email': request.email,
    });

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const userWithPassword = users[0];

    // Verify password
    const isValidPassword = await cryptoService.verifyPassword(
      request.password,
      userWithPassword.password
    );

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check if user is suspended
    if (userWithPassword.status === UserStatus.SUSPENDED) {
      throw new Error('Your account has been suspended');
    }

    // Remove password from user object
    const { password, ...user } = userWithPassword;

    // Generate tokens
    const token = jwtService.generateAccessToken(user as User);
    const refreshToken = jwtService.generateRefreshToken(user as User);

    return {
      user: user as User,
      token,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const payload = jwtService.verifyToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    const user = await db.get<User>(TABLES.USERS, { userId: payload.userId });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('Your account has been suspended');
    }

    const newToken = jwtService.generateAccessToken(user);
    const newRefreshToken = jwtService.generateRefreshToken(user);

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const userWithPassword = await db.get<any>(TABLES.USERS, { userId });
    if (!userWithPassword) {
      throw new Error('User not found');
    }

    const isValidPassword = await cryptoService.verifyPassword(
      oldPassword,
      userWithPassword.password
    );

    if (!isValidPassword) {
      throw new Error('Invalid old password');
    }

    const hashedNewPassword = await cryptoService.hashPassword(newPassword);

    await db.update(TABLES.USERS, { userId }, { password: hashedNewPassword });
  }

  async resetPassword(email: string): Promise<void> {
    const users = await db.scan<any>(TABLES.USERS, 'email = :email', {
      ':email': email,
    });

    if (users.length === 0) {
      // Don't reveal if email exists
      return;
    }

    const user = users[0];
    const tempPassword = cryptoService.generateTempPassword();
    const hashedPassword = await cryptoService.hashPassword(tempPassword);

    await db.update(TABLES.USERS, { userId: user.userId }, { password: hashedPassword });

    // Send email with temp password (reuse invitation email service)
    const { emailService } = await import('../aws/ses');
    await emailService.sendInvitationEmail(user.email, user.role, tempPassword);
  }

  verifyToken(token: string): boolean {
    return jwtService.verifyToken(token) !== null;
  }
}

export const authService = new AuthService();
