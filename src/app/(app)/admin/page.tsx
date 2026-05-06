import { Placeholder } from "@/components/brand/placeholder";

export const metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };

export default function AdminDashboard() {
  return (
    <Placeholder
      eyebrow="Admin · dashboard"
      title="Platform metrics"
      description="The admin dashboard manages users, builders, owners, projects, tenders, unlocks, payments, and Founding Builder Access. Locked behind role=admin via middleware."
      phase="Phase 4 · admin"
    />
  );
}
