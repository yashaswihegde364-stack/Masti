-- Requires the pgvector extension: https://github.com/pgvector/pgvector
create extension if not exists vector;
create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists verses (
  id bigserial primary key,
  translation text not null,
  book text not null,
  book_order smallint not null,
  chapter smallint not null,
  verse smallint not null,
  text text not null,
  unique (translation, book, chapter, verse)
);

create index if not exists verses_translation_book_chapter
  on verses (translation, book, chapter);

-- Voyage AI's voyage-3 model outputs 1024-dim embeddings.
create table if not exists verse_embeddings (
  verse_id bigint primary key references verses(id) on delete cascade,
  embedding vector(1024) not null
);

create index if not exists verse_embeddings_hnsw
  on verse_embeddings using hnsw (embedding vector_cosine_ops);

-- Curated situation -> passage mapping. For a corpus this small (~31k
-- verses), hand-curated topical anchors meaningfully outperform pure
-- embedding search for emotionally loaded queries ("I cheated on my
-- wife") where the literal words rarely appear in the relevant verses.
create table if not exists topics (
  id serial primary key,
  slug text unique not null,
  label text not null
);

create table if not exists topic_verses (
  topic_id int not null references topics(id) on delete cascade,
  verse_id bigint not null references verses(id) on delete cascade,
  weight real not null default 1.0,
  primary key (topic_id, verse_id)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'free', -- free | active | canceled | past_due
  plan text,                            -- monthly | yearly
  provider text,                        -- stripe | revenuecat | none
  provider_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null, -- user | assistant
  content text not null,
  cited_verse_ids bigint[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  prompt text,
  content text not null,
  linked_verse_ids bigint[] not null default '{}',
  created_at timestamptz not null default now()
);
