import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // Try to get token from Authorization header first, then from cookies
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else {
        // Try to get from httpOnly cookie
        token = (req as any).cookies?.accessToken;
    }
    
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};