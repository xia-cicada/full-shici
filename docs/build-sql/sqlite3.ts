import path from 'node:path'
import { Database } from 'bun:sqlite'
import { Glob } from 'bun'
import { pinyin } from 'pinyin-pro'

const resolve = (p: string) => path.resolve(import.meta.dir, p)

const db = new Database(resolve('poetry.sqlite'))
db.exec('PRAGMA journal_mode = WAL;PRAGMA synchronous = NORMAL;')

const INIT_QUERY = await Bun.file(resolve('./sqlite-init.sql')).text()
db.run(INIT_QUERY)

const getPy = (text: string = '') => {
  return pinyin(text, { toneType: 'none', type: 'string' })
}

const getPyInitials = (text: string = '') => {
  return pinyin(text, {
    pattern: 'first',
    toneType: 'none',
    type: 'string'
  }).replace(/\s+/g, '')
}

const appendPy = (item: any) => {
  item.title_pinyin = getPy(item.title)
  item.title_initials = getPyInitials(item.title)
  item.rhythmic_pinyin = getPy(item.rhythmic)
  item.rhythmic_initials = getPyInitials(item.rhythmic)
  item.author_pinyin = getPy(item.author)
  item.author_initials = getPyInitials(item.author)
}

const allData: any[] = []
const glob1 = new Glob('poet.*.[0-9]*.json')
for await (const file of glob1.scan({
  cwd: resolve('../全唐诗'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 1
    appendPy(item)
    item.extra_info = { dynasty: file.indexOf('song') > -1 ? '宋' : '唐' }
    allData.push(item)
  }
}

const glob2 = new Glob('ci.*.[0-9]*.json')
for await (const file of glob2.scan({
  cwd: resolve('../宋词'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 2
    item.title = item.title || item.rhythmic
    item.extra_info = { dynasty: '宋' }
    appendPy(item)
    allData.push(item)
  }
}

const glob3 = new Glob('*.json')
for await (const file of glob3.scan({
  cwd: resolve('../元曲'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 3
    item.title = item.title
    item.extra_info = { dynasty: '元' }
    appendPy(item)
    allData.push(item)
  }
}

const glob4 = new Glob('*.json')
for await (const file of glob4.scan({
  cwd: resolve('../诗经'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 4
    const { title, chapter, section, content } = item
    item.author = item.author || '佚名'
    item.title = [chapter, section, title].filter((v) => v).join('·')
    item.paragraphs = content
    item.extra_info = { dynasty: '西周、春秋', chapter, section, title }
    appendPy(item)
    allData.push(item)
  }
}

const glob5 = new Glob('*.json')
for await (const file of glob5.scan({
  cwd: resolve('../楚辞'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 5
    const { title, section, content } = item
    item.author = item.author || '佚名'
    item.title = [section, title].filter((v) => v).join('·')
    item.paragraphs = content
    item.extra_info = { dynasty: '战国', section, title }
    appendPy(item)
    allData.push(item)
  }
}

const glob6 = new Glob('huajianji*juan.json')
for await (const file of glob6.scan({
  cwd: resolve('../五代诗词/huajianji'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 6
    item.title = item.title || item.rhythmic
    item.extra_info = { dynasty: '五代', section: '花间集' }
    appendPy(item)
    allData.push(item)
  }
}

const glob6_2 = new Glob('poetrys.json')
for await (const file of glob6_2.scan({
  cwd: resolve('../五代诗词/nantang'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 6
    item.title = item.title || item.rhythmic
    item.extra_info = { dynasty: '五代，南唐' }
    appendPy(item)
    allData.push(item)
  }
}

const glob7 = new Glob('*.json')
for await (const file of glob7.scan({
  cwd: resolve('../论语'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 7
    item.author = '孔子'
    item.title = item.title || item.chapter
    item.extra_info = { dynasty: '春秋、战国' }
    appendPy(item)
    allData.push(item)
  }
}

const glob8 = new Glob('*.json')
for await (const file of glob8.scan({
  cwd: resolve('../曹操诗集'),
  absolute: true
})) {
  const list = await Bun.file(file).json()
  for (const item of list) {
    item.category_id = 8
    item.author = '曹操'
    item.extra_info = { dynasty: '东汉末年' }
    appendPy(item)
    allData.push(item)
  }
}

console.log('所有待插入条数', allData.length)

const insert = db.prepare(`
  INSERT INTO poetry (
    category_id, title, title_pinyin, title_initials,
    rhythmic, rhythmic_pinyin, rhythmic_initials,
    author, author_pinyin, author_initials,
    paragraphs, notes, tags, extra_info
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const batchSize = 1000
for (let i = 0; i < allData.length; i += batchSize) {
  const batch = allData.slice(i, i + batchSize)
  db.transaction(() => {
    for (const item of batch) {
      try {
        insert.run(
          item.category_id,
          item.title,
          item.title_pinyin,
          item.title_initials,
          item.rhythmic,
          item.rhythmic_pinyin,
          item.rhythmic_initials,
          item.author,
          item.author_pinyin,
          item.author_initials,
          JSON.stringify(item.paragraphs),
          JSON.stringify(item.notes),
          JSON.stringify(item.tags),
          JSON.stringify(item.extra_info)
        )
      } catch (e) {
        console.log(e)
        throw e
      }
    }
  })()
}

const count = db.prepare('SELECT COUNT(*) as count FROM poetry').get() as {
  count: number
}
console.log('当前数据库记录数:', count.count)
