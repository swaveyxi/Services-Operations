import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { serviceIncomes } from './serviceIncomes';
import { serviceCosts } from './serviceCosts';

export const associatedCosts = table(
  'associated_costs',
  {
    income_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => serviceIncomes.id, { onDelete: 'cascade' }),
    cost_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => serviceCosts.id, { onDelete: 'cascade' }),
  },
  (cols) => [t.primaryKey({ columns: [cols.income_id, cols.cost_id] })],
);
