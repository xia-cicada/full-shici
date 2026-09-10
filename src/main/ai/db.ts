import { safeStorage } from 'electron'
import log from 'electron-log'
import { userData } from '../userData/db'
import { ModelConfig } from './types'
import { defaultModelConfig } from './model'
import { PoetryAnalysis } from '../poetry/types'

export class AiDB {
  private userData = userData
  private db = userData.getDatabase()
  private keysMigrated = false

  constructor() {
    this.initTable()
  }

  initTable() {
    this.userData.migrateNs(
      'ai',
      1,
      `
      CREATE TABLE IF NOT EXISTS model_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,  -- 如 'deepseek-chat', 'gpt-4-turbo', 'claude-3-sonnet'
        apiKey TEXT NOT NULL,
        baseURL TEXT NOT NULL,
        temperature REAL NOT NULL DEFAULT 0.7 CHECK(temperature BETWEEN 0 AND 2), -- 范围约束
        systemPrompt TEXT,
        maxTokens INTEGER CHECK(maxTokens > 0),  -- 正整数校验
        topP REAL CHECK(topP BETWEEN 0 AND 1),
        frequencyPenalty REAL DEFAULT 0 CHECK(frequencyPenalty BETWEEN -2 AND 2),
        presencePenalty REAL DEFAULT 0 CHECK(presencePenalty BETWEEN -2 AND 2),
        isDefault BOOLEAN NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, provider)  -- 同一提供商下模型名称唯一
      );

      CREATE TRIGGER IF NOT EXISTS update_model_config_timestamp
      AFTER UPDATE ON model_config
      FOR EACH ROW
      BEGIN
        UPDATE model_config
        SET updatedAt = datetime('now')
        WHERE id = NEW.id;
      END;

      -- 保证只有一个默认模型的触发器（可选）
      CREATE TRIGGER IF NOT EXISTS ensure_single_default
      AFTER INSERT ON model_config
      WHEN NEW.isDefault = 1
      BEGIN
        UPDATE model_config
        SET isDefault = 0
        WHERE id != NEW.id AND isDefault = 1;
      END;
    `
    )

    // 赏析结果缓存：同一首诗只请求一次 AI
    this.userData.migrateNs(
      'ai',
      2,
      `
      CREATE TABLE IF NOT EXISTS ai_analysis (
        poetry_id INTEGER PRIMARY KEY,  -- 诗词ID（诗词库不可变，可直接作为缓存键）
        model TEXT NOT NULL DEFAULT '', -- 生成赏析的模型
        content TEXT NOT NULL,          -- PoetryAnalysis JSON
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `
    )

    this.ensureApiKeyEncColumn()
  }

  /**确保 apiKeyEnc 列存在（safeStorage 加密后的 API Key，base64） */
  private ensureApiKeyEncColumn() {
    const columns = this.db.prepare('PRAGMA table_info(model_config)').all() as { name: string }[]
    if (!columns.some((c) => c.name === 'apiKeyEnc')) {
      this.db.exec('ALTER TABLE model_config ADD COLUMN apiKeyEnc TEXT')
    }
  }

  /**应用就绪后调用：把历史明文 apiKey 迁移为 safeStorage 加密存储 */
  migratePlaintextApiKeys() {
    if (this.keysMigrated) return
    this.keysMigrated = true

    if (!isEncryptionAvailable()) return

    const rows = this.db
      .prepare(`SELECT id, apiKey FROM model_config WHERE apiKey != ''`)
      .all() as Pick<ModelConfig, 'id' | 'apiKey'>[]
    const update = this.db.prepare(`UPDATE model_config SET apiKey = '', apiKeyEnc = ? WHERE id = ?`)
    for (const row of rows) {
      try {
        update.run(safeStorage.encryptString(row.apiKey).toString('base64'), row.id)
      } catch (error) {
        log.warn('[ai] API Key 加密失败，保留明文:', error)
      }
    }
  }

  // ========== API Key 加解密 ==========

  /**写入加密后的 API Key；加密不可用时退回明文列 */
  private writeApiKey(id: number, plainKey: string) {
    let encrypted: string | null = null
    if (plainKey && isEncryptionAvailable()) {
      try {
        encrypted = safeStorage.encryptString(plainKey).toString('base64')
      } catch (error) {
        log.warn('[ai] API Key 加密失败，保留明文:', error)
      }
    }
    this.db
      .prepare(`UPDATE model_config SET apiKey = ?, apiKeyEnc = ? WHERE id = ?`)
      .run(encrypted ? '' : plainKey, encrypted, id)
  }

  /**读取解密后的 API Key（仅主进程内部使用） */
  private readApiKey(row: Pick<ModelConfig, 'apiKey'> & { apiKeyEnc?: string | null }): string {
    if (row.apiKeyEnc) {
      try {
        return safeStorage.decryptString(Buffer.from(row.apiKeyEnc, 'base64'))
      } catch (error) {
        log.warn('[ai] API Key 解密失败:', error)
        return ''
      }
    }
    // 旧数据或加密不可用时的明文
    return row.apiKey
  }

  /**返回给渲染层的配置必须脱敏，不携带 API Key */
  private sanitize(config: ModelConfig | null): ModelConfig | null {
    if (!config) return null
    const { apiKeyEnc: _enc, ...rest } = config as ModelConfig & { apiKeyEnc?: string | null }
    return { ...rest, apiKey: '' }
  }

  // ========== 模型配置相关方法 ==========

  // 添加新模型配置
  addModelConfig(config: ModelConfig): ModelConfig {
    // 如果设置为默认，先取消其他默认配置
    if (config.isDefault) {
      this.db.prepare('UPDATE model_config SET isDefault = 0 WHERE isDefault = 1').run()
    }

    // apiKey 列不再落明文，插入后立即加密写入 apiKeyEnc
    const info = this.db
      .prepare(
        `
      INSERT INTO model_config (
        name, provider, model, apiKey, baseURL,
        temperature, systemPrompt, maxTokens, topP,
        frequencyPenalty, presencePenalty, isDefault
      ) VALUES (
        @name, @provider, @model, @apiKey, @baseURL,
        @temperature, @systemPrompt, @maxTokens, @topP,
        @frequencyPenalty, @presencePenalty, @isDefault
      )
    `
      )
      .run({
        name: config.name,
        provider: config.provider,
        model: config.model,
        apiKey: '',
        baseURL: config.baseURL,
        temperature: config.temperature ?? 0.7,
        systemPrompt: config.systemPrompt ?? null,
        maxTokens: config.maxTokens ?? null,
        topP: config.topP ?? null,
        frequencyPenalty: config.frequencyPenalty ?? 0,
        presencePenalty: config.presencePenalty ?? 0,
        isDefault: config.isDefault
      })

    const id = info.lastInsertRowid as number
    this.writeApiKey(id, config.apiKey || '')
    return this.getModelConfigById(id)!
  }

  // 更新模型配置
  updateModelConfig(id: number, config: Partial<ModelConfig>): ModelConfig | null {
    const existing = this.getRawModelConfigById(id)
    if (!existing) return null

    // 如果设置为默认，先取消其他默认配置
    if (config.isDefault) {
      this.db.prepare('UPDATE model_config SET isDefault = 0 WHERE isDefault = 1').run()
    }

    const merged = { ...existing, ...config }
    this.db
      .prepare(
        `
      UPDATE model_config SET
        name = @name,
        provider = @provider,
        model = @model,
        baseURL = @baseURL,
        temperature = @temperature,
        systemPrompt = @systemPrompt,
        maxTokens = @maxTokens,
        topP = @topP,
        frequencyPenalty = @frequencyPenalty,
        presencePenalty = @presencePenalty,
        isDefault = @isDefault
      WHERE id = @id
    `
      )
      .run({
        name: merged.name,
        provider: merged.provider,
        model: merged.model,
        baseURL: merged.baseURL,
        temperature: merged.temperature,
        systemPrompt: merged.systemPrompt ?? null,
        maxTokens: merged.maxTokens ?? null,
        topP: merged.topP ?? null,
        frequencyPenalty: merged.frequencyPenalty ?? 0,
        presencePenalty: merged.presencePenalty ?? 0,
        isDefault: merged.isDefault,
        id
      })

    // 编辑时 API Key 留空表示保留原值
    const newKey = config.apiKey?.trim() ? config.apiKey : this.readApiKey(existing)
    this.writeApiKey(id, newKey)

    return this.getModelConfigById(id)
  }

  // 获取所有模型配置
  getAllModelConfigs(): ModelConfig[] {
    const rows = this.db
      .prepare('SELECT * FROM model_config ORDER BY isDefault DESC, name ASC')
      .all() as ModelConfig[]
    return rows.map((row) => this.sanitize(row)!)
  }

  // 根据ID获取模型配置（脱敏）
  getModelConfigById(id: number): ModelConfig | null {
    return this.sanitize(this.getRawModelConfigById(id))
  }

  private getRawModelConfigById(id: number): ModelConfig | null {
    return (
      (this.db.prepare('SELECT * FROM model_config WHERE id = ?').get(id) as ModelConfig) || null
    )
  }

  // 根据名称获取模型配置（脱敏）
  getModelConfigByName(name: string): ModelConfig | null {
    const row = this.db.prepare('SELECT * FROM model_config WHERE name = ?').get(name) as ModelConfig
    return this.sanitize(row)
  }

  // 获取默认模型配置（脱敏，供渲染层展示）
  getDefaultModelConfig(): ModelConfig {
    return this.sanitize(this.getRawDefaultModelConfig()) || defaultModelConfig
  }

  // 获取默认模型配置（含解密后的 API Key，仅主进程内部使用）
  getDefaultModelConfigRaw(): ModelConfig {
    return this.getRawDefaultModelConfig()
  }

  private getRawDefaultModelConfig(): ModelConfig {
    const row = this.db
      .prepare('SELECT * FROM model_config WHERE isDefault = 1')
      .get() as ModelConfig
    if (!row) return defaultModelConfig
    return { ...row, apiKey: this.readApiKey(row) }
  }

  // 删除模型配置
  deleteModelConfig(id: number): boolean {
    const result = this.db.prepare('DELETE FROM model_config WHERE id = ?').run(id)
    return result.changes > 0
  }

  // ========== 赏析缓存相关方法 ==========

  getPoetryAnalysis(poetryId: number): PoetryAnalysis | null {
    const row = this.db
      .prepare('SELECT content FROM ai_analysis WHERE poetry_id = ?')
      .get(poetryId) as { content: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.content) as PoetryAnalysis
    } catch {
      return null
    }
  }

  savePoetryAnalysis(poetryId: number, model: string, analysis: PoetryAnalysis): void {
    const now = Date.now()
    this.db
      .prepare(
        `
        INSERT OR REPLACE INTO ai_analysis (poetry_id, model, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .run(poetryId, model, JSON.stringify(analysis), now, now)
  }
}

/**safeStorage 是否可用；不可用时退回明文存储并记录日志 */
function isEncryptionAvailable(): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('[ai] safeStorage 不可用，API Key 将以明文保存在本地数据库')
      return false
    }
    return true
  } catch (error) {
    log.warn('[ai] safeStorage 检测失败，API Key 将以明文保存在本地数据库:', error)
    return false
  }
}

export const aiDB = new AiDB()
