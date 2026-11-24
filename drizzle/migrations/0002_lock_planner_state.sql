DROP POLICY IF EXISTS planner_state_rw ON public.planner_state;
REVOKE ALL ON public.planner_state FROM anon;
REVOKE ALL ON public.planner_state FROM authenticated;
GRANT ALL ON public.planner_state TO service_role;