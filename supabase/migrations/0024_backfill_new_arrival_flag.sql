-- 0024_backfill_new_arrival_flag.sql
-- Sets `books.is_new_arrival = true` for every book real-tagged into the
-- "New Arrivals" category (slug new-arrivals) migrated from the legacy
-- site — that category membership is genuine historical data, not a
-- guess. `is_new_arrival` had been sitting at false for every one of the
-- 4,820 books: nobody had ever connected the two, and "most recently
-- created" isn't a usable substitute here since the whole catalog was
-- created within the same ~42-minute migration run, not real add dates.

update public.books
set is_new_arrival = true
where id in (
  select bc.book_id
  from public.book_categories bc
  join public.categories c on c.id = bc.category_id
  where c.slug = 'new-arrivals'
);
