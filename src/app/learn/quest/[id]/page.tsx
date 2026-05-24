import { QuestSession } from "@/components/QuestSession";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuestPage({ params }: Props) {
  const { id } = await params;
  const num = parseInt(id, 10);

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div className="max-w-screen-xl mx-auto px-4">
        <QuestSession surahNumber={num} />
      </div>
    </div>
  );
}
