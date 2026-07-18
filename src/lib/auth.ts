import { betterAuth } from "better-auth";
import { admin, emailOTP } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { pool } from "./db";

function normalizeOrigin(origin?: string | null): string | null {
  if (!origin) return null;
  const normalized = origin.trim().replace(/\/+$/, "");
  return normalized || null;
}

const trustedOrigins = [
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  process.env.NEXT_PUBLIC_APP_URL,
  "https://www.nexadrill.shop",
  "https://nexadrill.shop",
]
  .map((origin) => normalizeOrigin(origin))
  .filter((origin): origin is string => Boolean(origin))
  .filter((origin, index, array) => array.indexOf(origin) === index);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateSlug(base: string): string {
  const slug = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
  const suffix = Math.random().toString(36).slice(2, 7);
  return (slug || "perfurador") + "-" + suffix;
}

export const auth = betterAuth({
  database: pool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  plugins: [
    // Painel admin: papéis (role) + suspender/banir (bloqueia login e revoga
    // sessões automaticamente). Colunas criadas na migration 015.
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === "sign-in"
            ? "Seu código de acesso - NexaDrill"
            : "Verificação de e-mail - NexaDrill";

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #1e293b;">NexaDrill</h2>
              <p style="color: #64748b;">Seu código de verificação:</p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 16px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 14px;">
                Este código expira em 10 minutos. Não compartilhe com ninguém.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const slug = generateSlug(user.name || user.email.split("@")[0]);
            await pool.query(
              `INSERT INTO public.perfuradores (auth_id, nome, email, slug, telefone, nome_empresa)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (auth_id) DO NOTHING`,
              [user.id, user.name || "", user.email, slug, "", ""],
            );
          } catch (err) {
            console.error("[better-auth] Erro ao criar perfurador:", err);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // Registra cada login no histórico de atividade do painel admin.
          try {
            await pool.query(
              `INSERT INTO public.activity_logs
                 (user_id, perfurador_id, event_type, action, ip, user_agent)
               VALUES
                 ($1, (SELECT id FROM public.perfuradores WHERE auth_id = $1),
                  'login', 'auth.login', $2, $3)`,
              [session.userId, session.ipAddress || null, session.userAgent || null],
            );
          } catch (err) {
            console.error("[better-auth] Erro ao registrar login:", err);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
