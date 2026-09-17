-- Milestone 9 Schema: Operational Finance Engine

CREATE TABLE IF NOT EXISTS finance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category_type TEXT NOT NULL CHECK (category_type IN ('revenue', 'expense')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS financial_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    party_type TEXT NOT NULL CHECK (party_type IN ('person', 'client', 'vendor')),
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    tax_identifier TEXT,
    address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES financial_parties(id),
    category_id UUID NOT NULL REFERENCES finance_categories(id),
    direction TEXT NOT NULL CHECK (direction IN ('receivable', 'payable')),
    title TEXT NOT NULL,
    description TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    gross_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    fee_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    net_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    balance_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    state TEXT NOT NULL CHECK (state IN ('Draft', 'Issued', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled')),
    issue_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    branch_id UUID REFERENCES branches(id),
    business_unit_id UUID REFERENCES business_units(id),
    department_id UUID REFERENCES departments(id),
    project_id UUID REFERENCES projects(id),
    target_type TEXT,
    target_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_obligation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES financial_obligations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL CHECK (item_type IN ('charge', 'discount', 'fee')),
    unit_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    total_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES financial_parties(id),
    direction TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'reversal', 'adjustment')),
    state TEXT NOT NULL CHECK (state IN ('Pending', 'Posted', 'Reversed', 'Refunded', 'Voided')),
    amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    unallocated_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other')),
    reference_number TEXT,
    notes TEXT,
    posted_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    original_transaction_id UUID REFERENCES financial_transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES financial_obligations(id) ON DELETE CASCADE,
    obligation_item_id UUID REFERENCES financial_obligation_items(id),
    allocated_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES financial_obligations(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waiver', 'fine', 'late_fee', 'credit_note', 'debit_note')),
    amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    reason TEXT NOT NULL,
    created_by_person_id UUID REFERENCES people(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_unit_id UUID REFERENCES business_units(id),
    department_id UUID REFERENCES departments(id),
    project_id UUID REFERENCES projects(id),
    category_id UUID REFERENCES finance_categories(id),
    period_name TEXT NOT NULL,
    budget_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    allocated_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    spent_amount NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_org ON finance_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_parties_org ON financial_parties(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_parties_person ON financial_parties(person_id);

CREATE INDEX IF NOT EXISTS idx_financial_obligations_org ON financial_obligations(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_party ON financial_obligations(party_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_state ON financial_obligations(state);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_due ON financial_obligations(due_at);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_project ON financial_obligations(project_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_org ON financial_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_party ON financial_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_state ON financial_transactions(state);

CREATE INDEX IF NOT EXISTS idx_financial_allocations_trans ON financial_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_allocations_obli ON financial_allocations(obligation_id);

CREATE INDEX IF NOT EXISTS idx_financial_budgets_org ON financial_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_bu ON financial_budgets(business_unit_id);
