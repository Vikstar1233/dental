import { getProfile } from "@/lib/get-profile";
import { logout } from "@/lib/actions/session";
import { Sidebar } from "@/components/layout/sidebar";

const NAV_ITEMS = [
  { href: "/doctor", label: "My patients" },
  { href: "/doctor/conversations", label: "Conversations" },
  { href: "/doctor/team-chat", label: "Team chat" },
];

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={NAV_ITEMS}
        roleLabel="Doctor"
        email={profile.email}
        accountHref="/doctor/account"
        logoutAction={logout}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
