import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AuthUserPayload } from '../types';

export function signToken(payload: AuthUserPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as unknown as NonNullable<SignOptions['expiresIn']>,
  };

  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): AuthUserPayload {
  return jwt.verify(token, config.jwtSecret) as AuthUserPayload;
}
