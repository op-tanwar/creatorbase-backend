import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/authSchemas';

export class AuthService {
  static async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      const error: any = new Error('An account with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        companyName: data.companyName,
      },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        role: true,
        planType: true,
        subscriptionStatus: true,
        planExpiresAt: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      planType: user.planType,
    });

    return { user, token };
  }

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (user.isSuspended) {
      const error: any = new Error(`Your account has been suspended. Reason: ${user.suspensionReason || 'Violation of platform terms. Please contact support@creatorbase.in'}`);
      error.statusCode = 403;
      throw error;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      planType: user.planType,
    });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
      planExpiresAt: user.planExpiresAt,
      isSuspended: user.isSuspended,
      suspensionReason: user.suspensionReason,
      createdAt: user.createdAt,
    };

    return { user: sanitizedUser, token };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        role: true,
        planType: true,
        subscriptionStatus: true,
        planExpiresAt: true,
        isSuspended: true,
        suspensionReason: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shortlists: true,
            campaigns: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            orderId: true,
            paymentId: true,
            amount: true,
            plan: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  static async updateProfile(userId: string, data: { name?: string; companyName?: string; currentPassword?: string; newPassword?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const updateData: any = {};
    if (data.name && data.name.trim().length >= 2) {
      updateData.name = data.name.trim();
    }
    if (data.companyName && data.companyName.trim().length >= 2) {
      updateData.companyName = data.companyName.trim();
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        const error: any = new Error('Current password is required to update password');
        error.statusCode = 400;
        throw error;
      }

      const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!isMatch) {
        const error: any = new Error('Current password is incorrect');
        error.statusCode = 400;
        throw error;
      }

      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(data.newPassword, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        role: true,
        planType: true,
        subscriptionStatus: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shortlists: true,
            campaigns: true,
          },
        },
      },
    });

    return updatedUser;
  }
}
