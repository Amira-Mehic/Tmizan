// ============================================================================
// Pristup blog objavama u bazi - javno čitanje za posjetioce (Blog, BlogPost)
// i uređivanje za blogger panel. Redovi iz baze dolaze u snake_case obliku, pa
// se ovdje pretvaraju u camelCase koji komponente već očekuju, čime ostatak
// aplikacije ne mora znati kako tabela izgleda.
// ============================================================================

import { supabase } from "./SupaBaseClient";
import { MOCK_POSTS } from "../constants/blog/MOCK_POSTS";

// Mapira DB red (snake_case) u oblik koji komponente već očekuju (camelCase, isti kao MOCK_POSTS)
function rowToPost(row) {
  const authorName = row.author_display_name || row.profiles?.full_name || "Tmizan";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title, titleEn: row.title_en || "",
    excerpt: row.excerpt || "", excerptEn: row.excerpt_en || "",
    content: row.content, contentEn: row.content_en || "",
    thumbnail: row.thumbnail || "",
    video: row.video_url || "",
    author: authorName, authorEn: authorName,
    date: row.created_at ? row.created_at.slice(0, 10) : "",
    category: row.category,
    readTime: row.read_time,
    featured: row.featured,
    published: row.published,
    authorId: row.author_id,
  };
}

// ── Javno čitanje (Blog.jsx, BlogPost.jsx) ─────────────────────────────────
export async function getAllPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, profiles(full_name)")
    .eq("published", true)
    .order("created_at", { ascending: false });
  // Fallback na demo postove dok baza nije popunjena (da se blog vidi popunjen)
  if (error || !data || data.length === 0) {
    if (error) console.warn("getAllPosts (koristim demo postove):", error.message);
    return MOCK_POSTS.filter(p => p.published !== false);
  }
  return data.map(rowToPost);
}

export async function getPostBySlug(slug) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, profiles(full_name)")
    .eq("slug", slug)
    .single();
  // Fallback na demo post (isti razlog kao getAllPosts)
  if (error || !data) return MOCK_POSTS.find(p => p.slug === slug) || null;
  return rowToPost(data);
}

// ── Blogger panel (BloggerDashboard, BloggerPostsList, BloggerPostEditor) ──
export async function getMyPosts(authorId) {
  if (!authorId) return [];
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getMyPosts:", error); return []; }
  return data.map(rowToPost);
}

export async function getPostById(id) {
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();
  if (error) return null;
  return rowToPost(data);
}

export async function savePost(post, authorId) {
  const row = {
    author_id: authorId,
    author_display_name: post.author || null,
    title: post.title,
    title_en: post.titleEn || null,
    slug: post.slug,
    excerpt: post.excerpt || null,
    excerpt_en: post.excerptEn || null,
    content: post.content,
    content_en: post.contentEn || null,
    thumbnail: post.thumbnail || null,
    video_url: post.video || null,
    category: post.category || "sve",
    read_time: post.readTime || 5,
    featured: !!post.featured,
    published: !!post.published,
    updated_at: new Date().toISOString(),
  };

  // post.id postoji i nije privremeni klijentski ID => radi se o postojećem redu u bazi (update)
  const isExisting = post.id && !String(post.id).startsWith("post_");

  if (isExisting) {
    const { data, error } = await supabase.from("blog_posts").update(row).eq("id", post.id).select().single();
    if (error) console.error("savePost update:", error);
    return { data: data ? rowToPost(data) : null, error };
  } else {
    const { data, error } = await supabase.from("blog_posts").insert(row).select().single();
    if (error) console.error("savePost insert:", error);
    return { data: data ? rowToPost(data) : null, error };
  }
}

export async function deletePost(id) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) console.error("deletePost:", error);
  return { error };
}
