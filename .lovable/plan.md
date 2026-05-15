# Smart Wealth — Build Plan

A full-stack investment app on TanStack Start + Lovable Cloud (Supabase). Dark-first glass UI, USDT TRC20 deposits, mining robot plans, 3-tier referrals, admin panel with realtime notifications.

## 1. Backend (Lovable Cloud)

**Tables (all RLS-enabled):**
- `profiles` — id (uuid → auth.users), username, email, uid (short public id), balance numeric default 0, withdrawal_address text, withdrawal_pin_hash, is_admin bool, is_blocked bool, referral_code, referred_by, last_active timestamptz
- `deposits` — id, user_id, amount, address, txid, status (pending/success/rejected), reject_reason, created_at
- `withdrawals` — id, user_id, amount, address, status, reject_reason, created_at
- `robot_investments` — id, user_id, plan (v1–v5), amount, daily_rate, started_at, ends_at, status (active/completed), profit
- `transactions` — id, user_id, type (deposit/withdrawal/robot_profit/referral_commission), amount, status, meta jsonb, created_at
- `referrals` — id, referrer_id, referred_id, level (1/2/3), commission_earned
- `deposit_address_rotation` — single row tracking current address index + rotated_at (server-side rotation every 5 min)

**Auth:** Email + password. OTP email verification (4-min expiry) via Supabase `signInWithOtp`/email verification. First registered user auto-flagged `is_admin = true` via DB trigger.

**Triggers/Functions:**
- `handle_new_user()` → creates profile row, sets is_admin if first user, generates uid + referral_code, links referred_by from signup metadata
- `has_role(uid)` security definer for admin checks
- RPC `approve_deposit(id)` / `reject_deposit(id, reason)` — admin only, atomically updates balance + status, distributes 3-tier referral commission (10/4/1%) on first deposit, triggers 20% first-deposit bonus
- RPC `approve_withdrawal(id)` / `reject_withdrawal(id, reason)` — admin only, deducts balance with 1% fee
- RPC `start_robot(plan, amount)` — validates range, deducts balance, creates investment, schedules profit
- RPC `complete_robot_profits()` — pg_cron every minute, returns principal+profit to balance when ends_at reached
- RPC `rotate_deposit_address()` — pg_cron every 5 min

**RLS:** Users see only their own rows. Admin policies via `has_role`. Deposits/withdrawals insert-only by owner; status updates admin-only.

## 2. Routes (TanStack file-based)

Public:
- `/` → redirects to /login or /dashboard
- `/register` (accepts `?ref=CODE`)
- `/login`
- `/about`, `/terms`

Authenticated (`_authenticated/`):
- `/dashboard` — balance card, exclusive offer popup on first visit, action buttons
- `/deposit` — 5-min rotating address, QR, amount, txid, copy
- `/withdraw`
- `/transactions`
- `/team`
- `/robots` — 5 plans + active investments view
- `/invite`
- `/settings`
- `/admin` — guarded by is_admin

## 3. Key features

**Header:** Logo, Smart Wealth wordmark, Dark/Light toggle (localStorage), Tawk.to customer service icon (script injected), admin shield icon (only if is_admin).

**Dashboard:** Glass card with pulsing "Exclusive Offer" popup, balance card with eye toggle, deposit/withdraw/transactions buttons, robots/invite/settings grid, exclusive-offer modal on first login.

**Deposit page:** 5-min countdown, rotates through 4 hard-coded TRC20 addresses (server-side rotation table), QR generated client-side (qrcode.react), copy-to-clipboard, success popup.

**Withdraw page:** Balance, amount, prefilled address, withdrawal pin, 1% fee notice, 20 USDT min.

**Robots page:** 5 plans (v1: 30–99 @ 1.5–2%, v2: 100–299 @ 2.2%, v3: 300–999 @ 3.4%, v4: 1000–5000 @ 6.5%, v5: 30–100 @ 9%) with animated pickaxe+coin icon, 24h countdown per active investment, auto-return principal+profit.

**Invite:** Referral link (`/register?ref=CODE`), code, copy, invited/valid/earnings stats, 10/4/1% commission card.

**Admin panel:**
- 4 stat glass cards: Total Deposits, Total Withdrawals, Total Users, Online Now (realtime, last 2 min)
- User search by uid/email, balance add/deduct, block/unblock, list with email/uid/wallet/balance
- Pending deposits/withdrawals tabs with approve/reject (reject requires reason)
- Realtime subscription on `deposits` + `withdrawals` where status='pending' → notification sound (Web Audio) + browser Notification API

**Settings:** Edit name, wallet address, change password, change withdrawal pin (each requires current password). Logout with confirm popup.

**Footer:** "Smart Wealth" / "Smart mining and a safe and automated investment..." / About Us | Terms & Privacy / © 2026.

**About page:** Sections (Who We Are, Our Technology, Investment Approach, Our Team, Security & Transparency, Our Commitment) with 4 attached images placed under "Our Technology".

## 4. Design system

- Black/dark-gray base, glassmorphism cards (backdrop-blur, white/5 surfaces, subtle borders), high-light green accent (`oklch` neon mint) for button glow rings.
- Buttons: rounded-full / rounded-2xl, transparent gradient, glowing green ring, press-scale + inner shadow on active.
- Pulse animation on offer cards, smooth fade-in transitions, animated mining icon (pickaxe + coin SVG with pulsing glow).
- Tokens defined in `src/styles.css` (`--background`, `--accent-glow`, `--gradient-glass`, `--shadow-glow`). Light mode inverts surface tokens, accent stays.
- Back icon at top of every authenticated page except `/dashboard`.

## 5. Realtime

- Supabase channel on `profiles` last_active for "Online Now" admin stat.
- Channel on `deposits`/`withdrawals` for admin pending notifications.
- `last_active` updated on every route change via root-level effect.

## 6. Confirmations needed

1. **OTP email delivery** — Supabase email confirmations require an email domain in Lovable Cloud. I'll use Lovable Emails default; if you want a custom sender domain, I can wire that. OK to proceed with default?
2. **First-account = admin**: confirmed — handled by DB trigger comparing user count.
3. **Robot v5 range overlaps v1 (both start at 30 USDT)** — keeping as specified (v5: 30–100 @ 9%). Confirm this is intentional, or should v5 start higher?
4. **Withdrawal address**: user enters once in Settings, reused on withdraw page. Editable anytime in Settings. OK?
5. **Tawk.to widget**: I'll inject the script tag globally so the chat bubble loads on every authenticated page.

If all good, approve and I'll build it end-to-end.