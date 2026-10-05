-- 0029_homepage_query_rpcs.sql
--
-- Cloudflare Workers allow a limited number of outbound requests per page
-- render (50 on the Free plan), and every Supabase query is one request. The
-- homepage was making ~66: the category shelf alone fired one COUNT query per
-- category (~40) plus one cover query per tile (9), so once the limit was hit
-- the remaining queries failed and sections like the hero mosaic and the
-- category covers came back empty.
--
-- These functions collapse that into a handful of requests. They are plain
-- read-only SQL, SECURITY INVOKER (the default), so row-level security applies
-- exactly as it does for the queries they replace: anon sees active books only.
--
-- Safe to run more than once (create or replace). No tables are touched.

-- ---------------------------------------------------------------------------
-- Active-book counts for many categories at once (was: one COUNT per category).
-- Categories with no active books are simply absent from the result.
-- ---------------------------------------------------------------------------
create or replace function public.category_book_counts(p_category_ids uuid[])
returns table (category_id uuid, book_count bigint)
language sql
stable
set search_path = public
as $$
  select bc.category_id, count(*)::bigint as book_count
  from public.book_categories bc
  join public.books b on b.id = bc.book_id and b.is_active
  where bc.category_id = any(p_category_ids)
  group by bc.category_id;
$$;

-- ---------------------------------------------------------------------------
-- Up to p_per_category cover paths per category, newest books first, only books
-- that actually have an image (was: one query per category tile). Considers
-- the newest p_per_category * 4 books of each category, which leaves plenty of
-- room for books without covers while keeping the work bounded.
-- Rows come back ordered by input category, then rank.
-- ---------------------------------------------------------------------------
create or replace function public.category_cover_paths(p_category_ids uuid[], p_per_category int default 8)
returns table (category_id uuid, storage_path text)
language sql
stable
set search_path = public
as $$
  select ids.cid as category_id, picked.storage_path
  from unnest(p_category_ids) with ordinality as ids(cid, ord)
  cross join lateral (
    select cover.storage_path
    from (
      select b.id, row_number() over (order by b.created_at desc, b.id) as rn
      from public.book_categories bc
      join public.books b on b.id = bc.book_id and b.is_active
      where bc.category_id = ids.cid
      order by b.created_at desc, b.id
      limit greatest(p_per_category, 1) * 4
    ) recent
    cross join lateral (
      select ma.storage_path
      from public.book_images bi
      join public.media_assets ma on ma.id = bi.media_id
      where bi.book_id = recent.id
      order by bi.is_primary desc, bi.sort_order asc
      limit 1
    ) cover
    order by recent.rn
    limit greatest(p_per_category, 1)
  ) picked
  order by ids.ord;
$$;

-- ---------------------------------------------------------------------------
-- A random sample of active books that have a cover, for the homepage hero
-- mosaic (was: four chained queries). p_category_slug limits it to one
-- category plus its direct sub-categories (the hero passes 'sooriya-books' so
-- it only showcases the publisher's own imprint); NULL means the whole
-- catalogue. Truly random per call, hence VOLATILE (supabase-js .rpc() uses
-- POST, which allows that). Picks twice as many random books as asked for,
-- then keeps those that have an image, so it never scans covers for the
-- whole catalogue.
-- ---------------------------------------------------------------------------
create or replace function public.random_book_covers(p_limit int default 24, p_category_slug text default null)
returns table (id uuid, title text, storage_path text)
language sql
volatile
set search_path = public
as $$
  select sample.id, sample.title, cover.storage_path
  from (
    select b.id, b.title
    from public.books b
    where b.is_active
      and (
        p_category_slug is null
        or exists (
          select 1
          from public.book_categories bc
          join public.categories c on c.id = bc.category_id
          left join public.categories parent on parent.id = c.parent_id
          where bc.book_id = b.id
            and (c.slug = p_category_slug or parent.slug = p_category_slug)
        )
      )
    order by random()
    limit greatest(p_limit, 1) * 2
  ) sample
  cross join lateral (
    select ma.storage_path
    from public.book_images bi
    join public.media_assets ma on ma.id = bi.media_id
    where bi.book_id = sample.id
    order by bi.is_primary desc, bi.sort_order asc
    limit 1
  ) cover
  limit greatest(p_limit, 1);
$$;

-- ---------------------------------------------------------------------------
-- Live catalogue totals for the brand-story / about sections in one request
-- (was: two separate COUNT queries).
-- ---------------------------------------------------------------------------
create or replace function public.store_stats()
returns table (book_count bigint, category_count bigint)
language sql
stable
set search_path = public
as $$
  select
    (select count(*) from public.books where is_active),
    (select count(*) from public.categories);
$$;

-- The storefront calls these as the anonymous or signed-in user.
grant execute on function public.category_book_counts(uuid[]) to anon, authenticated;
grant execute on function public.category_cover_paths(uuid[], int) to anon, authenticated;
grant execute on function public.random_book_covers(int, text) to anon, authenticated;
grant execute on function public.store_stats() to anon, authenticated;
