import React, { useState, useEffect } from 'react';
import { fetchPublicPostDetail } from '../api';
import type { Post } from '../types';
import {
  Calendar,
  User,
  ArrowLeft,
  Share2,
  Check,
  BookOpen,
  Sparkles,
  ArrowRight,
  Heart,
} from 'lucide-react';
import { DoodleHeart, DoodleStar } from '../components/DoodleDecorations';
import { MarkdownContent } from '../components/MarkdownContent';

interface PostDetailPageProps {
  slug: string;
  navigate: (path: string) => void;
}

export const PostDetailPage: React.FC<PostDetailPageProps> = ({ slug, navigate }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPublicPostDetail(slug)
      .then((data) => {
        setPost(data.post);
        setRelatedPosts(data.relatedPosts || []);
      })
      .catch((err) => {
        setError(err.message || 'Không tìm thấy bài viết');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.excerpt,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };



  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-[var(--kv-pink)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[var(--kv-text-soft)]">Đang tải bài viết...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="font-display font-bold text-xl text-[var(--kv-ink)]">
          Không tìm thấy bài viết
        </h2>
        <p className="text-xs text-[var(--kv-text-soft)]">
          Bài viết có thể chưa được xuất bản hoặc đường dẫn không chính xác.
        </p>
        <button
          onClick={() => navigate('/bai-viet')}
          className="kv-btn kv-btn--primary px-5 py-2.5 rounded-2xl text-xs font-bold font-display inline-flex items-center gap-2 mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về danh sách bài viết</span>
        </button>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8">
      {/* Nút quay lại & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/bai-viet')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--kv-text-soft)] hover:text-[var(--kv-ink)] transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tất cả bài viết</span>
        </button>

        <button
          onClick={handleShare}
          className="px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] hover:bg-white text-xs font-bold text-[var(--kv-ink)] transition-all flex items-center gap-1.5 shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã sao chép link!' : 'Chia sẻ'}</span>
        </button>
      </div>

      {/* Header bài viết */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-full text-xs font-bold font-display bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)]">
            {post.category}
          </span>
          <span className="text-xs text-[var(--kv-text-soft)] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--kv-orange)]" />
            {new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-xs text-[var(--kv-text-soft)] flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-[var(--kv-blue-fg)]" />
            {post.author_name}
          </span>
        </div>

        <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-[var(--kv-ink)] leading-tight tracking-tight">
          {post.title}
        </h1>

        <p className="text-sm sm:text-base text-[var(--kv-text-soft)] leading-relaxed italic border-l-4 border-[var(--kv-yellow)] pl-4 py-1">
          {post.excerpt}
        </p>
      </header>

      {/* Ảnh bìa lớn */}
      {post.cover_image && (
        <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-sm bg-gray-100">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/coming-soon.png';
            }}
          />
        </div>
      )}

      {/* Nội dung bài viết */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[var(--color-border)] shadow-xs">
        <MarkdownContent content={post.content_markdown} />

        {/* Footer kêu gọi trong bài */}
        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--kv-paper)] p-6 rounded-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-display font-bold text-sm text-[var(--kv-ink)] flex items-center gap-1.5 justify-center sm:justify-start">
              <Heart className="w-4 h-4 text-[var(--kv-pink)] fill-current" />
              <span>Chung tay cùng Dự án Kết Vòng</span>
            </h4>
            <p className="text-xs text-[var(--kv-text-soft)]">
              Mỗi sự đóng góp là một chiếc vòng tay kết thêm niềm hy vọng cho các em nhỏ.
            </p>
          </div>

          <button
            onClick={() => navigate('/ung-ho')}
            className="kv-btn kv-btn--primary px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xs shrink-0 font-display flex items-center gap-1.5"
          >
            <span>Ủng hộ ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Các bài viết liên quan */}
      {relatedPosts.length > 0 && (
        <section className="space-y-6 pt-8">
          <h3 className="font-display font-bold text-xl text-[var(--kv-ink)]">
            Bài Viết Cùng Hành Trình
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedPosts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  navigate(`/bai-viet/${rel.slug}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer p-4 space-y-3"
              >
                <div className="h-32 rounded-xl bg-gray-100 overflow-hidden">
                  <img
                    src={rel.cover_image || '/images/coming-soon.png'}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/coming-soon.png';
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--kv-pink)] uppercase tracking-wider">
                    {rel.category}
                  </span>
                  <h4 className="font-display font-bold text-xs text-[var(--kv-ink)] line-clamp-2 group-hover:text-[var(--kv-pink)] transition-colors">
                    {rel.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
