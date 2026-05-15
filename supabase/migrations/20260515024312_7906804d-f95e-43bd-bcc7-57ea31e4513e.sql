
REVOKE EXECUTE ON FUNCTION public.approve_deposit(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_deposit(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_withdrawal(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_withdrawal(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.start_robot(TEXT, NUMERIC) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.settle_robots() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_withdrawal_pin(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(UUID, NUMERIC, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_blocked(UUID, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.touch_last_active() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.approve_deposit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_deposit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_robot(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_robots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_withdrawal_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_blocked(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;
