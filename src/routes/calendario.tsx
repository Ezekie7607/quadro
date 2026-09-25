import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "@/components/calendar/calendar-view";

export const Route = createFileRoute("/calendario")({ component: CalendarPage });

function CalendarPage() {
  return <CalendarView />;
}
