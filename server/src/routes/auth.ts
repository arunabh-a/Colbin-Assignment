import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { hashPassword, verifyPassword } from "../utils/passwordHash";
import { signAccessToken } from "../utils/jwt";
import * as crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();
// POST /auth/register - Register a new user
router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res
                .status(400)
                .json({ message: "Email, password, and name are required" });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: "User already exists with the email" });
        }
        const hashedPassword = await hashPassword(password);
        const newUser = await prisma.user.create({
            data: { email, hashedPassword, name },
        });

        // Generate tokens for immediate login after registration
        const accessToken = signAccessToken(newUser.id, 'user'); // Default role
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        await prisma.refreshToken.create({
            data: {
                tokenHash,
                userId: newUser.id,
                expiresAt: new Date(Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXP_DAYS || '30') * 24 * 60 * 60 * 1000)),
                ip: (req.ip || undefined),
                userAgent: (req.headers['user-agent'] || undefined) as string | undefined,
            }
        });

        // Set both access and refresh tokens as httpOnly cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: parseInt(process.env.REFRESH_TOKEN_EXP_DAYS || '30') * 24 * 60 * 60 * 1000,
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });

        res.status(201).json({ 
            accessToken, // Still return for compatibility
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                bio: newUser.bio,
                emailVerified: newUser.emailVerified,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
                lastLoginAt: newUser.lastLoginAt,
            }
        });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


// POST /auth/login - Authenticate a user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await verifyPassword(user.hashedPassword, password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const accessToken = signAccessToken(user.id, user.role);
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        await prisma.refreshToken.create({
            data: {
                tokenHash,
                userId: user.id,
                expiresAt: new Date(Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXP_DAYS || '7') * 24 * 60 * 60 * 1000)),
                ip: (req.ip || undefined),
                userAgent: (req.headers['user-agent'] || undefined) as string | undefined,
            }
        });

        // Set both access and refresh tokens as httpOnly cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: parseInt(process.env.REFRESH_TOKEN_EXP_DAYS || '30') * 24 * 60 * 60 * 1000,
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        return res.status(200).json({ 
            accessToken, // Still return for compatibility
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                bio: user.bio,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                lastLoginAt: new Date(),
            }
        });

    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


// POST /auth/refresh - Rotate refresh token and issue new access token
router.post('/refresh', async (req, res) => {
    try {
        const rt = (req as any).cookies?.refreshToken as string | undefined;
        if (!rt) {
            return res.status(401).json({ message: 'No refresh token' });
        }

        const tokenHash = crypto.createHash('sha256').update(rt).digest('hex');
        const existing = await prisma.refreshToken.findFirst({
            where: { tokenHash, revoked: false },
            include: { user: true },
        });

        if (!existing || !existing.user) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        if (existing.expiresAt.getTime() <= Date.now()) {
            // Expired: revoke and reject
            await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                domain: process.env.COOKIE_DOMAIN || 'localhost',
            });
            return res.status(401).json({ message: 'Refresh token expired' });
        }

        // Rotate: revoke old, create new
        const newRefreshToken = crypto.randomBytes(40).toString('hex');
        const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        const expDays = parseInt(process.env.REFRESH_TOKEN_EXP_DAYS || '7');

        const result = await prisma.refreshToken.updateMany({
            where: { id: existing.id, tokenHash, revoked: false },
            data: {
            tokenHash: newHash,
            expiresAt: new Date(Date.now() + expDays * 24 * 60 * 60 * 1000),
            ip: (req.ip || undefined),
            userAgent: (req.headers['user-agent'] || undefined) as string | undefined,
            }
        });

        if (result.count === 0) {
            return res.status(401).json({ message: 'Invalid or already rotated refresh token' });
        }

        // Issue new access token
        const accessToken = signAccessToken(existing.user.id, existing.user.role);

        // Set both access and refresh token cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: expDays * 24 * 60 * 60 * 1000,
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });

        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Logout 
router.post('/logout', async (req, res) => {
    try {
        const rt = (req as any).cookies?.refreshToken as string | undefined;
        if (rt) {
            const tokenHash = crypto.createHash('sha256').update(rt).digest('hex');
            await prisma.refreshToken.updateMany({
                where: { tokenHash, revoked: false },
                data: { revoked: true }
            });
        }
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });
        
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || 'localhost',
        });
        
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;