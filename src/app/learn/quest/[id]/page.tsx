import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuestPage({ params }: Props) {
  const { id } = await params;
  redirect(`/learn/surah-quest/${id}`);
}
