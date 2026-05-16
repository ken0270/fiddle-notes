/**
 * 懒人笔记 - 完整的 Markdown 笔记应用
 * 支持 SQLite 离线存储、模板系统、标签管理、附件拖拽
 */
import { NotesDB } from './db.js';
import { initLanguage, setLanguage, getLanguage, t } from './i18n.js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/base16/one-light.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { markedHighlight } from 'marked-highlight';
import JSZip from 'jszip';
// CodeMirror 6
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { autocompletion } from '@codemirror/autocomplete';

// 初始化 marked
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  })
);
marked.use({ breaks: true, gfm: true });

function escapeHtmlEntities(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

/**
 * 根据图标标识符返回 SVG 图标 HTML（使用 Lucide 图标）
 * @param {string} iconType - 'note'|'bug'|'chip'|'chart'|'default'
 * @param {number} [size=18] - SVG 尺寸
 * @param {string} [cls=''] - 额外 CSS 类名
 */
function getTemplateIconSvg(iconType, size = 18, cls = '') {
  const s = size;
  const cl = cls ? ` class="${cls}"` : '';
  const iconPaths = {
    note: `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
    bug: `<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>`,
    chip: `<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>`,
    chart: `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/>`,
    default: `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
  };
  const makeSvg = (paths) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"${cl} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const pickerS = size <= 24 ? size : 28;
  const makePickerSvg = (paths) => `<svg width="${pickerS}" height="${pickerS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons = {
    note: makeSvg(iconPaths.note),
    bug: makeSvg(iconPaths.bug),
    chip: makeSvg(iconPaths.chip),
    chart: makeSvg(iconPaths.chart),
    default: makeSvg(iconPaths.default),
  };
  const pickerIcons = {
    note: makePickerSvg(iconPaths.note),
    bug: makePickerSvg(iconPaths.bug),
    chip: makePickerSvg(iconPaths.chip),
    chart: makePickerSvg(iconPaths.chart),
    default: makePickerSvg(iconPaths.default),
  };
  return {
    svg: icons[iconType] || icons.default,
    pickerSvg: pickerIcons[iconType] || pickerIcons.default,
  };
}

export class NoteApp {
  constructor() {
    this.currentNoteId = null;
    this.currentTagId = null;
    this.searchTerm = '';
    this.sortBy = 'updated_desc';
    this.isDarkTheme = false;
    this.currentView = 'split';
    this.db = window.NotesDB;
    this._blobUrls = [];
    this._blobDataMap = new Map(); // blobURL → { data, fileName, folder }
    this.cm = null;           // CodeMirror 实例
    this._scrollSyncLock = false;
    this._previewRaw = '';    // 上次渲染的原始内容
    this._previewHtml = '';   // 上次渲染的 HTML 缓存
    this._inputHandler = null;
    this._cmUpdateHandler = null;
    this.init();
  }

  async init() {
    try {
      await this.db.init();
      this.db.initDefaultTemplates();
      initLanguage();
      this.cacheDOMElements();
      this.applyI18n();
      this.setupEventListeners();
      this.setupTheme();
      await this.restoreStoragePath();
      // CodeMirror 在 DOM 元素可用后初始化
      this.initCodeMirror();
      this.renderTagsList();
      this.renderTemplatesList();
      this.renderNotesList();
      console.log('🚀 懒人笔记 启动完成');
      setTimeout(() => this.checkStoragePath(), 200);
    } catch (error) {
      console.error('❌ 应用初始化失败:', error);
      this.cacheDOMElements();
      this.setupTheme();
    }
    setTimeout(() => this.hideLoadingScreen(), 1500);
  }

  // ======================= DOM 缓存 =======================

  cacheDOMElements() {
    this.loadingScreen = document.getElementById('loadingScreen');
    this.sidebar = document.getElementById('sidebar');
    this.pageList = document.getElementById('pageList');
    this.pageEditor = document.getElementById('pageEditor');
    this.pageSettings = document.getElementById('pageSettings');
    this.pagesContainer = document.getElementById('pages');

    this.tagsList = document.getElementById('tagsList');
    this.templatesList = document.getElementById('templatesList');
    this.navAllCount = document.getElementById('navAllCount');
    this.totalNotesEl = document.getElementById('totalNotes');
    this.totalWordsEl = document.getElementById('totalWords');

    this.notesGrid = document.getElementById('notesGrid');
    this.emptyState = document.getElementById('emptyState');
    this.searchInput = document.getElementById('searchInput');
    this.newNoteBtn = document.getElementById('newNoteBtn');
    this.createFirstNoteBtn = document.getElementById('createFirstNote');
    this.themeToggle = document.getElementById('themeToggle');
    this.headerSettingsBtn = document.getElementById('headerSettingsBtn');
    this.toggleSidebarBtn = document.getElementById('toggleSidebar');
    this.templateMenu = document.getElementById('templateMenu');
    this.sortSelect = document.getElementById('sortSelect');

    this.backToListBtn = document.getElementById('backToList');
    this.noteTitleInput = document.getElementById('noteTitle');
    this.markdownEditor = document.getElementById('markdownEditor');
    this.markdownPreview = document.getElementById('markdownPreview');
    this.saveNoteBtn = document.getElementById('saveNoteBtn');
    this.exportZipBtn = document.getElementById('exportZipBtn');
    this.editorDivider = document.getElementById('editorDivider');
    this.editorPane = document.getElementById('editorPane');
    this.previewPane = document.getElementById('previewPane');
    this.attachmentsList = document.getElementById('attachmentsList');
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.uploadAttachmentBtn = document.getElementById('uploadAttachmentBtn');

    this.toolbarBtns = document.querySelectorAll('.toolbar-btn');
    this.viewBtns = document.querySelectorAll('.view-btn');

    this.wordCountEl = document.getElementById('wordCount');
    this.charCountEl = document.getElementById('charCount');
    this.saveStatusEl = document.getElementById('saveStatus');

    this.editorTagsList = document.getElementById('editorTagsList');
    this.editorTagsAddBtn = document.getElementById('editorTagsAddBtn');
    this.editorTagsBar = document.getElementById('editorTagsBar');

    this.templateManagerList = document.getElementById('templateManagerList');
    this.addTemplateBtn = document.getElementById('addTemplateBtn');

    this.storageRootPath = document.getElementById('storageRootPath');
    this.browseStoragePath = document.getElementById('browseStoragePath');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importDataBtn = document.getElementById('importDataBtn');
    this.resetStorageBtn = document.getElementById('resetStorageBtn');
    this.storagePathHint = document.getElementById('storagePathHint');
    this.storageInfo = document.getElementById('storageInfo');

    // CM 容器
    this.cmContainer = document.getElementById('cmContainer');
    // 模式切换按钮
    // TOC 面板
    this.tocPanel = document.getElementById('tocPanel');
    this.tocList = document.getElementById('tocList');
  }

  // ======================= CodeMirror 初始化 =======================

  initCodeMirror() {
    if (!this.cmContainer) return;
    const content = this.markdownEditor ? this.markdownEditor.value : '';
    // 隐藏原始 textarea，用 CodeMirror 替代
    if (this.markdownEditor) this.markdownEditor.style.display = 'none';

    const getThemes = () => {
      const base = [this.isDarkTheme ? oneDark : []];
      return base.filter(Boolean);
    };

    const startState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        autocompletion(),
        keymap.of([indentWithTab]),
        ...getThemes(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.onEditorChange();
          }
        }),
        EditorView.domEventHandlers({
          paste: (event) => {
            // 检查是否包含文件（图片等）
            const hasFile = Array.from(event.clipboardData?.items || []).some(
              (item) => item.kind === 'file'
            );
            if (hasFile) {
              event.preventDefault();
              this.handleEditorPaste(event);
              return true;
            }
            return false;
          },
          keydown: (event) => {
            // 自动列表续写
            if (event.key === 'Enter') {
              const result = this.handleAutoListContinuation(event);
              if (result) return true;
            }
            return false;
          },
        }),
      ],
    });

    this.cm = new EditorView({
      state: startState,
      parent: this.cmContainer,
    });

    this.cm.focus();
  }

  /** 切换 CM 主题 */
  updateCMTheme() {
    if (!this.cm) return;
    // CM 不直接支持运行时切换主题，重新创建配置
    // 简单方案：刷新当前状态
    const content = this.cm.state.doc.toString();
    this.cm.destroy();
    const startState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        autocompletion(),
        keymap.of([indentWithTab]),
        this.isDarkTheme ? oneDark : [],
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.onEditorChange();
        }),
        EditorView.domEventHandlers({
          paste: (event) => {
            const hasFile = Array.from(event.clipboardData?.items || []).some(
              (item) => item.kind === 'file'
            );
            if (hasFile) {
              event.preventDefault();
              this.handleEditorPaste(event);
              return true;
            }
            return false;
          },
          keydown: (event) => {
            if (event.key === 'Enter') {
              return this.handleAutoListContinuation(event) || false;
            }
            return false;
          },
        }),
      ],
    });
    this.cm = new EditorView({ state: startState, parent: this.cmContainer });
  }

  /** 获取 CM 中的当前文本 */
  getEditorContent() {
    if (this.cm) return this.cm.state.doc.toString();
    return this.markdownEditor ? this.markdownEditor.value : '';
  }

  /** 设置 CM 中的文本 */
  setEditorContent(content) {
    if (this.cm) {
      this.cm.dispatch({
        changes: { from: 0, to: this.cm.state.doc.length, insert: content },
      });
    } else if (this.markdownEditor) {
      this.markdownEditor.value = content;
    }
  }

  /** 在 CM 光标处插入文本 */
  insertAtCursor(text) {
    if (this.cm) {
      const { from } = this.cm.state.selection.main;
      this.cm.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + text.length },
      });
      this.cm.focus();
    } else if (this.markdownEditor) {
      const ta = this.markdownEditor;
      const start = ta.selectionStart;
      ta.value =
        ta.value.substring(0, start) + text + ta.value.substring(ta.selectionEnd);
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    }
    this.debouncedRender();
    this.autoSave();
  }

  // ======================= 编辑器内容变更处理 =======================

  onEditorChange() {
    this.debouncedRender();
    this.updateWordCount();
    this.autoSave();
    // 从标题同步笔记标题
    this.syncTitleFromContent();
  }

  // ======================= 事件绑定 =======================

  setupEventListeners() {
    this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('addTagBtn').addEventListener('click', () => this.createNewTag());

    this.newNoteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showTemplateMenu(e); });
    this.createFirstNoteBtn.addEventListener('click', () => this.createNoteFromTemplate(null));
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    this.sortSelect.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.renderNotesList();
    });

    this.editorTagsAddBtn.addEventListener('click', (e) => this.showEditorTagDropdown(e));
    this.addTemplateBtn.addEventListener('click', () => this.showTemplateEditorModal());

    this.headerSettingsBtn.addEventListener('click', () => {
      document.querySelector('.nav-item[data-view="all"]').classList.remove('active');
      this.showSettingsPage();
    });

    // 语言切换
    document.getElementById('langZhBtn').addEventListener('click', () => this.switchLanguage('zh'));
    document.getElementById('langEnBtn').addEventListener('click', () => this.switchLanguage('en'));
    document.querySelector('.nav-item[data-view="all"]').addEventListener('click', () => {
      document.querySelector('.nav-item[data-view="all"]').classList.add('active');
      this.showPage('list', 'back');
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.searchInput.focus(); }
    });

    this.backToListBtn.addEventListener('click', () => this.showPage('list', 'back'));
    this.saveNoteBtn.addEventListener('click', () => this.saveCurrentNote());
    this.exportZipBtn.addEventListener('click', () => this.exportToZip());

    this.uploadAttachmentBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
    this.setupDragAndDrop();

    this.viewBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.currentTarget.dataset.view);
      });
    });
    this.toolbarBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.handleEditorAction(e.currentTarget.dataset.action);
      });
    });

    this.browseStoragePath.addEventListener('click', () => this.browseStorageFolder());
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    this.exportDataBtn.addEventListener('click', () => this.exportAllData());
    this.importDataBtn.addEventListener('click', () => this.importData());
    this.resetStorageBtn.addEventListener('click', () => this.resetAllData());

    this.setupDividerDrag();
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.template-dropdown')) {
        this.templateMenu.classList.remove('show');
      }
    });

    // 预览区事件委托
    this.setupPreviewEventDelegation();

    // 旧 textarea 的 input 事件（CM 已经接管，不需要）
    // 保留 noteTitleInput 的变化监听
    this.noteTitleInput.addEventListener('input', () => { this.autoSave(); });
  }

  /** 预览区事件委托（图片点击放大、TOC 导航） */
  setupPreviewEventDelegation() {
    // 图片点击 → 灯箱
    this.markdownPreview.addEventListener('click', (e) => {
      const img = e.target.closest('.markdown-preview img');
      if (img && !img.closest('.toc-panel') && !img.closest('.lightbox-overlay')) {
        this.showImageLightbox(img);
      }
    });
  }

  // ======================= 预览更新（核心） =======================

  async debouncedRender() {
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => this.updatePreview(), 120);
  }

  updatePreview() {
    // 清理前一帧的 Blob URL
    this._blobUrls.forEach((u) => {
      URL.revokeObjectURL(u);
      this._blobDataMap.delete(u);
    });
    this._blobUrls = [];

    let content = this.getEditorContent();

    // 内容未变化则跳过重渲染
    if (content === this._previewRaw && this._previewHtml) {
      return;
    }
    this._previewRaw = content;

    // ---- 公式保护：在 marked 解析前提取公式并替换为占位符 ----
    const mathPlaceholders = [];
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
      const id = `MATHBLOCK_${mathPlaceholders.length}`;
      mathPlaceholders.push({ id, expr: expr.trim(), displayMode: true });
      return id;
    });
    content = content.replace(/(?<![A-Za-z0-9])\$([^$\n]+?)\$(?![A-Za-z0-9])/g, (_, expr) => {
      const id = `MATHINLINE_${mathPlaceholders.length}`;
      mathPlaceholders.push({ id, expr: expr.trim(), displayMode: false });
      return id;
    });

    // ---- Mermaid 保护：在 marked 解析前提取 mermaid 代码块 ----
    const mermaidBlocks = [];
    content = content.replace(/```mermaid\s*\n([\s\S]*?)```/g, (_, def) => {
      const idx = mermaidBlocks.length;
      mermaidBlocks.push({ idx, def: def.trim() });
      return `\n\n@@MERMAID_${idx}@@\n\n`;
    });

    // 1. 用 marked 解析（marked-highlight 处理代码高亮）
    let html = marked.parse(content);

    // 2. 将公式占位符替换为 KaTeX 渲染结果
    mathPlaceholders.forEach(({ id, expr, displayMode }) => {
      try {
        const katexHtml = katex.renderToString(expr, {
          displayMode,
          throwOnError: false,
          strict: false,
        });
        html = html.replace(id, katexHtml);
      } catch {
        html = html.replace(
          id,
          `<span class="katex-error" style="color:var(--color-danger)">公式错误: ${this.escapeHtml(expr)}</span>`
        );
      }
    });

    // 3. 将 Mermaid 占位符替换为渲染容器（内容不转义，Mermaid 需要原始语法）
    mermaidBlocks.forEach(({ idx, def }) => {
      const token = `@@MERMAID_${idx}@@`;
      // marked 可能把占位符包在 <p> 标签里
      const re = new RegExp(`(?:<p>)?${token}(?:<\\/p>)?`, 'g');
      html = html.replace(re, `<div class="mermaid" data-processed="false">${def}</div>`);
    });

    // 4. 插入预览容器
    this.markdownPreview.innerHTML = `<div class="markdown-preview">${html}</div>`;

    // 5. 给代码块添加复制按钮
    this.addCopyCodeButtons();

    // 6. 同步渲染 Mermaid
    this.renderMermaid();

    // 7. 解析本地图片
    this.resolveLocalImages();

    // 8. 搜索高亮
    if (this.searchTerm) this.highlightSearchResults();

    // 9. 生成 TOC
    this.generateTOC();

    // 10. 滚动同步
    this.setupScrollSync();

    // 缓存 HTML（不含 Mermaid 的异步渲染结果）
    this._previewHtml = this.markdownPreview.innerHTML;
  }

  /** 给所有代码块添加复制按钮 */
  addCopyCodeButtons() {
    const preview = this.markdownPreview.querySelector('.markdown-preview');
    if (!preview) return;
    const pres = preview.querySelectorAll('pre');
    pres.forEach((pre) => {
      // 避免重复添加
      if (pre.querySelector('.copy-code-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = '复制';
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent;
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = '已复制!';
          setTimeout(() => { btn.textContent = '复制'; }, 2000);
        } catch {
          btn.textContent = '复制失败';
        }
      });
      pre.appendChild(btn);
    });
  }

  /** KaTeX 渲染：将 $...$ 和 $$...$$ 转换为公式 */
  renderKaTeX() {
    const preview = this.markdownPreview.querySelector('.markdown-preview');
    if (!preview) return;
    // 处理行间公式 $$...$$
    const displayMath = preview.innerHTML.match(/\$\$([\s\S]*?)\$\$/g);
    if (displayMath) {
      displayMath.forEach((match) => {
        const expr = match.slice(2, -2).trim();
        try {
          const html = katex.renderToString(expr, { displayMode: true, throwOnError: false });
          preview.innerHTML = preview.innerHTML.replace(match, html);
        } catch (e) {
          preview.innerHTML = preview.innerHTML.replace(
            match,
            `<span class="katex-error" style="color:var(--color-danger)">公式错误: ${expr}</span>`
          );
        }
      });
    }
    // 处理行内公式 $...$（避免匹配 $$）
    const inlineMath = preview.innerHTML.match(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g);
    if (inlineMath) {
      inlineMath.forEach((match) => {
        const expr = match.slice(1, -1).trim();
        try {
          const html = katex.renderToString(expr, { displayMode: false, throwOnError: false });
          preview.innerHTML = preview.innerHTML.replace(match, html);
        } catch {}
      });
    }
  }

  /** Mermaid 渲染：调用 mermaid.run() 渲染已有 .mermaid 元素 */
  renderMermaid() {
    const preview = this.markdownPreview.querySelector('.markdown-preview');
    if (!preview) return;
    const mermaidEls = preview.querySelectorAll('.mermaid[data-processed="false"]');
    if (mermaidEls.length === 0) return;

    // 标记为已处理（防止重复渲染）
    mermaidEls.forEach((el) => el.dataset.processed = 'true');

    // 异步渲染
    setTimeout(async () => {
      try {
        await mermaid.run({
          nodes: Array.from(mermaidEls),
          suppressErrors: true,
        });
      } catch (err) {
        console.warn('Mermaid 渲染错:', err);
        mermaidEls.forEach((el) => {
          if (!el.querySelector('svg')) {
            el.innerHTML = `<pre class="mermaid-error">Mermaid 渲染失败</pre>`;
          }
        });
      }
    }, 0);
  }

  /** 生成目录 (TOC) */
  generateTOC() {
    if (!this.tocList) return;
    const preview = this.markdownPreview.querySelector('.markdown-preview');
    if (!preview) return;

    const headings = preview.querySelectorAll('h1, h2, h3');
    if (headings.length < 2) {
      this.tocPanel.style.display = 'none';
      return;
    }

    this.tocList.innerHTML = '';
    headings.forEach((h) => {
      const level = parseInt(h.tagName[1]);
      const text = h.textContent;
      const id = `toc-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')}-${Date.now()}`;
      h.id = id;

      const li = document.createElement('li');
      li.className = 'toc-item';
      li.style.paddingLeft = `${(level - 1) * 16}px`;
      li.innerHTML = `<a href="#${id}" class="toc-link">${this.escapeHtml(text)}</a>`;
      li.addEventListener('click', (e) => {
        e.preventDefault();
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      this.tocList.appendChild(li);
    });
    this.tocPanel.style.display = 'block';
  }

  // ======================= 滚动同步 =======================

  setupScrollSync() {
    const editorScroll = this.editorPane;
    const previewScroll = this.previewPane;
    if (!editorScroll || !previewScroll) return;

    // 移除旧监听器
    if (this._scrollSyncEditor) {
      editorScroll.removeEventListener('scroll', this._scrollSyncEditor);
    }
    if (this._scrollSyncPreview) {
      previewScroll.removeEventListener('scroll', this._scrollSyncPreview);
    }

    this._scrollSyncEditor = () => {
      if (this._scrollSyncLock) return;
      this._scrollSyncLock = true;
      const pct = editorScroll.scrollTop / (editorScroll.scrollHeight - editorScroll.clientHeight || 1);
      previewScroll.scrollTop = pct * (previewScroll.scrollHeight - previewScroll.clientHeight);
      requestAnimationFrame(() => { this._scrollSyncLock = false; });
    };

    this._scrollSyncPreview = () => {
      if (this._scrollSyncLock) return;
      this._scrollSyncLock = true;
      const pct = previewScroll.scrollTop / (previewScroll.scrollHeight - previewScroll.clientHeight || 1);
      editorScroll.scrollTop = pct * (editorScroll.scrollHeight - editorScroll.clientHeight);
      requestAnimationFrame(() => { this._scrollSyncLock = false; });
    };

    editorScroll.addEventListener('scroll', this._scrollSyncEditor);
    previewScroll.addEventListener('scroll', this._scrollSyncPreview);
  }

  // ======================= 任务列表勾选同步 =======================

  handleTaskListCheck(checkbox) {
    const preview = this.markdownPreview.querySelector('.markdown-preview');
    if (!preview) return;

    // 找到 checkbox 在预览 DOM 中的索引位置（第几个 checkbox）
    const allCheckboxes = preview.querySelectorAll('input[type="checkbox"]');
    const idx = Array.from(allCheckboxes).indexOf(checkbox);
    if (idx < 0) return;

    // 在编辑器内容中找到第 idx+1 个任务列表项
    const lines = this.getEditorContent().split('\n');
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(\s*[-*+]\s+\[)([ x])(\]\s+)/);
      if (match) {
        if (found === idx) {
          const checked = checkbox.checked ? 'x' : ' ';
          lines[i] = match[1] + checked + match[3] + lines[i].substring(match[0].length);
          this.setEditorContent(lines.join('\n'));
          return;
        }
        found++;
      }
    }
  }

  // ======================= 图片灯箱 =======================

  showImageLightbox(img) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-content">
        <button class="lightbox-close">&times;</button>
        <img src="${img.src}" alt="${img.alt || ''}" class="lightbox-image">
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.lightbox-close').addEventListener('click', close);
    overlay.querySelector('.lightbox-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  // ======================= 自动列表续写 =======================

  handleAutoListContinuation(event) {
    if (!this.cm) return false;
    const pos = this.cm.state.selection.main.head;
    const line = this.cm.state.doc.lineAt(pos);
    const text = line.text;

    // 无序列表
    const ulMatch = text.match(/^(\s*)([-*+])\s+/);
    if (ulMatch && text.trim() === ulMatch[0].trim()) {
      event.preventDefault();
      // 空列表项 → 删除当前项（结束列表）
      this.cm.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: { anchor: line.from },
      });
      return true;
    }
    if (ulMatch) {
      event.preventDefault();
      const prefix = ulMatch[1] + ulMatch[2] + ' ';
      this.cm.dispatch({
        changes: { from: pos, insert: '\n' + prefix },
        selection: { anchor: pos + 1 + prefix.length },
      });
      return true;
    }

    // 有序列表
    const olMatch = text.match(/^(\s*)(\d+)\.\s+/);
    if (olMatch && text.trim() === olMatch[0].trim()) {
      event.preventDefault();
      this.cm.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: { anchor: line.from },
      });
      return true;
    }
    if (olMatch) {
      event.preventDefault();
      const num = parseInt(olMatch[2]) + 1;
      const prefix = olMatch[1] + num + '. ';
      this.cm.dispatch({
        changes: { from: pos, insert: '\n' + prefix },
        selection: { anchor: pos + 1 + prefix.length },
      });
      return true;
    }

    // 任务列表
    const taskMatch = text.match(/^(\s*)[-*+]\s+\[\s\]\s+/);
    if (taskMatch && text.trim() === taskMatch[0].trim()) {
      event.preventDefault();
      this.cm.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: { anchor: line.from },
      });
      return true;
    }
    if (text.match(/^(\s*)[-*+]\s+\[[ x]\]\s+/)) {
      event.preventDefault();
      const prefix = text.match(/^(\s*)[-*+]\s+\[[ x]\]\s+/)[0].replace(/\[x\]/, '[ ]');
      this.cm.dispatch({
        changes: { from: pos, insert: '\n' + prefix },
        selection: { anchor: pos + 1 + prefix.length },
      });
      return true;
    }

    return false;
  }

  // ======================= 从内容标题同步笔记标题 =======================

  syncTitleFromContent() {
    const content = this.getEditorContent();
    const match = content.match(/^#\s+(.+)/m);
    if (match) {
      const headingTitle = match[1].trim();
      if (headingTitle && this.noteTitleInput.value !== headingTitle) {
        this.noteTitleInput.value = headingTitle;
      }
    }
  }

  // ======================= 拖拽 =======================

  setupDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      this.dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
      document.body.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
    });
    this.dropZone.addEventListener('dragenter', () => { this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('dragleave', (e) => {
      if (!this.dropZone.contains(e.relatedTarget)) { this.dropZone.classList.remove('drag-over'); }
    });
    this.dropZone.addEventListener('dragover', () => { this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('drop', (e) => {
      this.dropZone.classList.remove('drag-over');
      this.handleFileUpload(e.dataTransfer.files);
    });
  }

  // ======================= 笔记 CRUD =======================

  loadNotes() {
    let notes;
    if (this.currentTagId) {
      notes = this.db.getAllNotes().filter((note) =>
        this.db.getNoteTags(note.id).some((tag) => tag.id === this.currentTagId)
      );
    } else if (this.searchTerm) {
      notes = this.db.searchNotes(this.searchTerm);
    } else {
      notes = this.db.getAllNotes();
    }
    return this.sortNotes(notes);
  }

  sortNotes(notes) {
    const sorted = [...notes];
    switch (this.sortBy) {
      case 'created_desc': sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'created_asc': sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'title_asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'title_desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      case 'words_desc': sorted.sort((a, b) => (b.word_count || 0) - (a.word_count || 0)); break;
      case 'words_asc': sorted.sort((a, b) => (a.word_count || 0) - (b.word_count || 0)); break;
      default: sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)); break;
    }
    return sorted;
  }

  hideLoadingScreen() {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => { this.loadingScreen.style.display = 'none'; }, 500);
  }

  toggleSidebar() { this.sidebar.classList.toggle('hidden'); }

  /** 应用国际化翻译到所有 data-i18n 元素 */
  applyI18n() {
    // 更新文本内容
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // 更新 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // 更新 title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = t(key);
    });
  }

  /** 切换语言 */
  switchLanguage(lang) {
    setLanguage(lang);
    this.applyI18n();
    this.showSettingsToast(t('lang.switchTo' + (lang === 'zh' ? 'Zh' : 'En')));
  }

  showPage(pageName) {
    const activePage = document.querySelector('.page.active');
    let targetPage;
    if (pageName === 'list') targetPage = this.pageList;
    else if (pageName === 'settings') targetPage = this.pageSettings;
    else targetPage = this.pageEditor;
    if (activePage === targetPage) return;

    if (activePage) activePage.classList.remove('active');
    targetPage.classList.add('active');
  }

  renderTemplatesList() {
    const templates = this.db.getAllTemplates();
    this.templatesList.innerHTML = '';
    templates.forEach((template) => {
      const item = document.createElement('button');
      item.className = 'template-item';
      const iconName = template.icon || 'default';
      const iconSvg = getTemplateIconSvg(iconName, 18).svg;
      item.innerHTML = `<span class="template-icon">${iconSvg}</span><span class="template-name">${this.escapeHtml(template.name)}</span>`;
      item.addEventListener('click', () => this.createNoteFromTemplate(template.id));
      this.templatesList.appendChild(item);
    });
  }

  showTemplateMenu(e) {
    e.stopPropagation();
    if (this.templateMenu.children.length === 0) this.renderTemplateMenuItems();
    this.templateMenu.classList.toggle('show');
  }

  renderTemplateMenuItems() {
    const templates = this.db.getAllTemplates();
    this.templateMenu.innerHTML = '';
    this.templateMenu.appendChild(this.createTemplateMenuItem(null, '空白笔记', 'note'));
    const divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    this.templateMenu.appendChild(divider);
    templates.forEach((template) => {
      const iconName = template.icon || 'default';
      this.templateMenu.appendChild(this.createTemplateMenuItem(template.id, template.name, iconName));
    });
  }

  createTemplateMenuItem(templateId, name, iconType) {
    const item = document.createElement('button');
    item.className = 'dropdown-item';
    const iconSvg = getTemplateIconSvg(iconType, 18).svg;
    item.innerHTML = `<span class="menu-item-icon">${iconSvg}</span><span>${this.escapeHtml(name)}</span>`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.templateMenu.classList.remove('show');
      this.createNoteFromTemplate(templateId);
    });
    return item;
  }

  createNoteFromTemplate(templateId) {
    let content = '# 新笔记\n\n在这里开始编写你的 Markdown 笔记...\n';
    let defaultTitle = '未命名笔记';
    if (templateId) {
      const templates = this.db.getAllTemplates();
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        content = template.content;
        defaultTitle = template.name;
      }
    }
    // 弹出标题对话框
    this.showPromptDialog('新建笔记', defaultTitle, (title) => {
      if (!title) return; // 用户取消或输入空值
      const newNote = {
        id: Date.now().toString(),
        title: title.trim(),
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        word_count: 0,
      };
      this.db.createNote(newNote);
      this.renderNotesList();
      this.openNote(newNote.id);
    });
  }

  renderTagsList() {
    const tags = this.db.getAllTags();
    this.tagsList.innerHTML = '';
    tags.forEach((tag) => {
      const tagEl = this.createTagElement(tag);
      this.tagsList.appendChild(tagEl);
    });
  }

  createTagElement(tag) {
    const item = document.createElement('button');
    item.className = 'tag-item';
    if (this.currentTagId === tag.id) item.classList.add('active');
    item.innerHTML = `
      <div class="tag-color" style="background: ${tag.color}"></div>
      <span class="tag-name">${this.escapeHtml(tag.name)}</span>
      <button class="tag-delete" data-tag-id="${tag.id}" title="删除标签">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;
    item.addEventListener('click', (e) => {
      if (e.target.closest('.tag-delete')) return;
      this.currentTagId = this.currentTagId === tag.id ? null : tag.id;
      this.renderTagsList();
      this.renderNotesList();
    });
    item.querySelector('.tag-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await this.showConfirmDialog('确定要删除这个标签吗？')) {
        const stmt = this.db.db.prepare('DELETE FROM tags WHERE id = ?');
        stmt.run([tag.id]);
        stmt.free();
        this.db.saveToLocalStorage();
        if (this.currentTagId === tag.id) this.currentTagId = null;
        this.renderTagsList();
        this.renderNotesList();
      }
    });
    return item;
  }

  createNewTag() {
    this.showPromptDialog('请输入标签名称:', '', (name) => {
      if (!name || !name.trim()) return;
      const colors = ['#2563EB', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];
      const tag = this.db.createTag(name.trim(), colors[Math.floor(Math.random() * colors.length)]);
      if (tag) {
        this.renderTagsList();
      } else {
        this.showAlertDialog('标签已存在！');
      }
    });
  }

  openNote(noteId) {
    const note = this.db.getNoteById(noteId);
    if (!note) return;
    this.currentNoteId = noteId;
    this.noteTitleInput.value = note.title;
    this.setEditorContent(note.content);
    this._previewRaw = ''; // 强制重新渲染
    this.updatePreview();
    this.updateWordCount();
    this.renderAttachmentsList();
    this.renderEditorTags();
    this.showPage('editor', 'forward');
  }

  saveCurrentNote() {
    if (!this.currentNoteId) return;
    const note = this.db.getNoteById(this.currentNoteId);
    if (!note) return;
    const title = this.noteTitleInput.value || '未命名笔记';
    const content = this.getEditorContent();
    const updatedAt = new Date().toISOString();
    this.db.updateNote(this.currentNoteId, {
      title: title,
      content: content,
      updated_at: updatedAt,
      word_count: this.countWords(content),
    });
    this.renderNotesList();
    this.showSaveStatus('已保存');
    this.syncNoteToMD(this.currentNoteId, title, content, updatedAt);
  }

  autoSave() {
    if (!this.currentNoteId) return;
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.saveCurrentNote(), 1000);
  }

  deleteNote(noteId) {
    const note = this.db.getNoteById(noteId);
    this.db.deleteNote(noteId);
    if (this.currentNoteId === noteId) {
      this.currentNoteId = null;
      this.showPage('list', 'back');
    }
    this.renderNotesList();
    this.renderTagsList();
    if (note) this.removeNoteFile(note);
  }

  handleSearch(term) {
    this.searchTerm = term.toLowerCase().trim();
    this.renderNotesList();
  }

  handleFileUpload(files) {
    if (!this.currentNoteId || !files || files.length === 0) return;
    Array.from(files).forEach(async (file) => {
      const isImage = file.type.startsWith('image/');
      if (this.selectedDirHandle) {
        const subdir = isImage ? 'images' : 'attachments';
        try {
          const fileName = await this.saveFileToDir(subdir, file);
          if (fileName) {
            if (isImage) {
              const md = `![${file.name}](../images/${fileName})`;
              this.insertAtCursor(md);
            } else {
              const md = `[${file.name}](../attachments/${fileName})`;
              this.insertAtCursor(md);
            }
            this.showSaveStatus(isImage ? '图片已保存到 images/' : '附件已保存到 attachments/');
          }
        } catch (err) {
          console.error('保存文件失败:', err);
          this.showAlertDialog('保存文件失败');
        }
      } else {
        this.db
          .addAttachment(this.currentNoteId, file)
          .then(() => {
            this.renderAttachmentsList();
            this.showSaveStatus('附件已上传');
          })
          .catch((error) => {
            console.error('上传附件失败:', error);
            this.showAlertDialog('上传附件失败，请重试');
          });
      }
    });
    this.fileInput.value = '';
  }

  renderAttachmentsList() {
    if (!this.currentNoteId) {
      this.attachmentsList.innerHTML = '';
      return;
    }
    const attachments = this.db.getNoteAttachments(this.currentNoteId);
    this.attachmentsList.innerHTML = '';
    attachments.forEach((attachment) => {
      this.attachmentsList.appendChild(this.createAttachmentElement(attachment));
    });
  }

  createAttachmentElement(attachment) {
    const item = document.createElement('div');
    item.className = 'attachment-item';
    const fileExt = attachment.file_name.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExt);
    item.innerHTML = `
      <div class="attachment-icon">${isImage ? '🖼' : '📎'}</div>
      <div class="attachment-info">
        <div class="attachment-name">${this.escapeHtml(attachment.file_name)}</div>
        <div class="attachment-size">${this.formatFileSize(attachment.file_size)}</div>
      </div>
      <button class="attachment-delete" data-attachment-id="${attachment.id}" title="删除附件">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;
    item.addEventListener('click', (e) => {
      if (e.target.closest('.attachment-delete')) return;
      if (isImage) {
        window.open(attachment.url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.file_name;
        link.click();
      }
    });
    item.querySelector('.attachment-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await this.showConfirmDialog('确定要删除这个附件吗？')) {
        this.db.deleteAttachment(attachment.id);
        this.renderAttachmentsList();
        this.showSaveStatus('附件已删除');
      }
    });
    return item;
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  renderNotesList() {
    const notes = this.loadNotes();
    this.navAllCount.textContent = this.db.getAllNotes().length;
    this.totalNotesEl.textContent = notes.length;
    this.totalWordsEl.textContent = notes.reduce((sum, n) => sum + (n.word_count || 0), 0).toLocaleString();

    if (notes.length === 0 && !this.searchTerm && !this.currentTagId) {
      this.notesGrid.style.display = 'none';
      this.emptyState.style.display = 'flex';
      return;
    } else {
      this.notesGrid.style.display = 'grid';
      this.emptyState.style.display = 'none';
    }

    this.notesGrid.innerHTML = notes
      .map((note, index) => {
        const firstImage = this.extractFirstImage(note.content);
        const tags = this.db.getNoteTags(note.id);
        const imageHtml = firstImage
          ? `<div class="note-card-image"><img src="${firstImage}" alt="${this.escapeHtml(note.title)}" loading="lazy"></div>`
          : '';
        const tagsHtml = `<div class="note-card-tags">${tags
          .map(
            (tag) =>
              `<span class="note-tag" data-tag-id="${tag.id}" data-note-id="${note.id}" style="background: ${tag.color};cursor:pointer;" title="点击筛选"><span class="tag-color-dot"></span>${this.escapeHtml(tag.name)}</span>`
          )
          .join('')}<button class="note-card-tag-add" data-note-id="${note.id}" title="管理标签">+</button></div>`;
        return `
      <div class="note-card" data-note-id="${note.id}" style="animation-delay: ${index * 0.05}s">
        ${imageHtml}
        <div class="note-card-content">
          <div class="note-card-header">
            <div class="note-card-title">${this.escapeHtml(note.title)}</div>
            <div class="note-card-actions">
              <button class="note-card-btn duplicate" data-note-id="${note.id}" title="复制笔记">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="3" y="1" width="9" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                  <rect x="1" y="3" width="9" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="var(--bg-surface)"/>
                </svg>
              </button>
              <button class="note-card-btn delete" data-note-id="${note.id}" title="删除">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          ${tagsHtml}
          <div class="note-card-preview">${this.getPreviewText(note.content)}</div>
          <div class="note-card-footer">
            <span class="note-card-date">${this.formatDate(note.updated_at)}</span>
            <span class="note-card-words">${note.word_count || 0} 字</span>
          </div>
        </div>
      </div>`;
      })
      .join('');

    this.notesGrid.querySelectorAll('.note-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.note-card-btn')) return;
        this.openNote(e.currentTarget.dataset.noteId);
      });
    });
    this.notesGrid.querySelectorAll('.note-card-btn.duplicate').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.duplicateNote(e.currentTarget.dataset.noteId);
      });
    });
    this.notesGrid.querySelectorAll('.note-card-btn.delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const noteId = e.currentTarget.dataset.noteId;
        if (await this.showConfirmDialog('确定要删除这条笔记吗？')) {
          this.deleteNote(noteId);
        }
      });
    });
    this.notesGrid.querySelectorAll('.note-tag').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagId = parseInt(el.dataset.tagId);
        this.currentTagId = this.currentTagId === tagId ? null : tagId;
        this.renderTagsList();
        this.renderNotesList();
      });
    });
    this.notesGrid.querySelectorAll('.note-card-tag-add').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteId = btn.dataset.noteId;
        this.showCardTagPicker(noteId, btn);
      });
    });
    this.resolveCardImages();
  }

  async resolveCardImages() {
    if (!this.selectedDirHandle) return;
    const imgs = this.notesGrid.querySelectorAll('.note-card-image img');
    for (const img of imgs) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) continue;
      const match = src.match(/(?:\.\.\/)?(images|attachments)\/(.+)/);
      if (!match) continue;
      const relativePath = `${match[1]}/${match[2]}`;
      try {
        let blobUrl;
        if (window.electronAPI) {
          const res = await window.electronAPI.readFile(relativePath);
          if (res.success) {
            const byteChars = atob(res.data);
            const byteArray = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArray], { type: 'image/' + res.ext.replace('.', '') });
            blobUrl = URL.createObjectURL(blob);
          }
        } else {
          const dir = await this.selectedDirHandle.getDirectoryHandle(match[1]);
          const fileHandle = await dir.getFileHandle(match[2]);
          const file = await fileHandle.getFile();
          blobUrl = URL.createObjectURL(file);
        }
        if (blobUrl) {
          img.dataset.originalSrc = img.getAttribute('src');
          img.src = blobUrl;
        }
      } catch {
        const parent = img.closest('.note-card-image');
        if (parent) parent.style.display = 'none';
      }
    }
  }

  showCardTagPicker(noteId, anchorEl) {
    const old = document.querySelector('.card-tag-picker');
    if (old && old.dataset.noteId === noteId) { old.remove(); return; }
    if (old) old.remove();

    const allTags = this.db.getAllTags();
    const noteTags = this.db.getNoteTags(noteId);
    const noteTagIds = noteTags.map((t) => t.id);
    const availableTags = allTags.filter((t) => !noteTagIds.includes(t.id));

    const picker = document.createElement('div');
    picker.className = 'card-tag-picker';
    picker.dataset.noteId = noteId;
    picker.innerHTML = `
      <div class="card-tag-picker-header">管理标签</div>
      <div class="card-tag-picker-tags">
        ${noteTags
          .map(
            (t) =>
              `<span class="card-tag-picker-item active" data-tag-id="${t.id}" style="border-color:${t.color}"><span class="tag-dot" style="background:${t.color}"></span>${this.escapeHtml(t.name)}</span>`
          )
          .join('')}
        ${availableTags
          .map(
            (t) =>
              `<span class="card-tag-picker-item" data-tag-id="${t.id}" style="border-color:${t.color}"><span class="tag-dot" style="background:${t.color}"></span>${this.escapeHtml(t.name)}</span>`
          )
          .join('')}
      </div>`;

    const rect = anchorEl.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = rect.bottom + 6 + 'px';
    picker.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 220)) + 'px';

    document.body.appendChild(picker);

    picker.querySelectorAll('.card-tag-picker-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagId = parseInt(el.dataset.tagId);
        const isActive = el.classList.contains('active');
        if (isActive) {
          this.db.removeTagFromNote(noteId, tagId);
          el.classList.remove('active');
        } else {
          this.db.addTagToNote(noteId, tagId);
          el.classList.add('active');
        }
        this.renderNotesList();
      });
    });

    const close = (e) => {
      if (!picker.contains(e.target) && e.target !== anchorEl) {
        picker.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  updateWordCount() {
    const content = this.getEditorContent();
    this.wordCountEl.textContent = `${this.countWords(content)} 字`;
    this.charCountEl.textContent = `${content.length} 字符`;
  }

  switchView(view) {
    this.currentView = view;
    this.viewBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
    const cfg = { split: [1, 1], edit: [1, 0], preview: [0, 1] }[view];
    this.editorPane.style.display = cfg[0] ? 'flex' : 'none';
    this.previewPane.style.display = cfg[1] ? 'flex' : 'none';
    this.editorDivider.style.display = cfg[0] && cfg[1] ? 'flex' : 'none';
    this.editorPane.style.flex = '1';
    this.previewPane.style.flex = '1';
    // CM 重新测量
    if (this.cm) setTimeout(() => this.cm.requestMeasure(), 50);
  }

  handleEditorAction(action) {
    const getContent = () => this.getEditorContent();
    const getSelection = () => {
      if (this.cm) {
        const { from, to } = this.cm.state.selection.main;
        return { start: from, end: to, text: this.cm.state.sliceDoc(from, to) };
      }
      return { start: 0, end: 0, text: '' };
    };

    const sel = getSelection();
    const selectedText = sel.text;
    const actions = {
      bold: [`**${selectedText || '粗体文本'}**`, selectedText ? 0 : 4],
      italic: [`*${selectedText || '斜体文本'}*`, selectedText ? 0 : 4],
      strikethrough: [`~~${selectedText || '删除线文本'}~~`, selectedText ? 0 : 5],
      heading: [`## ${selectedText || '标题'}`, selectedText ? 0 : -3],
      link: [`[${selectedText || '链接文本'}](https://example.com)`, selectedText ? 0 : -11],
      image: [`![${selectedText || '图片描述'}](https://example.com/image.jpg)`, -27],
      code: [
        selectedText?.includes('\n')
          ? `\n\`\`\`\n${selectedText || '代码'}\n\`\`\`\n`
          : `\`${selectedText || '代码'}\``,
        0,
      ],
      codeblock: [`\n\`\`\`javascript\n${selectedText || '// 代码块'}\n\`\`\`\n`, 0],
      quote: [`\n> ${selectedText || '引用文本'}\n`, 0],
      ul: [`\n- ${selectedText || '列表项'}\n`, 0],
      ol: [`\n1. ${selectedText || '列表项'}\n`, 0],
      task: [`\n- [ ] ${selectedText || '任务项'}\n`, 0],
      table: ['\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n', 0],
      hr: ['\n---\n', 0],
    };
    const [replacement, cursorOffset] = actions[action] || ['', 0];

    if (this.cm) {
      const { from, to } = this.cm.state.selection.main;
      const newPos =
        cursorOffset < 0
          ? from + replacement.length + cursorOffset
          : from + replacement.length + cursorOffset;
      this.cm.dispatch({
        changes: { from, to, insert: replacement },
        selection: { anchor: newPos },
      });
      this.cm.focus();
    } else if (this.markdownEditor) {
      const ta = this.markdownEditor;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + replacement + ta.value.substring(end);
      ta.focus();
      const newPos =
        cursorOffset < 0 ? ta.value.length + cursorOffset : start + replacement.length + cursorOffset;
      ta.setSelectionRange(newPos, newPos);
    }
    this.debouncedRender();
    this.autoSave();
  }

  setupDividerDrag() {
    let isDragging = false;
    this.editorDivider.addEventListener('mousedown', () => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const container = document.getElementById('editorContainer');
      const rect = container.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      if (percentage > 20 && percentage < 80) {
        this.editorPane.style.flex = `0 0 ${percentage}%`;
        this.previewPane.style.flex = `0 0 ${100 - percentage}%`;
      }
    });
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (this.cm) this.cm.requestMeasure();
      }
    });
  }

  highlightSearchResults() {
    if (!this.searchTerm) return;
    const previewEl = this.markdownPreview.querySelector('.markdown-preview');
    if (!previewEl) return;
    this.highlightTextInNode(previewEl, this.searchTerm);
  }

  highlightTextInNode(node, searchTerm) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const regex = new RegExp(`(${this.escapeRegExp(searchTerm)})`, 'gi');
      if (regex.test(text)) {
        const fragment = document.createDocumentFragment();
        text.split(regex).forEach((part) => {
          if (part.toLowerCase() === this.searchTerm.toLowerCase()) {
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = part;
            fragment.appendChild(mark);
          } else {
            fragment.appendChild(document.createTextNode(part));
          }
        });
        node.parentNode.replaceChild(fragment, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
      Array.from(node.childNodes).forEach((child) => this.highlightTextInNode(child, this.searchTerm));
    }
  }

  /** 导出 ZIP 包：MD 文件 + 引用的图片/附件 + HTML */
  async exportToZip() {
    if (!this.currentNoteId) {
      this.showSaveStatus('请先打开一篇笔记');
      return;
    }
    this.showSaveStatus('正在打包...');
    const title = this.noteTitleInput.value || '笔记';
    const safeName = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').substring(0, 60) || 'note';
    // 所有文件共享同一套路径 ../images/xxx，统一放入 notes/ 子目录
    const mdContent = this.buildMDFrontmatter(
      this.currentNoteId,
      title,
      this.getEditorContent(),
      new Date().toISOString()
    );
    // 预览内容：恢复原始路径 + 处理无源 blob 图片
    let exportContent = this.markdownPreview.innerHTML;
    const blobImages = [];

    // 1) 有 data-original-src 的图片：恢复原始路径（../images/xxx）
    const previewDom = this.markdownPreview.querySelector('.markdown-preview');
    if (previewDom) {
      previewDom.querySelectorAll('img[data-original-src]').forEach((img) => {
        const blobSrc = img.getAttribute('src');
        const originalSrc = img.dataset.originalSrc;
        if (blobSrc && originalSrc) {
          exportContent = exportContent.replaceAll(blobSrc, originalSrc);
        }
      });
    }

    // 2) 剩余的 blob URL（粘贴的无源图片）：fetch 数据并加入 images/
    if (previewDom) {
      const remainingBlobs = previewDom.querySelectorAll('img[src^="blob:"]:not([data-original-src])');
      for (const img of remainingBlobs) {
        const src = img.getAttribute('src');
        if (!src) continue;
        try {
          let blob, ext = 'png';
          const cached = this._blobDataMap.get(src);
          if (cached) {
            const rawName = cached.fileName;
            ext = rawName.includes('.') ? rawName.split('.').pop() : 'png';
            blob = new Blob([cached.data], { type: `image/${ext}` });
          } else {
            const resp = await fetch(src);
            blob = await resp.blob();
            ext = (blob.type.split('/')[1] || 'png').replace(/[^a-z0-9]/g, '');
          }
          const fileName = `${safeName}_img_${blobImages.length}.${ext}`;
          blobImages.push({ fileName, blob });
          exportContent = exportContent.replace(src, `../images/${fileName}`);
        } catch (e) {
          console.warn('导出无源图片失败:', src, e.message || e);
        }
      }
    }

    try {
      const zip = new JSZip();
      const folder = zip.folder(safeName);

      // 1. 创建 notes/ 子目录，所有文档放这里，路径统一使用原始 ../images/xxx
      const notesFolder = folder.folder('notes');
      notesFolder.file(`${safeName}.md`, mdContent);

      // 2. 无源 blob 图片加入 images/
      const imagesFolder = folder.folder('images');
      const attachmentsFolder = folder.folder('attachments');
      blobImages.forEach(({ fileName, blob }) => {
        imagesFolder.file(fileName, blob);
      });

      // 2. 添加 HTML 版本（预览 HTML 已含标题，无需额外 <h1>）
      const printStyle = `
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.8; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a202c; }
        h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
        h1 { font-size: 2rem; border-bottom: 2px solid #2563EB; padding-bottom: 0.5em; }
        code { background: #f7fafc; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
        pre { background: #f7fafc; padding: 20px; border-radius: 8px; overflow-x: auto; border-left: 4px solid #2563EB; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #2563EB; padding-left: 20px; margin: 20px 0; color: #4a5568; font-style: italic; }
        a { color: #2563EB; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 12px; }
        th { background: #f7fafc; }`;
      const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${this.escapeHtml(title)}</title><style>${printStyle}</style></head><body>${exportContent}</body></html>`;
      notesFolder.file(`${safeName}.html`, printHtml);

      // 3. 提取并打包引用的图片和附件
      const content = this.getEditorContent();
      // 匹配 Markdown 图片：![alt](path) 和 HTML 图片路径
      const refs = new Set();
      const imgMatches = content.matchAll(/!\[.*?\]\(([^)]+)\)/g);
      for (const m of imgMatches) refs.add(m[1]);
      const htmlImgMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/g);
      for (const m of htmlImgMatches) refs.add(m[1]);
      // 匹配附件：[name](path) 且非图片格式
      const attachMatches = content.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
      for (const m of attachMatches) {
        const path = m[2];
        if (!path.startsWith('http') && !path.startsWith('#') && !path.startsWith('blob:') && !path.startsWith('data:')) {
          refs.add(path);
        }
      }

      for (const ref of refs) {
        // 提取文件名
        const fileName = ref.split('/').pop() || ref;
        const isImage = /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(ref);

        try {
          // 1) 外部 URL → fetch
          if (ref.startsWith('http://') || ref.startsWith('https://')) {
            const resp = await fetch(ref);
            if (resp.ok) {
              const blob = await resp.blob();
              const target = isImage ? imagesFolder : attachmentsFolder;
              target.file(fileName, blob);
            }
            continue;
          }
          // 2) 本地路径 → 从文件系统读取
          const match = ref.match(/(?:\.\.\/)?(images|attachments)\/(.+)/);
          if (match && this.selectedDirHandle) {
            const relativePath = `${match[1]}/${match[2]}`;
            let fileData;
            if (window.electronAPI) {
              const res = await window.electronAPI.readFile(relativePath);
              if (res.success) {
                const byteChars = atob(res.data);
                const byteArray = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
                fileData = byteArray;
              }
            } else {
              try {
                const dir = await this.selectedDirHandle.getDirectoryHandle(match[1]);
                const fileHandle = await dir.getFileHandle(match[2]);
                const file = await fileHandle.getFile();
                fileData = await file.arrayBuffer();
              } catch {}
            }
            if (fileData) {
              const target = match[1] === 'images' ? imagesFolder : attachmentsFolder;
              target.file(match[2], fileData);
            }
          }
        } catch (err) {
          console.warn(`导出文件失败: ${ref}`, err);
        }
      }

      // 5. 生成 ZIP 并下载
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showSaveStatus('ZIP 包已导出');
    } catch (err) {
      console.error('导出 ZIP 失败:', err);
      this.showAlertDialog('导出 ZIP 失败: ' + (err.message || '未知错误'));
    }
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    if (this.isDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('fiddle-notes-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('fiddle-notes-theme', 'light');
    }
    this.updateCMTheme();
  }

  setupTheme() {
    if (localStorage.getItem('fiddle-notes-theme') === 'dark') {
      this.isDarkTheme = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // ======================= 键盘快捷键 =======================

  handleKeyboardShortcuts(e) {
    const ctrl = e.ctrlKey || e.metaKey;

    // 编辑器内的快捷键（只有在编辑器页面且未聚焦在输入框时，或 CM 有焦点时生效）
    const isEditorActive = this.pageEditor.classList.contains('active');
    const isCMFocused = this.cm && this.cm.hasFocus;

    // 保存
    if (ctrl && e.key === 's') {
      e.preventDefault();
      this.saveCurrentNote();
      return;
    }
    // 新建笔记
    if (ctrl && e.key === 'n' && isEditorActive) {
      e.preventDefault();
      this.createNoteFromTemplate(null);
      return;
    }
    // 导出 PDF

    // 加粗 Ctrl+B
    if (ctrl && e.key === 'b' && (isCMFocused || isEditorActive)) {
      e.preventDefault();
      this.handleEditorAction('bold');
      return;
    }
    // 斜体 Ctrl+I
    if (ctrl && e.key === 'i' && (isCMFocused || isEditorActive)) {
      e.preventDefault();
      this.handleEditorAction('italic');
      return;
    }
    // 代码块 Ctrl+Shift+K
    if (ctrl && e.shiftKey && e.key === 'K' && (isCMFocused || isEditorActive)) {
      e.preventDefault();
      this.handleEditorAction('codeblock');
      return;
    }

    if (e.key === 'Escape') {
      const modal = document.querySelector('.template-modal-overlay');
      if (modal) { modal.remove(); return; }
      const dropdown = document.querySelector('.editor-tag-dropdown');
      if (dropdown) { dropdown.remove(); return; }
      if (this.pageEditor.classList.contains('active')) {
        this.showPage('list', 'back');
      } else if (this.pageSettings.classList.contains('active')) {
        document.querySelector('.nav-item[data-view="all"]').classList.add('active');
        this.showPage('list', 'back');
      }
    }
  }

  // ======================= 存储路径 =======================

  async restoreStoragePath() {
    if (!window.electronAPI) return;
    try {
      const rootPath = await window.electronAPI.getStorageRoot();
      if (rootPath) {
        localStorage.setItem('fiddle-notes-root-path', rootPath);
        this.selectedDirHandle = { _electronPath: rootPath };
        console.log('✅ 已从配置文件恢复存储路径:', rootPath);
      }
    } catch (e) {
      console.warn('恢复存储路径失败:', e);
    }
  }

  checkStoragePath() {
    const hasPath = localStorage.getItem('fiddle-notes-root-path');

    if (hasPath && !this.selectedDirHandle) {
      if (!window.electronAPI) {
        this.showReSelectPrompt(hasPath);
      }
      return;
    }

    if (hasPath) return;

    if (localStorage.getItem('fiddle-notes-path-prompted')) return;
    localStorage.setItem('fiddle-notes-path-prompted', 'true');
    this.showStoragePathPrompt();
  }

  showReSelectPrompt(pathName) {
    const overlay = document.createElement('div');
    overlay.className = 'template-modal-overlay';
    overlay.innerHTML = `
      <div class="template-modal" style="max-width:480px;">
        <div class="template-modal-header">
          <div class="template-modal-title">📂 重新选择文件夹</div>
        </div>
        <div class="template-modal-body">
          <div class="settings-field">
            <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:var(--space-5);font-size:var(--text-sm);">
              页面已刷新，需要重新选择存储文件夹 <strong>${this.escapeHtml(pathName)}</strong>
              以恢复文件读写权限。
            </p>
            <div style="display:flex;flex-direction:column;gap:var(--space-3);align-items:stretch;">
              <button class="btn-settings-primary" id="promptBrowseBtn" style="justify-content:center;padding:var(--space-4);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/>
                  <path d="M12 5v14"/>
                </svg>
                <span>重新选择文件夹</span>
              </button>              <button class="btn-settings-secondary" id="promptSkipBtn" style="justify-content:center;padding:var(--space-4);">
                <span>暂不使用（使用 localStorage）</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#promptBrowseBtn').addEventListener('click', () => {
      overlay.remove();
      this.headerSettingsBtn.click();
      setTimeout(() => this.browseStorageFolder(), 500);
    });
    overlay.querySelector('#promptSkipBtn').addEventListener('click', () => {
      localStorage.removeItem('fiddle-notes-root-path');
      overlay.remove();
      this.showSettingsToast('已切换回 localStorage');
    });
  }


  showStoragePathPrompt() {
    const overlay = document.createElement('div');
    overlay.className = 'template-modal-overlay';
    overlay.innerHTML = `
      <div class="template-modal" style="max-width:500px;">
        <div class="template-modal-header">
          <div class="template-modal-title">📂 设置存储路径</div>
        </div>
        <div class="template-modal-body">
          <div class="settings-field">
            <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:var(--space-5);font-size:var(--text-sm);">
              你的笔记数据当前存储在 <strong>浏览器 localStorage</strong> 中，清除浏览器缓存会导致数据丢失！
            </p>
            <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:var(--space-5);font-size:var(--text-sm);">
              建议选择一个本地文件夹，每条笔记将保存为 <strong>独立的 .md 文件</strong>，
              可以直接用任何文本编辑器打开查看和编辑。
            </p>
            <div style="display:flex;flex-direction:column;gap:var(--space-3);align-items:stretch;">
              <button class="btn-settings-primary" id="promptBrowseBtn" style="justify-content:center;padding:var(--space-4);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/>
                  <path d="M12 5v14"/>
                </svg>
                <span>选择存储文件夹</span>
              </button>
              <button class="btn-settings-secondary" id="promptLaterBtn" style="justify-content:center;padding:var(--space-4);">
                <span>稍后设置（使用 localStorage）</span>
              </button>
            </div>
            <div id="promptLocalInfo" style="display:none;margin-top:var(--space-4);padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-lg);">
              <p style="font-size:var(--text-xs);color:var(--text-tertiary);line-height:1.6;">
                ⚠️ 数据存储在浏览器 localStorage 中，随时可以前往 <strong>设置 → 存储设置</strong> 配置本地文件夹。
                <br><br>
                当前存储位置：<code style="font-size:var(--text-xs);">浏览器内部存储</code>
              </p>
            </div>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#promptBrowseBtn').addEventListener('click', async () => {
      overlay.remove();
      this.headerSettingsBtn.click();
      setTimeout(() => this.browseStorageFolder(), 500);
    });

    overlay.querySelector('#promptLaterBtn').addEventListener('click', () => {
      const info = overlay.querySelector('#promptLocalInfo');
      info.style.display = 'block';
      overlay.querySelector('#promptLaterBtn').textContent = '知道了';
      overlay.querySelector('#promptLaterBtn').onclick = () => overlay.remove();
    });
  }

  showSettingsPage() {
    this.loadSettings();
    this.renderTemplateManager();
    this.showPage('settings', 'forward');
  }

  loadSettings() {
    const rootPath = localStorage.getItem('fiddle-notes-root-path') || '';
    this.storageRootPath.value = rootPath;
    if (rootPath) {
      this.storagePathHint.textContent = `笔记→notes/  图片→images/  附件→attachments/`;
      this.storageInfo.textContent = `${rootPath}/ (notes + images + attachments)`;
    } else {
      this.storagePathHint.textContent =
        '当前使用浏览器 localStorage（关闭浏览器可能丢失数据）。建议选择文件夹，笔记将保存为独立的 .md 文件。';
      this.storageInfo.textContent = '浏览器 localStorage';
    }
  }

  async browseStorageFolder() {
    try {
      if (window.electronAPI) {
        const selectedPath = await window.electronAPI.selectFolder();
        if (!selectedPath) return;
        await window.electronAPI.setStorageRoot(selectedPath);
        const shortName = selectedPath.split(/[\\/]/).pop();
        const rootPath = selectedPath;
        localStorage.setItem('fiddle-notes-root-path', rootPath);
        this.storageRootPath.value = shortName;
        this.storagePathHint.textContent = `笔记 → ${rootPath}/notes/  |  图片 → ${rootPath}/images/`;
        this.storageInfo.textContent = `${rootPath}/ (notes + images + attachments)`;
        this.selectedDirHandle = { _electronPath: rootPath };
        this.showSettingsToast('文件夹已就绪');
        await this.exportAllNotesToMD();
        this.renderNotesList();
        return;
      }

      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        const path = dirHandle.name;
        localStorage.setItem('fiddle-notes-root-path', path);
        localStorage.setItem('fiddle-notes-dir-handle', JSON.stringify({ name: dirHandle.name }));
        this.storageRootPath.value = path;
        this.selectedDirHandle = dirHandle;

        this.showSettingsToast('正在创建目录结构...');
        await this.ensureSubdirs(dirHandle);

        this.storagePathHint.textContent = `笔记 → ${path}/notes/  |  图片 → ${path}/images/  |  附件 → ${path}/attachments/`;
        this.storageInfo.textContent = `${path}/ (notes + images + attachments)`;
        this.showSettingsToast('文件夹已就绪，正在导出笔记...');
        await this.exportAllNotesToMD();
        this.showSettingsToast('笔记已导出到文件夹');
        this.renderNotesList();
      } else {
        this.showAlertDialog('您的浏览器不支持文件夹选择。已使用 localStorage 作为备选存储方案。');
        this.storageRootPath.value = '';
        this.storageRootPath.removeAttribute('readonly');
        this.storageRootPath.placeholder = '手动输入存储路径...';
        this.browseStoragePath.textContent = '确认路径';
        this.browseStoragePath.onclick = () => {
          const path = this.storageRootPath.value.trim();
          if (path) {
            localStorage.setItem('fiddle-notes-root-path', path);
            this.storagePathHint.textContent = `数据将保存到: ${path}`;
            this.showSettingsToast('路径已设置');
          }
        };
      }
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'SecurityError') {
        console.error('选择文件夹失败:', error);
        this.showSettingsToast('选择文件夹失败');
      }
    }
  }

  saveSettings() {
    const rootPath = this.storageRootPath.value.trim();
    if (rootPath) {
      localStorage.setItem('fiddle-notes-root-path', rootPath);
      if (this.selectedDirHandle) this.syncToDirectory(this.selectedDirHandle);
      this.showSettingsToast('设置已保存');
      this.renderNotesList();
    } else {
      localStorage.removeItem('fiddle-notes-root-path');
      this.showSettingsToast('已切换回浏览器本地存储');
    }
  }

  async syncToDirectory(dirHandle) {
    try {
      const data = this.db.db.export();
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const fileHandle = await dirHandle.getFileHandle('fiddle-notes.db', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      const jsonData = this.exportDataAsJSON();
      const jsonHandle = await dirHandle.getFileHandle('fiddle-notes-backup.json', { create: true });
      const jsonWritable = await jsonHandle.createWritable();
      await jsonWritable.write(jsonData);
      await jsonWritable.close();
      console.log('✅ 数据已同步到文件夹:', dirHandle.name);
    } catch (error) {
      console.error('同步到文件夹失败:', error);
      this.showSettingsToast('同步到文件夹失败');
    }
  }

  exportDataAsJSON() {
    return JSON.stringify(
      {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        notes: this.db.getAllNotes(),
        tags: this.db.getAllTags(),
        templates: this.db.getAllTemplates(),
      },
      null,
      2
    );
  }

  exportAllData() {
    try {
      const blob = new Blob([this.exportDataAsJSON()], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fiddle-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showSettingsToast('数据已导出');
    } catch (error) {
      console.error('导出失败:', error);
      this.showSettingsToast('导出失败');
    }
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.notes && !data.tags && !data.templates) {
          this.showSettingsToast('无效的备份文件');
          return;
        }
        if (!(await this.showConfirmDialog('导入将合并数据，是否继续？'))) return;
        if (data.notes && Array.isArray(data.notes))
          data.notes.forEach((note) => {
            if (!this.db.getNoteById(note.id)) this.db.createNote(note);
          });
        if (data.tags && Array.isArray(data.tags))
          data.tags.forEach((tag) => this.db.createTag(tag.name, tag.color));
        if (data.templates && Array.isArray(data.templates))
          data.templates.forEach((tpl) => this.db.createTemplate(tpl.name, tpl.content, tpl.icon));
        this.renderNotesList();
        this.renderTagsList();
        this.renderTemplatesList();
        this.showSettingsToast('数据已导入');
      } catch (error) {
        console.error('导入失败:', error);
        this.showSettingsToast('导入失败，请检查文件格式');
      }
    });
    input.click();
  }

  async resetAllData() {
    if (!(await this.showConfirmDialog('确定要重置所有数据吗？此操作不可恢复！\n\n建议先导出数据备份。'))) return;
    if (!(await this.showConfirmDialog('再次确认：所有笔记、标签和模板将被永久删除！'))) return;
    try {
      localStorage.removeItem('fiddle-notes-db');
      localStorage.removeItem('fiddle-notes-root-path');
      localStorage.removeItem('fiddle-notes-dir-handle');
      this.db.initialized = false;
      this.db.init().then(() => {
        this.db.initDefaultTemplates();
        this.renderNotesList();
        this.renderTagsList();
        this.renderTemplatesList();
        this.loadSettings();
        this.showSettingsToast('数据已重置');
      });
    } catch (error) {
      console.error('重置失败:', error);
      this.showSettingsToast('重置失败');
    }
  }

  showSettingsToast(message) {
    const old = document.querySelector('.settings-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'settings-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ======================= 通用对话框 =======================

  showConfirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'template-modal-overlay';
      overlay.innerHTML = `
        <div class="template-modal" style="max-width:400px;">
          <div class="template-modal-body" style="padding:var(--space-8);text-align:center;">
            <p style="color:var(--text-secondary);line-height:1.7;font-size:var(--text-sm);margin-bottom:var(--space-6);">${this.escapeHtml(message)}</p>
            <div style="display:flex;gap:var(--space-3);justify-content:center;">
              <button class="btn-settings-secondary modal-confirm-cancel" style="padding:var(--space-3) var(--space-6);">取消</button>
              <button class="btn-settings-primary modal-confirm-ok" style="padding:var(--space-3) var(--space-6);">确定</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('.modal-confirm-ok').addEventListener('click', () => { overlay.remove(); resolve(true); });
      overlay.querySelector('.modal-confirm-cancel').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    });
  }

  showPromptDialog(title, defaultValue, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'template-modal-overlay';
    overlay.innerHTML = `
      <div class="template-modal" style="max-width:420px;">
        <div class="template-modal-header">
          <div class="template-modal-title">${this.escapeHtml(title)}</div>
        </div>
        <div class="template-modal-body">
          <input type="text" class="template-modal-input modal-prompt-input" value="${this.escapeHtml(defaultValue || '')}" placeholder="请输入..." autofocus>
        </div>
        <div class="template-modal-footer">
          <button class="btn-settings-secondary modal-prompt-cancel">取消</button>
          <button class="btn-settings-primary modal-prompt-ok">确定</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('.modal-prompt-input');
    const close = () => { overlay.remove(); callback(null); };
    overlay.querySelector('.modal-prompt-ok').addEventListener('click', () => { const v = input.value.trim(); overlay.remove(); callback(v || null); });
    overlay.querySelector('.modal-prompt-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('.modal-prompt-ok').click(); if (e.key === 'Escape') close(); });
    setTimeout(() => input.focus(), 100);
  }

  showAlertDialog(message) {
    const overlay = document.createElement('div');
    overlay.className = 'template-modal-overlay';
    overlay.innerHTML = `
      <div class="template-modal" style="max-width:400px;">
        <div class="template-modal-body" style="padding:var(--space-8);text-align:center;">
          <p style="color:var(--text-secondary);line-height:1.7;font-size:var(--text-sm);margin-bottom:var(--space-6);">${this.escapeHtml(message)}</p>
          <button class="btn-settings-primary modal-alert-ok" style="padding:var(--space-3) var(--space-6);">知道了</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-alert-ok').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ======================= 编辑器标签 =======================

  renderEditorTags() {
    this.editorTagsList.innerHTML = '';
    if (!this.currentNoteId) return;
    const tags = this.db.getNoteTags(this.currentNoteId);
    if (tags.length === 0) {
      this.editorTagsList.innerHTML =
        '<span class="editor-tags-label" style="color:var(--text-tertiary);font-weight:300;">无标签</span>';
      return;
    }
    tags.forEach((tag) => {
      const el = document.createElement('span');
      el.className = 'editor-tag';
      el.style.background = tag.color;
      el.innerHTML = `${this.escapeHtml(tag.name)}<button class="editor-tag-remove" data-tag-id="${tag.id}" title="移除标签">&times;</button>`;
      el.querySelector('.editor-tag-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTagFromCurrentNote(tag.id);
      });
      this.editorTagsList.appendChild(el);
    });
  }

  showEditorTagDropdown(e) {
    e.stopPropagation();
    const old = document.querySelector('.editor-tag-dropdown');
    if (old) { old.remove(); return; }
    const allTags = this.db.getAllTags();
    const noteTags = this.currentNoteId ? this.db.getNoteTags(this.currentNoteId) : [];
    const noteTagIds = noteTags.map((t) => t.id);
    const availableTags = allTags.filter((t) => !noteTagIds.includes(t.id));
    if (availableTags.length === 0) { this.showSettingsToast('没有更多可用标签'); return; }
    const dropdown = document.createElement('div');
    dropdown.className = 'editor-tag-dropdown show';
    dropdown.style.position = 'absolute';
    availableTags.forEach((tag) => {
      const item = document.createElement('button');
      item.className = 'editor-tag-dropdown-item';
      item.innerHTML = `<span class="tag-dot" style="background:${tag.color}"></span><span>${this.escapeHtml(tag.name)}</span>`;
      item.addEventListener('click', () => { this.addTagToCurrentNote(tag.id); dropdown.remove(); });
      dropdown.appendChild(item);
    });
    this.editorTagsAddBtn.style.position = 'relative';
    this.editorTagsAddBtn.appendChild(dropdown);
    setTimeout(() => {
      document.addEventListener('click', function closeHandler(ev) {
        if (!dropdown.contains(ev.target) && ev.target !== document.querySelector('.editor-tags-add')) {
          dropdown.remove();
          document.removeEventListener('click', closeHandler);
        }
      });
    }, 10);
  }

  addTagToCurrentNote(tagId) {
    if (!this.currentNoteId) return;
    this.db.addTagToNote(this.currentNoteId, tagId);
    this.renderEditorTags();
  }
  removeTagFromCurrentNote(tagId) {
    if (!this.currentNoteId) return;
    this.db.removeTagFromNote(this.currentNoteId, tagId);
    this.renderEditorTags();
  }

  duplicateNote(noteId) {
    const original = this.db.getNoteById(noteId);
    if (!original) return;
    const newNote = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      title: original.title + ' (副本)',
      content: original.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      word_count: original.word_count,
    };
    this.db.createNote(newNote);
    this.db.getNoteTags(noteId).forEach((tag) => this.db.addTagToNote(newNote.id, tag.id));
    this.renderNotesList();
    this.showSettingsToast('笔记已复制');
  }

  // ======================= .md 文件同步 =======================

  sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').substring(0, 100) || 'untitled';
  }

  buildMDFrontmatter(noteId, title, content, updatedAt) {
    const note = this.db.getNoteById(noteId);
    const tags = note ? this.db.getNoteTags(noteId) : [];
    const tagList = tags.map((t) => t.name).join(', ');
    const created = note ? note.created_at : updatedAt;
    return `---
title: "${title.replace(/"/g, '\\"')}"
created: ${created}
updated: ${updatedAt}
tags: [${tagList}]

---

${content}
`;
  }

  async syncNoteToMD(noteId, title, content, updatedAt) {
    if (!this.selectedDirHandle) return;
    try {
      const mdContent = this.buildMDFrontmatter(noteId, title, content, updatedAt);
      const fileName = this.sanitizeFileName(title) + '.md';
      const relativePath = `notes/${fileName}`;

      if (window.electronAPI) {
        await window.electronAPI.writeFile(relativePath, mdContent);
        return;
      }

      let notesDir;
      try {
        notesDir = await this.selectedDirHandle.getDirectoryHandle('notes', { create: true });
      } catch {
        notesDir = await this.selectedDirHandle.getDirectoryHandle('notes', { create: true });
      }
      const fileHandle = await notesDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(mdContent);
      await writable.close();
    } catch (error) {
      console.warn('同步 .md 文件失败:', error);
    }
  }

  async removeNoteFile(note) {
    if (!this.selectedDirHandle) return;
    try {
      const fileName = this.sanitizeFileName(note.title) + '.md';
      const relativePath = `notes/${fileName}`;
      if (window.electronAPI) {
        await window.electronAPI.deleteFile(relativePath);
        return;
      }
      const notesDir = await this.selectedDirHandle.getDirectoryHandle('notes');
      await notesDir.removeEntry(fileName);
    } catch { /* 忽略 */ }
  }

  async exportAllNotesToMD() {
    if (!this.selectedDirHandle) return;
    const notes = this.db.getAllNotes();
    for (const note of notes) {
      await this.syncNoteToMD(note.id, note.title, note.content, note.updated_at);
    }
    if (notes.length > 0) {
      this.showSettingsToast(`已导出 ${notes.length} 篇笔记到 notes/ 目录`);
    }
  }

  // ======================= 文件系统工具 =======================

  async ensureSubdirs(dirHandle) {
    for (const name of ['notes', 'images', 'attachments']) {
      try {
        await dirHandle.getDirectoryHandle(name, { create: true });
      } catch { /* 忽略 */ }
    }
  }

  async getSubdir(name) {
    if (!this.selectedDirHandle) return null;
    try {
      return await this.selectedDirHandle.getDirectoryHandle(name, { create: true });
    } catch {
      return null;
    }
  }

  getElectronRoot() {
    if (this.selectedDirHandle && this.selectedDirHandle._electronPath) {
      return this.selectedDirHandle._electronPath;
    }
    return null;
  }

  async saveFileToDir(subdir, file) {
    const baseName = file.name || 'pasted';
    const ext = baseName.includes('.') ? baseName.split('.').pop() : 'png';
    const nameWithoutExt = baseName.includes('.') ? baseName.substring(0, baseName.lastIndexOf('.')) : baseName;
    const timestamp = Date.now().toString(36);
    const safeName = nameWithoutExt.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').substring(0, 50);
    const fileName = `${timestamp}-${safeName}.${ext}`;
    const relativePath = `${subdir}/${fileName}`;

    const electronRoot = this.getElectronRoot();
    if (electronRoot && window.electronAPI) {
      const reader = new FileReader();
      const result = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = result.split(',')[1];
      const res = await window.electronAPI.writeBinaryFile(relativePath, base64Data);
      if (!res.success) throw new Error(res.error);
      return fileName;
    }

    const dir = await this.getSubdir(subdir);
    if (!dir) return null;
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return fileName;
  }

  async saveFileWithRetry(subdir, file, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.saveFileToDir(subdir, file);
      } catch (err) {
        if (i === retries) throw err;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    return null;
  }

  // ======================= 模板管理 =======================

  renderTemplateManager() {
    if (!this.templateManagerList) return;
    const templates = this.db.getAllTemplates();
    this.templateManagerList.innerHTML = '';
    if (templates.length === 0) {
      this.templateManagerList.innerHTML =
        '<div style="padding:var(--space-4);text-align:center;color:var(--text-tertiary);font-size:var(--text-sm);">暂无自定义模板</div>';
      return;
    }
    templates.forEach((tpl) => {
      const item = document.createElement('div');
      item.className = 'template-manager-item';
      const iconName = tpl.icon || 'default';
      const iconSvg = getTemplateIconSvg(iconName, 16).svg;
      const previewText = tpl.content.replace(/[#*`\[\]]/g, '').trim().substring(0, 60);
      item.innerHTML = `
        <span class="template-manager-icon">${iconSvg}</span>
        <span class="template-manager-name">${this.escapeHtml(tpl.name)}</span>
        <span class="template-manager-preview">${this.escapeHtml(previewText)}...</span>
        <div class="template-manager-actions">
          <button class="template-btn edit" data-template-id="${tpl.id}" title="编辑"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1.5l2.5 2.5L5 11.5 2 12l.5-3L10 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></button>
          <button class="template-btn delete" data-template-id="${tpl.id}" title="删除"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
        </div>`;
      item.querySelector('.template-btn.edit').addEventListener('click', () => this.showTemplateEditorModal(tpl));
      item.querySelector('.template-btn.delete').addEventListener('click', async () => {
        if (await this.showConfirmDialog(`确定要删除模板"${tpl.name}"吗？`)) {
          const stmt = this.db.db.prepare('DELETE FROM templates WHERE id = ?');
          stmt.run([tpl.id]);
          stmt.free();
          this.db.saveToLocalStorage();
          this.renderTemplateManager();
          this.renderTemplatesList();
          this.showSettingsToast('模板已删除');
        }
      });
      this.templateManagerList.appendChild(item);
    });
  }

  showTemplateEditorModal(template = null) {
    const isEdit = template !== null;
    const overlay = document.createElement('div');
    overlay.className = 'template-modal-overlay';
    const currentIcon = template ? (template.icon || 'default') : 'note';
    const iconOptions = ['note', 'default', 'bug', 'chip', 'chart'];
    const iconHtml = iconOptions.map(type => {
      const { pickerSvg } = getTemplateIconSvg(type);
      return `<button class="template-icon-option${type === currentIcon ? ' selected' : ''}" data-icon="${type}">${pickerSvg}</button>`;
    }).join('');
    overlay.innerHTML = `
      <div class="template-modal">
        <div class="template-modal-header">
          <div class="template-modal-title">${isEdit ? '编辑模板' : '新建模板'}</div>
          <button class="template-modal-close" id="templateModalClose">&times;</button>
        </div>
        <div class="template-modal-body">
          <div class="template-modal-field">
            <label class="template-modal-label">模板图标</label>
            <div class="template-icon-picker" id="templateIconPicker">${iconHtml}</div>
          </div>
          <div class="template-modal-field">
            <label class="template-modal-label">模板名称</label>
            <input type="text" class="template-modal-input" id="templateModalName" value="${isEdit ? this.escapeHtml(template.name) : ''}" placeholder="输入模板名称...">
          </div>
          <div class="template-modal-field">
            <label class="template-modal-label">模板内容 (Markdown)</label>
            <textarea class="template-modal-textarea" id="templateModalContent" placeholder="输入 Markdown 内容...">${isEdit ? this.escapeHtml(template.content) : ''}</textarea>
          </div>
        </div>
        <div class="template-modal-footer">
          <button class="btn-settings-secondary" id="templateModalCancel">取消</button>
          <button class="btn-settings-primary" id="templateModalSave">${isEdit ? '保存修改' : '创建模板'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#templateModalClose').addEventListener('click', close);
    overlay.querySelector('#templateModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    // 图标选择
    let selectedIcon = currentIcon;
    overlay.querySelectorAll('.template-icon-option').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.template-icon-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIcon = btn.dataset.icon;
      });
    });
    overlay.querySelector('#templateModalSave').addEventListener('click', () => {
      const name = overlay.querySelector('#templateModalName').value.trim();
      const content = overlay.querySelector('#templateModalContent').value;
      if (!name) { this.showSettingsToast('请输入模板名称'); return; }
      if (isEdit) {
        const stmt = this.db.db.prepare('UPDATE templates SET name = ?, content = ?, icon = ? WHERE id = ?');
        stmt.run([name, content, selectedIcon, template.id]);
        stmt.free();
      } else {
        const stmt = this.db.db.prepare('INSERT INTO templates (name, content, icon, created_at) VALUES (?, ?, ?, ?)');
        stmt.run([name, content, selectedIcon, new Date().toISOString()]);
        stmt.free();
      }
      this.db.saveToLocalStorage();
      this.renderTemplateManager();
      this.renderTemplatesList();
      close();
      this.showSettingsToast(isEdit ? '模板已更新' : '模板已创建');
    });
    overlay.querySelector('#templateModalName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') overlay.querySelector('#templateModalSave').click();
    });
  }

  // ======================= 粘贴处理 =======================

  handleEditorPaste(e) {
    const dt = e.clipboardData || e.originalEvent?.clipboardData;
    if (!dt) return;
    e.preventDefault();

    const seen = new Set();
    const filesToHandle = [];

    const items = dt.items;
    if (items) {
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && !seen.has(file.name + file.size)) {
            seen.add(file.name + file.size);
            filesToHandle.push(file);
          }
        }
      }
    }

    const files = dt.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && !seen.has(file.name + file.size)) {
          seen.add(file.name + file.size);
          filesToHandle.push(file);
        }
      }
    }

    if (filesToHandle.length === 0) {
      // 没有文件，让 CM 正常粘贴文本
      if (this.cm) {
        // 恢复默认粘贴
        const text = dt.getData('text/plain') || dt.getData('text/html') || '';
        if (text) {
          this.cm.dispatch(this.cm.state.replaceSelection(text));
        }
      }
      return;
    }

    for (const file of filesToHandle) {
      this.pasteFileToNote(file, file.type.startsWith('image/'));
    }
  }

  pasteFileToNote(file, isImage) {
    if (isImage && this.selectedDirHandle) {
      this.saveFileToDir('images', file)
        .then((fileName) => {
          if (fileName) {
            this.insertAtCursor(`![${file.name}](../images/${fileName})`);
            this.showSaveStatus('图片已保存到 images/');
          } else {
            this.showSaveStatus('粘贴失败：无法写入 images/ 目录');
          }
        })
        .catch((err) => {
          console.error('保存粘贴图片失败:', err);
          this.showSaveStatus('粘贴失败：' + (err.message || '写入权限错误'));
        });
    } else if (!isImage && this.selectedDirHandle) {
      this.saveFileToDir('attachments', file)
        .then((fileName) => {
          if (fileName) {
            this.insertAtCursor(`[${file.name}](../attachments/${fileName})`);
            this.showSaveStatus('附件已保存到 attachments/');
          } else {
            this.showSaveStatus('粘贴失败：无法写入 attachments/ 目录');
          }
        })
        .catch((err) => {
          console.error('保存粘贴附件失败:', err);
          this.showSaveStatus('粘贴失败：' + (err.message || '写入权限错误'));
        });
    } else if (this.currentNoteId) {
      this.db
        .addAttachment(this.currentNoteId, file)
        .then(() => {
          this.renderAttachmentsList();
          this.showSaveStatus(isImage ? '图片已粘贴为附件' : '附件已粘贴');
        })
        .catch((err) => {
          console.error('粘贴附件失败:', err);
          this.showSaveStatus('粘贴失败：' + (err.message || '未知错误'));
        });
    } else {
      this.showSaveStatus('粘贴失败：请先打开一篇笔记');
    }
  }

  // ======================= 解析本地图片 =======================

  async resolveLocalImages() {
    if (!this.selectedDirHandle) return;
    const imgs = this.markdownPreview.querySelectorAll('.markdown-preview img');
    for (const img of imgs) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) continue;
      const match = src.match(/(?:\.\.\/)?(images|attachments)\/(.+)/);
      if (!match) continue;
      const relativePath = `${match[1]}/${match[2]}`;

      try {
        let blobUrl;
        if (window.electronAPI) {
          const res = await window.electronAPI.readFile(relativePath);
          if (res.success) {
            const mimeType = match[1] === 'images' ? 'image/' + res.ext.replace('.', '') : 'application/octet-stream';
            const byteChars = atob(res.data);
            const byteArray = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArray], { type: mimeType });
            blobUrl = URL.createObjectURL(blob);
          }
        } else {
          const dir = await this.selectedDirHandle.getDirectoryHandle(match[1]);
          const fileHandle = await dir.getFileHandle(match[2]);
          const file = await fileHandle.getFile();
          blobUrl = URL.createObjectURL(file);
          // 浏览器模式：保存文件数据用于导出
          try {
            const fileBuffer = await file.arrayBuffer();
            this._blobDataMap.set(blobUrl, { data: new Uint8Array(fileBuffer), fileName: match[2], folder: match[1] });
          } catch {}
        }
        if (blobUrl) {
          this._blobUrls.push(blobUrl);
          // 保存原始路径（如 ../images/xxx.png），导出时恢复
          const originalSrc = img.getAttribute('src');
          if (originalSrc && !originalSrc.startsWith('blob:')) {
            img.dataset.originalSrc = originalSrc;
          }
          img.src = blobUrl;
          // Electron 模式：保存文件数据用于导出
          if (window.electronAPI && byteArray) {
            this._blobDataMap.set(blobUrl, { data: byteArray, fileName: match[2], folder: match[1] });
          }
        }
      } catch {
        img.alt = `[图片未找到: ${match[2]}]`;
      }
    }
  }

  // ======================= 工具方法 =======================

  extractFirstImage(content) {
    const match = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (match && match[2]) return match[2];
    const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
    return htmlMatch ? htmlMatch[1] : null;
  }

  getPreviewText(content) {
    const text = content
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/#{1,6}\s?/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  }

  countWords(text) {
    const chinese = text.match(/[\u4e00-\u9fa5]/g) || [];
    const english = text.match(/[a-zA-Z0-9]+/g) || [];
    return chinese.length + english.length;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    if (days < 365) return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  showSaveStatus(message) {
    this.saveStatusEl.textContent = message;
    this.saveStatusEl.classList.remove('saved', 'unsaved');
    this.saveStatusEl.classList.add('saved');
    setTimeout(() => { this.saveStatusEl.textContent = '已保存'; }, 2000);
  }
}
