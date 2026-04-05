-- Ops: backfill NULL business_id on tenant tables (legacy DBs).
-- Prerequisites: columns exist (run full migrations or 20260331121500 + 20260331123000).
-- Uses default_business_id from public._app_kv (create default business first if missing).

DO $$
DECLARE
  default_business_id UUID;
BEGIN
  SELECT value::uuid INTO default_business_id
  FROM public._app_kv
  WHERE key = 'default_business_id';

  IF default_business_id IS NULL THEN
    RAISE EXCEPTION 'default_business_id not set in _app_kv. Run multitenant migration or insert key first.';
  END IF;

  UPDATE public.projects SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.customers SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.advisors SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.office_expenses SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.reminders SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.customer_documents SET business_id = default_business_id WHERE business_id IS NULL;

  UPDATE public.plots p
  SET business_id = pr.business_id
  FROM public.projects pr
  WHERE p.project_id = pr.id AND p.business_id IS NULL;

  UPDATE public.plot_sales s
  SET business_id = p.business_id
  FROM public.plots p
  WHERE s.plot_id = p.id AND s.business_id IS NULL;

  UPDATE public.payments pay
  SET business_id = s.business_id
  FROM public.plot_sales s
  WHERE pay.sale_id = s.id AND pay.business_id IS NULL;

  UPDATE public.advisor_project_commissions apc
  SET business_id = pr.business_id
  FROM public.projects pr
  WHERE apc.project_id = pr.id AND apc.business_id IS NULL;

  UPDATE public.advisor_commissions ac
  SET business_id = s.business_id
  FROM public.plot_sales s
  WHERE ac.sale_id = s.id AND ac.business_id IS NULL;

  UPDATE public.advisor_commission_payments acp
  SET business_id = ac.business_id
  FROM public.advisor_commissions ac
  WHERE acp.commission_id = ac.id AND acp.business_id IS NULL;

  UPDATE public.enquiry_customers e
  SET business_id = pr.business_id
  FROM public.projects pr
  WHERE e.project_id = pr.id AND e.business_id IS NULL;

  UPDATE public.enquiry_customers
  SET business_id = default_business_id
  WHERE business_id IS NULL;

  UPDATE public.hr_employees SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.hr_payout_batches SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.hr_attendance SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.hr_employee_payouts SET business_id = default_business_id WHERE business_id IS NULL;
END $$;
