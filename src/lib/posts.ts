import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export const getPosts = async () => (await getCollection('posts', ({ data }) => !data.draft))
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
export const postUrl = (post: Post) => `/posts/${post.id}/`;
export const tagUrl = (tag: string) => `/tags/${encodeURIComponent(tag)}/`;
export const formatDate = (date: Date) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai',
}).format(date).replaceAll('/', '.');
export function readingStats(body = '') {
  const text = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\]\([^\n)]*\)/g, ']')
    .replace(/https?:\/\/[^\s<>`）]+/g, '');
  const chinese = (text.match(/\p{Script=Han}/gu) || []).length;
  const words = (text.match(/[a-zA-Z0-9]+/g) || []).length;
  return {
    wordCount: chinese + words,
    minutes: Math.max(1, Math.ceil(chinese / 350 + words / 200)),
  };
}
