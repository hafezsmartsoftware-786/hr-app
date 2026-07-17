-- =============================================================
-- Employee Advance Management Module
-- Run this in your Supabase SQL editor to set up the module.
-- =============================================================

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finance';
COMMIT;

-- ─── Sequence for human-readable request numbers ─────────────
CREATE SEQUENCE IF NOT EXISTS public.advance_request_seq START 1;

-- ─── Main table: employee_advances ───────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_advances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request identity
  request_number        text NOT NULL UNIQUE DEFAULT
    ('ADV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.advance_request_seq')::text, 4, '0')),

  -- Employee
  employee_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Amounts
  requested_amount      numeric(14, 2) NOT NULL CHECK (requested_amount > 0),
  approved_amount       numeric(14, 2),

  -- Outstanding balance snapshot captured at finance review
  previous_balance      numeric(14, 2) NOT NULL DEFAULT 0,
  total_outstanding     numeric(14, 2) GENERATED ALWAYS AS (
    COALESCE(approved_amount, requested_amount) + previous_balance
  ) STORED,

  -- Repayment tracking
  paid_amount           numeric(14, 2) NOT NULL DEFAULT 0,
  remaining_balance     numeric(14, 2) GENERATED ALWAYS AS (
    COALESCE(approved_amount, 0) - COALESCE(paid_amount, 0)
  ) STORED,
  installment_count     int,
  installment_amount    numeric(14, 2),
  deduction_start_date  date,
  deduction_end_date    date,
  repayment_status      text NOT NULL DEFAULT 'pending'
    CHECK (repayment_status IN ('pending', 'active', 'completed', 'closed')),

  -- Request meta
  reason                text,
  expected_date         date,
  attachment_url        text,
  currency              text NOT NULL DEFAULT 'EGP',

  -- Status
  status                text NOT NULL DEFAULT 'pending_manager'
    CHECK (status IN (
      'draft',
      'pending_manager',
      'pending_hr',
      'pending_finance',
      'approved_for_payment',
      'paid',
      'rejected',
      'cancelled',
      'returned'
    )),

  -- Audit
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  payment_date          timestamptz,

  -- Who did what
  manager_decided_by    uuid REFERENCES public.profiles(id),
  hr_decided_by         uuid REFERENCES public.profiles(id),
  finance_decided_by    uuid REFERENCES public.profiles(id),
  rejected_by           uuid REFERENCES public.profiles(id),
  rejection_reason      text,

  -- Soft delete guard (approved requests cannot be hard-deleted)
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS ea_employee_idx      ON public.employee_advances (employee_id);
CREATE INDEX IF NOT EXISTS ea_status_idx        ON public.employee_advances (status);
CREATE INDEX IF NOT EXISTS ea_created_idx       ON public.employee_advances (created_at DESC);
CREATE INDEX IF NOT EXISTS ea_request_num_idx   ON public.employee_advances (request_number);

-- Updated-at trigger
DROP TRIGGER IF EXISTS ea_set_updated_at ON public.employee_advances;
CREATE TRIGGER ea_set_updated_at
  BEFORE UPDATE ON public.employee_advances
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─── Approval audit log: employee_advance_approvals ──────────
CREATE TABLE IF NOT EXISTS public.employee_advance_approvals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id    uuid NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
  approver_id   uuid REFERENCES public.profiles(id),
  approval_level text NOT NULL
    CHECK (approval_level IN ('manager', 'hr', 'finance', 'system')),
  action        text NOT NULL
    CHECK (action IN ('submitted', 'approved', 'rejected', 'returned', 'cancelled', 'paid')),
  comments      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eaa_advance_idx  ON public.employee_advance_approvals (advance_id);
CREATE INDEX IF NOT EXISTS eaa_created_idx ON public.employee_advance_approvals (created_at DESC);

-- ─── Repayment installments: employee_advance_installments ───
CREATE TABLE IF NOT EXISTS public.employee_advance_installments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id        uuid NOT NULL REFERENCES public.employee_advances(id) ON DELETE CASCADE,
  payroll_period    text NOT NULL,         -- e.g. '2024-02'
  installment_amount numeric(14, 2) NOT NULL CHECK (installment_amount > 0),
  paid_amount       numeric(14, 2) NOT NULL DEFAULT 0,
  remaining_amount  numeric(14, 2) GENERATED ALWAYS AS (installment_amount - paid_amount) STORED,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'skipped')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eai_advance_idx ON public.employee_advance_installments (advance_id);

DROP TRIGGER IF EXISTS eai_set_updated_at ON public.employee_advance_installments;
CREATE TRIGGER eai_set_updated_at
  BEFORE UPDATE ON public.employee_advance_installments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─── Grants ──────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.employee_advances TO authenticated;
GRANT SELECT, INSERT ON public.employee_advance_approvals TO authenticated;
GRANT SELECT ON public.employee_advance_installments TO authenticated;

GRANT ALL ON public.employee_advances TO service_role;
GRANT ALL ON public.employee_advance_approvals TO service_role;
GRANT ALL ON public.employee_advance_installments TO service_role;
GRANT ALL ON public.advance_request_seq TO service_role;

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advance_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advance_installments ENABLE ROW LEVEL SECURITY;

-- employee_advances: employees can see their own; all admin-area roles can see all
DROP POLICY IF EXISTS ea_employee_select ON public.employee_advances;
CREATE POLICY ea_employee_select ON public.employee_advances
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'hr', 'manager', 'finance')
    )
  );

DROP POLICY IF EXISTS ea_employee_insert ON public.employee_advances;
CREATE POLICY ea_employee_insert ON public.employee_advances
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS ea_employee_update ON public.employee_advances;
CREATE POLICY ea_employee_update ON public.employee_advances
  FOR UPDATE TO authenticated
  USING (
    -- employees can only cancel own drafts/pending_manager
    (employee_id = auth.uid() AND status IN ('draft', 'pending_manager'))
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'hr', 'manager', 'finance')
    )
  );

-- Approved requests cannot be deleted
DROP POLICY IF EXISTS ea_no_delete ON public.employee_advances;
CREATE POLICY ea_no_delete ON public.employee_advances
  FOR DELETE TO authenticated
  USING (
    status IN ('draft') AND employee_id = auth.uid()
  );

-- Approvals log: all admin-area roles can read
DROP POLICY IF EXISTS eaa_select ON public.employee_advance_approvals;
CREATE POLICY eaa_select ON public.employee_advance_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_advances ea
      WHERE ea.id = advance_id AND (
        ea.employee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'hr', 'manager', 'finance')
        )
      )
    )
  );

DROP POLICY IF EXISTS eaa_insert ON public.employee_advance_approvals;
CREATE POLICY eaa_insert ON public.employee_advance_approvals
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- business logic enforced in server functions

-- Installments: same visibility as advances
DROP POLICY IF EXISTS eai_select ON public.employee_advance_installments;
CREATE POLICY eai_select ON public.employee_advance_installments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_advances ea
      WHERE ea.id = advance_id AND (
        ea.employee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'hr', 'manager', 'finance')
        )
      )
    )
  );
