import ChangePasswordForm from "@/components/ChangePasswordForm";
import DetailList from "@/components/DetailList";
import PageShell from "@/components/PageShell";
import SectionHeading from "@/components/SectionHeading";
import { requireUser } from "@/lib/auth";

// Settings is shared by customers and the admin, so it lives outside the
// (customer) and (admin) folders. The sidebar that is shown depends on the role.
export default async function SettingsPage() {
    // Any signed-in, ACTIVE user. The role comes from the database, not the browser.
    const user = await requireUser();

    return (
        <PageShell
            title="Settings"
            userName={user.fullName}
            role={user.role === "ADMIN" ? "admin" : "customer"}
        >
            <section>
                <SectionHeading>Profile</SectionHeading>
                <div className="mt-6 max-w-2xl">
                    <DetailList
                        items={[
                            { label: "Full name", value: user.fullName },
                            { label: "Email", value: user.email },
                            { label: "Role", value: user.role === "ADMIN" ? "Administrator" : "Customer" },
                        ]}
                    />
                </div>
            </section>

            <section>
                <SectionHeading>Change password</SectionHeading>
                <div className="mt-6">
                    <ChangePasswordForm idPrefix="settings" />
                </div>
            </section>
        </PageShell>
    );
}