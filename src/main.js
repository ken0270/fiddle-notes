/**
 * 懒人笔记 - 应用入口
 */
import './styles.css';
import { NotesDB } from './db.js';
import { NoteApp } from './app.js';

// 导出单例到全局（兼容旧代码）
window.NotesDB = new NotesDB();

document.addEventListener('DOMContentLoaded', () => {
  window.noteApp = new NoteApp();
});
