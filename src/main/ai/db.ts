import { userData } from '../userData/db'
import { ModelConfig } from './types'
import { defaultModelConfig } from './model'

export class AiDB {
  private userData = userData
  private db = userData.getDatabase()
  constructor() {
    this.initTable()
  }
  initTable() {
    this.userData.migrate(
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
  }

  // 添加新模型配置
  addModelConfig(config: ModelConfig): ModelConfig {
    // 如果设置为默认，先取消其他默认配置
    if (config.isDefault) {
      this.db.prepare('UPDATE model_config SET isDefault = 0 WHERE isDefault = 1').run()
    }

    const stmt = this.db.prepare(`
      INSERT INTO model_config (
        name, provider, model, apiKey, baseURL,
        temperature, systemPrompt, maxTokens, topP,
        frequencyPenalty, presencePenalty, isDefault
      ) VALUES (
        @name, @provider, @model, @apiKey, @baseURL,
        @temperature, @systemPrompt, @maxTokens, @topP,
        @frequencyPenalty, @presencePenalty, @isDefault
      )
    `)

    const info = stmt.run(config)
    return this.getModelConfigById(info.lastInsertRowid as number)!
  }

  // 更新模型配置
  updateModelConfig(id: number, config: Partial<ModelConfig>): ModelConfig | null {
    const existing = this.getModelConfigById(id)
    if (!existing) return null

    // 如果设置为默认，先取消其他默认配置
    if (config.isDefault) {
      this.db.prepare('UPDATE model_config SET isDefault = 0 WHERE isDefault = 1').run()
    }

    const mergedConfig = { ...existing, ...config }
    this.db
      .prepare(
        `
      UPDATE model_config SET
        name = @name,
        provider = @provider,
        model = @model,
        apiKey = @apiKey,
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
      .run(mergedConfig)

    return this.getModelConfigById(id)
  }

  // 获取所有模型配置
  getAllModelConfigs(): ModelConfig[] {
    return this.db
      .prepare('SELECT * FROM model_config ORDER BY isDefault DESC, name ASC')
      .all() as ModelConfig[]
  }

  // 根据ID获取模型配置
  getModelConfigById(id: number): ModelConfig | null {
    return (
      (this.db.prepare('SELECT * FROM model_config WHERE id = ?').get(id) as ModelConfig) || null
    )
  }

  // 根据名称获取模型配置
  getModelConfigByName(name: string): ModelConfig | null {
    return (
      (this.db.prepare('SELECT * FROM model_config WHERE name = ?').get(name) as ModelConfig) ||
      null
    )
  }

  // 获取默认模型配置
  getDefaultModelConfig(): ModelConfig {
    return (
      (this.db.prepare('SELECT * FROM model_config WHERE isDefault = 1').get() as ModelConfig) ||
      defaultModelConfig
    )
  }

  // 删除模型配置
  deleteModelConfig(id: number): boolean {
    const result = this.db.prepare('DELETE FROM model_config WHERE id = ?').run(id)
    return result.changes > 0
  }
}

export const aiDB = new AiDB()
