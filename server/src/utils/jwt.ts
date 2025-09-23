import jwt, { SignOptions, Secret } from "jsonwebtoken";

const getAccessTokenSecret = (): Secret => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error("Missing environment variable: JWT_SECRET");
    }
    
    return JWT_SECRET as Secret;
};

const accessTokenExpiresIn: SignOptions['expiresIn'] = (() => {
    const env = process.env.JWT_ACCESS_EXP;
    if (!env) return '15m' as unknown as SignOptions['expiresIn'];
    const n = Number(env);
    if (!Number.isNaN(n)) return n;
    if (/^\s*\d+\s*(ms|s|m|h|d|w|y)\s*$/i.test(env)) return env.trim() as unknown as SignOptions['expiresIn'];
    return '15m' as unknown as SignOptions['expiresIn'];
})();

export const signAccessToken = (userId: string, role: string) => {
    const options: SignOptions = { algorithm: 'HS256', expiresIn: accessTokenExpiresIn };
    return jwt.sign({ userId, role }, getAccessTokenSecret(), options);
}


export const verifyAccessToken = (token: string) => {
    try {
        return jwt.verify(token, getAccessTokenSecret(), { algorithms: ['HS256'] }) as { userId: string, role: string, iat: number, exp: number };
    } catch (err) {
        return null;
    }
};