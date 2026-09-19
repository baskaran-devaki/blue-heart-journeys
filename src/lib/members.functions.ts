import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ProvisionInput = {
  email: string;
  full_name?: string;
  resetPassword?: boolean;
};

/**
 * Invites a new member without assigning a predictable password.
 * Existing members receive the normal password-reset email from the client.
 */
export const provisionMemberAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProvisionInput) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Valid email required");

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
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://blueheartguys.lovable.app/reset-password",
        data: { full_name: data.full_name ?? "" },
      });
      if (error) throw error;
      return { created: true, reset: false };
    }

    if (data.resetPassword) {
      return { created: false, reset: true };
    }

    return { created: false, reset: false };
  });
