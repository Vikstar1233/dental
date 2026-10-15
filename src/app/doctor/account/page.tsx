import { getProfile } from "@/lib/get-profile";
import { AccountSettings } from "@/components/account-settings";

export default async function DoctorAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await getProfile();
  const { error, success } = await searchParams;

  return (
    <div className="px-10 py-10">
      <AccountSettings
        redirectTo="/doctor/account"
        error={error}
        success={success}
      />
    </div>
  );
}
