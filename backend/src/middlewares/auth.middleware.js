import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      username: payload.username
    };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "invalid token" });
  }
}
