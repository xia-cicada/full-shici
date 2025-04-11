-- 创建分类表（带拼音字段）
CREATE TABLE
  IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- 分类名称（如"唐诗"、"宋词"）
    name_pinyin TEXT, -- 分类名称拼音（如 "tang shi song shi"）
    name_initials TEXT, -- 分类名称首字母（如 "tsss"）
    description TEXT, -- 分类描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- 创建诗词主表（带拼音字段）
CREATE TABLE
  IF NOT EXISTS poetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL, -- 分类ID（外键）
    title TEXT NOT NULL, -- 题目
    title_pinyin TEXT, -- 题目拼音
    title_initials TEXT, -- 题目首字母
    rhythmic TEXT, -- 词牌名（宋词专用）
    rhythmic_pinyin TEXT, -- 词牌名拼音
    rhythmic_initials TEXT, -- 词牌名首字母
    author TEXT NOT NULL, -- 作者
    author_pinyin TEXT, -- 作者拼音
    author_initials TEXT, -- 作者首字母
    paragraphs TEXT NOT NULL DEFAULT '[]', -- 存储为JSON数组
    notes TEXT DEFAULT '[]', -- 存储为JSON数组（注释/注解）
    tags TEXT DEFAULT '[]', -- 存储为JSON数组（标签）
    extra_info TEXT DEFAULT '{}', -- 存储其他特殊字段的JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 外键约束
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    -- 确保category_id是有效的
    CHECK (category_id > 0)
  );

-- 创建全文搜索虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS poetry_search USING fts5 (
  title,
  author,
  rhythmic,
  title_pinyin,
  author_pinyin,
  rhythmic_pinyin,
  title_initials,
  author_initials,
  rhythmic_initials,
  content = poetry,
  content_rowid = id
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_poetry_category ON poetry (category_id);

CREATE INDEX IF NOT EXISTS idx_poetry_author ON poetry (author);

CREATE INDEX IF NOT EXISTS idx_poetry_title ON poetry (title);

CREATE INDEX IF NOT EXISTS idx_poetry_rhythmic ON poetry (rhythmic);

-- 拼音相关索引
CREATE INDEX IF NOT EXISTS idx_categories_name_pinyin ON categories (name_pinyin);

CREATE INDEX IF NOT EXISTS idx_categories_name_initials ON categories (name_initials);

CREATE INDEX IF NOT EXISTS idx_poetry_title_pinyin ON poetry (title_pinyin);

CREATE INDEX IF NOT EXISTS idx_poetry_title_initials ON poetry (title_initials);

CREATE INDEX IF NOT EXISTS idx_poetry_author_pinyin ON poetry (author_pinyin);

CREATE INDEX IF NOT EXISTS idx_poetry_author_initials ON poetry (author_initials);

CREATE INDEX IF NOT EXISTS idx_poetry_rhythmic_pinyin ON poetry (rhythmic_pinyin);

CREATE INDEX IF NOT EXISTS idx_poetry_rhythmic_initials ON poetry (rhythmic_initials);

-- 创建触发器保持数据同步
CREATE TRIGGER IF NOT EXISTS poetry_ai AFTER INSERT ON poetry BEGIN
INSERT INTO
  poetry_search (
    rowid,
    title,
    author,
    rhythmic,
    title_pinyin,
    author_pinyin,
    rhythmic_pinyin,
    title_initials,
    author_initials,
    rhythmic_initials
  )
VALUES
  (
    new.id,
    new.title,
    new.author,
    new.rhythmic,
    new.title_pinyin,
    new.author_pinyin,
    new.rhythmic_pinyin,
    new.title_initials,
    new.author_initials,
    new.rhythmic_initials
  );

END;

CREATE TRIGGER IF NOT EXISTS poetry_ad AFTER DELETE ON poetry BEGIN
DELETE FROM poetry_search
WHERE
  rowid = old.id;

END;

CREATE TRIGGER IF NOT EXISTS poetry_au AFTER
UPDATE ON poetry BEGIN
DELETE FROM poetry_search
WHERE
  rowid = old.id;

INSERT INTO
  poetry_search (
    rowid,
    title,
    author,
    rhythmic,
    title_pinyin,
    author_pinyin,
    rhythmic_pinyin,
    title_initials,
    author_initials,
    rhythmic_initials
  )
VALUES
  (
    new.id,
    new.title,
    new.author,
    new.rhythmic,
    new.title_pinyin,
    new.author_pinyin,
    new.rhythmic_pinyin,
    new.title_initials,
    new.author_initials,
    new.rhythmic_initials
  );

END;

-- 初始化基本分类数据（带拼音）
INSERT
OR IGNORE INTO categories (id, name, name_pinyin, name_initials, description)
VALUES
  (
    1,
    '唐诗/宋诗',
    'tang shi song shi',
    'tsss',
    '全唐诗 & 全宋诗'
  ),
  (2, '宋词', 'song ci', 'sc', '全宋词'),
  (3, '元曲', 'yuan qu', 'yq', '元曲'),
  (4, '诗经', 'shi jing', 'sj', '诗经'),
  (5, '楚辞', 'chu ci', 'cc', '楚辞'),
  (6, '五代诗词', 'wu dai shi ci', 'wdsc', '五代诗词'),
  (7, '论语', 'lun yu', 'ly', '论语'),
  (8, '曹操诗集', 'cao cao shi ji', 'ccsj', '曹操诗集');