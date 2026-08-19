import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// "about" has its own dedicated route (src/app/(storefront)/about) which
// takes precedence over this dynamic segment — only listed here for pages
// still on the generic static-content template.
const ALLOWED_SLUGS = ["privacy", "terms"];

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
  const { data: page } = await supabase.from("static_pages").select("title, body, updated_at").eq("slug", slug).maybeSingle();
  if (!page) notFound();

  // The legacy WordPress source for this content is itself unavailable
  // (confirmed 404 on the live site), so there is no real legal text to
  // migrate yet — this state is shown honestly rather than filled with
  // placeholder legal language.
  const isPending = page.body?.trim() === "Content pending migration from the legacy site.";

  return (
    <div className="container max-w-3xl py-12 md:py-16">
      <h1 className="font-heading text-3xl leading-tight md:text-4xl md:leading-tight">{page.title}</h1>

      {isPending ? (
        <div className="mt-8 flex flex-col items-start gap-3 rounded-lg border border-dashed p-8">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium">This page is being updated</p>
          <p className="text-sm text-muted-foreground">
            Our {page.title.toLowerCase()} content is being finalized and will appear here shortly. In the
            meantime, please{" "}
            <Link href="/contact" className="text-accent hover:underline">
              contact us
            </Link>{" "}
            with any questions.
          </p>
        </div>
      ) : (
        <div className="mt-8 whitespace-pre-line text-muted-foreground">{page.body}</div>
      )}
    </div>
  );
}
