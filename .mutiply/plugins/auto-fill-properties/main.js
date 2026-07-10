const { App, Plugin, PluginSettingTab, Setting, Notice, Modal } = require('obsidian');

class PropertyIndexer {
    constructor(app) {
        this.app = app;
        this.indexes = {};
    }

    buildIndex(folderPath) {
        const files = this.app.vault.getMarkdownFiles().filter(file => 
            file.path.startsWith(folderPath) && !file.path.startsWith(`${folderPath}/Templates`)
        );

        const values = {};
        const valueFiles = {};

        files.forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter) {
                Object.entries(cache.frontmatter).forEach(([key, val]) => {
                    const stringValue = String(val);
                    if (!values[key]) {
                        values[key] = new Set();
                        valueFiles[key] = {};
                    }
                    values[key].add(stringValue);
                    if (!valueFiles[key][stringValue]) {
                        valueFiles[key][stringValue] = new Set();
                    }
                    valueFiles[key][stringValue].add(file.path);
                });
            }
        });

        return { values, valueFiles, lastUpdated: Date.now() };
    }

    getIndex(folderPath, forceRefresh = false) {
        if (!forceRefresh && this.indexes[folderPath] && Date.now() - this.indexes[folderPath].lastUpdated < 60000) {
            return this.indexes[folderPath];
        }
        this.indexes[folderPath] = this.buildIndex(folderPath);
        return this.indexes[folderPath];
    }

    getFilteredValues(folderPath, propertyName, selectedValues) {
        const index = this.getIndex(folderPath);
        const otherKeys = Object.keys(selectedValues).filter(k => k !== propertyName && selectedValues[k]);
        
        if (otherKeys.length === 0) {
            return Array.from(index.values[propertyName] || []).sort();
        }

        let commonFiles = null;
        otherKeys.forEach(key => {
            const value = selectedValues[key];
            const files = index.valueFiles[key]?.[value];
            if (!files) return;
            if (!commonFiles) {
                commonFiles = new Set(files);
            } else {
                commonFiles = new Set([...commonFiles].filter(f => files.has(f)));
            }
        });

        if (!commonFiles || commonFiles.size === 0) {
            return Array.from(index.values[propertyName] || []).sort();
        }

        const availableValues = new Set();
        commonFiles.forEach(filePath => {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file) {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.frontmatter?.[propertyName]) {
                    availableValues.add(String(cache.frontmatter[propertyName]));
                }
            }
        });

        return Array.from(availableValues).sort();
    }

    invalidateCache(folderPath) {
        delete this.indexes[folderPath];
    }

    invalidateAllCaches() {
        this.indexes = {};
    }
}

class PresetManager {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.presets = [];
        this.recentPresets = [];
    }

    async loadPresets() {
        try {
            const data = await this.plugin.loadData();
            this.presets = data?.presets || [];
            this.recentPresets = data?.recentPresets || [];
        } catch (e) {
            console.error('Failed to load presets:', e);
            this.presets = [];
            this.recentPresets = [];
        }
    }

    async savePresets() {
        try {
            await this.plugin.saveData({ 
                presets: this.presets,
                recentPresets: this.recentPresets
            });
        } catch (e) {
            console.error('Failed to save presets:', e);
        }
    }

    getMatchingPresets(folderPath) {
        return this.presets.filter(preset => 
            preset.folderPattern === '*' || folderPath.startsWith(preset.folderPattern)
        );
    }

    async addPreset(preset) {
        preset.id = preset.id || `preset-${Date.now()}`;
        this.presets.push(preset);
        await this.savePresets();
    }

    async updatePreset(id, updates) {
        const index = this.presets.findIndex(p => p.id === id);
        if (index !== -1) {
            this.presets[index] = { ...this.presets[index], ...updates };
            await this.savePresets();
        }
    }

    async deletePreset(id) {
        this.presets = this.presets.filter(p => p.id !== id);
        await this.savePresets();
    }

    getPreset(id) {
        return this.presets.find(p => p.id === id) || null;
    }

    async recordRecent(presetId) {
        this.recentPresets = this.recentPresets.filter(id => id !== presetId);
        this.recentPresets.unshift(presetId);
        this.recentPresets = this.recentPresets.slice(0, 5);
        await this.savePresets();
    }

    getRecentPresets() {
        return this.recentPresets.map(id => this.getPreset(id)).filter(Boolean);
    }

    async scanTemplates() {
        const templatesFolder = this.app.vault.getAbstractFileByPath('Templates');
        if (!templatesFolder || !templatesFolder.children) return;

        const templateFiles = templatesFolder.children.filter(f => f.extension === 'md');
        const existingPresetIds = new Set(this.presets.map(p => p.id));

        for (const file of templateFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) continue;

            const presetId = `preset-auto-${file.name}`;
            if (existingPresetIds.has(presetId)) continue;

            const defaultValues = {};
            Object.entries(cache.frontmatter).forEach(([key, val]) => {
                if (val && !['PrevNote', 'NextNote', 'words'].includes(key)) {
                    defaultValues[key] = String(val);
                }
            });

            await this.addPreset({
                id: presetId,
                name: file.name.replace('.md', ''),
                type: 'auto',
                sourceTemplate: file.name,
                folderPattern: '*',
                defaultValues,
                requiredFields: []
            });
        }
    }
}

class PropertyFillModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.indexer = plugin.indexer;
        this.presetManager = plugin.presetManager;
        this.selectedPreset = null;
        this.selectedValues = {};
        this.propertyInputs = {};
        this.currentFolder = '';
    }

    open(folderPath = null) {
        if (folderPath) {
            this.currentFolder = folderPath;
        } else {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.currentFolder = activeFile.parent.path;
            }
        }
        super.open();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('afp-modal');
        this.renderPresetSelector(contentEl);
        this.propertyGridEl = contentEl.createDiv('afp-property-grid');
        this.renderProperties();
        this.renderFooter(contentEl);
    }

    onClose() {
        this.contentEl.empty();
        this.propertyInputs = {};
        this.selectedValues = {};
    }

    renderPresetSelector(container) {
        const header = container.createDiv('afp-preset-header');
        
        const selectContainer = header.createDiv('afp-preset-select');
        selectContainer.createEl('label', { text: '选择预设方案:', cls: 'afp-property-label' });
        this.presetSelect = selectContainer.createEl('select', { cls: 'afp-property-select' });
        
        const opt = this.presetSelect.createEl('option', { value: '', text: '无预设 - 从现有文件中筛选' });
        
        const recentPresets = this.presetManager.getRecentPresets();
        if (recentPresets.length > 0) {
            const optRecent = this.presetSelect.createEl('option', { value: '---recent---', text: '--- 最近使用 ---' });
            optRecent.disabled = true;
            recentPresets.forEach(preset => {
                this.presetSelect.createEl('option', { value: preset.id, text: `⭐ ${preset.name}` });
            });
        }

        const presets = this.presetManager.getMatchingPresets(this.currentFolder);
        const autoPresets = presets.filter(p => p.type === 'auto');
        const manualPresets = presets.filter(p => p.type !== 'auto');

        if (autoPresets.length > 0) {
            const optAuto = this.presetSelect.createEl('option', { value: '---auto---', text: '--- 模板预设 ---' });
            optAuto.disabled = true;
            autoPresets.forEach(preset => {
                this.presetSelect.createEl('option', { value: preset.id, text: preset.name });
            });
        }

        if (manualPresets.length > 0) {
            const optManual = this.presetSelect.createEl('option', { value: '---manual---', text: '--- 自定义预设 ---' });
            optManual.disabled = true;
            manualPresets.forEach(preset => {
                this.presetSelect.createEl('option', { value: preset.id, text: preset.name });
            });
        }

        const addBtn = header.createEl('button', { text: '+ 新增预设', cls: 'afp-btn afp-btn-secondary' });
        addBtn.addEventListener('click', () => {
            new PresetEditorModal(this.app, this.plugin, null).open();
        });

        this.presetSelect.addEventListener('change', (e) => {
            const presetId = e.target.value;
            this.selectedPreset = presetId ? this.presetManager.getPreset(presetId) : null;
            if (this.selectedPreset) {
                this.presetManager.recordRecent(presetId);
            }
            this.applyPreset();
        });
    }

    renderProperties() {
        const grid = this.propertyGridEl;
        grid.empty();

        const currentFile = this.app.workspace.getActiveFile();
        const currentFrontmatter = currentFile ? 
            this.app.metadataCache.getFileCache(currentFile)?.frontmatter || {} : {};

        const index = this.indexer.getIndex(this.currentFolder);
        const allProperties = new Set([
            ...Object.keys(currentFrontmatter),
            ...Object.keys(index.values)
        ]);

        if (this.selectedPreset) {
            const presetProps = this.selectedPreset.properties ? Object.keys(this.selectedPreset.properties) : Object.keys(this.selectedPreset.defaultValues || {});
            presetProps.forEach(prop => allProperties.add(prop));
        }

        const internalProps = ['PrevNote', 'NextNote', 'created', 'modified', 'tags', 'words'];
        const displayProps = Array.from(allProperties).filter(p => !internalProps.includes(p));

        if (displayProps.length === 0) {
            grid.createDiv('afp-empty-state', { text: '当前文件夹中未找到可填充的属性' });
            return;
        }

        displayProps.forEach(prop => {
            const row = grid.createDiv('afp-property-row');
            const labelContainer = row.createDiv('afp-property-label');

            const isRequired = this.selectedPreset?.requiredFields?.includes(prop);
            labelContainer.createEl('span', { text: prop });
            if (isRequired) {
                labelContainer.createEl('span', { text: '*', cls: 'required' });
            }

            const select = row.createEl('select', { cls: 'afp-property-select' });
            this.propertyInputs[prop] = select;

            select.createEl('option', { value: '', text: `选择 ${prop}...` });

            const values = this.indexer.getFilteredValues(this.currentFolder, prop, this.selectedValues);
            values.forEach(val => {
                select.createEl('option', { value: val, text: val });
            });

            select.createEl('option', { value: '__custom__', text: '... 自定义输入' });

            const currentValue = this.selectedValues[prop] || currentFrontmatter[prop];
            if (currentValue) {
                select.setValue(String(currentValue));
            }

            select.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === '__custom__') {
                    this.showCustomInput(prop);
                    return;
                }
                this.selectedValues[prop] = value || undefined;
                this.updateFilteredOptions();
            });
        });
    }

    showCustomInput(propertyName) {
        new CustomInputModal(this.app, propertyName, (value) => {
            if (value) {
                this.selectedValues[propertyName] = value;
                if (this.propertyInputs[propertyName]) {
                    this.propertyInputs[propertyName].setValue(value);
                }
                this.updateFilteredOptions();
            }
        }).open();
    }

    applyPreset() {
        if (this.selectedPreset) {
            Object.entries(this.selectedPreset.defaultValues).forEach(([key, value]) => {
                this.selectedValues[key] = value;
            });
        }
        this.renderProperties();
    }

    updateFilteredOptions() {
        Object.keys(this.propertyInputs).forEach(prop => {
            const select = this.propertyInputs[prop];
            const currentValue = select.value;

            select.innerHTML = '';
            select.createEl('option', { value: '', text: `选择 ${prop}...` });

            const values = this.indexer.getFilteredValues(this.currentFolder, prop, this.selectedValues);
            values.forEach(val => {
                select.createEl('option', { value: val, text: val });
            });

            select.createEl('option', { value: '__custom__', text: '... 自定义输入' });

            if (currentValue && (values.includes(currentValue) || currentValue === this.selectedValues[prop])) {
                select.setValue(currentValue);
            }
        });
    }

    renderFooter(container) {
        const footer = container.createDiv('afp-footer');

        const cancelBtn = footer.createEl('button', { text: '取消', cls: 'afp-btn afp-btn-secondary' });
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        const applyBtn = footer.createEl('button', { text: '应用填充', cls: 'afp-btn afp-btn-primary' });
        applyBtn.addEventListener('click', () => {
            this.applyChanges();
        });
    }

    async applyChanges() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('未找到活动文件');
            return;
        }

        const content = await this.app.vault.read(activeFile);
        const { frontmatter, body } = this.parseFrontmatter(content);

        Object.entries(this.selectedValues).forEach(([key, value]) => {
            if (value) {
                frontmatter[key] = value;
            }
        });

        const newContent = this.buildFrontmatter(frontmatter) + body;
        await this.app.vault.modify(activeFile, newContent);

        new Notice('属性填充成功');
        this.close();
    }

    parseFrontmatter(content) {
        const lines = content.split('\n');
        const frontmatter = {};
        let inFrontmatter = false;
        let bodyStart = 0;

        if (lines[0] === '---') {
            inFrontmatter = true;
            bodyStart = 1;

            for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                    bodyStart = i + 1;
                    break;
                }

                const match = lines[i].match(/^(\S+):\s*(.+)$/);
                if (match) {
                    frontmatter[match[1].trim()] = match[2].trim();
                }
            }
        }

        const body = lines.slice(bodyStart).join('\n');
        return { frontmatter, body };
    }

    buildFrontmatter(frontmatter) {
        if (Object.keys(frontmatter).length === 0) {
            return '';
        }

        let fm = '---\n';
        Object.entries(frontmatter).forEach(([key, value]) => {
            fm += `${key}: ${this.stringifyYamlValue(value)}\n`;
        });
        fm += '---\n\n';
        return fm;
    }

    stringifyYamlValue(value) {
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (Array.isArray(value)) return JSON.stringify(value);
        if (typeof value === 'string') {
            if (value.includes(' ') || value.includes(':') || value.includes('"')) {
                return `"${value}"`;
            }
            return value;
        }
        return String(value);
    }
}

class CustomInputModal extends Modal {
    constructor(app, propertyName, callback) {
        super(app);
        this.propertyName = propertyName;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('afp-modal');

        contentEl.createEl('h3', { text: `自定义 ${this.propertyName}` });

        const input = contentEl.createEl('input', {
            type: 'text',
            cls: 'afp-search-input',
            placeholder: `输入 ${this.propertyName} 的值...`
        });

        const footer = contentEl.createDiv('afp-footer');
        const cancelBtn = footer.createEl('button', { text: '取消', cls: 'afp-btn afp-btn-secondary' });
        const okBtn = footer.createEl('button', { text: '确定', cls: 'afp-btn afp-btn-primary' });

        cancelBtn.addEventListener('click', () => this.close());
        okBtn.addEventListener('click', () => {
            this.callback(input.value.trim());
            this.close();
        });

        input.focus();
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.callback(input.value.trim());
                this.close();
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

class PresetEditorModal extends Modal {
    constructor(app, plugin, presetId = null) {
        super(app);
        this.plugin = plugin;
        this.presetManager = plugin.presetManager;
        this.indexer = plugin.indexer;
        this.presetId = presetId;
        this.preset = presetId ? { ...this.presetManager.getPreset(presetId) } : {
            name: '',
            folderPattern: '*',
            defaultValues: {},
            requiredFields: []
        };
        this.propertyRows = [];
        this.discoveredProperties = [];
    }

    findTemplateFile(templateName) {
        const pathsToTry = [
            `Templates/${templateName}`,
            `模板/${templateName}`,
            `_templates/${templateName}`,
            templateName
        ];

        for (const path of pathsToTry) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file) return file;
        }

        const corePlugins = this.app.internalPlugins.plugins['core-plugins'];
        if (corePlugins?.instance?.options?.templateFolder) {
            const templatePath = `${corePlugins.instance.options.templateFolder}/${templateName}`;
            const file = this.app.vault.getAbstractFileByPath(templatePath);
            if (file) return file;
        }

        for (const file of this.app.vault.getFiles()) {
            if (file.name === templateName) {
                return file;
            }
        }

        return null;
    }

    discoverProperties() {
        const properties = new Set();
        const excludedKeys = ['PrevNote', 'NextNote', 'words', 'position', 'aliases', 'cssclasses', 'tags'];

        if (this.preset.sourceTemplate) {
            const templateFile = this.findTemplateFile(this.preset.sourceTemplate);
            if (templateFile) {
                const cache = this.app.metadataCache.getFileCache(templateFile);
                if (cache?.frontmatter) {
                    Object.keys(cache.frontmatter).forEach(key => {
                        if (!excludedKeys.includes(key)) {
                            properties.add(key);
                        }
                    });
                }
            } else {
                console.error('AutoFillProperties: Template file not found:', this.preset.sourceTemplate);
            }
        }

        let scanFolder = this.preset.folderPattern;
        if (scanFolder === '*') {
            const activeFile = this.app.workspace.getActiveFile();
            scanFolder = activeFile ? activeFile.parent.path : '';
        }

        if (scanFolder) {
            const index = this.indexer.getIndex(scanFolder);
            Object.keys(index.values).forEach(key => {
                if (!excludedKeys.includes(key)) {
                    properties.add(key);
                }
            });
        }

        return Array.from(properties);
    }

    getPropertyValues(propertyName) {
        const values = new Set();

        if (this.preset.sourceTemplate) {
            const templateFile = this.findTemplateFile(this.preset.sourceTemplate);
            if (templateFile) {
                const cache = this.app.metadataCache.getFileCache(templateFile);
                if (cache?.frontmatter?.[propertyName]) {
                    const val = String(cache.frontmatter[propertyName]);
                    if (val) values.add(val);
                }
            }
        }

        let scanFolder = this.preset.folderPattern;
        if (scanFolder === '*') {
            const activeFile = this.app.workspace.getActiveFile();
            scanFolder = activeFile ? activeFile.parent.path : '';
        }

        if (scanFolder) {
            const index = this.indexer.getIndex(scanFolder);
            Array.from(index.values[propertyName] || []).forEach(val => values.add(val));
        }

        return Array.from(values).sort();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('afp-modal');

        contentEl.createEl('h3', { text: this.presetId ? '编辑预设' : '新建预设' });

        const nameRow = contentEl.createDiv('afp-property-row');
        nameRow.createEl('label', { text: '预设名称:', cls: 'afp-property-label' });
        const nameInput = nameRow.createEl('input', { type: 'text', cls: 'afp-search-input', value: this.preset.name });

        const folderRow = contentEl.createDiv('afp-property-row');
        folderRow.createEl('label', { text: '适用文件夹:', cls: 'afp-property-label' });
        folderRow.createEl('span', { text: '输入文件夹路径，使用 * 表示全部', cls: 'afp-filter-info' });
        const folderInput = folderRow.createEl('input', { type: 'text', cls: 'afp-search-input', value: this.preset.folderPattern });

        this.discoveredProperties = this.discoverProperties();

        const propertiesSection = contentEl.createDiv();
        propertiesSection.createEl('label', { text: '预设属性:', cls: 'afp-property-label' });
        propertiesSection.createEl('span', { text: '点击添加属性，选择默认值', cls: 'afp-filter-info' });

        const addBtn = propertiesSection.createEl('button', { text: '+ 添加属性', cls: 'afp-btn afp-btn-secondary' });
        addBtn.style.marginBottom = '12px';
        addBtn.addEventListener('click', () => {
            this.showAddPropertyModal();
        });

        const scanBtn = propertiesSection.createEl('button', { text: '🔄 重新扫描', cls: 'afp-btn afp-btn-secondary' });
        scanBtn.style.marginLeft = '8px';
        scanBtn.style.marginBottom = '12px';
        scanBtn.addEventListener('click', () => {
            this.discoveredProperties = this.discoverProperties();
            new Notice(`发现 ${this.discoveredProperties.length} 个属性`);
        });

        this.propertiesGrid = propertiesSection.createDiv('afp-property-grid');
        this.propertiesGrid.style.gap = '8px';

        const propsConfig = this.preset.properties || {};
        const existingProps = new Set();

        if (Object.keys(propsConfig).length > 0) {
            Object.keys(propsConfig).forEach(prop => {
                this.addPropertyRow(prop, propsConfig[prop]);
                existingProps.add(prop);
            });
        } else if (Object.keys(this.preset.defaultValues).length > 0) {
            Object.keys(this.preset.defaultValues).forEach(prop => {
                this.addPropertyRow(prop, {
                    type: 'text',
                    defaultValue: this.preset.defaultValues[prop],
                    autoFill: '',
                    quickOptions: []
                });
                existingProps.add(prop);
            });
        }

        this.discoveredProperties.forEach(prop => {
            if (!existingProps.has(prop)) {
                this.addPropertyRow(prop, {
                    type: 'text',
                    defaultValue: '',
                    autoFill: '',
                    quickOptions: []
                });
            }
        });

        const requiredRow = contentEl.createDiv('afp-property-row');
        requiredRow.createEl('label', { text: '必填字段:', cls: 'afp-property-label' });
        requiredRow.createEl('span', { text: '选择必填的属性', cls: 'afp-filter-info' });
        
        const requiredContainer = requiredRow.createDiv();
        requiredContainer.style.display = 'flex';
        requiredContainer.style.flexWrap = 'wrap';
        requiredContainer.style.gap = '8px';

        const availableProps = [...new Set([...this.discoveredProperties, ...Object.keys(this.preset.defaultValues)])];
        availableProps.forEach(prop => {
            const checkbox = requiredContainer.createEl('label');
            checkbox.style.display = 'flex';
            checkbox.style.alignItems = 'center';
            checkbox.style.gap = '4px';
            checkbox.style.cursor = 'pointer';
            
            const input = checkbox.createEl('input', { type: 'checkbox' });
            input.checked = this.preset.requiredFields?.includes(prop);
            input.dataset.prop = prop;
            
            checkbox.createEl('span', { text: prop });
        });

        const footer = contentEl.createDiv('afp-footer');
        const cancelBtn = footer.createEl('button', { text: '取消', cls: 'afp-btn afp-btn-secondary' });
        const saveBtn = footer.createEl('button', { text: '保存', cls: 'afp-btn afp-btn-primary' });

        cancelBtn.addEventListener('click', () => this.close());
        saveBtn.addEventListener('click', async () => {
            this.preset.name = nameInput.value.trim();
            this.preset.folderPattern = folderInput.value.trim() || '*';

            this.preset.properties = {};
            this.preset.defaultValues = {};
            this.propertyRows.forEach(row => {
                const propName = row.propNameInput.style.display !== 'none' ? row.propNameInput.value.trim() : row.propNameCustomInput.value.trim();
                if (propName) {
                    const defaultValue = row.valueInput.style.display !== 'none' ? row.valueInput.value.trim() : row.valueCustomInput.value.trim();
                    const propConfig = {
                        type: row.typeSelect.value,
                        defaultValue: defaultValue,
                        autoFill: row.autoFillInput.value.trim(),
                        quickOptions: row.quickOptionsInput.value.split(',').map(s => s.trim()).filter(Boolean)
                    };
                    this.preset.properties[propName] = propConfig;
                    this.preset.defaultValues[propName] = propConfig.defaultValue;
                }
            });

            this.preset.requiredFields = [];
            requiredContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                if (cb.checked) {
                    this.preset.requiredFields.push(cb.dataset.prop);
                }
            });

            if (!this.preset.name) {
                new Notice('请输入预设名称');
                return;
            }

            if (!this.preset.type) {
                this.preset.type = 'manual';
            }

            if (this.presetId) {
                await this.presetManager.updatePreset(this.presetId, this.preset);
            } else {
                await this.presetManager.addPreset(this.preset);
            }

            new Notice('预设保存成功');
            this.close();
        });
    }

    addPropertyRow(propName, propConfig = {}) {
        const config = {
            type: propConfig.type || 'text',
            defaultValue: propConfig.defaultValue || '',
            autoFill: propConfig.autoFill || '',
            quickOptions: propConfig.quickOptions || []
        };

        const row = this.propertiesGrid.createDiv('afp-property-row');
        row.style.flexDirection = 'column';
        row.style.alignItems = 'stretch';
        row.style.gap = '6px';
        row.style.padding = '8px';
        row.style.border = '1px solid var(--background-modifier-border)';
        row.style.borderRadius = '4px';

        const topRow = row.createDiv();
        topRow.style.display = 'flex';
        topRow.style.alignItems = 'center';
        topRow.style.gap = '12px';

        const nameSelect = topRow.createEl('select', { cls: 'afp-property-select' });
        nameSelect.style.flex = '1';
        
        nameSelect.createEl('option', { value: '__custom__', text: '自定义属性名...' });
        this.discoveredProperties.forEach(prop => {
            const opt = nameSelect.createEl('option', { value: prop, text: prop });
            if (prop === propName) {
                opt.selected = true;
            }
        });
        if (propName && !this.discoveredProperties.includes(propName)) {
            const opt = nameSelect.createEl('option', { value: propName, text: propName });
            opt.selected = true;
        }

        const nameInput = topRow.createEl('input', { type: 'text', cls: 'afp-search-input', value: propName });
        nameInput.style.display = propName && !this.discoveredProperties.includes(propName) ? 'block' : 'none';
        nameInput.style.flex = '1';

        const typeSelect = topRow.createEl('select', { cls: 'afp-property-select' });
        typeSelect.style.width = '100px';
        typeSelect.createEl('option', { value: 'text', text: '文本' });
        typeSelect.createEl('option', { value: 'list', text: '列表' });
        typeSelect.createEl('option', { value: 'checkbox', text: '复选框' });
        typeSelect.createEl('option', { value: 'number', text: '数字' });
        typeSelect.createEl('option', { value: 'date', text: '日期' });
        typeSelect.value = config.type;

        const delBtn = topRow.createEl('button', { text: '×', cls: 'afp-btn afp-btn-secondary' });
        delBtn.style.width = '32px';
        delBtn.style.height = '32px';
        delBtn.style.padding = '0';
        delBtn.addEventListener('click', () => {
            row.remove();
            this.propertyRows = this.propertyRows.filter(r => r !== row);
        });

        const autoFillRow = row.createDiv('afp-property-row');
        autoFillRow.createEl('label', { text: '自动填充:', cls: 'afp-property-label' });
        autoFillRow.createEl('span', { text: '支持 {{today}}, {{now}}, {{folder}}, {{filename}}', cls: 'afp-filter-info' });
        const autoFillInput = autoFillRow.createEl('input', { type: 'text', cls: 'afp-search-input', value: config.autoFill });
        autoFillInput.style.flex = '1';

        const quickOptionsRow = row.createDiv('afp-property-row');
        quickOptionsRow.createEl('label', { text: '快捷选项:', cls: 'afp-property-label' });
        quickOptionsRow.createEl('span', { text: '用逗号分隔', cls: 'afp-filter-info' });
        const quickOptionsInput = quickOptionsRow.createEl('input', { type: 'text', cls: 'afp-search-input', value: config.quickOptions.join(', ') });
        quickOptionsInput.style.flex = '1';

        const defaultValueRow = row.createDiv('afp-property-row');
        defaultValueRow.createEl('label', { text: '默认值:', cls: 'afp-property-label' });

        const valueSelect = defaultValueRow.createEl('select', { cls: 'afp-property-select' });
        valueSelect.style.flex = '1';
        
        valueSelect.createEl('option', { value: '', text: '选择默认值...' });
        valueSelect.createEl('option', { value: '__custom__', text: '自定义值...' });
        
        const values = this.getPropertyValues(propName);
        values.forEach(val => {
            const opt = valueSelect.createEl('option', { value: val, text: val });
            if (val === config.defaultValue) {
                opt.selected = true;
            }
        });

        const valueInput = defaultValueRow.createEl('input', { type: 'text', cls: 'afp-search-input', value: config.defaultValue });
        valueInput.style.display = config.defaultValue && !values.includes(config.defaultValue) ? 'block' : 'none';
        valueInput.style.flex = '1';

        nameSelect.addEventListener('change', (e) => {
            if (e.target.value === '__custom__') {
                nameSelect.style.display = 'none';
                nameInput.style.display = 'block';
                nameInput.focus();
            } else {
                nameSelect.style.display = 'block';
                nameInput.style.display = 'none';
                nameInput.value = e.target.value;
                
                valueSelect.innerHTML = '';
                valueSelect.createEl('option', { value: '', text: '选择默认值...' });
                valueSelect.createEl('option', { value: '__custom__', text: '自定义值...' });
                const newValues = this.getPropertyValues(e.target.value);
                newValues.forEach(val => {
                    valueSelect.createEl('option', { value: val, text: val });
                });
            }
        });

        valueSelect.addEventListener('change', (e) => {
            if (e.target.value === '__custom__') {
                valueSelect.style.display = 'none';
                valueInput.style.display = 'block';
                valueInput.focus();
            } else {
                valueSelect.style.display = 'block';
                valueInput.style.display = 'none';
                valueInput.value = e.target.value;
            }
        });

        this.propertyRows.push({
            propNameInput: nameSelect,
            propNameCustomInput: nameInput,
            valueInput: valueSelect,
            valueCustomInput: valueInput,
            typeSelect,
            autoFillInput,
            quickOptionsInput,
            row
        });
    }

    showAddPropertyModal() {
        const modal = new Modal(this.app);
        modal.titleEl.setText('选择要添加的属性');
        
        const content = modal.contentEl;
        content.addClass('afp-modal');
        content.style.maxHeight = '400px';
        content.style.overflowY = 'auto';

        if (this.discoveredProperties.length === 0) {
            content.createDiv('afp-empty-state', { text: '未发现可用属性，请先点击"重新扫描"' });
        } else {
            const existingProps = this.propertyRows.map(r => {
                const nameEl = r.propNameInput.style.display !== 'none' ? r.propNameInput : r.propNameCustomInput;
                return nameEl.value;
            });

            this.discoveredProperties.forEach(prop => {
                if (!existingProps.includes(prop)) {
                    const btn = content.createEl('button', { text: prop, cls: 'afp-btn afp-btn-secondary' });
                    btn.style.width = '100%';
                    btn.style.marginBottom = '8px';
                    btn.addEventListener('click', () => {
                        this.addPropertyRow(prop, {});
                        modal.close();
                    });
                }
            });
        }

        modal.open();
    }

    onClose() {
        this.contentEl.empty();
        this.propertyRows = [];
    }
}

class AutoFillPropertiesSettingsTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '自动填充属性设置' });

        const presetsSection = containerEl.createDiv();
        presetsSection.createEl('h3', { text: '预设方案管理' });

        const presets = this.plugin.presetManager.presets;

        if (presets.length === 0) {
            presetsSection.createEl('p', { text: '暂无预设方案，点击下方按钮创建', cls: 'afp-filter-info' });
        } else {
            const autoPresets = presets.filter(p => p.type === 'auto');
            const manualPresets = presets.filter(p => p.type !== 'auto');

            if (autoPresets.length > 0) {
                presetsSection.createEl('div', { text: '模板预设（自动生成）', cls: 'afp-preset-group-label' });
                autoPresets.forEach(preset => {
                    this.renderPresetRow(presetsSection, preset);
                });
            }

            if (manualPresets.length > 0) {
                presetsSection.createEl('div', { text: '自定义预设', cls: 'afp-preset-group-label' });
                manualPresets.forEach(preset => {
                    this.renderPresetRow(presetsSection, preset);
                });
            }
        }

        const addPresetBtn = presetsSection.createEl('button', { text: '+ 创建新预设', cls: 'afp-btn afp-btn-primary' });
        addPresetBtn.addEventListener('click', () => {
            new PresetEditorModal(this.app, this.plugin).open();
        });

        const scanTemplatesBtn = presetsSection.createEl('button', { text: '重新扫描模板', cls: 'afp-btn afp-btn-secondary' });
        scanTemplatesBtn.style.marginLeft = '12px';
        scanTemplatesBtn.addEventListener('click', async () => {
            await this.plugin.presetManager.scanTemplates();
            this.display();
            new Notice('模板扫描完成');
        });

        const instructions = containerEl.createDiv();
        instructions.createEl('h3', { text: '使用说明' });
        const ul = instructions.createEl('ul');
        ul.createEl('li', { text: '1. 在笔记中打开命令面板 (Ctrl+P / Cmd+P)' });
        ul.createEl('li', { text: '2. 搜索并执行 "Auto Fill Properties"' });
        ul.createEl('li', { text: '3. 选择预设方案或从同文件夹文件中筛选属性值' });
        ul.createEl('li', { text: '4. 点击"应用填充"完成属性填写' });
        ul.createEl('li', { text: '提示：选择属性值后，其他属性的可选值会自动根据同文件夹文件进行筛选' });
    }

    renderPresetRow(container, preset) {
        const presetRow = container.createDiv('afp-property-row');
        presetRow.style.flexDirection = 'row';
        presetRow.style.alignItems = 'center';
        presetRow.style.justifyContent = 'space-between';

        const info = container.createDiv();
        info.createEl('div', { text: preset.name, cls: 'afp-property-label' });
        info.createEl('div', { text: `文件夹: ${preset.folderPattern}`, cls: 'afp-filter-info' });

        const actions = container.createDiv();
        const editBtn = actions.createEl('button', { text: '编辑', cls: 'afp-btn afp-btn-secondary' });
        editBtn.style.marginRight = '8px';
        editBtn.addEventListener('click', () => {
            new PresetEditorModal(this.app, this.plugin, preset.id).open();
        });

        if (preset.type !== 'auto') {
            const deleteBtn = actions.createEl('button', { text: '删除', cls: 'afp-btn afp-btn-secondary' });
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`确定删除预设 "${preset.name}" 吗？`)) {
                    await this.plugin.presetManager.deletePreset(preset.id);
                    this.display();
                }
            });
        }

        presetRow.appendChild(info);
        presetRow.appendChild(actions);
    }
}

class AutoFillPropertiesPlugin extends Plugin {
    async onload() {
        this.indexer = new PropertyIndexer(this.app);
        this.presetManager = new PresetManager(this.app, this);

        await this.presetManager.loadPresets();
        await this.presetManager.scanTemplates();

        this.addCommand({
            id: 'auto-fill-properties',
            name: 'Auto Fill Properties',
            callback: () => {
                new PropertyFillModal(this.app, this).open();
            }
        });

        this.addSettingTab(new AutoFillPropertiesSettingsTab(this.app, this));

        this.registerEvent(
            this.app.metadataCache.on('changed', (file) => {
                const folderPath = file.parent.path;
                this.indexer.invalidateCache(folderPath);
            })
        );

        this.addRibbonIcon('pencil', 'Auto Fill Properties', () => {
            new PropertyFillModal(this.app, this).open();
        });

        console.log('Auto Fill Properties Plugin loaded');
    }

    onunload() {
        console.log('Auto Fill Properties Plugin unloaded');
    }
}

module.exports = AutoFillPropertiesPlugin;