import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';

export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || !req.user.userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required',
      errors: null,
    });
    return;
  }

  // Ensure latest role check directly from database
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, role: true, isSuspended: true },
  });

  if (!user || user.isSuspended || user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Super Admin access required',
      errors: null,
    });
    return;
  }

  next();
};
