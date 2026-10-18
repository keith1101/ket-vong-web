import React, { useState, useEffect } from 'react';
import { fetchPublicPosts } from '../api';
import type { Post } from '../types';
import {
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { DoodleStar, SparkleDoodle, DoodleHeart } from '../components/DoodleDecorations';

interface PostsPageProps {
  navigate: (path: string) => void;
}

export const PostsPage: React.FC<PostsPageProps> = ({ navigate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'Hoạt động', label: 'Hoạt Động Workshop' },
    { id: 'Thông báo', label: 'Thông Báo & Tin Tức' },
    { id: 'Câu chuyện bé', label: 'Câu Chuyện Các Bé' },
  ];

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await fetchPublicPosts(currentPage, 6, selectedCategory);
      setPosts(data.items);
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      console.error('Lỗi tải bài viết:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [currentPage, selectedCategory]);

  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Hero Header */}
      <div className="text-center relative max-w-2xl mx-auto space-y-4">
        {/* Doodles trang trí */}
        <div className="hidden sm:block absolute -top-4 -left-12 pointer-events-none">
          <DoodleStar className="w-8 h-8 text-[#FFC20E]" />
        </div>
        <div className="hidden sm:block absolute top-6 -right-12 pointer-events-none">
          <SparkleDoodle className="w-7 h-7 text-[#D81B7A]" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] text-xs font-bold uppercase tracking-wider font-display">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Nhật Ký Hành Trình</span>
        </div>

        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--kv-ink)] tracking-tight">
          Tin Tức & Hoạt Động Kết Vòng
        </h1>

        <p className="text-sm sm:text-base text-[var(--kv-text-soft)] font-body leading-relaxed">
          Nơi lưu giữ từng câu chuyện, nụ cười và dấu ấn của các em nhỏ tại Ngôi nhà chung Ba Thùy cùng sự sẻ chia của cộng đồng.
        </p>
      </div>

      {/* Bộ lọc chuyên mục & Tìm kiếm */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface)] p-3 sm:p-4 rounded-3xl border border-[var(--color-border)] shadow-xs">
        {/* Tabs chuyên mục */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold font-display transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[var(--kv-ink)] text-white shadow-xs'
                  : 'text-[var(--kv-text-soft)] hover:bg-[var(--kv-blue-bg)] hover:text-[var(--kv-ink)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl border border-[var(--color-border)] text-xs focus:outline-none focus:border-[var(--kv-ink)] bg-white/80"
          />
        </div>
      </div>

      {/* Danh sách bài viết dạng lưới Card Crayon */}
      {loading ? (
        <div className="py-24 text-center text-xs text-[var(--kv-text-soft)] space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--kv-pink)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Đang tải bài viết...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-[var(--color-border)] p-8 space-y-3">
          <FileText className="w-10 h-10 mx-auto text-gray-300" />
          <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">Chưa có bài viết nào</h3>
          <p className="text-xs text-[var(--kv-text-soft)] max-w-sm mx-auto">
            Hiện chưa có bài viết nào trong danh mục này hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => navigate(`/bai-viet/${post.slug}`)}
              className="group bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Ảnh bìa */}
              <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                <img
                  src={post.cover_image || '/images/coming-soon.png'}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/coming-soon.png';
                  }}
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold font-display bg-[var(--kv-paper)]/95 backdrop-blur-xs text-[var(--kv-ink)] shadow-xs">
                  {post.category}
                </span>
              </div>

              {/* Thông tin bài viết */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--kv-text-soft)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[var(--kv-orange)]" />
                      {new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[var(--kv-blue-fg)]" />
                      {post.author_name}
                    </span>
                  </div>

                  <h2 className="font-display font-bold text-lg text-[var(--kv-ink)] group-hover:text-[var(--kv-pink)] transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h2>

                  <p className="text-xs text-[var(--kv-text-soft)] line-clamp-3 leading-relaxed font-body">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-1 text-xs font-bold text-[var(--kv-pink)] font-display group-hover:translate-x-1 transition-transform">
                  <span>Đọc bài viết</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2.5 rounded-xl border border-[var(--color-border)] text-[var(--kv-ink)] hover:bg-white transition-colors disabled:opacity-40"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-4 py-2 rounded-xl bg-white border border-[var(--color-border)] text-xs font-bold font-display">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2.5 rounded-xl border border-[var(--color-border)] text-[var(--kv-ink)] hover:bg-white transition-colors disabled:opacity-40"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
