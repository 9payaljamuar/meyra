// SMS (MSG91) + email (SMTP) + in-app notifications. Every message is recorded in `notifications`;
// without provider keys it is only logged there (status 'logged') so flows still work in dev.
import nodemailer from 'nodemailer';
import {one, q} from '../db.js';

const MSG91_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_OTP_TEMPLATE = process.env.MSG91_OTP_TEMPLATE_ID;
const MSG91_SENDER = process.env.MSG91_SENDER_ID;
const MSG91_FLOW_TEMPLATE = process.env.MSG91_FLOW_TEMPLATE_ID; // generic "##message##" DLT template
const SMTP_URL = process.env.SMTP_URL;
const MAIL_FROM = process.env.MAIL_FROM ?? 'Meyra <no-reply@meyraglory.com>';

export const smsLive = !!(MSG91_KEY && MSG91_OTP_TEMPLATE);
export const emailLive = !!SMTP_URL;

const mailer = SMTP_URL ? nodemailer.createTransport(SMTP_URL) : null;

async function record(n: {userId?: number | null; channel: string; to?: string | null; title: string; body: string; status: string; error?: string}) {
  await q(
    `INSERT INTO notifications(user_id, channel, to_addr, title, body, status, error) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [n.userId ?? null, n.channel, n.to ?? null, n.title, n.body, n.status, n.error ?? null],
  );
}

export async function sendOtpSms(phone: string, code: string) {
  if (!smsLive) {
    console.log(`[otp] ${phone}: ${code}`);
    await record({channel: 'sms', to: phone, title: 'Login OTP', body: 'OTP ******', status: 'logged'});
    return;
  }
  const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_OTP_TEMPLATE}&mobile=91${phone}&otp=${code}`;
  const res = await fetch(url, {method: 'POST', headers: {authkey: MSG91_KEY!}});
  const data: any = await res.json().catch(() => ({}));
  const ok = res.ok && data.type !== 'error';
  await record({channel: 'sms', to: phone, title: 'Login OTP', body: 'OTP ******', status: ok ? 'sent' : 'failed', error: ok ? undefined : data.message});
  if (!ok) throw new Error('Could not send OTP. Please try again.');
}

async function sms(userId: number | null, phone: string | null | undefined, title: string, body: string) {
  if (!phone) return;
  if (!(MSG91_KEY && MSG91_FLOW_TEMPLATE)) return record({userId, channel: 'sms', to: phone, title, body, status: 'logged'});
  try {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {authkey: MSG91_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({template_id: MSG91_FLOW_TEMPLATE, sender: MSG91_SENDER, recipients: [{mobiles: `91${phone}`, message: body}]}),
    });
    await record({userId, channel: 'sms', to: phone, title, body, status: res.ok ? 'sent' : 'failed'});
  } catch (e: any) {
    await record({userId, channel: 'sms', to: phone, title, body, status: 'failed', error: e.message});
  }
}

/** Send one email. `logBody` replaces the body in the outbox (e.g. to hide a code). */
export async function sendEmail(userId: number | null, to: string, title: string, body: string, logBody?: string) {
  return email(userId, to, title, body, logBody);
}

async function email(userId: number | null, to: string | null | undefined, title: string, body: string, logBody = body) {
  if (!to || to.endsWith('@phone.meyra.app') || to.endsWith('@meyra.invalid')) return;
  if (!mailer) {
    if (logBody !== body) console.log(`[email] ${to}: ${body}`);
    return record({userId, channel: 'email', to, title, body: logBody, status: 'logged'});
  }
  try {
    await mailer.sendMail({
      from: MAIL_FROM, to, subject: title, text: body,
      html: `<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;color:#121212">
        <h2 style="color:#B8862B;font-weight:600;margin:0 0 12px">Meyra</h2>
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${body.replace(/\n/g, '<br>')}</p></div>`,
    });
    await record({userId, channel: 'email', to, title, body: logBody, status: 'sent'});
  } catch (e: any) {
    await record({userId, channel: 'email', to, title, body: logBody, status: 'failed', error: e.message});
  }
}

/** Notify a user on every channel: in-app always, plus SMS/email when we have their contact. */
export async function notify(userId: number, title: string, body: string, opts: {sms?: boolean} = {}) {
  const u = await one('SELECT email, phone FROM users WHERE id = $1', [userId]);
  if (!u) return;
  await record({userId, channel: 'inapp', title, body, status: 'sent'});
  await email(userId, u.email, title, body);
  if (opts.sms) await sms(userId, u.phone, title, body);
}

/** Fire-and-forget so a slow provider never blocks the request. */
export function notifyLater(userId: number, title: string, body: string, opts?: {sms?: boolean}) {
  notify(userId, title, body, opts).catch(e => console.error('[notify]', e));
}
