# RoboClub Drive

A cloud-based file sharing platform built for RoboClub members. Upload, preview, and share files across devices — powered by Supabase.

## Features

- 📁 File & folder management with drag-and-drop upload
- 🔍 Search across all files
- 👁️ Live previews — images, code files, 3D STL models
- 📦 Download folders as ZIP
- 🔗 One-click share links (direct Supabase public URLs)
- 🌙 Dark / light theme
- 📱 Mobile responsive with slide-in sidebar
- 🔐 Auth system — guests can browse & download, accounts required to upload
- 🛡️ Ownership-based permissions — only the uploader can rename/delete their files
- 👑 Admin account with full control over all content

## Tech Stack

- Vanilla JS (ES Modules) — no framework
- Supabase — storage + PostgreSQL + auth
- Three.js — 3D STL preview
- JSZip — folder downloads
- Lucide Icons

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) and run this in the SQL Editor:

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id TEXT DEFAULT 'root',
  file_size BIGINT DEFAULT 0,
  file_type TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  download_url TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  user_id UUID
);

ALTER TABLE items DISABLE ROW LEVEL SECURITY;
```

Then create a public Storage bucket named `roboclub-drive`.

### 2. Config

Edit `js/config.js`:

```js
export const supabaseConfig = {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_ANON_KEY',
    bucket: 'roboclub-drive',
    adminEmail: 'your@admin.email'
};
```

### 3. Deploy

Works with any static host — GitHub Pages, Vercel, Cloudflare Pages.

## License

MIT
