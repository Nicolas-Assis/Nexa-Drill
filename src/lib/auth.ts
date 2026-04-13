import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { pool } from "./db";

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
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
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
              [user.id, user.name || "", user.email, slug, "", ""]
            );
          } catch (err) {
            console.error("[better-auth] Erro ao criar perfurador:", err);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
