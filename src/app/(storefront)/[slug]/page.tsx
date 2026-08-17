import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SLUGS = ["about", "privacy", "terms"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!ALLOWED_SLUGS.includes(slug)) return {};
  const supabase = await createClient();
  const { data: page } = await supabase.from("static_pages").select("title, seo_title, seo_description").eq("slug", slug).maybeSingle();
  if (!page) return {};
  return { title: page.seo_title || page.title, description: page.seo_description || undefined };
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ALLOWED_SLUGS.includes(slug)) notFound();

  const supabase = await createClient();
  const { data: page } = await supabase.from("static_pages").select("title, body").eq("slug", slug).maybeSingle();
  if (!page) notFound();

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="mb-6 font-heading text-3xl">{page.title}</h1>
      <div className="whitespace-pre-line text-muted-foreground">{page.body}</div>
    </div>
  );
}
