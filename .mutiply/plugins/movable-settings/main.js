const { Plugin, Setting } = require('obsidian');

class MovableSettingsPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'open-movable-settings',
			name: 'Open Movable Settings',
			callback: () => {
				this.app.setting.open();
				setTimeout(() => {
					this.makeSettingsMovable();
				}, 50);
			}
		});

		this.addCommand({
			id: 'toggle-settings-movable',
			name: 'Toggle Settings Movable Mode',
			callback: () => {
				this.toggleMovableMode();
			}
		});

		this.addRibbonIcon('settings', 'Open Movable Settings', () => {
			this.app.setting.open();
			setTimeout(() => {
				this.makeSettingsMovable();
			}, 50);
		});

		this.addSettingTab(new MovableSettingsPluginSettings(this.app, this));

		this.registerEvent(this.app.workspace.on('css-change', () => {
			if (this.isSettingsOpen()) {
				this.makeSettingsMovable();
			}
		}));
	}

	isSettingsOpen() {
		return document.querySelector('.settings-modal') !== null;
	}

	toggleMovableMode() {
		const modal = document.querySelector('.settings-modal');
		if (modal) {
			if (modal.hasClass('movable-settings-enabled')) {
				this.removeMovableMode();
			} else {
				this.makeSettingsMovable();
			}
		} else {
			this.app.setting.open();
			setTimeout(() => {
				this.makeSettingsMovable();
			}, 50);
		}
	}

	makeSettingsMovable() {
		const modal = document.querySelector('.settings-modal');
		if (!modal || modal.hasClass('movable-settings-enabled')) return;

		const backdrop = document.querySelector('.modal-backdrop');
		if (backdrop) {
			backdrop.style.background = 'rgba(0, 0, 0, 0.15)';
		}

		modal.addClass('movable-settings-enabled');
		modal.style.position = 'fixed';
		modal.style.top = '80px';
		modal.style.left = '10%';
		modal.style.transform = 'none';
		modal.style.width = '80%';
		modal.style.height = 'calc(100% - 160px)';
		modal.style.maxWidth = 'none';
		modal.style.maxHeight = 'none';
		modal.style.margin = '0';

		const header = modal.querySelector('.view-header');
		if (header) {
			header.style.cursor = 'grab';
			header.style.userSelect = 'none';

			header.addEventListener('mousedown', this.startDrag.bind(this, modal));
		}

		const resizeHandle = document.createElement('div');
		resizeHandle.className = 'movable-settings-resize-handle';
		modal.appendChild(resizeHandle);
		resizeHandle.addEventListener('mousedown', this.startResize.bind(this, modal));

		document.addEventListener('keydown', this.handleEscape.bind(this));
	}

	removeMovableMode() {
		const modal = document.querySelector('.settings-modal');
		if (!modal) return;

		const backdrop = document.querySelector('.modal-backdrop');
		if (backdrop) {
			backdrop.style.background = '';
		}

		modal.removeClass('movable-settings-enabled');
		modal.style.position = '';
		modal.style.top = '';
		modal.style.left = '';
		modal.style.transform = '';
		modal.style.width = '';
		modal.style.height = '';
		modal.style.maxWidth = '';
		modal.style.maxHeight = '';
		modal.style.margin = '';

		const header = modal.querySelector('.view-header');
		if (header) {
			header.style.cursor = '';
			header.style.userSelect = '';
			header.removeEventListener('mousedown', this.startDrag);
		}

		const resizeHandle = modal.querySelector('.movable-settings-resize-handle');
		if (resizeHandle) {
			resizeHandle.remove();
		}

		document.removeEventListener('keydown', this.handleEscape);
	}

	startDrag(modal, e) {
		if (e.target.closest('button') || e.target.closest('.search-input')) return;

		e.preventDefault();
		const startX = e.clientX - modal.offsetLeft;
		const startY = e.clientY - modal.offsetTop;

		const onMouseMove = (ev) => {
			modal.style.left = Math.max(0, ev.clientX - startX) + 'px';
			modal.style.top = Math.max(0, ev.clientY - startY) + 'px';
		};

		const onMouseUp = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}

	startResize(modal, e) {
		e.preventDefault();
		const startWidth = modal.offsetWidth;
		const startHeight = modal.offsetHeight;
		const startX = e.clientX;
		const startY = e.clientY;

		const onMouseMove = (ev) => {
			const newWidth = Math.max(400, startWidth + ev.clientX - startX);
			const newHeight = Math.max(300, startHeight + ev.clientY - startY);
			modal.style.width = newWidth + 'px';
			modal.style.height = newHeight + 'px';
		};

		const onMouseUp = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}

	handleEscape(e) {
		if (e.key === 'Escape') {
			const modal = document.querySelector('.settings-modal');
			if (modal && modal.hasClass('movable-settings-enabled')) {
				this.removeMovableMode();
			}
		}
	}

	onunload() {
		this.removeMovableMode();
	}
}

class MovableSettingsPluginSettings extends Setting {
	constructor(app, plugin) {
		super(app, plugin);
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Movable Settings')
			.setDesc('Make the settings window movable so you can see changes behind it.')
			.addButton((btn) => {
				btn.setButtonText('Open Movable Settings')
					.onClick(() => {
						this.plugin.app.setting.open();
						setTimeout(() => {
							this.plugin.makeSettingsMovable();
						}, 50);
					});
			});
	}
}

module.exports = MovableSettingsPlugin;