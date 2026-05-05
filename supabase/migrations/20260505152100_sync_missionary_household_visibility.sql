-- Missionary Household is now the admin source of truth for public visibility.
-- Keep the legacy public_visible column aligned so existing RLS policies and
-- public queries continue to hide profiles when the feature toggle is off.
update public.missionary_households
set show_household = coalesce(public_visible, true),
    public_visible = coalesce(public_visible, true),
    updated_at = now()
where show_household is distinct from coalesce(public_visible, true)
   or public_visible is null;
