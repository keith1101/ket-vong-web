import { Hono } from 'hono';
import { getDb } from '../db.js';
import type { Post } from '@ketvong/db';

export const postsRoutes = new Hono();

// GET /api/v1/posts - Danh sách bài viết công khai (chỉ lấy bài đã xuất bản)
postsRoutes.get('/', async (c) => {
  try {
    const db = getDb();
    const page = Math.max(1, Number(c.req.query('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || '10')));
    const offset = (page - 1) * limit;
    const category = c.req.query('category');

    let countSql = "SELECT COUNT(*) as total FROM posts WHERE status = 'published'";
    let querySql = "SELECT * FROM posts WHERE status = 'published'";
    const countParams: unknown[] = [];
    const queryParams: unknown[] = [];

    if (category && category !== 'all') {
      countSql += ' AND category = ?';
      querySql += ' AND category = ?';
      countParams.push(category);
      queryParams.push(category);
    }

    querySql += ' ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const countRow = await db.queryOne<{ total: number }>(countSql, countParams);
    const totalItems = countRow?.total || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const items = await db.query<Post>(querySql, queryParams);

    return c.json({
      success: true,
      data: {
        items,
        pagination: {
          current_page: page,
          per_page: limit,
          total_items: totalItems,
          total_pages: totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error('[Public Posts] Lỗi tải danh sách bài viết:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Không thể tải danh sách bài viết.',
        },
      },
      500
    );
  }
});

// GET /api/v1/posts/:slug - Chi tiết bài viết công khai
postsRoutes.get('/:slug', async (c) => {
  try {
    const db = getDb();
    const slug = c.req.param('slug');

    const post = await db.queryOne<Post>(
      "SELECT * FROM posts WHERE (slug = ? OR id = ?) AND status = 'published'",
      [slug, slug]
    );

    if (!post) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy bài viết hoặc bài viết chưa được xuất bản.',
          },
        },
        404
      );
    }

    // Lấy thêm 3 bài viết liên quan (cùng chuyên mục hoặc mới nhất, khác bài hiện tại)
    const relatedPosts = await db.query<Post>(
      "SELECT id, slug, title, excerpt, cover_image, category, published_at FROM posts WHERE status = 'published' AND id != ? ORDER BY published_at DESC LIMIT 3",
      [post.id]
    );

    return c.json({
      success: true,
      data: {
        post,
        relatedPosts,
      },
    });
  } catch (error: any) {
    console.error('[Public Posts] Lỗi xem chi tiết bài viết:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Không thể tải nội dung bài viết.',
        },
      },
      500
    );
  }
});
