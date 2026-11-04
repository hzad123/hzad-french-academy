-- Upgrade the published A0 greeting lesson without touching quiz answers or progress.
-- Run once in the existing Supabase project's SQL Editor.
update public.academy_units
set content = jsonb_set(
  content - 'objectives',
  '{sections}',
  $sections$[
    {
      "heading":"How to greet someone",
      "items":[
        {"french":"Bonjour","english":"Hello / Good day","usage":"Use during the day. A polite greeting for teachers, strangers and friends."},
        {"french":"Bonsoir","english":"Good evening","usage":"Use when greeting someone in the evening."},
        {"french":"Salut","english":"Hi / Bye","usage":"Informal. Use with friends and people you know well."},
        {"french":"Au revoir","english":"Goodbye","usage":"A polite way to say goodbye when leaving."}
      ]
    },
    {
      "heading":"Mini dialogue — French and English",
      "dialogue":[
        {"french":"— Bonjour ! Comment ça va ?","english":"— Hello! How are you?"},
        {"french":"— Ça va bien, merci. Et vous ?","english":"— I'm doing well, thank you. And you? (formal)"},
        {"french":"— Très bien, merci. Au revoir !","english":"— Very well, thank you. Goodbye!"}
      ]
    }
  ]$sections$::jsonb
)
where id = 'a0-01';
select id,title,content->'sections' as sections from public.academy_units where id='a0-01';
