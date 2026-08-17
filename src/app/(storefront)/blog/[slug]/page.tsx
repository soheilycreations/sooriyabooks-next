import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return { title: post.seo_title || post.title, description: post.seo_description || post.excerpt || undefined };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="container max-w-3xl py-12">
      <h1 className="font-heading text-3xl">{post.title}</h1>
      {post.published_at && <p className="mt-2 text-sm text-muted-foreground">{formatDate(post.published_at)}</p>}
      <div className="mt-8 whitespace-pre-line text-muted-foreground">{post.body}</div>
    </article>
  );
}
