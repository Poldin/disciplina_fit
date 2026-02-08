export interface Discipline {
  id: string;
  created_at: string;
  title: string | null;
  short_desc: string | null;
  long_desc: string | null;
  slug: string;
  subscribers: number | null;
  tag: string | null;
  img_url: string | null;
  lenght_days: number | null;
  metadata: Record<string, unknown> | null;
}
