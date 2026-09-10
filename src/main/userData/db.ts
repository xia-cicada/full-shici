/**
 * 个人数据使用sqlite3储存在用户目录下
 */
import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'

export class UserData {
  private db: Database.Database

  constructor() {
    // 获取用户数据目录
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'userdata.sqlite')

    // 初始化数据库连接
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL') // 更好的并发性能

    this.initializeVersionTable()
  }

  private initializeVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        updated_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS db_version_ns (
        ns TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
    `)
  }

  public getDatabase(): Database.Database {
    return this.db
  }

  /**
   * 按模块命名空间执行迁移。
   * 旧实现是所有模块共用一个全局版本号，任何一个模块抬高版本后，
   * 其他模块的迁移都会被跳过（如表永远建不出来）。
   * 迁移脚本必须是幂等的（CREATE TABLE IF NOT EXISTS 等），
   * 因为一旦执行过，重复升级/降级场景下不会重放。
   */
  public migrateNs(ns: string, version: number, migrationScript: string): void {
    const row = this.db
      .prepare('SELECT version FROM db_version_ns WHERE ns = ?')
      .get(ns) as { version: number } | undefined
    const currentVersion = row?.version ?? 0

    if (version > currentVersion) {
      const now = Date.now()
      this.db.transaction(() => {
        this.db.exec(migrationScript)
        this.db
          .prepare(
            `
            INSERT INTO db_version_ns (ns, version, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(ns) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at
          `
          )
          .run(ns, version, now)
      })()
    }
  }

  public close(): void {
    this.db?.close()
  }
}

export const userData = new UserData()
