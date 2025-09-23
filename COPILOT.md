# Copilot Project Context

This is a **Fullstack Developer assignment prototype** for a recruitment platform.  
It uses **Node.js (Express, TypeScript)** on the backend, **Postgres + Prisma** for persistence, and **React (Vite + TS)** on the frontend.  

## Requirements
- Registration API (`/api/auth/register`): email + password + name.
- Login API (`/api/auth/login`): email + password → returns JWT access token + sets refresh cookie.
- JWT Authentication:  
  - Access token (15m lifetime).  
  - Refresh token (7d lifetime) stored in HttpOnly cookie.  
  - Refresh rotation: issue new refresh token on each refresh.  
- Profile API (`/api/users/me`): protected endpoint returning user details.  
- Error handling: consistent JSON error format `{ error: { code, message } }`.  
- Password hashing: Argon2.  
- Database schema: Prisma User + RefreshToken models.  

## Deliverables
- Working backend with auth and user routes.  
- Simple frontend with Login, Register, and Profile pages.  
- Documentation in `docs/README.md` and `docs/API.md`.  

## Coding Guidelines
- TypeScript everywhere.  
- Express middlewares for auth & errors.  
- Prisma for DB queries.  
- Keep code simple and production-aware, but minimal (no Redis/queues for prototype).  
- Write modular, testable functions.  
- Consistent response structure.  

## Reminder to Copilot
- Stick to **Postgres + Prisma** (not MongoDB).  
- Use **argon2** for hashing passwords.  
- Use **jsonwebtoken** for access tokens.  
- Store refresh tokens hashed in DB.  
- Follow the repo structure under `/backend/src/`.  
