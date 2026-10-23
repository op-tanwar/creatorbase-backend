import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid',
      errors: null,
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    // Verify user in database for active status and up-to-date role
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isSuspended: true, suspensionReason: true, role: true },
    });

    if (!dbUser) {
      res.status(401).json({
        success: false,
        message: 'User account no longer exists',
        errors: null,
      });
      return;
    }

    if (dbUser.isSuspended) {
      res.status(403).json({
        success: false,
        message: `Account is suspended. Reason: ${dbUser.suspensionReason || 'Contact platform administration'}`,
        errors: null,
      });
      return;
    }

    req.user = {
      ...decoded,
      role: dbUser.role,
    };
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
      errors: null,
    });
    return;
  }
};
