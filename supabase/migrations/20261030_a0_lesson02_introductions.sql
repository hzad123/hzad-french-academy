-- Lesson 02: polished introductions, bilingual dialogue, tu/vous grammar and five instant-feedback questions.
-- This migration preserves progress and keeps Lesson 02 unpublished until approved.
begin;
update public.academy_units
set title = 'Je m’appelle… | Introducing Yourself',
    minutes = 18,
    content = $lesson$
    {
      "sections":[
        {"heading":"Introduce yourself","items":[
          {"french":"Je m’appelle…","english":"My name is…","usage":"Use to introduce yourself. Example: Je m’appelle Sarah. (My name is Sarah.)"},
          {"french":"Comment tu t’appelles ?","english":"What’s your name?","usage":"Informal singular: ask a friend, child or someone you know well."},
          {"french":"Comment vous vous appelez ?","english":"What’s your name?","usage":"Polite singular or plural: use with a stranger, in formal situations, or with a group."},
          {"french":"Moi, c’est…","english":"I’m… / My name is…","usage":"A natural, conversational way to introduce yourself."},
          {"french":"Enchanté / Enchantée","english":"Nice to meet you","usage":"Use after an introduction. Enchanté is the masculine written form; enchantée is feminine. They sound the same."},
          {"french":"Et toi ? / Et vous ?","english":"And you?","usage":"Use Et toi ? informally; use Et vous ? politely or when speaking to several people."}
        ]},
        {"heading":"Tu or vous?","items":[
          {"french":"Tu","english":"Informal you (one person)","usage":"Use with friends, family, children and people who invite you to use tu."},
          {"french":"Vous","english":"Polite you / plural you","usage":"Use with someone you address formally, or whenever you speak to two or more people."}
        ]},
        {"heading":"Mini dialogue — French and English","dialogue":[
          {"french":"Amira : Bonjour ! Je m’appelle Amira. Et toi ?","english":"Amira: Hello! My name is Amira. And you?"},
          {"french":"Lucas : Moi, c’est Lucas. Enchanté !","english":"Lucas: I’m Lucas. Nice to meet you!"},
          {"french":"Amira : Enchantée !","english":"Amira: Nice to meet you too!"}
        ]},
        {"heading":"Polite introduction — French and English","dialogue":[
          {"french":"— Bonjour, comment vous vous appelez ?","english":"— Hello, what is your name? (polite)"},
          {"french":"— Je m’appelle Madame Martin. Et vous ?","english":"— My name is Ms. Martin. And you?"},
          {"french":"— Je m’appelle Alex. Enchanté !","english":"— My name is Alex. Nice to meet you!"}
        ]}
      ],
      "vocabulary":[
        ["Je m’appelle","My name is"],["Comment tu t’appelles ?","What is your name? (informal)"],
        ["Comment vous vous appelez ?","What is your name? (polite/plural)"],
        ["Moi, c’est…","I’m… / My name is…"],["Enchanté","Nice to meet you (masculine)"],
        ["Enchantée","Nice to meet you (feminine)"],["Et toi ?","And you? (informal)"],
        ["Et vous ?","And you? (polite/plural)"]
      ]
    }$lesson$::jsonb,
    quiz = $quiz$
    [
      {"id":"i1","type":"choice","prompt":"How do you say “My name is Léa”?","options":["Je suis appelle Léa","Je m’appelle Léa","Tu t’appelles Léa"],"answer":1,"explanation":"Je m’appelle means ‘My name is.’ Je suis appelle is not correct French; tu t’appelles means ‘your name is’ when speaking to someone."},
      {"id":"i2","type":"choice","prompt":"Which question is more polite when meeting an adult stranger?","options":["Comment vous vous appelez ?","Comment tu t’appelles ?","Et toi ?"],"answer":0,"explanation":"Vous is used for polite address and when speaking to multiple people. Tu is informal and singular."},
      {"id":"i3","type":"choice","prompt":"What does « Et toi ? » mean?","options":["Good evening","And you?","Thank you"],"answer":1,"explanation":"Et toi ? means ‘And you?’ when speaking informally to one person. In polite or plural situations, say Et vous ?"},
      {"id":"i4","type":"choice","prompt":"You are speaking to two people. Which word for ‘you’ should you use?","options":["Tu","Vous","Moi"],"answer":1,"explanation":"Vous is always used when addressing two or more people, whether the conversation is formal or informal."},
      {"id":"i5","type":"choice","prompt":"Lucas says « Moi, c’est Lucas. » What does he mean?","options":["My name is Lucas","Where is Lucas?","Goodbye, Lucas"],"answer":0,"explanation":"Moi, c’est Lucas is a natural conversational introduction meaning ‘I’m Lucas’ or ‘My name is Lucas.’"}
    ]$quiz$::jsonb
where id = 'a0-02';
-- No change to published flag. Review before publishing.
commit;
select id,title,minutes,published,jsonb_array_length(quiz) as questions
from public.academy_units where id='a0-02';
