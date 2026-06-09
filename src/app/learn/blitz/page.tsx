import { redirect } from "next/navigation";

// Default to Al-Baqarah which has the richest tajweed annotation.
export default function BlitzPage() {
  redirect("/learn/blitz/2");
}
