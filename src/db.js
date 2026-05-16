/**
 * 懒人笔记 - 数据库层 (SQLite via sql.js)
 * 提供离线本地存储能力
 * 开发模式通过 CDN 加载 (index.html)
 * 生产构建时替换为本地文件
 */

export class NotesDB {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * 初始化数据库
   */
  async init() {
    if (this.initialized) return;

    try {
      await this.initSQLJS();

      const savedData = localStorage.getItem('fiddle-notes-db');

      if (savedData) {
        const binaryArray = JSON.parse(savedData);
        const uint8Array = new Uint8Array(binaryArray);
        this.db = new this.SQL.Database(uint8Array);
      } else {
        this.db = new this.SQL.Database();
      }

      this.createTables();
      this.initialized = true;
      console.log('✅ 数据库初始化成功');
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  async initSQLJS() {
    return new Promise((resolve, reject) => {
      if (window.SQLModule) {
        this.SQL = window.SQLModule;
        resolve();
        return;
      }
      if (typeof initSqlJs === 'undefined') {
        reject(new Error('initSqlJs 未定义'));
        return;
      }
      // 生产构建时 WASM 在 dist/ 同级，开发模式用 CDN
      const isElectron = !!window.electronAPI;
      const locateFile = isElectron
        ? file => `./${file}`    // 本地文件
        : file => `https://sql.js.org/dist/${file}`; // CDN
      initSqlJs({ locateFile }).then(SQL => {
        window.SQLModule = SQL;
        this.SQL = SQL;
        resolve();
      }).catch(reject);
    });
  }

  createTables() {
    const schema = `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '未命名笔记',
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        word_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL DEFAULT '#2563EB'
      );

      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_data TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'default',
        created_at TEXT NOT NULL
      );
    `;

    this.db.exec(schema);
    this.migrateTemplatesTable();
    this.saveToLocalStorage();
  }

  /**
   * 迁移模板表，为旧数据添加 icon 列
   */
  migrateTemplatesTable() {
    try {
      this.db.exec("ALTER TABLE templates ADD COLUMN icon TEXT NOT NULL DEFAULT 'default'");
    } catch (e) {
      // 列已存在，忽略错误
    }
  }

  saveToLocalStorage() {
    try {
      const data = this.db.export();
      const binaryArray = Array.from(data);
      localStorage.setItem('fiddle-notes-db', JSON.stringify(binaryArray));
    } catch (error) {
      console.error('保存数据库失败:', error);
    }
  }

  getAllNotes() {
    const stmt = this.db.prepare('SELECT * FROM notes ORDER BY updated_at DESC');
    const notes = [];
    while (stmt.step()) {
      notes.push(stmt.getAsObject());
    }
    stmt.free();
    return notes;
  }

  getNoteById(id) {
    const stmt = this.db.prepare('SELECT * FROM notes WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const note = stmt.getAsObject();
      stmt.free();
      return note;
    }
    stmt.free();
    return null;
  }

  searchNotes(term) {
    const stmt = this.db.prepare('SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC');
    const searchTerm = `%${term}%`;
    stmt.bind([searchTerm, searchTerm]);
    const notes = [];
    while (stmt.step()) {
      notes.push(stmt.getAsObject());
    }
    stmt.free();
    return notes;
  }

  createNote(note) {
    const stmt = this.db.prepare('INSERT INTO notes (id, title, content, created_at, updated_at, word_count) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run([note.id, note.title, note.content, note.created_at, note.updated_at, note.word_count || 0]);
    stmt.free();
    this.saveToLocalStorage();
    return note;
  }

  updateNote(id, updates) {
    const fields = [];
    const values = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
    if (updates.updated_at !== undefined) { fields.push('updated_at = ?'); values.push(updates.updated_at); }
    if (updates.word_count !== undefined) { fields.push('word_count = ?'); values.push(updates.word_count); }
    values.push(id);
    const sql = `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(values);
    stmt.free();
    this.saveToLocalStorage();
  }

  deleteNote(id) {
    const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.saveToLocalStorage();
  }

  getAllTags() {
    const stmt = this.db.prepare('SELECT * FROM tags ORDER BY name');
    const tags = [];
    while (stmt.step()) { tags.push(stmt.getAsObject()); }
    stmt.free();
    return tags;
  }

  createTag(name, color = '#2563EB') {
    try {
      const stmt = this.db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
      stmt.run([name, color]);
      stmt.free();
      this.saveToLocalStorage();
      const getStmt = this.db.prepare('SELECT * FROM tags WHERE name = ?');
      getStmt.bind([name]);
      getStmt.step();
      const tag = getStmt.getAsObject();
      getStmt.free();
      return tag;
    } catch (error) {
      console.error('创建标签失败:', error);
      return null;
    }
  }

  getNoteTags(noteId) {
    const stmt = this.db.prepare('SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ? ORDER BY t.name');
    const tags = [];
    stmt.bind([noteId]);
    while (stmt.step()) { tags.push(stmt.getAsObject()); }
    stmt.free();
    return tags;
  }

  addTagToNote(noteId, tagId) {
    try {
      const stmt = this.db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
      stmt.run([noteId, tagId]);
      stmt.free();
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('添加标签失败:', error);
      return false;
    }
  }

  removeTagFromNote(noteId, tagId) {
    const stmt = this.db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?');
    stmt.run([noteId, tagId]);
    stmt.free();
    this.saveToLocalStorage();
  }

  addAttachment(noteId, file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target.result;
        const base64Data = fileData.split(',')[1];
        const stmt = this.db.prepare('INSERT INTO attachments (note_id, file_name, file_data, file_type, file_size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run([noteId, file.name, base64Data, file.type, file.size, new Date().toISOString()]);
        stmt.free();
        this.saveToLocalStorage();
        const getStmt = this.db.prepare('SELECT last_insert_rowid() as id');
        getStmt.step();
        const result = getStmt.getAsObject();
        getStmt.free();
        resolve(result.id);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getNoteAttachments(noteId) {
    const stmt = this.db.prepare('SELECT * FROM attachments WHERE note_id = ? ORDER BY uploaded_at DESC');
    const attachments = [];
    stmt.bind([noteId]);
    while (stmt.step()) {
      const attachment = stmt.getAsObject();
      attachment.url = `data:${attachment.file_type};base64,${attachment.file_data}`;
      attachments.push(attachment);
    }
    stmt.free();
    return attachments;
  }

  deleteAttachment(attachmentId) {
    const stmt = this.db.prepare('DELETE FROM attachments WHERE id = ?');
    stmt.run([attachmentId]);
    stmt.free();
    this.saveToLocalStorage();
  }

  getAllTemplates() {
    const stmt = this.db.prepare('SELECT * FROM templates ORDER BY name');
    const templates = [];
    while (stmt.step()) { templates.push(stmt.getAsObject()); }
    stmt.free();
    return templates;
  }

  createTemplate(name, content, icon = 'default') {
    const stmt = this.db.prepare('INSERT INTO templates (name, content, icon, created_at) VALUES (?, ?, ?, ?)');
    stmt.run([name, content, icon, new Date().toISOString()]);
    stmt.free();
    this.saveToLocalStorage();
  }

  initDefaultTemplates() {
    const templates = this.getAllTemplates();
    if (templates.length > 0) return;

    const defaultTemplates = [
      { name: '空白笔记', icon: 'note', content: '# 新笔记\n\n在这里开始编写...\n' },
    ];

    defaultTemplates.forEach(template => {
      this.createTemplate(template.name, template.content, template.icon);
    });

    console.log('✅ 默认模板已初始化');
  }

  close() {
    if (this.db) {
      this.saveToLocalStorage();
      this.db.close();
    }
  }
}
