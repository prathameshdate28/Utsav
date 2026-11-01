import { TimelinePlanner } from "./planner";

export const metadata = {
  title: "Timeline & Due Dates — Utsav",
  description: "Reverse-scheduled milestones and ceremony schedules.",
};

export default function TimelinePage() {
  return <TimelinePlanner />;
}
