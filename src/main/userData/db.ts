/**
 * 个人数据使用sqlite3储存在用户目录下
 */
import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'

export interface UserDataInfo {
  version: number
  updated_at: number
}

export class UserData {
  private db: Database.Database

  constructor() {
    // 获取用户数据目录
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'userdata.sqlite')

    // 初始化数据库连接
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL') // 更好的并发性能

    // 创建版本表用于管理数据库版本
    this.initializeVersionTable()
  }

  private initializeVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        updated_at TIMESTAMP NOT NULL
      );

      INSERT INTO db_version (version, updated_at) SELECT 0, ${Date.now()} WHERE NOT EXISTS (SELECT 1 FROM db_version);
    `)
  }

  public getDatabase(): Database.Database {
    return this.db
  }

  public migrate(version: number, migrationScript: string): void {
    const currentVersion = this.getCurrentVersion()
    if (version > currentVersion) {
      const now = Date.now()
      this.db.transaction(() => {
        this.db.exec(migrationScript)
        this.db.prepare('UPDATE db_version SET version = ?, updated_at = ?').run(version, now)
      })()
    }
  }

  private getCurrentVersion(): number {
    const row = this.db.prepare('SELECT version FROM db_version').get() as UserDataInfo
    return row ? row.version : 0
  }

  public close(): void {
    this.db?.close()
  }
}

export const userData = new UserData()
