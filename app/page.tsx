import { createClient } from "./utils/supabase/server";
import HomeContent from "./components/HomeContent";

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

  return <HomeContent disciplines={shuffleArray(disciplines ?? [])} />;
}
