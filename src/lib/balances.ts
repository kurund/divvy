import type { Balance, Expense, Member, Settlement } from './types';

// Net balance per member = sum(paid) - sum(shares).
// Positive => owed money by the group. Negative => owes the group.
export function computeBalances(members: Member[], expenses: Expense[]): Balance[] {
	const net = new Map<string, number>();
	for (const m of members) net.set(m.id, 0);

	for (const exp of expenses) {
		net.set(exp.paid_by, (net.get(exp.paid_by) ?? 0) + exp.amount_cents);
		for (const share of exp.shares) {
			net.set(share.member_id, (net.get(share.member_id) ?? 0) - share.share_cents);
		}
	}

	return [...net.entries()].map(([member_id, net_cents]) => ({ member_id, net_cents }));
}

// Greedy debt simplification: repeatedly settle the largest creditor
// with the largest debtor. Produces at most n-1 transactions for n members.
export function simplifyDebts(balances: Balance[]): Settlement[] {
	const creditors = balances
		.filter((b) => b.net_cents > 0)
		.map((b) => ({ ...b }))
		.sort((a, b) => b.net_cents - a.net_cents);
	const debtors = balances
		.filter((b) => b.net_cents < 0)
		.map((b) => ({ ...b, net_cents: -b.net_cents }))
		.sort((a, b) => b.net_cents - a.net_cents);

	const settlements: Settlement[] = [];
	let i = 0;
	let j = 0;
	while (i < creditors.length && j < debtors.length) {
		const c = creditors[i];
		const d = debtors[j];
		const amount = Math.min(c.net_cents, d.net_cents);
		if (amount > 0) {
			settlements.push({
				from_member_id: d.member_id,
				to_member_id: c.member_id,
				amount_cents: amount
			});
		}
		c.net_cents -= amount;
		d.net_cents -= amount;
		if (c.net_cents === 0) i++;
		if (d.net_cents === 0) j++;
	}
	return settlements;
}
