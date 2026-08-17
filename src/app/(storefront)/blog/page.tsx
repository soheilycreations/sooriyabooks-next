import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };
export const revalidate = 3600;

export default async function BlogIndexPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(24);

  return (
    <div className="container py-12">
      <h1 className="mb-8 font-heading text-3xl">Blog</h1>
      {(!posts || posts.length === 0) && <p className="text-muted-foreground">No posts published yet.</p>}
      <div className="grid gap-8 sm:grid-cols-2">
        {(posts ?? []).map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group">
            <h2 className="font-heading text-xl group-hover:text-accent">{post.title}</h2>
            {post.published_at && <p className="mt-1 text-xs text-muted-foreground">{formatDate(post.published_at)}</p>}
            {post.excerpt && <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
