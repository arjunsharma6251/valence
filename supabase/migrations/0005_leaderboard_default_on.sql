-- The weekly board is opt-out for new accounts. Nobody is listed until they
-- also choose a display name (leaderboard_week() requires one), so this
-- changes the default rather than publishing anyone silently. Existing rows
-- are left alone: people who already saw the toggle made their own choice.
alter table profiles alter column public set default true;
