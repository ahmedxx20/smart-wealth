
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  uid TEXT NOT NULL UNIQUE,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  withdrawal_address TEXT,
  withdrawal_pin_hash TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  has_first_deposit BOOLEAN NOT NULL DEFAULT false,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- has_role function (SECURITY DEFINER, no recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = _uid), false)
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "users update own profile limited" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "admin can insert" ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- ============ DEPOSITS ============
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  address TEXT NOT NULL,
  txid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own deposits" ON public.deposits FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user insert own deposits" ON public.deposits FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update deposits" ON public.deposits FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ============ WITHDRAWALS ============
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own withdrawals" ON public.withdrawals FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user insert own withdrawals" ON public.withdrawals FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update withdrawals" ON public.withdrawals FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ============ ROBOT INVESTMENTS ============
CREATE TABLE public.robot_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  daily_rate NUMERIC(6,4) NOT NULL,
  profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  settled BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.robot_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own robots" ON public.robot_investments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user insert own robots" ON public.robot_investments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============ TRANSACTIONS (audit log) ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own tx" ON public.transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INT NOT NULL,
  commission_earned NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id, level)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own referrals" ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
  v_uid TEXT;
  v_ref TEXT;
  v_referrer UUID;
  v_referrer_code TEXT;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles;
  v_uid := upper(substr(replace(NEW.id::text,'-',''),1,8));
  v_ref := upper(substr(md5(NEW.id::text || now()::text),1,8));
  v_referrer_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referrer_code IS NOT NULL AND v_referrer_code <> '' THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(v_referrer_code) LIMIT 1;
  END IF;
  INSERT INTO public.profiles (id, username, email, uid, referral_code, referred_by, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    NEW.email,
    v_uid,
    v_ref,
    v_referrer,
    v_count = 0
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ APPROVE / REJECT FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.approve_deposit(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD; bonus NUMERIC := 0; r1 UUID; r2 UUID; r3 UUID; c1 NUMERIC; c2 NUMERIC; c3 NUMERIC;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id = p_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.deposits SET status='success' WHERE id = p_id;
  UPDATE public.profiles SET balance = balance + d.amount WHERE id = d.user_id;
  INSERT INTO public.transactions(user_id,type,amount,status,meta)
    VALUES (d.user_id,'deposit',d.amount,'success',jsonb_build_object('deposit_id',d.id));
  -- 20% first-deposit bonus
  IF NOT (SELECT has_first_deposit FROM public.profiles WHERE id = d.user_id) THEN
    bonus := round(d.amount * 0.20, 2);
    UPDATE public.profiles SET balance = balance + bonus, has_first_deposit = true WHERE id = d.user_id;
    INSERT INTO public.transactions(user_id,type,amount,status,meta)
      VALUES (d.user_id,'first_deposit_bonus',bonus,'success',jsonb_build_object('deposit_id',d.id));
    -- referral commissions
    SELECT referred_by INTO r1 FROM public.profiles WHERE id = d.user_id;
    IF r1 IS NOT NULL THEN
      c1 := round(d.amount * 0.10, 2);
      UPDATE public.profiles SET balance = balance + c1 WHERE id = r1;
      INSERT INTO public.transactions(user_id,type,amount,status,meta)
        VALUES (r1,'referral_commission',c1,'success',jsonb_build_object('level',1,'from',d.user_id));
      INSERT INTO public.referrals(referrer_id,referred_id,level,commission_earned) VALUES (r1,d.user_id,1,c1)
        ON CONFLICT (referrer_id,referred_id,level) DO UPDATE SET commission_earned = referrals.commission_earned + c1;
      SELECT referred_by INTO r2 FROM public.profiles WHERE id = r1;
      IF r2 IS NOT NULL THEN
        c2 := round(d.amount * 0.04, 2);
        UPDATE public.profiles SET balance = balance + c2 WHERE id = r2;
        INSERT INTO public.transactions(user_id,type,amount,status,meta)
          VALUES (r2,'referral_commission',c2,'success',jsonb_build_object('level',2,'from',d.user_id));
        INSERT INTO public.referrals(referrer_id,referred_id,level,commission_earned) VALUES (r2,d.user_id,2,c2)
          ON CONFLICT (referrer_id,referred_id,level) DO UPDATE SET commission_earned = referrals.commission_earned + c2;
        SELECT referred_by INTO r3 FROM public.profiles WHERE id = r2;
        IF r3 IS NOT NULL THEN
          c3 := round(d.amount * 0.01, 2);
          UPDATE public.profiles SET balance = balance + c3 WHERE id = r3;
          INSERT INTO public.transactions(user_id,type,amount,status,meta)
            VALUES (r3,'referral_commission',c3,'success',jsonb_build_object('level',3,'from',d.user_id));
          INSERT INTO public.referrals(referrer_id,referred_id,level,commission_earned) VALUES (r3,d.user_id,3,c3)
            ON CONFLICT (referrer_id,referred_id,level) DO UPDATE SET commission_earned = referrals.commission_earned + c3;
        END IF;
      END IF;
    END IF;
  END IF;
END;$$;

CREATE OR REPLACE FUNCTION public.reject_deposit(p_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.deposits SET status='rejected', reject_reason=p_reason WHERE id=p_id AND status='pending';
END;$$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=p_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.withdrawals SET status='success' WHERE id=p_id;
  -- balance was already deducted at request time; just log
  INSERT INTO public.transactions(user_id,type,amount,status,meta)
    VALUES (w.user_id,'withdrawal',w.amount,'success',jsonb_build_object('withdrawal_id',w.id,'fee',w.fee));
END;$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=p_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.withdrawals SET status='rejected', reject_reason=p_reason WHERE id=p_id;
  -- refund the held amount + fee
  UPDATE public.profiles SET balance = balance + w.amount + w.fee WHERE id = w.user_id;
END;$$;

-- Request withdrawal (deduct balance immediately, stays pending)
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount NUMERIC, p_pin TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; v_fee NUMERIC; v_total NUMERIC; v_id UUID;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p.is_blocked THEN RAISE EXCEPTION 'account blocked'; END IF;
  IF p.withdrawal_pin_hash IS NULL THEN RAISE EXCEPTION 'set withdrawal pin first'; END IF;
  IF p.withdrawal_pin_hash <> crypt(p_pin, p.withdrawal_pin_hash) THEN RAISE EXCEPTION 'invalid withdrawal pin'; END IF;
  IF p.withdrawal_address IS NULL OR p.withdrawal_address = '' THEN RAISE EXCEPTION 'set withdrawal address first'; END IF;
  IF p_amount < 20 THEN RAISE EXCEPTION 'minimum withdrawal is 20 USDT'; END IF;
  v_fee := round(p_amount * 0.01, 2);
  v_total := p_amount + v_fee;
  IF p.balance < v_total THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.profiles SET balance = balance - v_total WHERE id = p.id;
  INSERT INTO public.withdrawals(user_id,amount,fee,address,status)
    VALUES (p.id, p_amount, v_fee, p.withdrawal_address, 'pending') RETURNING id INTO v_id;
  RETURN v_id;
END;$$;

-- Start a robot investment
CREATE OR REPLACE FUNCTION public.start_robot(p_plan TEXT, p_amount NUMERIC)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; v_rate NUMERIC; v_min NUMERIC; v_max NUMERIC; v_id UUID;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p.is_blocked THEN RAISE EXCEPTION 'account blocked'; END IF;
  IF p_plan='v1' THEN v_rate:=0.0175; v_min:=30; v_max:=99;
  ELSIF p_plan='v2' THEN v_rate:=0.022; v_min:=100; v_max:=299;
  ELSIF p_plan='v3' THEN v_rate:=0.034; v_min:=300; v_max:=999;
  ELSIF p_plan='v4' THEN v_rate:=0.065; v_min:=1000; v_max:=5000;
  ELSIF p_plan='v5' THEN v_rate:=0.09; v_min:=30; v_max:=100;
  ELSE RAISE EXCEPTION 'invalid plan'; END IF;
  IF p_amount < v_min OR p_amount > v_max THEN RAISE EXCEPTION 'amount out of range'; END IF;
  IF p.balance < p_amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.profiles SET balance = balance - p_amount WHERE id = p.id;
  INSERT INTO public.robot_investments(user_id,plan,amount,daily_rate,ends_at,profit)
    VALUES (p.id, p_plan, p_amount, v_rate, now() + interval '24 hours', round(p_amount * v_rate, 2))
    RETURNING id INTO v_id;
  RETURN v_id;
END;$$;

-- Settle completed robot investments for a user (call on /robots load)
CREATE OR REPLACE FUNCTION public.settle_robots()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.robot_investments
    WHERE user_id = auth.uid() AND status='active' AND settled=false AND ends_at <= now() FOR UPDATE
  LOOP
    UPDATE public.robot_investments SET status='completed', settled=true WHERE id = r.id;
    UPDATE public.profiles SET balance = balance + r.amount + r.profit WHERE id = r.user_id;
    INSERT INTO public.transactions(user_id,type,amount,status,meta)
      VALUES (r.user_id,'robot_profit',r.profit,'success',jsonb_build_object('robot_id',r.id,'plan',r.plan));
    INSERT INTO public.transactions(user_id,type,amount,status,meta)
      VALUES (r.user_id,'robot_principal_return',r.amount,'success',jsonb_build_object('robot_id',r.id));
  END LOOP;
END;$$;

-- Set / change withdrawal pin. p_current = NULL on first set.
CREATE OR REPLACE FUNCTION public.set_withdrawal_pin(p_current TEXT, p_new TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur TEXT;
BEGIN
  SELECT withdrawal_pin_hash INTO cur FROM public.profiles WHERE id = auth.uid();
  IF cur IS NOT NULL THEN
    IF p_current IS NULL OR cur <> crypt(p_current, cur) THEN RAISE EXCEPTION 'invalid current pin'; END IF;
  END IF;
  UPDATE public.profiles SET withdrawal_pin_hash = crypt(p_new, gen_salt('bf'))
    WHERE id = auth.uid();
END;$$;

-- Admin: adjust balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_user UUID, p_delta NUMERIC, p_note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET balance = balance + p_delta WHERE id = p_user;
  INSERT INTO public.transactions(user_id,type,amount,status,meta)
    VALUES (p_user, CASE WHEN p_delta>=0 THEN 'admin_credit' ELSE 'admin_debit' END,
            abs(p_delta), 'success', jsonb_build_object('note', p_note));
END;$$;

CREATE OR REPLACE FUNCTION public.admin_set_blocked(p_user UUID, p_blocked BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET is_blocked = p_blocked WHERE id = p_user;
END;$$;

-- Heartbeat for "online now"
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET last_active = now() WHERE id = auth.uid();
END;$$;

-- Enable pgcrypto for crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
