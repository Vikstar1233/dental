import { requireAdmin } from "@/lib/require-admin";
import { logout } from "@/lib/actions/session";
import { Sidebar } from "@/components/layout/sidebar";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/pipeline", label: "Pipeline" },
  { href: "/admin/patients", label: "Patients" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/doctors", label: "Doctors" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/team-chat", label: "Team chat" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={NAV_ITEMS}
        roleLabel="Admin"
        email={profile.email}
        accountHref="/admin/account"
        logoutAction={logout}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
