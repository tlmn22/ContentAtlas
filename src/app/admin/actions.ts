"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/supabase";
import { getChannelInfo } from "@/lib/youtube";

export async function addChannel(formData: FormData) {
  const input = String(formData.get("channel") ?? "").trim();
  if (!input) redirect("/admin?error=" + encodeURIComponent("Сувгийн хаяг оруулна уу"));

  let info;
  try {
    info = await getChannelInfo(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "YouTube API алдаа";
    redirect("/admin?error=" + encodeURIComponent(msg.slice(0, 200)));
  }
  if (!info) redirect("/admin?error=" + encodeURIComponent(`Суваг олдсонгүй: ${input}`));

  const db = getDb();
  const { error } = await db.from("channels").upsert(
    {
      id: info.id,
      title: info.title,
      handle: info.handle,
      avatar_url: info.avatarUrl,
      uploads_playlist_id: info.uploadsPlaylistId,
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin");
  redirect("/admin?ok=" + encodeURIComponent(`«${info.title}» нэмэгдлээ`));
}

export async function toggleChannel(id: string, isActive: boolean) {
  const db = getDb();
  await db.from("channels").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin");
}

export async function deleteChannel(id: string) {
  const db = getDb();
  await db.from("channels").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function addAdminUser(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-zA-Z0-9_.-]{2,32}$/.test(username)) {
    redirect(
      "/admin?error=" + encodeURIComponent("Нэвтрэх нэр 2-32 тэмдэгт, зөвхөн үсэг/тоо байх ёстой")
    );
  }
  if (password.length < 4) {
    redirect("/admin?error=" + encodeURIComponent("Нууц үг дор хаяж 4 тэмдэгт байх ёстой"));
  }

  const db = getDb();
  const { error } = await db.rpc("upsert_admin_user", { p_username: username, p_password: password });
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin");
  redirect("/admin?ok=" + encodeURIComponent(`«${username}» admin хэрэглэгч нэмэгдлээ`));
}

export async function deleteAdminUser(username: string) {
  const db = getDb();
  const { count } = await db.from("admin_users").select("*", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    redirect("/admin?error=" + encodeURIComponent("Сүүлчийн admin хэрэглэгчийг устгах боломжгүй"));
  }

  await db.from("admin_users").delete().eq("username", username);
  revalidatePath("/admin");
}
