import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import AppError from "../errors/AppError";
import authConfig from "../config/auth";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

const isAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile, companyId } = decoded as TokenPayload;
    if (!companyId || typeof companyId !== 'number') {
      throw new AppError("Invalid company ID", 401);
    }
    req.user = {
      id,
      profile,
      companyId
    };
  } catch (err) {
    throw new AppError("Invalid token. We'll try to assign a new one on next request", 403);
  }

  return next();
};

export default isAuth;
