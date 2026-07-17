-- The first changelog diff keyed proposals by title only, so resubmissions
-- sharing a title (two Coinholder "Unstoppable Wallet" rows) collapsed into
-- one key whose status flapped with SELECT order, producing phantom entries.
-- Wipe the feed; the fixed key (link/date discriminator) repopulates it with
-- real changes only.
DELETE FROM "zcg_changelog";
