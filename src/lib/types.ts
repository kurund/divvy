export type Group = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  created_at: string;
};

export type Member = {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
};

export type ExpenseShare = {
  expense_id: string;
  member_id: string;
  share_cents: number;
};

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  shares: ExpenseShare[];
};

export type Balance = {
  member_id: string;
  net_cents: number;
};

export type Settlement = {
  from_member_id: string;
  to_member_id: string;
  amount_cents: number;
};
