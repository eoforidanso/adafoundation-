// Ada Community Impact Foundation: public site + /admin dashboard API.
//
// Bindings (wrangler.jsonc): ASSETS (static files), DB (D1), MEDIA (R2).
// Secrets: ADMIN_PASSWORD (set by the foundation), SESSION_SECRET (random).
// Optional: EMAIL (send_email binding) for volunteer sign-up alerts.

const SESSION_COOKIE = 'acif_session';
const SESSION_HOURS = 12;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const DEFAULT_HERO = '/images/hero-canoes.jpg';
const ALERT_FROM = { email: 'alerts@adacommunityimpactfoundation.org', name: 'ACIF Website' };
const SITE_URL = 'https://adacommunityimpactfoundation.org';

// Field rules for each table the dashboard can edit.
const TABLES = {
  directors: {
    order: 'sort, id', sortable: true,
    fields: { name: { max: 80, required: true }, title: { max: 60 }, photo: { src: true }, sort: { int: true } },
  },
  photos: {
    order: 'sort, id', sortable: true,
    fields: {
      src: { src: true, required: true }, caption: { max: 120 }, alt: { max: 200 },
      credit: { max: 300 }, credit_url: { url: true }, placement: { oneOf: ['gallery', 'hero', 'hidden'] }, sort: { int: true },
    },
  },
  goals: {
    order: 'sort, id', sortable: true,
    fields: { value: { max: 12, required: true }, label: { max: 80, required: true }, kind: { oneOf: ['target', 'achieved'] }, sort: { int: true } },
  },
  news: {
    order: 'item_date DESC, id DESC',
    fields: { title: { max: 120, required: true }, item_date: { date: true }, body: { max: 5000 }, photo: { src: true }, published: { bool: true } },
  },
  volunteers: {
    order: 'created_at DESC', noCreate: true,
    fields: { status: { oneOf: ['new', 'contacted', 'archived'] } },
  },
  donations: {
    order: 'gift_date DESC, id DESC', stamped: true,
    fields: {
      donor_name: { max: 120, required: true }, donor_email: { max: 160, email: true },
      amount_cents: { int: true, required: true, min: 1 }, gift_date: { date: true, required: true },
      method: { oneOf: ['Zelle', 'Check', 'Cash', 'Card', 'Other'] }, note: { max: 500 },
    },
  },
};

const SETTINGS = { headline: 160, lede: 600, phone: 40, zelle: 40, email: 160, city: 80, alert_email: 300 };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path.startsWith('/api/')) return await api(req, env, url, ctx);
      if (path.startsWith('/media/')) return await media(env, decodeURIComponent(path.slice(7)));
      if (path === '/' || path === '/index.html') return await renderHome(req, env);
      return env.ASSETS.fetch(req);
    } catch (err) {
      console.error(err);
      if (path.startsWith('/api/')) return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
      return env.ASSETS.fetch(req);
    }
  },
};

/* ---------- helpers ---------- */

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const enc = new TextEncoder();

function b64url(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

async function ipHash(req, env) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  return (await sha256(ip + '|' + (env.SESSION_SECRET || ''))).slice(0, 22);
}

async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

/* ---------- sessions ---------- */

// The token carries a tag of the current password, so changing the
// password signs everyone out.
async function passwordTag(env) {
  return (await sha256('tag|' + env.ADMIN_PASSWORD)).slice(0, 10);
}

async function makeSession(env) {
  const payload = `v1.${Date.now() + SESSION_HOURS * 3600e3}.${await passwordTag(env)}`;
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}

async function isSignedIn(req, env) {
  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) return false;
  const token = getCookie(req, SESSION_COOKIE);
  const cut = token.lastIndexOf('.');
  if (cut < 0) return false;
  const payload = token.slice(0, cut);
  if (!safeEqual(token.slice(cut + 1), await hmac(env.SESSION_SECRET, payload))) return false;
  const [, exp, tag] = payload.split('.');
  return Number(exp) > Date.now() && tag === (await passwordTag(env));
}

function sessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/* ---------- API ---------- */

async function api(req, env, url, ctx) {
  const path = url.pathname;
  const method = req.method;

  if (path === '/api/volunteer' && method === 'POST') return volunteerSignup(req, env, ctx);
  if (path === '/api/login' && method === 'POST') return login(req, env);
  if (path === '/api/logout' && method === 'POST') return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });

  if (!path.startsWith('/api/admin/')) return json({ error: 'Not found.' }, 404);

  if (path === '/api/admin/session') {
    return json({ signedIn: await isSignedIn(req, env), configured: Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET) });
  }
  if (!(await isSignedIn(req, env))) return json({ error: 'Your session has ended. Please sign in again.' }, 401);
  // Every change must come from the dashboard itself (blocks cross-site requests).
  if (method !== 'GET' && req.headers.get('x-acif-admin') !== '1') return json({ error: 'Request blocked.' }, 403);

  const parts = path.slice('/api/admin/'.length).split('/').filter(Boolean);

  if (parts[0] === 'all' && method === 'GET') return json(await loadAll(env));
  if (parts[0] === 'upload' && method === 'POST') return upload(req, env);
  if (parts[0] === 'settings' && method === 'PUT') return saveSettings(req, env);
  if (parts[0] === 'test-email' && method === 'POST') return testEmail(env);

  const table = TABLES[parts[0]];
  if (!table) return json({ error: 'Not found.' }, 404);
  const name = parts[0];

  if (parts.length === 1 && method === 'POST' && !table.noCreate) return createRow(req, env, name, table);
  if (parts[1] === 'order' && method === 'PUT' && table.sortable) return reorder(req, env, name);
  const id = Number(parts[1]);
  if (Number.isInteger(id) && id > 0) {
    if (method === 'PUT') return updateRow(req, env, name, table, id);
    if (method === 'DELETE') return deleteRow(env, name, id);
  }
  return json({ error: 'Not found.' }, 404);
}

async function login(req, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: 'The dashboard password has not been set yet. See the setup steps in the README.' }, 503);
  }
  const who = await ipHash(req, env);
  const since = Date.now() - 15 * 60e3;
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash = ? AND at > ?').bind(who, since).first();
  if (recent.n >= 8) return json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);

  const body = await readJson(req);
  const given = typeof body?.password === 'string' ? body.password : '';
  const ok = safeEqual(await sha256('pw|' + given), await sha256('pw|' + env.ADMIN_PASSWORD));
  if (!ok) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO login_attempts (ip_hash, at) VALUES (?, ?)').bind(who, Date.now()),
      env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(Date.now() - 86400e3),
    ]);
    return json({ error: 'That password is not right.' }, 401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ?').bind(who).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(await makeSession(env), SESSION_HOURS * 3600) });
}

async function volunteerSignup(req, env, ctx) {
  const b = await readJson(req);
  if (!b) return json({ error: 'Please fill in the form and try again.' }, 400);
  if (b.website) return json({ ok: true }); // honeypot: bots fill hidden fields
  const name = oneLine(b.name).slice(0, 100);
  const email = oneLine(b.email).slice(0, 160);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Please add your name and a valid email address so we can reply.' }, 400);

  const who = await ipHash(req, env);
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM volunteers WHERE ip_hash = ? AND created_at > ?').bind(who, Date.now() - 3600e3).first();
  if (recent.n >= 5) return json({ error: 'We already have your details. Thank you, we will be in touch.' }, 429);

  const signup = {
    name, email, phone: oneLine(b.phone).slice(0, 40),
    area: oneLine(b.area).slice(0, 80), message: String(b.message || '').trim().slice(0, 2000),
  };
  await env.DB.prepare('INSERT INTO volunteers (name, email, phone, area, message, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(signup.name, signup.email, signup.phone, signup.area, signup.message, who, Date.now())
    .run();
  // The sign-up is already saved; the alert is best effort and never blocks the visitor.
  ctx.waitUntil(volunteerAlert(env, signup).catch((err) => console.error('Volunteer alert failed:', err.code || '', err.message)));
  return json({ ok: true });
}

/* ---------- email alerts ---------- */

function oneLine(text) {
  return String(text || '').replace(/[\r\n]+/g, ' ').trim();
}

async function alertRecipients(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'alert_email'").first();
  return String(row?.value || '').split(',').map((s) => s.trim()).filter((s) => /^\S+@\S+\.\S+$/.test(s)).slice(0, 5);
}

async function volunteerAlert(env, v) {
  if (!env.EMAIL) return;
  const to = await alertRecipients(env);
  if (!to.length) return;
  const rows = [['Name', v.name], ['Email', v.email], ['Phone', v.phone || 'Not given'], ['Wants to help with', v.area || 'Not given']];
  const text = 'Someone signed up to volunteer on the website.\n\n' +
    rows.map(([k, val]) => `${k}: ${val}`).join('\n') +
    `\n\nMessage:\n${v.message || '(none)'}\n\nReply to this email to answer ${v.name} directly.\nSee all sign-ups: ${SITE_URL}/admin#volunteers\n`;
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0C2A30;max-width:560px">' +
    '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#0B7F86">Ada Community Impact Foundation</p>' +
    '<h2 style="margin:0 0 16px;font-size:22px">New volunteer sign-up</h2>' +
    '<table style="border-collapse:collapse;width:100%">' +
    rows.map(([k, val]) => `<tr><td style="padding:6px 12px 6px 0;color:#4D6A70;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(val)}</td></tr>`).join('') +
    '</table>' +
    (v.message ? `<p style="margin:16px 0 4px;color:#4D6A70">Message</p><p style="margin:0;white-space:pre-wrap;background:#F5EFE6;padding:12px 14px;border-radius:8px">${esc(v.message)}</p>` : '') +
    `<p style="margin:20px 0 0">Reply to this email to answer ${esc(v.name)} directly, or <a href="${SITE_URL}/admin#volunteers" style="color:#0B7F86">see all sign-ups in the dashboard</a>.</p></div>`;
  await env.EMAIL.send({
    to, from: ALERT_FROM, replyTo: { email: v.email, name: oneLine(v.name) },
    subject: oneLine(`New volunteer: ${v.name}${v.area ? ` (${v.area})` : ''}`).slice(0, 150),
    text, html,
  });
}

async function testEmail(env) {
  if (!env.EMAIL) return json({ error: 'Email sending is not connected to the website yet.' }, 503);
  const to = await alertRecipients(env);
  if (!to.length) return json({ error: 'Add an address under "Send sign-up alerts to" and save first.' }, 400);
  try {
    await env.EMAIL.send({
      to, from: ALERT_FROM, subject: 'Test alert from your website',
      text: `This is a test. Volunteer sign-up alerts from ${SITE_URL} will arrive at this address.\n`,
      html: `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px">This is a test. Volunteer sign-up alerts from <a href="${SITE_URL}">${SITE_URL.replace('https://', '')}</a> will arrive at this address.</p>`,
    });
  } catch (err) {
    const why = {
      E_SENDER_DOMAIN_NOT_AVAILABLE: 'Email Sending is not switched on for adacommunityimpactfoundation.org yet. Finish the setup in the Cloudflare dashboard.',
      E_SENDER_NOT_VERIFIED: 'Cloudflare is still verifying the domain for sending. Try again in a few minutes.',
      E_DAILY_LIMIT_EXCEEDED: 'The daily email limit has been reached. Try again tomorrow.',
      E_RATE_LIMIT_EXCEEDED: 'Too many emails at once. Try again in a minute.',
    }[err.code];
    return json({ error: why || `The email could not be sent (${err.code || err.message}).` }, 502);
  }
  return json({ ok: true, to });
}

async function loadAll(env) {
  const out = {};
  for (const [name, t] of Object.entries(TABLES)) {
    const cols = name === 'volunteers' ? 'id, name, email, phone, area, message, status, created_at' : '*';
    out[name] = (await env.DB.prepare(`SELECT ${cols} FROM ${name} ORDER BY ${t.order}`).all()).results;
  }
  out.settings = await getSettings(env);
  return out;
}

async function getSettings(env) {
  const rows = (await env.DB.prepare('SELECT key, value FROM settings').all()).results;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function validate(rules, body, partial) {
  const values = {};
  for (const [field, rule] of Object.entries(rules)) {
    if (!(field in body)) {
      if (!partial && rule.required) return { error: `Please fill in ${field.replace(/_/g, ' ')}.` };
      continue;
    }
    let v = body[field];
    if (rule.int) {
      v = Number(v);
      if (!Number.isInteger(v) || (rule.min != null && v < rule.min)) return { error: `${field.replace(/_/g, ' ')} must be a whole number.` };
    } else if (rule.bool) {
      v = v ? 1 : 0;
    } else {
      v = String(v ?? '').trim();
      if (rule.required && !v) return { error: `Please fill in ${field.replace(/_/g, ' ')}.` };
      if (rule.max && v.length > rule.max) return { error: `${field.replace(/_/g, ' ')} is too long (${rule.max} characters max).` };
      if (rule.oneOf && !rule.oneOf.includes(v)) return { error: `Choose a valid ${field.replace(/_/g, ' ')}.` };
      if (rule.src && v && !/^\/(media|images)\/[\w.\-]+$/.test(v)) return { error: 'That photo address is not valid.' };
      if (rule.url && v && !/^https?:\/\/\S+$/.test(v)) return { error: 'Links must start with http:// or https://' };
      if (rule.email && v && !/^\S+@\S+\.\S+$/.test(v)) return { error: 'That email address does not look right.' };
      if (rule.date && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'Dates must look like 2026-10-08.' };
    }
    values[field] = v;
  }
  return { values };
}

async function createRow(req, env, name, table) {
  const body = await readJson(req);
  if (!body) return json({ error: 'Nothing to save.' }, 400);
  const { values, error } = validate(table.fields, body, false);
  if (error) return json({ error }, 400);
  if (table.sortable && !('sort' in values)) {
    const max = await env.DB.prepare(`SELECT COALESCE(MAX(sort), 0) AS m FROM ${name}`).first();
    values.sort = max.m + 1;
  }
  if (table.stamped) values.created_at = Date.now();
  const cols = Object.keys(values);
  const row = await env.DB.prepare(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING *`)
    .bind(...cols.map((c) => values[c])).first();
  if (name === 'photos' && row.placement === 'hero') await onlyOneHero(env, row.id);
  return json(row, 201);
}

async function updateRow(req, env, name, table, id) {
  const body = await readJson(req);
  if (!body) return json({ error: 'Nothing to save.' }, 400);
  const { values, error } = validate(table.fields, body, true);
  if (error) return json({ error }, 400);
  const cols = Object.keys(values);
  if (!cols.length) return json({ error: 'Nothing to save.' }, 400);
  const before = await env.DB.prepare(`SELECT * FROM ${name} WHERE id = ?`).bind(id).first();
  if (!before) return json({ error: 'That item no longer exists.' }, 404);
  const row = await env.DB.prepare(`UPDATE ${name} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? RETURNING *`)
    .bind(...cols.map((c) => values[c]), id).first();
  if (name === 'photos' && row.placement === 'hero') await onlyOneHero(env, id);
  for (const field of ['photo', 'src']) {
    if (before[field] && before[field] !== row[field]) await removeMediaIfUnused(env, before[field]);
  }
  return json(row);
}

async function deleteRow(env, name, id) {
  const before = await env.DB.prepare(`SELECT * FROM ${name} WHERE id = ?`).bind(id).first();
  if (!before) return json({ ok: true });
  await env.DB.prepare(`DELETE FROM ${name} WHERE id = ?`).bind(id).run();
  for (const field of ['photo', 'src']) if (before[field]) await removeMediaIfUnused(env, before[field]);
  return json({ ok: true });
}

async function reorder(req, env, name) {
  const body = await readJson(req);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!ids.length) return json({ error: 'Nothing to reorder.' }, 400);
  await env.DB.batch(ids.map((id, i) => env.DB.prepare(`UPDATE ${name} SET sort = ? WHERE id = ?`).bind(i + 1, id)));
  return json({ ok: true });
}

async function onlyOneHero(env, keepId) {
  await env.DB.prepare("UPDATE photos SET placement = 'gallery' WHERE placement = 'hero' AND id != ?").bind(keepId).run();
}

async function removeMediaIfUnused(env, src) {
  if (!src.startsWith('/media/')) return;
  const used = await env.DB.prepare(
    'SELECT (SELECT COUNT(*) FROM directors WHERE photo = ?1) + (SELECT COUNT(*) FROM photos WHERE src = ?1) + (SELECT COUNT(*) FROM news WHERE photo = ?1) AS n'
  ).bind(src).first();
  if (used.n === 0) await env.MEDIA.delete(src.slice(7));
}

async function saveSettings(req, env) {
  const body = await readJson(req);
  if (!body) return json({ error: 'Nothing to save.' }, 400);
  const stmts = [];
  for (const [key, max] of Object.entries(SETTINGS)) {
    if (!(key in body)) continue;
    const v = String(body[key] ?? '').trim();
    if (v.length > max) return json({ error: `${key} is too long (${max} characters max).` }, 400);
    if (key === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) return json({ error: 'That email address does not look right.' }, 400);
    if (key === 'alert_email' && v && v.split(',').some((a) => !/^\S+@\S+\.\S+$/.test(a.trim()))) {
      return json({ error: 'Check the alert addresses. Separate more than one with commas.' }, 400);
    }
    stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, v));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json(await getSettings(env));
}

async function upload(req, env) {
  const type = (req.headers.get('content-type') || '').split(';')[0].trim();
  const ext = IMAGE_TYPES[type];
  if (!ext) return json({ error: 'Upload a JPG, PNG, WebP or GIF photo.' }, 415);
  const size = Number(req.headers.get('content-length') || 0);
  if (size > MAX_UPLOAD_BYTES) return json({ error: 'That photo is too large (8 MB max).' }, 413);
  const data = await req.arrayBuffer();
  if (!data.byteLength) return json({ error: 'The photo was empty.' }, 400);
  if (data.byteLength > MAX_UPLOAD_BYTES) return json({ error: 'That photo is too large (8 MB max).' }, 413);
  const key = `${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, data, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
  return json({ src: `/media/${key}` }, 201);
}

async function media(env, key) {
  if (!/^[\w\-]+\.(jpg|png|webp|gif)$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers });
}

/* ---------- public page ---------- */

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

function paragraphs(text) {
  return text.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}

function prettyDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function renderHome(req, env) {
  const page = await env.ASSETS.fetch(new Request(new URL('/', req.url), { headers: req.headers }));
  if (!page.ok) return page;

  const [directors, photos, goals, news, settings] = await Promise.all([
    env.DB.prepare('SELECT * FROM directors ORDER BY sort, id').all().then((r) => r.results),
    env.DB.prepare("SELECT * FROM photos WHERE placement != 'hidden' ORDER BY sort, id").all().then((r) => r.results),
    env.DB.prepare('SELECT * FROM goals ORDER BY sort, id').all().then((r) => r.results),
    env.DB.prepare('SELECT * FROM news WHERE published = 1 ORDER BY item_date DESC, id DESC LIMIT 12').all().then((r) => r.results),
    getSettings(env),
  ]);

  const hero = photos.find((p) => p.placement === 'hero');
  const gallery = photos.filter((p) => p.placement === 'gallery');
  const credited = photos.filter((p) => p.credit);

  const boardHtml = directors.map((d) =>
    `<li class="member">${d.photo
      ? `<img class="avatar avatar-img" src="${esc(d.photo)}" alt="" loading="lazy" width="52" height="52">`
      : `<span class="avatar" aria-hidden="true">${esc(initials(d.name))}</span>`}<span class="who"><strong>${esc(d.name)}</strong><span>${esc(d.title)}</span></span></li>`
  ).join('');

  const goalsHtml = goals.map((g) =>
    `<div class="goal"><span class="n">${esc(g.value)}</span><span class="u">${esc(g.label)}</span><span class="kind kind-${g.kind}">${g.kind === 'achieved' ? 'Achieved' : '2030 target'}</span></div>`
  ).join('');
  const kinds = new Set(goals.map((g) => g.kind));
  const goalsNote = kinds.has('achieved') && kinds.has('target')
    ? 'Achieved figures are results so far. Targets are what we are working towards by 2030.'
    : kinds.has('achieved') ? 'Results achieved so far. We report progress every year.'
    : 'These are our targets for 2030. We will report progress against each one, every year.';

  const galleryHtml = gallery.map((p) =>
    `<figure class="ph"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`
  ).join('');

  const newsHtml = news.map((n) =>
    `<article class="news-item">${n.photo ? `<img src="${esc(n.photo)}" alt="" loading="lazy">` : ''}<div class="news-body">${n.item_date ? `<time datetime="${esc(n.item_date)}">${esc(prettyDate(n.item_date))}</time>` : ''}<h3>${esc(n.title)}</h3>${paragraphs(n.body || '')}</div></article>`
  ).join('');

  const creditsHtml = credited.length
    ? 'Photo credits: ' + credited.map((p) => {
        const who = p.credit_url ? `<a href="${esc(p.credit_url)}" target="_blank" rel="noopener">${esc(p.credit)}</a>` : esc(p.credit);
        return `${esc(p.caption || 'Photo')}, ${who}`;
      }).join('; ') + '.'
    : '';

  const set = (value, fn) => ({ element(el) { if (value != null && value !== '') fn(el); } });
  const html = { html: true };

  const rewriter = new HTMLRewriter()
    .on('[data-slot="headline"]', set(settings.headline, (el) => el.setInnerContent(esc(settings.headline).replace(/\*(.+?)\*/g, '<em>$1</em>'), html)))
    .on('[data-slot="lede"]', set(settings.lede, (el) => el.setInnerContent(settings.lede)))
    .on('[data-slot="hero-img"]', set(hero, (el) => {
      el.setAttribute('src', hero.src);
      el.setAttribute('alt', hero.alt || '');
      if (hero.src !== DEFAULT_HERO) { el.removeAttribute('srcset'); el.removeAttribute('sizes'); }
    }))
    .on('[data-slot="gallery"]', {
      element(el) {
        el.setAttribute('class', `photos count-${gallery.length}`);
        if (gallery.length) el.setInnerContent(galleryHtml, html); else { el.setInnerContent(''); el.setAttribute('hidden', ''); }
      },
    })
    .on('[data-slot="board"]', { element(el) { el.setInnerContent(boardHtml, html); } })
    .on('[data-slot="goals"]', { element(el) { el.setInnerContent(goalsHtml, html); } })
    .on('[data-slot="goals-note"]', { element(el) { el.setInnerContent(goalsNote); } })
    .on('[data-slot="news"]', set(news.length || null, (el) => el.removeAttribute('hidden')))
    .on('[data-slot="nav-news"]', set(news.length || null, (el) => el.removeAttribute('hidden')))
    .on('[data-slot="news-list"]', { element(el) { el.setInnerContent(newsHtml, html); } })
    .on('[data-slot="phone"]', set(settings.phone, (el) => el.setInnerContent(settings.phone)))
    .on('[data-slot="zelle"]', set(settings.zelle, (el) => el.setInnerContent(settings.zelle)))
    .on('[data-slot="city"]', set(settings.city, (el) => el.setInnerContent(settings.city)))
    .on('[data-slot="email-text"]', set(settings.email, (el) => el.setInnerContent(settings.email)))
    .on('[data-slot="email"]', set(settings.email, (el) => { el.setAttribute('href', 'mailto:' + settings.email); el.setInnerContent(settings.email); }))
    .on('[data-slot="credits"]', {
      element(el) { if (creditsHtml) el.setInnerContent(creditsHtml, html); else el.setAttribute('hidden', ''); },
    });

  const res = rewriter.transform(page);
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.delete('etag');
  return new Response(res.body, { status: res.status, headers });
}
