import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Initialize dotenv before any other imports that might use env vars
dotenv.config();

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import cookieParser from 'cookie-parser'; 
import { errorHandler } from './middleware/errorHandler';

export const app = express();
app.use(cors({ origin: process.env.CORS_CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser()); // used to parse cookies from the request headers


app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);
