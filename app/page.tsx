import { createClient } from "./utils/supabase/server";
import HomeContent from "./components/HomeContent";
import { fetchParticipantCountsByDisciplineIds } from "./utils/disciplineParticipantCounts";

function shuffleArray<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default async function Home() {
  const supabase = await createClient();

  const { data: disciplines } = await supabase.from("disciplines").select("*");
  const list = disciplines ?? [];
  const counts = await fetchParticipantCountsByDisciplineIds(
    list.map((d) => d.id)
  );
  const withParticipantCounts = list.map((d) => ({
    ...d,
    subscribers: counts.get(d.id) ?? 0,
  }));

  return <HomeContent disciplines={shuffleArray(withParticipantCounts)} />;
}
