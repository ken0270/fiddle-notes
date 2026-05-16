/**
 * 懒人笔记 - 国际化模块
 * 支持中文 (zh) 和英文 (en)
 */

const locales = {
  zh: {
    /* ===== 通用 ===== */
    'app.name': '懒人笔记',
    'app.title': '懒人笔记 - 优雅的 Markdown 笔记',
    'app.loading': '懒人笔记',

    /* ===== 侧边栏 ===== */
    'sidebar.allNotes': '全部笔记',
    'sidebar.tags': '标签',
    'sidebar.templates': '模板',
    'sidebar.notesCount': '篇笔记',
    'sidebar.totalWords': '总字数',

    /* ===== 笔记列表页 ===== */
    'page.allNotes': '全部笔记',
    'search.placeholder': '搜索笔记...',
    'sort.updatedDesc': '最新更新',
    'sort.createdDesc': '最近创建',
    'sort.titleAsc': '标题 A-Z',
    'sort.wordsDesc': '字数最多',
    'sort.wordsAsc': '字数最少',
    'newNote.btn': '新建笔记',

    /* ===== 空状态 ===== */
    'empty.title': '开始记录你的想法',
    'empty.desc': '创建你的第一篇 Markdown 笔记，享受优雅的编写体验',
    'empty.createBtn': '创建第一篇笔记',

    /* ===== 编辑器 ===== */
    'editor.back': '返回',
    'editor.titlePlaceholder': '无标题笔记',
    'editor.placeholder': '使用 Markdown 编写你的笔记...',
    'editor.zipBtn': 'ZIP',
    'editor.saveBtn': '保存',
    'editor.tagsLabel': '标签：',
    'editor.wordCount': '{n} 字',
    'editor.charCount': '{n} 字符',
    'editor.saved': '已保存',
    'editor.previewEmpty': '在左侧输入 Markdown 文本，这里会显示实时预览',

    /* ===== 编辑器视图切换 ===== */
    'view.split': '分栏视图',
    'view.edit': '编辑视图',
    'view.preview': '预览视图',

    /* ===== 编辑器工具栏 ===== */
    'toolbar.bold': '加粗 (Ctrl+B)',
    'toolbar.italic': '斜体 (Ctrl+I)',
    'toolbar.strikethrough': '删除线',
    'toolbar.heading': '标题',
    'toolbar.link': '链接',
    'toolbar.image': '图片',
    'toolbar.code': '代码',
    'toolbar.codeblock': '代码块',
    'toolbar.quote': '引用',
    'toolbar.ul': '无序列表',
    'toolbar.ol': '有序列表',
    'toolbar.task': '任务列表',
    'toolbar.table': '表格',
    'toolbar.hr': '分割线',

    /* ===== 目录面板 ===== */
    'toc.title': '目录',

    /* ===== 附件区 ===== */
    'attachments.title': '附件',
    'attachments.dropHint': '拖拽文件到此处',
    'attachments.imageFolder': '图片已保存到 images/',
    'attachments.fileFolder': '附件已保存到 attachments/',
    'attachments.uploaded': '附件已上传',
    'attachments.deleted': '附件已删除',
    'attachments.pasted': '图片已粘贴为附件',
    'attachments.filePasted': '附件已粘贴',

    /* ===== 设置页 ===== */
    'settings.title': '设置',
    'settings.storage': '存储设置',
    'settings.storageRoot': '存储根路径',
    'settings.storagePlaceholder': '选择或输入数据存储根路径...',
    'settings.browseFolder': '选择文件夹',
    'settings.storageHint': '当前使用浏览器本地存储 (localStorage)。选择文件夹后可将数据保存到本地文件系统。',
    'settings.storageHintFs': '笔记→notes/  图片→images/  附件→attachments/',
    'settings.storageHintLocal': '当前使用浏览器 localStorage（关闭浏览器可能丢失数据）。建议选择文件夹，笔记将保存为独立的 .md 文件。',
    'settings.save': '保存设置',
    'settings.export': '导出数据',
    'settings.import': '导入数据',
    'settings.reset': '重置数据',
    'settings.templates': '模板管理',
    'settings.newTemplate': '新建模板',
    'settings.about': '关于',
    'settings.language': '语言',
    'settings.langZh': '中文',
    'settings.langEn': 'English',
    'settings.saved': '设置已保存',
    'settings.noTemplates': '暂无自定义模板',

    /* ===== 关于 ===== */
    'about.appName': '应用名称',
    'about.version': '版本',
    'about.storage': '数据存储',
    'about.storageValue': '浏览器 localStorage',
    'about.copyright': '版权信息',
    'about.copyrightValue': 'Copyright \u00a9 81075817@qq.com',

    /* ===== 对话框 ===== */
    'dialog.cancel': '取消',
    'dialog.confirm': '确定',
    'dialog.ok': '知道了',
    'dialog.inputPlaceholder': '请输入...',

    /* ===== 确认消息 ===== */
    'confirm.deleteNote': '确定要删除这条笔记吗？',
    'confirm.deleteAttachment': '确定要删除这个附件吗？',
    'confirm.deleteTemplate': '确定要删除模板"{name}"吗？',
    'confirm.resetData1': '确定要重置所有数据吗？此操作不可恢复！\n\n建议先导出数据备份。',
    'confirm.resetData2': '再次确认：所有笔记、标签和模板将被永久删除！',
    'confirm.importData': '导入将合并数据，是否继续？',

    /* ===== 状态/提示 ===== */
    'status.noNoteOpen': '请先打开一篇笔记',
    'status.packing': '正在打包...',
    'status.zipExported': 'ZIP 包已导出',
    'status.saveFailed': '保存文件失败',
    'status.uploadFailed': '上传附件失败，请重试',
    'status.copySuccess': '已复制!',
    'status.copyFailed': '复制失败',
    'status.exportFailed': '导出 ZIP 失败: {msg}',
    'status.pasteFailedNoNote': '粘贴失败：请先打开一篇笔记',
    'status.pasteFailedImages': '粘贴失败：无法写入 images/ 目录',
    'status.pasteFailedAttachments': '粘贴失败：无法写入 attachments/ 目录',
    'status.pasteFailed': '粘贴失败：{msg}',
    'status.folderReady': '文件夹已就绪',
    'status.creatingDirs': '正在创建目录结构...',
    'status.exportingNotes': '文件夹已就绪，正在导出笔记...',
    'status.notesExported': '笔记已导出到文件夹',
    'status.pathSet': '路径已设置',
    'status.folderSelectFailed': '选择文件夹失败',
    'status.switchedToLocal': '已切换回浏览器本地存储',
    'status.syncFailed': '同步到文件夹失败',
    'status.dataExported': '数据已导出',
    'status.exportDataFailed': '导出失败',
    'status.invalidBackup': '无效的备份文件',
    'status.dataImported': '数据已导入',
    'status.importFailed': '导入失败，请检查文件格式',
    'status.dataReset': '数据已重置',
    'status.resetFailed': '重置失败',
    'status.noteCopied': '笔记已复制',
    'status.batchExport': '已导出 {n} 篇笔记到 notes/ 目录',
    'status.templateDeleted': '模板已删除',
    'status.templateNameRequired': '请输入模板名称',
    'status.templateUpdated': '模板已更新',
    'status.templateCreated': '模板已创建',
    'status.browserNotSupport': '您的浏览器不支持文件夹选择。已使用 localStorage 作为备选存储方案。',
    'status.storageWarning': '你的笔记数据当前存储在 浏览器 localStorage 中，清除浏览器缓存会导致数据丢失！',

    /* ===== 存储路径提示 ===== */
    'storage.reselectTitle': '\uD83D\uDCC2 重新选择文件夹',
    'storage.reselectDesc': '页面已刷新，需要重新选择存储文件夹 {path} 以恢复文件读写权限。',
    'storage.reselectBtn': '重新选择文件夹',
    'storage.skipBtn': '暂不使用（使用 localStorage）',
    'storage.setupTitle': '\uD83D\uDCC2 设置存储路径',
    'storage.setupSuggest': '建议选择一个本地文件夹，每条笔记将保存为 独立的 .md 文件，可以直接用任何文本编辑器打开查看和编辑。',
    'storage.selectFolder': '选择存储文件夹',
    'storage.laterBtn': '稍后设置（使用 localStorage）',
    'storage.localHint': '\u26a0\uFE0F 数据存储在浏览器 localStorage 中，随时可以前往 设置 → 存储设置 配置本地文件夹。',
    'storage.currentLocal': '当前存储位置：浏览器内部存储',
    'storage.manualPlaceholder': '手动输入存储路径...',
    'storage.confirmPath': '确认路径',
    'storage.dataTo': '数据将保存到: {path}',

    /* ===== 模板对话框 ===== */
    'template.edit': '编辑模板',
    'template.new': '新建模板',
    'template.icon': '模板图标',
    'template.name': '模板名称',
    'template.namePlaceholder': '输入模板名称...',
    'template.content': '模板内容 (Markdown)',
    'template.contentPlaceholder': '输入 Markdown 内容...',
    'template.saveEdit': '保存修改',
    'template.create': '创建模板',

    /* ===== 标签管理 ===== */
    'tag.manage': '管理标签',
    'tag.noMore': '没有更多可用标签',
    'tag.none': '无标签',

    /* ===== 笔记 ===== */
    'note.copySuffix': ' (副本)',
    'note.defaultTitle': '未命名笔记',
    'note.imageNotFound': '[图片未找到: {name}]',

    /* ===== 日期 ===== */
    'date.yesterday': '昨天',
    'date.daysAgo': '{n} 天前',

    /* ===== 文件大小 ===== */
    'fileSize.B': ' B',
    'fileSize.KB': ' KB',
    'fileSize.MB': ' MB',

    /* ===== 默认模板 ===== */
    'template.defaultName': '空白笔记',
    'template.defaultContent': '# 新笔记\n\n在这里开始编写...\n',

    /* ===== 数学公式/Mermaid 错误 ===== */
    'error.katex': '公式错误: {expr}',
    'error.mermaid': 'Mermaid 渲染失败',

    /* ===== 代码块复制 ===== */
    'code.copy': '复制',
    'code.copied': '已复制!',
    'code.copyFailed': '复制失败',

    /* ===== 设置 - 语言 ===== */
    'sidebar.toggleBtn': '切换侧边栏',
    'theme.toggle': '切换主题',
    'settings.open': '设置',
    'tag.addBtn': '新建标签',
    'tag.addToNote': '添加标签',
    'attachment.uploadBtn': '上传附件',
    'lang.switchToZh': '已切换到中文',
    'lang.switchToEn': 'Switched to English',
  },

  en: {
    /* ===== 通用 ===== */
    'app.name': 'Fiddle Notes',
    'app.title': 'Fiddle Notes - Elegant Markdown Notes',
    'app.loading': 'Fiddle Notes',

    /* ===== 侧边栏 ===== */
    'sidebar.allNotes': 'All Notes',
    'sidebar.tags': 'Tags',
    'sidebar.templates': 'Templates',
    'sidebar.notesCount': 'notes',
    'sidebar.totalWords': 'words',

    /* ===== 笔记列表页 ===== */
    'page.allNotes': 'All Notes',
    'search.placeholder': 'Search notes...',
    'sort.updatedDesc': 'Recently Updated',
    'sort.createdDesc': 'Recently Created',
    'sort.titleAsc': 'Title A-Z',
    'sort.wordsDesc': 'Most Words',
    'sort.wordsAsc': 'Least Words',
    'newNote.btn': 'New Note',

    /* ===== 空状态 ===== */
    'empty.title': 'Start writing your thoughts',
    'empty.desc': 'Create your first Markdown note and enjoy an elegant writing experience',
    'empty.createBtn': 'Create First Note',

    /* ===== 编辑器 ===== */
    'editor.back': 'Back',
    'editor.titlePlaceholder': 'Untitled Note',
    'editor.placeholder': 'Write your notes in Markdown...',
    'editor.zipBtn': 'ZIP',
    'editor.saveBtn': 'Save',
    'editor.tagsLabel': 'Tags: ',
    'editor.wordCount': '{n} words',
    'editor.charCount': '{n} chars',
    'editor.saved': 'Saved',
    'editor.previewEmpty': 'Type Markdown on the left, see preview here',

    /* ===== 编辑器视图切换 ===== */
    'view.split': 'Split View',
    'view.edit': 'Edit View',
    'view.preview': 'Preview View',

    /* ===== 编辑器工具栏 ===== */
    'toolbar.bold': 'Bold (Ctrl+B)',
    'toolbar.italic': 'Italic (Ctrl+I)',
    'toolbar.strikethrough': 'Strikethrough',
    'toolbar.heading': 'Heading',
    'toolbar.link': 'Link',
    'toolbar.image': 'Image',
    'toolbar.code': 'Code',
    'toolbar.codeblock': 'Code Block',
    'toolbar.quote': 'Quote',
    'toolbar.ul': 'Bullet List',
    'toolbar.ol': 'Ordered List',
    'toolbar.task': 'Task List',
    'toolbar.table': 'Table',
    'toolbar.hr': 'Divider',

    /* ===== 目录面板 ===== */
    'toc.title': 'Table of Contents',

    /* ===== 附件区 ===== */
    'attachments.title': 'Attachments',
    'attachments.dropHint': 'Drop files here',
    'attachments.imageFolder': 'Image saved to images/',
    'attachments.fileFolder': 'File saved to attachments/',
    'attachments.uploaded': 'Attachment uploaded',
    'attachments.deleted': 'Attachment deleted',
    'attachments.pasted': 'Image pasted as attachment',
    'attachments.filePasted': 'File pasted as attachment',

    /* ===== 设置页 ===== */
    'settings.title': 'Settings',
    'settings.storage': 'Storage Settings',
    'settings.storageRoot': 'Storage Root Path',
    'settings.storagePlaceholder': 'Select or enter storage root path...',
    'settings.browseFolder': 'Browse Folder',
    'settings.storageHint': 'Currently using browser localStorage. Select a folder to save data to your local filesystem.',
    'settings.storageHintFs': 'Notes→notes/  Images→images/  Attachments→attachments/',
    'settings.storageHintLocal': 'Currently using browser localStorage (data may be lost if cache is cleared). Select a folder to save notes as standalone .md files.',
    'settings.save': 'Save Settings',
    'settings.export': 'Export Data',
    'settings.import': 'Import Data',
    'settings.reset': 'Reset Data',
    'settings.templates': 'Template Manager',
    'settings.newTemplate': 'New Template',
    'settings.about': 'About',
    'settings.language': 'Language',
    'settings.langZh': '中文',
    'settings.langEn': 'English',
    'settings.saved': 'Settings saved',
    'settings.noTemplates': 'No custom templates',

    /* ===== 关于 ===== */
    'about.appName': 'App Name',
    'about.version': 'Version',
    'about.storage': 'Data Storage',
    'about.storageValue': 'Browser localStorage',
    'about.copyright': 'Copyright',
    'about.copyrightValue': 'Copyright \u00a9 81075817@qq.com',

    /* ===== 对话框 ===== */
    'dialog.cancel': 'Cancel',
    'dialog.confirm': 'OK',
    'dialog.ok': 'Got it',
    'dialog.inputPlaceholder': 'Please enter...',

    /* ===== 确认消息 ===== */
    'confirm.deleteNote': 'Are you sure you want to delete this note?',
    'confirm.deleteAttachment': 'Are you sure you want to delete this attachment?',
    'confirm.deleteTemplate': 'Are you sure you want to delete template "{name}"?',
    'confirm.resetData1': 'Are you sure you want to reset all data? This cannot be undone!\n\nIt is recommended to export a backup first.',
    'confirm.resetData2': 'Confirm again: all notes, tags, and templates will be permanently deleted!',
    'confirm.importData': 'Import will merge data. Continue?',

    /* ===== 状态/提示 ===== */
    'status.noNoteOpen': 'Please open a note first',
    'status.packing': 'Packing...',
    'status.zipExported': 'ZIP exported',
    'status.saveFailed': 'Failed to save file',
    'status.uploadFailed': 'Failed to upload attachment, please retry',
    'status.copySuccess': 'Copied!',
    'status.copyFailed': 'Copy failed',
    'status.exportFailed': 'Export ZIP failed: {msg}',
    'status.pasteFailedNoNote': 'Paste failed: please open a note first',
    'status.pasteFailedImages': 'Paste failed: cannot write to images/ directory',
    'status.pasteFailedAttachments': 'Paste failed: cannot write to attachments/ directory',
    'status.pasteFailed': 'Paste failed: {msg}',
    'status.folderReady': 'Folder ready',
    'status.creatingDirs': 'Creating directory structure...',
    'status.exportingNotes': 'Folder ready, exporting notes...',
    'status.notesExported': 'Notes exported to folder',
    'status.pathSet': 'Path set',
    'status.folderSelectFailed': 'Failed to select folder',
    'status.switchedToLocal': 'Switched back to browser localStorage',
    'status.syncFailed': 'Sync to folder failed',
    'status.dataExported': 'Data exported',
    'status.exportDataFailed': 'Export failed',
    'status.invalidBackup': 'Invalid backup file',
    'status.dataImported': 'Data imported',
    'status.importFailed': 'Import failed, please check file format',
    'status.dataReset': 'Data reset',
    'status.resetFailed': 'Reset failed',
    'status.noteCopied': 'Note copied',
    'status.batchExport': '{n} notes exported to notes/ directory',
    'status.templateDeleted': 'Template deleted',
    'status.templateNameRequired': 'Please enter a template name',
    'status.templateUpdated': 'Template updated',
    'status.templateCreated': 'Template created',
    'status.browserNotSupport': 'Your browser does not support folder selection. Using localStorage as fallback.',
    'status.storageWarning': 'Your notes are currently stored in browser localStorage. Clearing browser cache will cause data loss!',

    /* ===== 存储路径提示 ===== */
    'storage.reselectTitle': '\uD83D\uDCC2 Reselect Folder',
    'storage.reselectDesc': 'Page was refreshed. Please reselect storage folder {path} to restore file access.',
    'storage.reselectBtn': 'Reselect Folder',
    'storage.skipBtn': 'Skip (use localStorage)',
    'storage.setupTitle': '\uD83D\uDCC2 Set Storage Path',
    'storage.setupSuggest': 'We recommend selecting a local folder. Each note will be saved as a standalone .md file that can be opened and edited with any text editor.',
    'storage.selectFolder': 'Select Storage Folder',
    'storage.laterBtn': 'Set Later (use localStorage)',
    'storage.localHint': '\u26a0\uFE0F Data is stored in browser localStorage. You can go to Settings → Storage Settings anytime to configure a local folder.',
    'storage.currentLocal': 'Current storage: browser internal storage',
    'storage.manualPlaceholder': 'Enter storage path manually...',
    'storage.confirmPath': 'Confirm Path',
    'storage.dataTo': 'Data will be saved to: {path}',

    /* ===== 模板对话框 ===== */
    'template.edit': 'Edit Template',
    'template.new': 'New Template',
    'template.icon': 'Template Icon',
    'template.name': 'Template Name',
    'template.namePlaceholder': 'Enter template name...',
    'template.content': 'Template Content (Markdown)',
    'template.contentPlaceholder': 'Enter Markdown content...',
    'template.saveEdit': 'Save Changes',
    'template.create': 'Create Template',

    /* ===== 标签管理 ===== */
    'tag.manage': 'Manage Tags',
    'tag.noMore': 'No more available tags',
    'tag.none': 'No tags',

    /* ===== 笔记 ===== */
    'note.copySuffix': ' (copy)',
    'note.defaultTitle': 'Untitled Note',
    'note.imageNotFound': '[Image not found: {name}]',

    /* ===== 日期 ===== */
    'date.yesterday': 'Yesterday',
    'date.daysAgo': '{n} days ago',

    /* ===== 文件大小 ===== */
    'fileSize.B': ' B',
    'fileSize.KB': ' KB',
    'fileSize.MB': ' MB',

    /* ===== 默认模板 ===== */
    'template.defaultName': 'Blank Note',
    'template.defaultContent': '# New Note\n\nStart writing here...\n',

    /* ===== 数学公式/Mermaid 错误 ===== */
    'error.katex': 'Formula error: {expr}',
    'error.mermaid': 'Mermaid render failed',

    /* ===== 代码块复制 ===== */
    'code.copy': 'Copy',
    'code.copied': 'Copied!',
    'code.copyFailed': 'Copy failed',

    /* ===== 设置 - 语言 ===== */
    'sidebar.toggleBtn': 'Toggle Sidebar',
    'theme.toggle': 'Toggle Theme',
    'settings.open': 'Settings',
    'tag.addBtn': 'New Tag',
    'tag.addToNote': 'Add Tag',
    'attachment.uploadBtn': 'Upload Attachment',
    'lang.switchToZh': '已切换到中文',
    'lang.switchToEn': 'Switched to English',
  }
};

let currentLang = 'zh';

/**
 * 设置当前语言
 */
export function setLanguage(lang) {
  if (locales[lang]) {
    currentLang = lang;
    localStorage.setItem('fiddle-notes-lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}

/**
 * 获取当前语言
 */
export function getLanguage() {
  return currentLang;
}

/**
 * 初始化语言设置（从 localStorage 恢复）
 */
export function initLanguage() {
  const saved = localStorage.getItem('fiddle-notes-lang');
  if (saved && locales[saved]) {
    currentLang = saved;
    document.documentElement.lang = saved === 'zh' ? 'zh-CN' : 'en';
  }
}

/**
 * 翻译函数
 * @param {string} key - 翻译键
 * @param {object} [params] - 插值参数
 * @returns {string}
 */
export function t(key, params = {}) {
  const locale = locales[currentLang];
  let text = locale[key];
  if (text === undefined) {
    // fallback 到中文
    text = locales.zh[key];
  }
  if (text === undefined) return key;
  // 插值替换
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
  }
  return text;
}

export { locales };
