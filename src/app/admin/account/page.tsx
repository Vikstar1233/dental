import { requireAdmin } from "@/lib/require-admin";
import { AccountSettings } from "@/components/account-settings";

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { error, success } = await searchParams;

  return (
    <div className="px-10 py-10">
      <AccountSettings
        redirectTo="/admin/account"
        error={error}
        success={success}
      />
    </div>
  );
}
