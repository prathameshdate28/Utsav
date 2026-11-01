import { BudgetPlanner } from "./planner";

export const metadata = {
  title: "Budget & What-If — Utsav",
  description: "Deterministic Indian event budget engine with what-if scenario levers.",
};

export default function BudgetPage() {
  return (
    <BudgetPlanner />
  );
}
