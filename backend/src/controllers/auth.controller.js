import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../config/prisma.js";

function buildToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email
  };
}

export async function register(req, res) {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ ok: false, error: "username, email and password are required" });
  }

  const normalizedEmail = email.toString().trim().toLowerCase();
  const normalizedUsername = username.toString().trim();

  if (normalizedUsername.length < 2) {
    return res.status(400).json({ ok: false, error: "username must have at least 2 characters" });
  }

  if (password.toString().length < 6) {
    return res.status(400).json({ ok: false, error: "password must have at least 6 characters" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return res.status(409).json({ ok: false, error: "email already exists" });
  }

  const passwordHash = await bcrypt.hash(password.toString(), 10);
  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      email: normalizedEmail,
      password: passwordHash
    }
  });

  const token = buildToken(user);
  return res.status(201).json({ ok: true, token, user: sanitizeUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "email and password are required" });
  }

  const normalizedEmail = email.toString().trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const isValidPassword = await bcrypt.compare(password.toString(), user.password);
  if (!isValidPassword) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const token = buildToken(user);
  return res.json({ ok: true, token, user: sanitizeUser(user) });
}
