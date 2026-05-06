import { Placeholder } from "@/components/brand/placeholder";

export const metadata = { title: "Project owner dashboard" };

export default function OwnerDashboard() {
  return (
    <Placeholder
      eyebrow="Project owner · dashboard"
      title="Your projects"
      description="The owner dashboard will list your uploaded projects, builders who unlocked them, tender submissions, and unread messages. Real data lands in Phase 2 once project upload + unlock workflows ship."
      phase="Phase 2 · marketplace workflow"
    />
  );
}
