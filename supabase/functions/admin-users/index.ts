import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { success: false, message: "طريقة الطلب غير مدعومة." });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return respond(401, { success: false, message: "سجّل الدخول بحساب مشرف أولاً." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { success: false, message: "إعدادات خدمة إدارة المستخدمين غير مكتملة." });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !userData.user) {
    return respond(401, { success: false, message: "انتهت جلسة الدخول. سجّل الدخول مرة أخرى." });
  }

  const { data: adminRecord, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (adminError || !adminRecord) {
    return respond(403, { success: false, message: "هذه العملية متاحة لمشرفي المتجر فقط." });
  }

  let body: { action?: string; email?: string; firstName?: string; lastName?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return respond(400, { success: false, message: "بيانات الطلب غير صالحة." });
  }

  if (body.action === "invite") {
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !firstName || !lastName) {
      return respond(400, { success: false, message: "أدخل الاسم الأول والأخير وبريداً إلكترونياً صحيحاً." });
    }
    if (firstName.length > 80 || lastName.length > 80) {
      return respond(400, { success: false, message: "الاسم أطول من الحد المسموح." });
    }

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName },
    });
    if (error) {
      if (/already been registered|already exists/i.test(error.message)) {
        return respond(409, { success: false, message: "هذا البريد مسجل بالفعل." });
      }
      return respond(400, { success: false, message: error.message });
    }
    return respond(200, {
      success: true,
      user: { id: data.user.id, email: data.user.email },
    });
  }

  if (body.action === "delete") {
    const userId = String(body.userId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return respond(400, { success: false, message: "معرّف الحساب غير صالح." });
    }
    if (userId === userData.user.id) {
      return respond(400, { success: false, message: "لا يمكنك حذف حسابك الحالي." });
    }

    const { data: targetAdmin, error: targetAdminError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetAdminError) return respond(500, { success: false, message: "تعذر التحقق من صلاحيات الحساب." });
    if (targetAdmin) return respond(409, { success: false, message: "لا يمكن حذف حساب مشرف من إدارة العملاء." });

    const { count, error: ordersError } = await adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (ordersError) return respond(500, { success: false, message: "تعذر التحقق من طلبات الحساب." });
    if ((count || 0) > 0) {
      return respond(409, { success: false, message: "لا يمكن حذف حساب لديه طلبات محفوظة. أوقف استقبال طلباته بدلاً من ذلك للحفاظ على سجل الطلبات." });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return respond(400, { success: false, message: deleteError.message });
    return respond(200, { success: true });
  }

  return respond(400, { success: false, message: "العملية المطلوبة غير معروفة." });
});