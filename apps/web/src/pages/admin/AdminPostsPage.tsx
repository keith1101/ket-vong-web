import React, { useState, useEffect } from 'react';
import {
  adminGetPosts,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
} from '../../api';
import type { Post, PostStatus } from '../../types';
import { MarkdownContent } from '../../components/MarkdownContent';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Calendar,
  User,
  Upload,
  Link as LinkIcon,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  Quote,
} from 'lucide-react';

export const AdminPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [category, setCategory] = useState('Hoạt động');
  const [status, setStatus] = useState<PostStatus>('published');
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete confirmation modal state
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await adminGetPosts();
      setPosts(data);
    } catch (err: any) {
      console.error('Lỗi tải danh sách bài viết:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContentMarkdown('');
    setCoverImage('/images/coming-soon.png');
    setImageInputMode('upload');
    setCategory('Hoạt động');
    setStatus('published');
    setPreviewTab('edit');
    setFeedbackMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (post: Post) => {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContentMarkdown(post.content_markdown);
    setCoverImage(post.cover_image || '');
    setImageInputMode(post.cover_image && post.cover_image.startsWith('data:') ? 'upload' : 'url');
    setCategory(post.category);
    setStatus(post.status);
    setPreviewTab('edit');
    setFeedbackMsg(null);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) {
      // Auto-generate clean slug from title
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(autoSlug);
    }
  };

  const handleImageFileChange = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa là 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('post-markdown-editor') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = prefix + (selected || 'nội dung') + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContentMarkdown(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 7));
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (!contentMarkdown.trim()) {
      alert('Vui lòng nhập nội dung bài viết.');
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    const postPayload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content_markdown: contentMarkdown.trim(),
      cover_image: coverImage.trim() || null,
      category: category.trim(),
      status,
    };

    try {
      if (editingPost) {
        await adminUpdatePost(editingPost.id, postPayload);
        setFeedbackMsg({ type: 'success', text: 'Đã cập nhật bài viết thành công!' });
      } else {
        await adminCreatePost(postPayload);
        setFeedbackMsg({ type: 'success', text: 'Đã đăng bài viết mới thành công!' });
      }
      await loadPosts();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 700);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Lỗi khi lưu bài viết' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    setDeleting(true);
    try {
      await adminDeletePost(deletingPost.id);
      setDeletingPost(null);
      await loadPosts();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bài viết');
    } finally {
      setDeleting(false);
    }
  };



  const filteredPosts = posts.filter((p) => {
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.excerpt.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thống kê nhanh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[var(--kv-ink)] flex items-center gap-2">
            <span>Quản Lý Bài Viết & Hoạt Động</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)]">
              {posts.length} bài
            </span>
          </h2>
          <p className="text-xs text-[var(--kv-text-soft)] mt-1 font-body">
            Đăng tải tin tức, cập nhật tiến độ và câu chuyện hoạt động thiện nguyện của Kết Vòng.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="kv-btn kv-btn--primary px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm shrink-0 font-display font-bold text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Soạn Bài Viết Mới</span>
        </button>
      </div>

      {/* Thẻ thống kê tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[var(--kv-text-soft)] uppercase tracking-wider">Tổng Bài Viết</div>
            <div className="text-2xl font-display font-black text-[var(--kv-ink)] mt-0.5">{posts.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-green-600 uppercase tracking-wider">Đã Xuất Bản</div>
            <div className="text-2xl font-display font-black text-green-700 mt-0.5">{publishedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Bản Nháp</div>
            <div className="text-2xl font-display font-black text-amber-700 mt-0.5">{draftCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm & lọc */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Bộ lọc tab */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-colors ${
              filterStatus === 'all'
                ? 'bg-[var(--kv-ink)] text-white'
                : 'text-[var(--kv-text-soft)] hover:bg-gray-100'
            }`}
          >
            Tất cả ({posts.length})
          </button>
          <button
            onClick={() => setFilterStatus('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-colors ${
              filterStatus === 'published'
                ? 'bg-green-600 text-white'
                : 'text-[var(--kv-text-soft)] hover:bg-green-50 hover:text-green-700'
            }`}
          >
            Đã đăng ({publishedCount})
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-colors ${
              filterStatus === 'draft'
                ? 'bg-amber-600 text-white'
                : 'text-[var(--kv-text-soft)] hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            Bản nháp ({draftCount})
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, chuyên mục..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border)] text-xs focus:outline-none focus:border-[var(--kv-ink)] bg-gray-50/50"
          />
        </div>
      </div>

      {/* Danh sách bài viết */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--kv-text-soft)]">Đang tải danh sách bài viết...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--kv-text-soft)] space-y-2">
            <FileText className="w-8 h-8 mx-auto text-gray-300" />
            <p>Không có bài viết nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors"
              >
                {/* Ảnh bìa + Nội dung tiêu đề */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 relative group">
                    {post.cover_image ? (
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/coming-soon.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-display bg-[var(--kv-blue-bg)] text-[var(--kv-blue-fg)]">
                        {post.category}
                      </span>
                      {post.status === 'published' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          Đã xuất bản
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Bản nháp
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm text-[var(--kv-ink)] line-clamp-2 leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-xs text-[var(--kv-text-soft)] line-clamp-1">
                      {post.excerpt}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(post.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {post.author_name}
                      </span>
                      <span className="text-gray-300 font-mono text-[10px]">
                        /{post.slug}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Các nút thao tác */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {post.status === 'published' && (
                    <a
                      href={`/bai-viet/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-gray-500 hover:text-[var(--kv-ink)] hover:bg-gray-100 transition-colors"
                      title="Xem bài viết trên web"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => openEditModal(post)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-[var(--kv-ink)] hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sửa</span>
                  </button>

                  <button
                    onClick={() => setDeletingPost(post)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                    title="Xóa bài viết"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL SOẠN / CHỈNH SỬA BÀI VIẾT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[var(--color-border)] my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--kv-pink-bg)] text-[var(--kv-pink-fg)] flex items-center justify-center font-display font-bold">
                  {editingPost ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[var(--kv-ink)]">
                    {editingPost ? 'Chỉnh Sửa Bài Viết' : 'Soạn Bài Viết Mới'}
                  </h3>
                  <p className="text-[11px] text-[var(--kv-text-soft)]">
                    Nội dung hỗ trợ Markdown và xem trước thời gian thực
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    feedbackMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* 1. Tiêu đề bài viết */}
              <div>
                <label className="block text-xs font-bold text-[var(--kv-ink)] mb-1 font-display">
                  Tiêu đề bài viết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nụ cười ngày workshop xâu vòng tay tại Ngôi nhà chung Ba Thùy"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[var(--kv-ink)]"
                />
              </div>

              {/* 2. Đường dẫn thân thiện (Slug) & Chuyên mục */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--kv-ink)] mb-1 font-display">
                    Đường dẫn thân thiện (Slug)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="nu-cuoi-ngay-workshop"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:border-[var(--kv-ink)]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Đường dẫn xem bài: /bai-viet/{slug || '...'}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--kv-ink)] mb-1 font-display">
                    Chuyên mục
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[var(--kv-ink)] bg-white"
                  >
                    <option value="Hoạt động">Hoạt động workshop</option>
                    <option value="Thông báo">Thông báo & Tin tức</option>
                    <option value="Câu chuyện bé">Câu chuyện các bé</option>
                    <option value="Minh bạch">Báo cáo & Minh bạch</option>
                  </select>
                </div>
              </div>

              {/* 3. Ảnh bìa đại diện (Cover Image) */}
              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--kv-ink)] font-display flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[var(--kv-pink)]" />
                    <span>Ảnh bìa bài viết (Cover image)</span>
                  </label>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                        imageInputMode === 'upload' ? 'bg-[var(--kv-ink)] text-white' : 'text-gray-500'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Tải file ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                        imageInputMode === 'url' ? 'bg-[var(--kv-ink)] text-white' : 'text-gray-500'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Dán link ảnh</span>
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleImageFileChange(e.target.files?.[0])}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--kv-pink-bg)] file:text-[var(--kv-pink-fg)] hover:file:bg-[var(--kv-pink)] hover:file:text-white file:transition-colors cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-400 block">Định dạng JPG, PNG, WebP (Tối đa 5MB)</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="https://example.com/anh-bia.jpg hoặc /images/workshop-1.jpg"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[var(--kv-ink)] bg-white"
                  />
                )}

                {coverImage && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group">
                    <img src={coverImage} alt="Xem trước ảnh bìa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Xóa ảnh bìa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Đoạn tóm tắt (Excerpt) */}
              <div>
                <label className="block text-xs font-bold text-[var(--kv-ink)] mb-1 font-display">
                  Đoạn tóm tắt ngắn (Excerpt)
                </label>
                <textarea
                  rows={2}
                  placeholder="Đoạn tóm tắt ngắn 1-2 câu hiển thị ở danh sách bài viết ngoài trang chủ..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[var(--kv-ink)]"
                />
              </div>

              {/* 5. Nội dung chi tiết Markdown + Toolbar + Preview Tab */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <label className="text-xs font-bold text-[var(--kv-ink)] font-display flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Nội dung bài viết (Markdown) *</span>
                  </label>

                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('edit')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        previewTab === 'edit' ? 'bg-white shadow-xs text-[var(--kv-ink)]' : 'text-gray-500'
                      }`}
                    >
                      Soạn thảo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('preview')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        previewTab === 'preview' ? 'bg-white shadow-xs text-[var(--kv-ink)]' : 'text-gray-500'
                      }`}
                    >
                      Xem trước
                    </button>
                  </div>
                </div>

                {previewTab === 'edit' ? (
                  <div className="space-y-2">
                    {/* Markdown Quick Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                      <button
                        type="button"
                        onClick={() => insertMarkdown('## ')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="Tiêu đề H2"
                      >
                        <Heading2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('### ')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="Tiêu đề H3"
                      >
                        <Heading3 className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-[1px] h-4 bg-gray-300 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => insertMarkdown('**', '**')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="In đậm"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('*', '*')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="In nghiêng"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('> ')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="Trích dẫn"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('- ')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="Danh sách"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('![Mô tả ảnh](', ')')}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-700"
                        title="Chèn ảnh"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      id="post-markdown-editor"
                      rows={10}
                      required
                      placeholder="## Tiêu đề phụ&#10;&#10;Nội dung chia sẻ về hoạt động workshop...&#10;&#10;![Hình ảnh hoạt động](/images/workshop-1.jpg)"
                      value={contentMarkdown}
                      onChange={(e) => setContentMarkdown(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-[var(--kv-ink)]"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-gray-200 min-h-[240px] max-h-96 overflow-y-auto bg-gray-50/50">
                    {contentMarkdown ? (
                      <MarkdownContent content={contentMarkdown} />
                    ) : (
                      <p className="text-xs text-gray-400 italic">Chưa có nội dung soạn thảo để xem trước.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Trạng thái xuất bản */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--kv-ink)] font-display">Trạng thái xuất bản</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="post_status"
                      value="published"
                      checked={status === 'published'}
                      onChange={() => setStatus('published')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-green-700">Xuất bản ngay</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="post_status"
                      value="draft"
                      checked={status === 'draft'}
                      onChange={() => setStatus('draft')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-amber-700">Lưu bản nháp</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="kv-btn kv-btn--primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{editingPost ? 'Lưu Thay Đổi' : (status === 'published' ? 'Đăng Bài Viết Ngay' : 'Lưu Bản Nháp')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BÀI VIẾT */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-border)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg text-[var(--kv-ink)]">
                Xác nhận xóa bài viết?
              </h3>
              <p className="text-xs text-[var(--kv-text-soft)]">
                Bạn có chắc chắn muốn xóa bài viết <strong className="text-[var(--kv-ink)]">"{deletingPost.title}"</strong> không? Hành động này sẽ được ghi vào nhật ký hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPost(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
