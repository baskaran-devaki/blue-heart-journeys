import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ProvisionInput = {
  email: string;
  phone: string;
  full_name?: string;
  resetPassword?: boolean;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/**
 * Creates (or re-syncs) the login account for a member the admin added.
 * The member's mobile number is used as the initial password – Supabase
 * stores it hashed, it is never persisted in our own tables.
 */
export const provisionMemberAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProvisionInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const email = data.email.trim().toLowerCase();
    const password = data.phone.replace(/\D/g, "");
    if (!email.includes("@")) throw new Error("Valid email required");
    if (password.length < 6) {
      throw new Error("Mobile number needs at least 6 digits to be the default password");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let existingId: string | null = null;
    for (let page = 1; page <= 10 && !existingId; page += 1) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw error;
      const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (hit) existingId = hit.id;
      if (list.users.length < 200) break;
    }

    if (!existingId) {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name ?? "" },
      });
      if (error) throw error;
      return { created: true, reset: false };
    }

    if (data.resetPassword) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, { password });
      if (error) throw error;
      return { created: false, reset: true };
    }

    return { created: false, reset: false };
  });
