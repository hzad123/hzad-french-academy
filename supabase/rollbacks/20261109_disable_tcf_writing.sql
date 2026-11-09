-- Preserve every draft, response, result, wallet entry and existing course.
update academy_ai.activities set enabled=false where kind='tcf-writing';
-- Keep the additive schema for retained student attempts. Revert UI/Edge
-- separately if needed; do not drop tables or remove ledger history.
