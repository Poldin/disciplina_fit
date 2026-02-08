import { createClient } from "./utils/supabase/server";
import HomeContent from "./components/HomeContent";

export default async function Home() {
  const supabase = await createClient();

  const { data: disciplines } = await supabase
    .from("disciplines")
    .select("*")
    .order("created_at", { ascending: false });

  return <HomeContent disciplines={disciplines || []} />;
}
