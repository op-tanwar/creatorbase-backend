import { Request } from 'express';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: string;
  planType: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
