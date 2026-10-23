import { redirect } from "next/navigation";

export default function AdminMentorRequestsRedirect() {
  redirect("/admin/dashboard");
}
