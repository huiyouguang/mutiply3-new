const {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFolder,
  normalizePath
} = require("obsidian");

const DEFAULT_SETTINGS = {
  templateFolder: "Templates",
  defaultFolder: "",
  openAfterCreate: true,
  filenameProperty: "文件名",
  titleProperty: "title",
  dateFormat: "YYYY-MM-DD",
  datetimeFormat: "YYYY-MM-DD HH:mm",
  showRibbonIcon: true,
  interceptNativeCreate: false,
  maxPropertySuggestions: 80,
  propertyColumns: 2,
  recentFolders: [],
  recentTemplates: [],
  lastUsedConfig: null,
  insertLinkAfterCreate: false,
  indexNotePath: "",
  filenameFormat: "",
  folderTemplateMap: {},
  quickCreateSkipProperties: false
};

module.exports = class SmartNoteCreatorPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    await this.applyCoreTemplateFolder();
    this.syncRibbonIcon();
    this.syncNativeCreatePatch();

    this.addCommand({
      id: "create-smart-note",
      name: "智能新建笔记",
      callback: () => this.startCreateFlow()
    });

    this.addCommand({
      id: "create-smart-note-quick",
      name: "快速创建笔记（使用上次配置）",
      callback: () => this.startQuickCreateFlow()
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("Smart Note Creator: 在此文件夹新建")
              .setIcon("file-plus")
              .onClick(() => this.startCreateFlow(file.path));
          });
        }
      })
    );

    this.addSettingTab(new SmartNoteCreatorSettingTab(this.app, this));
  }

  async applyCoreTemplateFolder() {
    if (this.settings.templateFolder !== DEFAULT_SETTINGS.templateFolder) return;

    try {
      const raw = await this.app.vault.adapter.read(".obsidian/templates.json");
      const coreTemplates = JSON.parse(raw);
      if (coreTemplates && coreTemplates.folder) {
        const configured = normalizePath(coreTemplates.folder);
        if (this.app.vault.getAbstractFileByPath(configured) instanceof TFolder) {
          this.settings.templateFolder = configured;
          await this.saveSettings();
        }
      }
    } catch (error) {
      // Keep the bundled default when the core templates config is absent.
    }
  }

  async startCreateFlow(preferredFolderPath) {
    try {
      new Notice("Smart Note Creator：请选择存放文件夹");
      const folder = await new FolderSuggestModal(this.app, this, preferredFolderPath).waitForChoice();
      if (!folder) return;

      const templates = this.getTemplateFiles();
      if (templates.length === 0) {
        new Notice(`没有在 ${this.settings.templateFolder || "Templates"} 找到模板文件`);
        return;
      }

      new Notice("Smart Note Creator：请选择文件模板");
      const template = await new TemplateSuggestModal(this.app, this, folder.path).waitForChoice();
      if (!template) return;

      const templateContent = await this.app.vault.read(template);
      const parsed = parseTemplate(templateContent);
      const contextValues = this.getContextValues();
      new Notice("Smart Note Creator：请填写模板属性");
      const values = await new PropertyModal(this.app, this, parsed, folder, template, contextValues).waitForValues();
      if (!values) return;

      const file = await this.createNote(folder, template, parsed, values);
      await this.rememberChoice("recentFolders", folder.path);
      await this.rememberChoice("recentTemplates", template.path);
      await this.saveLastUsedConfig(folder.path, template.path, values);

      if (this.settings.openAfterCreate) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }

      await this.executePostCreateActions(file);
      new Notice(`已创建：${file.path}`);
    } catch (error) {
      console.error("Smart Note Creator failed", error);
      new Notice(`Smart Note Creator 创建失败：${error.message || error}`);
    }
  }

  async startQuickCreateFlow() {
    const config = this.settings.lastUsedConfig;
    if (!config) {
      new Notice("Smart Note Creator：没有上次配置，请先使用智能新建笔记");
      return;
    }

    try {
      const folder = this.app.vault.getAbstractFileByPath(config.folderPath);
      const template = this.app.vault.getAbstractFileByPath(config.templatePath);

      if (!folder || !(folder instanceof TFolder)) {
        new Notice(`Smart Note Creator：文件夹不存在：${config.folderPath}`);
        return;
      }

      if (!template) {
        new Notice(`Smart Note Creator：模板不存在：${config.templatePath}`);
        return;
      }

      const templateContent = await this.app.vault.read(template);
      const parsed = parseTemplate(templateContent);
      const contextValues = this.getContextValues();
      const cachedValues = config.values || {};
      const mergedValues = { ...contextValues, ...cachedValues };

      let values;
      if (this.settings.quickCreateSkipProperties) {
        values = mergedValues;
      } else {
        new Notice("Smart Note Creator：快速创建 - 请填写属性");
        values = await new PropertyModal(this.app, this, parsed, folder, template, mergedValues).waitForValues();
        if (!values) return;
      }

      const file = await this.createNote(folder, template, parsed, values);
      await this.saveLastUsedConfig(folder.path, template.path, values);

      if (this.settings.openAfterCreate) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }

      await this.executePostCreateActions(file);
      new Notice(`快速创建成功：${file.path}`);
    } catch (error) {
      console.error("Smart Note Creator quick failed", error);
      new Notice(`Smart Note Creator 快速创建失败：${error.message || error}`);
    }
  }

  getContextValues() {
    const values = {};
    const activeFile = this.app.workspace.getActiveFile();
    const excludeKeys = [
      this.settings.filenameProperty,
      this.settings.titleProperty,
      "title",
      "文件名",
      "date",
      "日期",
      "created",
      "created_at",
      "updated",
      "updated_at",
      "datetime",
      "时间",
      "modified",
      "mtime",
      "ctime"
    ];

    if (activeFile) {
      const cache = this.app.metadataCache.getFileCache(activeFile);
      if (cache && cache.frontmatter) {
        Object.keys(cache.frontmatter).forEach(key => {
          if (!excludeKeys.includes(key)) {
            values[key] = cache.frontmatter[key];
          }
        });
      }
    }
    return values;
  }

  async saveLastUsedConfig(folderPath, templatePath, values) {
    this.settings.lastUsedConfig = {
      folderPath,
      templatePath,
      values
    };
    await this.saveSettings();
  }

  async executePostCreateActions(file) {
    if (this.settings.insertLinkAfterCreate) {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.path !== file.path) {
        try {
          const content = await this.app.vault.read(activeFile);
          const link = `\n[[${file.basename.replace(".md", "")}]]`;
          if (!content.includes(link)) {
            await this.app.vault.modify(activeFile, content + link);
          }
        } catch (error) {
          console.error("Failed to insert link", error);
        }
      }
    }

    if (this.settings.indexNotePath) {
      const indexFile = this.app.vault.getAbstractFileByPath(this.settings.indexNotePath);
      if (indexFile) {
        try {
          const content = await this.app.vault.read(indexFile);
          const link = `\n- [[${file.basename.replace(".md", "")}]]`;
          if (!content.includes(link)) {
            await this.app.vault.modify(indexFile, content + link);
          }
        } catch (error) {
          console.error("Failed to update index note", error);
        }
      }
    }
  }

  syncRibbonIcon() {
    if (this.settings.showRibbonIcon && !this.ribbonIconEl) {
      this.ribbonIconEl = this.addRibbonIcon("file-plus", "Smart Note Creator", () => this.startCreateFlow());
      this.ribbonIconEl.addClass("smart-note-creator-ribbon");
    }

    if (!this.settings.showRibbonIcon && this.ribbonIconEl) {
      this.ribbonIconEl.remove();
      this.ribbonIconEl = null;
    }
  }

  syncNativeCreatePatch() {
    const fileManager = this.app.fileManager;
    if (!fileManager || this.nativeCreatePatched) return;

    this.originalCreateNewMarkdownFile = fileManager.createNewMarkdownFile;
    if (typeof this.originalCreateNewMarkdownFile === "function") {
      fileManager.createNewMarkdownFile = async (...args) => {
        if (!this.settings.interceptNativeCreate || this.isRunningSmartFlow) {
          return await this.originalCreateNewMarkdownFile.apply(fileManager, args);
        }

        const preferredFolderPath = getFolderPathFromCreateArgs(args);
        await this.startCreateFlow(preferredFolderPath);
        return null;
      };
      this.nativeCreatePatched = true;
      this.register(() => {
        if (this.originalCreateNewMarkdownFile) {
          fileManager.createNewMarkdownFile = this.originalCreateNewMarkdownFile;
        }
      });
    }
  }

  async createNote(folder, template, parsed, values) {
    this.isRunningSmartFlow = true;
    const now = window.moment ? window.moment() : null;
    const baseTitle = sanitizeTitle(
      values[this.settings.filenameProperty] ||
      values[this.settings.titleProperty] ||
      values.title ||
      template.basename
    );

    const context = {
      ...values,
      title: baseTitle,
      fileName: baseTitle,
      filename: baseTitle,
      folder: folder.path,
      template: template.basename,
      date: now ? now.format(this.settings.dateFormat) : new Date().toISOString().slice(0, 10),
      datetime: now ? now.format(this.settings.datetimeFormat) : new Date().toISOString()
    };

    let fileName = baseTitle;
    if (this.settings.filenameFormat) {
      const formatted = renderTemplate(this.settings.filenameFormat, context);
      fileName = sanitizeFileName(formatted);
    }

    const targetPath = await this.makeUniquePath(folder.path, `${fileName}.md`);

    const frontmatter = Object.assign({}, parsed.frontmatter, values);
    const renderedBody = renderTemplate(parsed.body, context).replace("{{cursor}}", "");
    const content = `${stringifyFrontmatter(frontmatter)}${renderedBody.trimStart()}`;

    try {
      return await this.app.vault.create(targetPath, content);
    } finally {
      this.isRunningSmartFlow = false;
    }
  }

  async makeUniquePath(folderPath, fileName) {
    const baseFolder = folderPath ? normalizePath(folderPath) : "";
    const extension = ".md";
    const cleanName = sanitizeFileName(fileName.replace(/\.md$/i, "")) || "Untitled";
    let candidate = normalizePath(baseFolder ? `${baseFolder}/${cleanName}${extension}` : `${cleanName}${extension}`);
    let counter = 1;

    while (this.app.vault.getAbstractFileByPath(candidate)) {
      candidate = normalizePath(baseFolder ? `${baseFolder}/${cleanName} ${counter}${extension}` : `${cleanName} ${counter}${extension}`);
      counter += 1;
    }

    return candidate;
  }

  getTemplateFiles() {
    const configured = normalizePath(this.settings.templateFolder || "Templates");
    const folders = unique([configured, "Templates"]).filter(Boolean);
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => folders.some((folder) => file.path.startsWith(`${folder}/`) || file.path === `${folder}.md`))
      .sort((a, b) => scoreTemplate(b, this) - scoreTemplate(a, this) || a.path.localeCompare(b.path));
  }

  async rememberChoice(key, value) {
    const list = Array.isArray(this.settings[key]) ? this.settings[key] : [];
    this.settings[key] = [value, ...list.filter((item) => item !== value)].slice(0, 8);
    await this.saveSettings();
  }

  getPropertySuggestions(propertyName) {
    const values = new Map();
    const max = Number(this.settings.maxPropertySuggestions) || 80;

    this.app.vault.getMarkdownFiles().forEach((file) => {
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache && cache.frontmatter;
      if (!frontmatter || !Object.prototype.hasOwnProperty.call(frontmatter, propertyName)) return;

      normalizeSuggestionValues(frontmatter[propertyName]).forEach((value) => {
        if (!value) return;
        values.set(value, (values.get(value) || 0) + 1);
      });
    });

    return Array.from(values.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, max)
      .map(([value]) => value);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class FolderSuggestModal extends Modal {
  constructor(app, plugin, preferredFolderPath) {
    super(app);
    this.plugin = plugin;
    this.preferredFolderPath = preferredFolderPath;
    this.selectedPath = preferredFolderPath || plugin.settings.defaultFolder || "";
  }

  waitForChoice() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  onOpen() {
    this.contentEl.empty();
    this.modalEl.addClass("smart-note-creator-modal");
    this.contentEl.createEl("h2", { text: "选择存放文件夹" });
    const folders = this.getItems();
    if (!folders.some((folder) => folder.path === this.selectedPath)) {
      this.selectedPath = folders[0] ? folders[0].path : "";
    }

    const selectedEl = this.contentEl.createDiv({ cls: "smart-note-creator-selected-path" });
    const searchSetting = new Setting(this.contentEl)
      .setName("搜索文件夹")
      .setDesc("不输入时按层级展开，输入后显示匹配文件夹。")
      .addText((text) => {
        text.setPlaceholder("输入文件夹名称或路径");
        text.onChange((value) => {
          this.searchQuery = value.trim().toLowerCase();
          this.renderFolderTree(treeEl, selectedEl);
        });
      });

    searchSetting.settingEl.addClass("smart-note-creator-folder-search");

    const treeEl = this.contentEl.createDiv({ cls: "smart-note-creator-folder-tree" });
    this.treeEl = treeEl;
    this.selectedEl = selectedEl;
    this.renderFolderTree(treeEl, selectedEl);

    new Setting(this.contentEl)
      .setName("新建子文件夹")
      .setDesc("会创建在当前选中的文件夹下面，可留空。")
      .addText((text) => {
        text.setPlaceholder("例如：新项目");
        text.onChange((value) => {
          this.newFolderName = value.trim();
        });
      })
      .addButton((button) => {
        button.setButtonText("创建并选中").onClick(async () => {
          if (!this.newFolderName) return;
          const base = this.selectedPath || "";
          const targetPath = normalizePath(base ? `${base}/${this.newFolderName}` : this.newFolderName);
          if (this.app.vault.getAbstractFileByPath(targetPath)) {
            new Notice("这个文件夹已经存在");
            return;
          }
          try {
            await this.app.vault.createFolder(targetPath);
            this.selectedPath = targetPath;
            this.newFolderName = "";
            this.renderFolderTree(treeEl, selectedEl);
            new Notice(`已创建文件夹：${targetPath}`);
          } catch (error) {
            new Notice(`创建文件夹失败：${error.message || error}`);
          }
        });
      });

    const actions = this.contentEl.createDiv({ cls: "smart-note-creator-actions" });
    new Setting(actions)
      .addButton((button) => {
        button.setButtonText("取消").onClick(() => this.finish(null));
      })
      .addButton((button) => {
        button.setButtonText("下一步").setCta().onClick(() => {
          const folder = this.app.vault.getAbstractFileByPath(this.selectedPath) || this.app.vault.getRoot();
          this.finish(folder instanceof TFolder ? folder : this.app.vault.getRoot());
        });
      });
  }

  getItems() {
    const folders = this.app.vault
      .getAllLoadedFiles()
      .filter((file) => file instanceof TFolder && !file.path.startsWith("."))
      .sort((a, b) => scoreFolder(b, this) - scoreFolder(a, this) || a.path.localeCompare(b.path));

    return [this.app.vault.getRoot(), ...folders.filter((folder) => folder.path)];
  }

  getItemText(folder) {
    if (!folder.path) return "/ 根目录";
    if (this.plugin.settings.recentFolders.includes(folder.path)) return `最近：${folder.path}`;
    if (folder.path === this.preferredFolderPath) return `当前：${folder.path}`;
    return folder.path;
  }

  renderFolderTree(container, selectedEl) {
    container.empty();
    selectedEl.setText(`已选择：${this.selectedPath || "/ 根目录"}`);

    if (this.searchQuery) {
      this.getItems()
        .filter((folder) => this.getItemText(folder).toLowerCase().includes(this.searchQuery))
        .slice(0, 80)
        .forEach((folder) => this.renderFolderRow(container, folder, 0, false, false));
      return;
    }

    const root = this.app.vault.getRoot();
    const expandedSet = this.getExpandedFolders();
    this.renderFolderNode(container, root, 0, expandedSet);
  }

  getExpandedFolders() {
    const expanded = new Set();
    if (this.selectedPath) {
      const parts = this.selectedPath.split("/");
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        expanded.add(current);
      }
    }
    return expanded;
  }

  renderFolderNode(container, folder, depth, expandedSet) {
    const children = folder.children
      .filter((child) => child instanceof TFolder && !child.path.startsWith("."))
      .sort((a, b) => scoreFolder(b, this) - scoreFolder(a, this) || a.name.localeCompare(b.name));

    const hasChildren = children.length > 0;
    const shouldExpand = depth <= 1 || expandedSet.has(folder.path);
    const row = this.renderFolderRow(container, folder, depth, hasChildren, shouldExpand);

    if (hasChildren) {
      const childrenEl = container.createDiv({
        cls: `smart-note-creator-folder-children${shouldExpand ? "" : " is-collapsed"}`
      });
      children.forEach((child) => {
        this.renderFolderNode(childrenEl, child, depth + 1, expandedSet);
      });
      return { row, childrenEl };
    }
    return { row };
  }

  renderFolderRow(container, folder, depth, hasChildren, expanded = false) {
    const row = container.createDiv({ cls: "smart-note-creator-folder-row" });
    row.toggleClass("is-selected", folder.path === this.selectedPath);
    row.setAttribute("aria-expanded", String(hasChildren && expanded));
    row.style.setProperty("--folder-depth", String(depth));

    const marker = row.createSpan({
      cls: "smart-note-creator-folder-marker",
      text: hasChildren ? (expanded ? "▾" : "▸") : ""
    });
    row.createSpan({ cls: "smart-note-creator-folder-name", text: this.getItemText(folder) });

    row.addEventListener("click", () => {
      this.selectedPath = folder.path;
      this.renderFolderTree(this.treeEl, this.selectedEl);
    });

    if (hasChildren) {
      const toggleExpand = (event) => {
        event.stopPropagation();
        const childrenEl = row.nextElementSibling;
        if (!childrenEl || !childrenEl.classList.contains("smart-note-creator-folder-children")) return;
        const isExpanded = row.getAttribute("aria-expanded") === "true";
        const next = !isExpanded;
        row.setAttribute("aria-expanded", String(next));
        childrenEl.toggleClass("is-collapsed", !next);
        marker.setText(next ? "▾" : "▸");
      };
      marker.addEventListener("click", toggleExpand);
      row.addEventListener("dblclick", toggleExpand);
    }

    return row;
  }

  finish(folder) {
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve(folder);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) {
      const resolve = this.resolve;
      this.resolve = null;
      resolve(null);
    }
  }
}

class TemplateSuggestModal extends Modal {
  constructor(app, plugin, folderPath = "") {
    super(app);
    this.plugin = plugin;
    this.folderPath = folderPath;
    this.selectedPath = "";
    this.searchQuery = "";
  }

  waitForChoice() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  onOpen() {
    this.contentEl.empty();
    this.modalEl.addClass("smart-note-creator-modal");
    this.contentEl.createEl("h2", { text: "选择文件模板" });
    const templates = this.plugin.getTemplateFiles();

    const recommendedPath = this.plugin.settings.folderTemplateMap[this.folderPath];
    if (recommendedPath && templates.some((t) => t.path === recommendedPath)) {
      this.selectedPath = recommendedPath;
    } else if (templates.length > 0) {
      this.selectedPath = templates[0].path;
    }

    if (templates.length === 0) {
      this.contentEl.createEl("p", { text: `没有在 ${this.plugin.settings.templateFolder || "Templates"} 找到模板文件。` });
      const actions = this.contentEl.createDiv({ cls: "smart-note-creator-actions" });
      new Setting(actions).addButton((button) => button.setButtonText("关闭").setCta().onClick(() => this.finish(null)));
      return;
    }

    const searchSetting = new Setting(this.contentEl)
      .setName("搜索模板")
      .setDesc("按模板文件名或路径过滤。")
      .addText((text) => {
        text.setPlaceholder("输入模板名称");
        text.onChange((value) => {
          this.searchQuery = value.trim().toLowerCase();
          this.renderTemplateOptions(selectEl, previewEl);
        });
      });
    searchSetting.settingEl.addClass("smart-note-creator-template-search");

    let selectEl;
    const previewEl = this.contentEl.createEl("pre", { cls: "smart-note-creator-preview" });
    new Setting(this.contentEl)
      .setName("模板")
      .setDesc(recommendedPath ? "已根据文件夹智能推荐模板。" : "会优先显示最近使用的模板。")
      .addDropdown((dropdown) => {
        selectEl = dropdown.selectEl;
        this.renderTemplateOptions(selectEl, previewEl);
        dropdown.onChange((value) => {
          this.selectedPath = value;
          this.renderPreview(previewEl);
        });
      });

    const actions = this.contentEl.createDiv({ cls: "smart-note-creator-actions" });
    new Setting(actions)
      .addButton((button) => {
        button.setButtonText("取消").onClick(() => this.finish(null));
      })
      .addButton((button) => {
        button.setButtonText("下一步").setCta().onClick(() => {
          const file = this.app.vault.getAbstractFileByPath(this.selectedPath);
          if (this.folderPath && file) {
            this.plugin.settings.folderTemplateMap[this.folderPath] = file.path;
            this.plugin.saveSettings();
          }
          this.finish(file);
        });
      });
  }

  getItemText(file) {
    if (this.plugin.settings.folderTemplateMap[this.folderPath] === file.path) return `推荐：${file.path}`;
    if (this.plugin.settings.recentTemplates.includes(file.path)) return `最近：${file.path}`;
    return file.path;
  }

  renderTemplateOptions(selectEl, previewEl) {
    const templates = this.plugin.getTemplateFiles()
      .filter((file) => !this.searchQuery || file.path.toLowerCase().includes(this.searchQuery));
    selectEl.innerHTML = "";
    templates.forEach((file) => {
      selectEl.createEl("option", { text: this.getItemText(file), value: file.path });
    });
    if (!templates.some((file) => file.path === this.selectedPath)) {
      this.selectedPath = templates[0] ? templates[0].path : "";
    }
    selectEl.value = this.selectedPath;
    this.renderPreview(previewEl);
  }

  async renderPreview(previewEl) {
    const file = this.app.vault.getAbstractFileByPath(this.selectedPath);
    if (!file) {
      previewEl.setText("没有匹配模板");
      return;
    }
    const content = await this.app.vault.cachedRead(file);
    previewEl.setText(content.slice(0, 1200));
  }

  finish(file) {
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve(file);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) {
      const resolve = this.resolve;
      this.resolve = null;
      resolve(null);
    }
  }
}

class PropertyModal extends Modal {
  constructor(app, plugin, parsed, folder, template, contextValues = {}) {
    super(app);
    this.plugin = plugin;
    this.parsed = parsed;
    this.folder = folder;
    this.template = template;
    this.contextValues = contextValues;
    this.values = {};
    this.previewEl = null;
    this.createButton = null;
  }

  waitForValues() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  async onOpen() {
    this.contentEl.empty();
    this.modalEl.addClass("smart-note-creator-modal");
    this.contentEl.createEl("h2", { text: "填写笔记属性" });

    const defaultTitle = this.template.basename;
    const clipboardText = await this.getClipboardText();
    const fields = this.buildFields(defaultTitle, clipboardText);

    new Setting(this.contentEl)
      .setName("保存位置")
      .setDesc(this.folder.path || "/ 根目录")
      .addText((text) => text.setValue(this.template.basename).setDisabled(true));

    const grid = this.contentEl.createDiv({ cls: "smart-note-creator-property-grid" });
    grid.style.setProperty("--property-columns", String(this.plugin.settings.propertyColumns || 2));

    fields.forEach((field) => {
      this.values[field.name] = field.value;
      const itemEl = grid.createDiv({ cls: "smart-note-creator-property-card" });
      const setting = new Setting(itemEl).setName(field.name);
      if (field.desc) setting.setDesc(field.desc);

      this.renderFieldInput(setting, field);
    });

    this.previewEl = this.contentEl.createEl("pre", { cls: "smart-note-creator-preview" });
    this.updatePreview();

    const actions = this.contentEl.createDiv({ cls: "smart-note-creator-actions" });
    new Setting(actions)
      .addButton((button) => {
        button.setButtonText("取消").onClick(() => {
          this.finish(null);
        });
      })
      .addButton((button) => {
        this.createButton = button;
        button.setButtonText("创建").setCta().onClick(() => {
          const normalized = normalizeValues(this.values);
          if (!getPreferredTitle(normalized, this.plugin.settings)) {
            new Notice("请至少填写文件名或 title");
            return;
          }
          this.finish(normalized);
        });
      });

    this.contentEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (this.createButton) {
          this.createButton.buttonEl.click();
        }
      }
    });
  }

  renderFieldInput(setting, field) {
    const type = this.detectFieldType(field.name);

    if (type === "boolean") {
      setting.addToggle((toggle) => {
        toggle.setValue(Boolean(this.values[field.name])).onChange((value) => {
          this.values[field.name] = value;
          this.updatePreview();
        });
      });
      return;
    }

    if (type === "date") {
      setting.addText((text) => {
        text.setValue(field.value).onChange((value) => {
          this.values[field.name] = value;
          this.updatePreview();
        });
        text.inputEl.type = "date";
      });
      return;
    }

    if (type === "datetime") {
      setting.addText((text) => {
        text.setValue(field.value).onChange((value) => {
          this.values[field.name] = value;
          this.updatePreview();
        });
        text.inputEl.type = "datetime-local";
      });
      return;
    }

    if (type === "tags") {
      setting.addText((text) => {
        field.text = text;
        const tagValue = Array.isArray(field.value) ? field.value.join(", ") : field.value;
        text.setValue(tagValue).onChange((value) => {
          this.values[field.name] = value.split(",").map((t) => t.trim()).filter(Boolean);
          this.updatePreview();
        });
        text.setPlaceholder("标签1, 标签2, ...");
      });

      const suggestions = this.plugin.getPropertySuggestions(field.name);
      if (suggestions.length > 0) {
        setting.addDropdown((dropdown) => {
          dropdown.addOption("", "选择已用标签");
          suggestions.forEach((value) => dropdown.addOption(value, value));
          dropdown.onChange((value) => {
            if (!value) return;
            const current = this.values[field.name] || [];
            const arr = Array.isArray(current) ? current : current.split(",").map((t) => t.trim()).filter(Boolean);
            if (!arr.includes(value)) {
              arr.push(value);
            }
            this.values[field.name] = arr;
            if (field.text) field.text.setValue(arr.join(", "));
            dropdown.setValue("");
            this.updatePreview();
          });
        });
      }
      return;
    }

    if (field.multiline) {
      setting.addTextArea((text) => {
        text.setValue(field.value).onChange((value) => {
          this.values[field.name] = value;
          this.updatePreview();
        });
      });
    } else {
      setting.addText((text) => {
        field.text = text;
        text.setValue(field.value).onChange((value) => {
          this.values[field.name] = value;
          this.updatePreview();
        });
      });

      if (this.shouldSuggestForField(field.name)) {
        const suggestions = this.plugin.getPropertySuggestions(field.name);
        if (suggestions.length > 0) {
          setting.addDropdown((dropdown) => {
            dropdown.addOption("", "选择已用值");
            suggestions.forEach((value) => dropdown.addOption(value, value));
            dropdown.onChange((value) => {
              if (!value) return;
              this.values[field.name] = value;
              if (field.text) field.text.setValue(value);
              dropdown.setValue("");
              this.updatePreview();
            });
          });
        }
      }
    }
  }

  detectFieldType(name) {
    const lower = name.toLowerCase();
    if (["tags", "标签", "tag", "categories", "类别"].includes(lower)) return "tags";
    if (["date", "日期", "created", "创建日期"].includes(lower)) return "date";
    if (["datetime", "时间", "created_at", "updated", "修改时间", "timestamp"].includes(lower)) return "datetime";
    if (["completed", "done", "published", "公开", "归档", "归档状态", "状态"].includes(lower)) return "boolean";
    return "text";
  }

  async getClipboardText() {
    try {
      const text = await navigator.clipboard.readText();
      return text && text.length < 200 ? text.trim() : "";
    } catch (error) {
      return "";
    }
  }

  buildFields(defaultTitle, clipboardText = "") {
    const names = new Set(this.parsed.fields);
    names.add(this.plugin.settings.filenameProperty);

    if (this.plugin.settings.titleProperty) {
      names.add(this.plugin.settings.titleProperty);
    }

    return Array.from(names).map((name) => {
      const templateValue = this.parsed.frontmatter[name];
      const contextValue = this.contextValues[name];
      let value;

      if (contextValue !== undefined && contextValue !== null && contextValue !== "") {
        value = String(contextValue);
      } else if (templateValue !== undefined && templateValue !== null && templateValue !== "") {
        value = String(templateValue);
      } else if (name === this.plugin.settings.filenameProperty || name === this.plugin.settings.titleProperty || name === "title" || name === "文件名") {
        value = clipboardText || defaultTitle;
      } else {
        value = defaultFieldValue(name, templateValue, defaultTitle, this.plugin.settings);
      }

      return {
        name,
        value,
        multiline: typeof value === "string" && value.includes("\n"),
        desc: name === this.plugin.settings.filenameProperty ? "用于生成最终文件名" : ""
      };
    });
  }

  shouldSuggestForField(name) {
    return ![
      this.plugin.settings.filenameProperty,
      this.plugin.settings.titleProperty,
      "title",
      "文件名"
    ].includes(name);
  }

  updatePreview() {
    if (!this.previewEl || !this.template) return;

    const title = sanitizeTitle(
      this.values[this.plugin.settings.filenameProperty] ||
      this.values[this.plugin.settings.titleProperty] ||
      this.values.title ||
      this.template.basename
    );

    const now = window.moment ? window.moment() : null;
    const context = {
      ...this.values,
      title,
      fileName: title,
      filename: title,
      folder: this.folder.path,
      template: this.template.basename,
      date: now ? now.format(this.plugin.settings.dateFormat) : new Date().toISOString().slice(0, 10),
      datetime: now ? now.format(this.plugin.settings.datetimeFormat) : new Date().toISOString()
    };

    const frontmatter = Object.assign({}, this.parsed.frontmatter, this.values);
    const renderedBody = renderTemplate(this.parsed.body, context).replace("{{cursor}}", "");
    const content = `${stringifyFrontmatter(frontmatter)}${renderedBody.trimStart()}`;

    this.previewEl.setText(content.slice(0, 2000));
  }

  finish(values) {
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve(values);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) {
      const resolve = this.resolve;
      this.resolve = null;
      resolve(null);
    }
  }
}

class SmartNoteCreatorSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Smart Note Creator" });

    new Setting(containerEl)
      .setName("模板文件夹")
      .setDesc("从这个文件夹读取 Markdown 模板。")
      .addText((text) => text
        .setPlaceholder("Templates")
        .setValue(this.plugin.settings.templateFolder)
        .onChange(async (value) => {
          this.plugin.settings.templateFolder = normalizePath(value.trim() || "Templates");
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("默认文件夹")
      .setDesc("没有当前文件夹时优先推荐的位置，可留空。")
      .addText((text) => text
        .setPlaceholder("00 Inbox")
        .setValue(this.plugin.settings.defaultFolder)
        .onChange(async (value) => {
          this.plugin.settings.defaultFolder = normalizePath(value.trim());
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("文件名属性")
      .setDesc("创建时用这个属性作为文件名。")
      .addText((text) => text
        .setValue(this.plugin.settings.filenameProperty)
        .onChange(async (value) => {
          this.plugin.settings.filenameProperty = value.trim() || "文件名";
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("创建后打开")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.openAfterCreate)
        .onChange(async (value) => {
          this.plugin.settings.openAfterCreate = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("显示工具栏按钮")
      .setDesc("在左侧工具栏显示 Smart Note Creator 快速入口。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showRibbonIcon)
        .onChange(async (value) => {
          this.plugin.settings.showRibbonIcon = value;
          this.plugin.syncRibbonIcon();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("接管新建文件按钮")
      .setDesc("打开后，文件列表或其他插件通过 Obsidian 新建 Markdown 文件时，会改为触发 Smart Note Creator。若某个插件没有走 Obsidian 原生新建接口，则不会被接管。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.interceptNativeCreate)
        .onChange(async (value) => {
          this.plugin.settings.interceptNativeCreate = value;
          this.plugin.syncNativeCreatePatch();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("属性候选数量")
      .setDesc("每个属性最多显示多少个历史已用值。")
      .addText((text) => text
        .setPlaceholder("80")
        .setValue(String(this.plugin.settings.maxPropertySuggestions))
        .onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.plugin.settings.maxPropertySuggestions = Number.isFinite(parsed) && parsed > 0 ? parsed : 80;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("属性填写列数")
      .setDesc("属性窗口在宽屏下显示的列数，建议 2。")
      .addText((text) => text
        .setPlaceholder("2")
        .setValue(String(this.plugin.settings.propertyColumns || 2))
        .onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.plugin.settings.propertyColumns = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 3) : 2;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "快速创建" });

    new Setting(containerEl)
      .setName("快速创建跳过属性")
      .setDesc("打开后，使用快速创建命令时直接创建笔记，不再弹出属性填写窗口。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.quickCreateSkipProperties)
        .onChange(async (value) => {
          this.plugin.settings.quickCreateSkipProperties = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "创建后动作" });

    new Setting(containerEl)
      .setName("在当前笔记插入链接")
      .setDesc("创建新笔记后，自动在当前打开的笔记末尾插入新笔记的 wikilink。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.insertLinkAfterCreate)
        .onChange(async (value) => {
          this.plugin.settings.insertLinkAfterCreate = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("追加到索引笔记")
      .setDesc("创建新笔记后，自动将链接追加到指定的索引笔记中。")
      .addText((text) => text
        .setPlaceholder("例如：00 Index.md")
        .setValue(this.plugin.settings.indexNotePath)
        .onChange(async (value) => {
          this.plugin.settings.indexNotePath = normalizePath(value.trim());
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "文件名模板" });

    new Setting(containerEl)
      .setName("文件名格式")
      .setDesc("支持变量：{{date}}、{{title}}、{{datetime}}、{{folder}}。例如：{{date}} - {{title}}")
      .addText((text) => text
        .setPlaceholder("{{title}}")
        .setValue(this.plugin.settings.filenameFormat)
        .onChange(async (value) => {
          this.plugin.settings.filenameFormat = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("清除文件夹模板关联")
      .setDesc("清空所有文件夹与模板的智能推荐关联记录。")
      .addButton((button) => button
        .setButtonText("清除")
        .onClick(async () => {
          this.plugin.settings.folderTemplateMap = {};
          await this.plugin.saveSettings();
          new Notice("已清除文件夹模板关联");
        }));
  }
}

function parseTemplate(content) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) {
    return { frontmatter: {}, fields: [], body: content };
  }

  const frontmatterRaw = match[1];
  const frontmatter = {};
  const fields = [];

  frontmatterRaw.split(/\r?\n/).forEach((line) => {
    if (!line.trim() || /^\s/.test(line)) return;
    const index = line.indexOf(":");
    if (index === -1) return;

    const key = line.slice(0, index).trim().replace(/^["']|["']$/g, "");
    if (!key) return;

    const rawValue = line.slice(index + 1).trim();
    fields.push(key);
    frontmatter[key] = cleanYamlValue(rawValue);
  });

  return {
    frontmatter,
    fields,
    body: content.slice(match[0].length)
  };
}

function cleanYamlValue(value) {
  if (value === "") return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function stringifyFrontmatter(values) {
  const lines = Object.entries(values)
    .filter(([key]) => key && key !== "words")
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`);

  return `---\n${lines.join("\n")}\n---\n\n`;
}

function formatYamlValue(value) {
  if (Array.isArray(value)) return `[${value.map(formatYamlValue).join(", ")}]`;
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!text) return "";
  if (/[:#\[\]{}]|^\s|\s$/.test(text)) return JSON.stringify(text);
  return text;
}

function renderTemplate(content, context) {
  return content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const value = context[key.trim()];
    return value === undefined || value === null ? "" : String(value);
  });
}

function defaultFieldValue(name, current, defaultTitle, settings) {
  if (current !== undefined && current !== null && current !== "") return String(current);
  if (name === settings.filenameProperty || name === settings.titleProperty || name === "title" || name === "文件名") return defaultTitle;
  if (["created", "创建时间", "date", "日期"].includes(name)) {
    return window.moment ? window.moment().format(settings.dateFormat) : new Date().toISOString().slice(0, 10);
  }
  if (["updated", "修改时间", "datetime", "时间"].includes(name)) {
    return window.moment ? window.moment().format(settings.datetimeFormat) : new Date().toISOString();
  }
  return "";
}

function normalizeValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
  );
}

function getPreferredTitle(values, settings) {
  return values[settings.filenameProperty] || values[settings.titleProperty] || values.title || values["文件名"];
}

function sanitizeTitle(title) {
  return sanitizeFileName(String(title || "Untitled").trim()) || "Untitled";
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function scoreFolder(folder, modal) {
  if (!folder.path) return 100;
  if (folder.path === modal.preferredFolderPath) return 90;
  if (folder.path === modal.plugin.settings.defaultFolder) return 80;
  const recentIndex = modal.plugin.settings.recentFolders.indexOf(folder.path);
  if (recentIndex !== -1) return 70 - recentIndex;
  const active = modal.app.workspace.getActiveFile();
  if (active && active.parent && active.parent.path === folder.path) return 60;
  return 0;
}

function scoreTemplate(file, plugin) {
  const recentIndex = plugin.settings.recentTemplates.indexOf(file.path);
  return recentIndex === -1 ? 0 : 50 - recentIndex;
}

function unique(items) {
  return Array.from(new Set(items));
}

function normalizeSuggestionValues(value) {
  if (Array.isArray(value)) return value.flatMap(normalizeSuggestionValues);
  if (value && typeof value === "object") return [];
  if (value === null || value === undefined) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFolderPathFromCreateArgs(args) {
  for (const arg of args) {
    if (!arg) continue;
    if (arg instanceof TFolder) return arg.path;
    if (typeof arg === "string" && !arg.endsWith(".md")) return normalizePath(arg);
    if (typeof arg === "object") {
      if (arg.folder instanceof TFolder) return arg.folder.path;
      if (typeof arg.folder === "string") return normalizePath(arg.folder);
      if (typeof arg.path === "string" && !arg.path.endsWith(".md")) return normalizePath(arg.path);
    }
  }
  return "";
}
