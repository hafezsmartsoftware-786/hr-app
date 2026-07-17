import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/employee/SettingsPage";

export const Route = createFileRoute("/finance/profile")({
  component: FinanceProfile,
});

function FinanceProfile() {
  return <SettingsPage />;
}
