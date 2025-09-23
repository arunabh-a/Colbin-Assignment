import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /user - Get user by query id
router.get('/user', requireAuth, async (req, res) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            return res.status(400).json({ message: "userId query parameter is required" });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, bio: true, createdAt: true, updatedAt: true }
        });
        return res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// GET /me - Get current user's profile
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { user } = req as any;
        const me = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { id: true, email: true, name: true, role: true, bio: true, createdAt: true, updatedAt: true }
        });
        if (!me) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json(me);
    } catch (error) {
        console.error('Error fetching current user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /me - Update current user's profile
router.put('/me', requireAuth, async (req, res) => {
    try {
        const { user } = req as any;
        const { name, bio } = req.body;
        
        const updatedUser = await prisma.user.update({
            where: { id: user.userId },
            data: { name, bio },
            select: { id: true, email: true, name: true, role: true, bio: true, createdAt: true, updatedAt: true }
        });
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;