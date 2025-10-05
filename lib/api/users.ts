import { db, generateId, TABLES } from '../aws/dynamodb';
import { emailService } from '../aws/ses';
import { cryptoService } from '../utils/crypto';
import { User, UserRole, UserStatus, CreateUserRequest } from '@/types';

export class UserService {
  async createUser(data: CreateUserRequest): Promise<User> {
    const userId = generateId('user');
    const tempPassword = cryptoService.generateTempPassword();
    const hashedPassword = await cryptoService.hashPassword(tempPassword);

    const user: User = {
      userId,
      email: data.email,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      companyName: data.companyName,
      portfolioUrl: data.portfolioUrl,
      specialization: data.specialization,
      bio: data.bio,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.create(TABLES.USERS, { ...user, password: hashedPassword });

    // Send invitation email
    await emailService.sendInvitationEmail(user.email, user.role, tempPassword);

    // Remove password from response
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async getUserById(userId: string): Promise<User | null> {
    return await db.get<User>(TABLES.USERS, { userId });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await db.scan<User>(TABLES.USERS, 'email = :email', {
      ':email': email,
    });

    return users.length > 0 ? users[0] : null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return await db.update<User>(TABLES.USERS, { userId }, updates);
  }

  async suspendPhotographer(userId: string): Promise<User> {
    // Check for upcoming events
    const assignments = await db.query<any>(
      TABLES.PHOTOGRAPHER_ASSIGNMENTS,
      'photographerId-index',
      'photographerId = :photographerId',
      { ':photographerId': userId }
    );

    if (assignments.length > 0) {
      throw new Error('Photographer has upcoming events. Please reassign all events before suspending.');
    }

    const user = await this.updateUser(userId, { status: UserStatus.SUSPENDED });

    // Send suspension email
    await emailService.sendSuspensionEmail(user.email, user.firstName);

    return user;
  }

  async reactivatePhotographer(userId: string): Promise<User> {
    const user = await this.updateUser(userId, { status: UserStatus.ACTIVE });

    // Send reactivation email
    await emailService.sendReactivationEmail(user.email, user.firstName);

    return user;
  }

  async listUsersByRole(role: UserRole): Promise<User[]> {
    return await db.scan<User>(TABLES.USERS, 'role = :role', { ':role': role });
  }

  async getAllUsers(): Promise<User[]> {
    return await db.scan<User>(TABLES.USERS);
  }
}

export const userService = new UserService();
