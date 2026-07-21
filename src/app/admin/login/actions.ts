"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin-auth";
import { getDb } from "@/lib/supabase";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/admin/login?error=" + encodeURIComponent("Нэвтрэх нэр, нууц үгээ оруулна уу"));
  }

  const db = getDb();
  const { data: ok, error } = await db.rpc("verify_admin_login", {
    p_username: username,
    p_password: password,
  });
  if (error || !ok) {
    redirect("/admin/login?error=" + encodeURIComponent("Нэвтрэх нэр эсвэл нууц үг буруу байна"));
  }

  const token = await createSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
}
