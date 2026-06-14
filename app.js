/**
 * RoboClub Drive - Main Application Coordinator
 */
import { storage } from './storage.js';
import { preview } from './preview.js';
import { auth } from './auth.js';

class App {
    constructor() {
        this.currentFolderId = 'root';
        this.currentCategory = 'all';
        this.viewMode = 'grid';
        this.breadcrumbsHistory = [{ id: 'root', name: 'Kök Dizin' }];
        this._contextTarget = null;
        this._renameTargetId = null;
        this.currentPreviewUrl = null;
        this._authMode = 'signin'; // 'signin' | 'signup'

        this.dom = {
            filesContainer:       document.getElementById('files-container'),
            emptyState:           document.getElementById('empty-state'),
            breadcrumbs:          document.getElementById('breadcrumbs'),
            searchInput:          document.getElementById('search-input'),
            themeToggle:          document.getElementById('theme-toggle-btn'),
            themeIcon:            document.getElementById('theme-icon'),
            btnNew:               document.getElementById('btn-new'),
            newDropdown:          document.getElementById('new-dropdown'),
            btnNewFolder:         document.getElementById('btn-new-folder'),
            fileUpload:           document.getElementById('file-upload'),
            dropZone:             document.getElementById('drop-zone'),
            uploadProgress:       document.getElementById('upload-progress-container'),
            uploadFileName:       document.getElementById('upload-file-name'),
            uploadPercentage:     document.getElementById('upload-percentage'),
            uploadBarFill:        document.getElementById('upload-progress-bar-fill'),
            folderModal:          document.getElementById('folder-modal'),
            folderNameInput:      document.getElementById('folder-name-input'),
            btnCreateFolder:      document.getElementById('btn-create-folder'),
            btnCancelFolder:      document.getElementById('btn-cancel-folder'),
            closeFolderModal:     document.getElementById('close-folder-modal'),
            renameModal:          document.getElementById('rename-modal'),
            renameInput:          document.getElementById('rename-input'),
            btnConfirmRename:     document.getElementById('btn-confirm-rename'),
            btnCancelRename:      document.getElementById('btn-cancel-rename'),
            closeRenameModal:     document.getElementById('close-rename-modal'),
            previewModal:         document.getElementById('preview-modal'),
            previewFilename:      document.getElementById('preview-filename'),
            previewIcon:          document.getElementById('preview-icon'),
            closePreviewModal:    document.getElementById('close-preview-modal'),
            previewLoading:       document.getElementById('preview-loading'),
            preview3d:            document.getElementById('3d-preview-container'),
            canvas3d:             document.getElementById('3d-canvas'),
            previewImage:         document.getElementById('image-preview-container'),
            imgElement:           document.getElementById('image-preview'),
            previewCode:          document.getElementById('code-preview-container'),
            codeElement:          document.getElementById('code-preview'),
            previewGeneric:       document.getElementById('generic-preview-container'),
            genericFilename:      document.getElementById('generic-filename'),
            genericFilesize:      document.getElementById('generic-filesize'),
            btnDownloadPreview:   document.getElementById('btn-download-preview'),
            btnGenerateShare:     document.getElementById('btn-generate-share'),
            shareContainer:       document.getElementById('share-container'),
            shareLinkInput:       document.getElementById('share-link-input'),
            btnCopyLink:          document.getElementById('btn-copy-link'),
            btn3dReset:           document.getElementById('btn-3d-reset'),
            select3dColor:        document.getElementById('select-3d-color'),
            viewGridBtn:          document.getElementById('view-grid-btn'),
            viewListBtn:          document.getElementById('view-list-btn'),
            storagePercentageText:document.getElementById('storage-percentage-text'),
            storageBarFill:       document.getElementById('storage-bar-fill'),
            storageUsedDesc:      document.getElementById('storage-used-desc'),
            btnClearStorage:      document.getElementById('btn-clear-storage'),
            toastContainer:       document.getElementById('toast-container'),
            navItems:             document.querySelectorAll('.nav-item'),
            contextMenu:          document.getElementById('context-menu'),
            ctxRename:            document.getElementById('ctx-rename'),
            ctxShare:             document.getElementById('ctx-share'),
            ctxDelete:            document.getElementById('ctx-delete'),
            sidebar:              document.getElementById('sidebar'),
            sidebarOverlay:       document.getElementById('sidebar-overlay'),
            mobileMenuBtn:        document.getElementById('mobile-menu-btn'),
            sidebarCloseBtn:      document.getElementById('sidebar-close-btn'),
            // Auth UI
            userInfo:             document.getElementById('user-info'),
            guestInfo:            document.getElementById('guest-info'),
            userEmailDisplay:     document.getElementById('user-email-display'),
            btnSignout:           document.getElementById('btn-signout'),
            btnSignin:            document.getElementById('btn-signin'),
            btnDeleteAccount:     document.getElementById('btn-delete-account'),
            authModal:            document.getElementById('auth-modal'),
            authModalTitle:       document.getElementById('auth-modal-title'),
            closeAuthModal:       document.getElementById('close-auth-modal'),
            authEmail:            document.getElementById('auth-email'),
            authPassword:         document.getElementById('auth-password'),
            authError:            document.getElementById('auth-error'),
            btnAuthSubmit:        document.getElementById('btn-auth-submit'),
            btnAuthSwitch:        document.getElementById('btn-auth-switch'),
            btnTogglePw:          document.getElementById('btn-toggle-pw'),
            pwEyeIcon:            document.getElementById('pw-eye-icon'),
            // Delete account modal
            deleteAccountModal:        document.getElementById('delete-account-modal'),
            closeDeleteAccountModal:   document.getElementById('close-delete-account-modal'),
            deleteAccountPassword:     document.getElementById('delete-account-password'),
            btnCancelDeleteAccount:    document.getElementById('btn-cancel-delete-account'),
            btnConfirmDeleteAccount:   document.getElementById('btn-confirm-delete-account'),
        };
    }

    async start() {
        try {
            await storage.init();
            this.initTheme();
            this.bindEvents();
            this.updateAuthUI();
            this.updateStorageUsage();
            await this.handleSharedLink();
            await this.refreshFileList();
            this.showToast('RoboClub Drive Hazır!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast(error.message || 'Başlatma hatası.', 'error');
        }
    }

    /* ── Theme ─────────────────────────────────────── */
    initTheme() { this.setTheme(localStorage.getItem('theme') || 'light'); }
    setTheme(name) {
        document.documentElement.setAttribute('data-theme', name);
        localStorage.setItem('theme', name);
        this.dom.themeIcon.setAttribute('data-lucide', name === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    }

    /* ── Sidebar ───────────────────────────────────── */
    openSidebar()  { this.dom.sidebar.classList.add('open');    this.dom.sidebarOverlay.classList.add('active'); }
    closeSidebar() { this.dom.sidebar.classList.remove('open'); this.dom.sidebarOverlay.classList.remove('active'); }

    /* ── Auth UI ───────────────────────────────────── */
    updateAuthUI() {
        const user = auth.getUser();
        const loggedIn = !!user;

        this.dom.userInfo.style.display  = loggedIn ? 'block' : 'none';
        this.dom.guestInfo.style.display = loggedIn ? 'none'  : 'block';

        if (loggedIn) {
            this.dom.userEmailDisplay.textContent = user.email;
        }

        // Upload zone & new-item button: only show to logged-in users
        this.dom.dropZone.style.display  = loggedIn ? 'block' : 'none';
        this.dom.btnNew.style.display    = loggedIn ? 'inline-flex' : 'none';

        // Refresh file list so action buttons reflect ownership
        this.refreshFileList();
    }

    openAuthModal(mode) {
        this._authMode = mode || 'signin';
        this._setAuthMode(this._authMode);
        this.dom.authEmail.value    = '';
        this.dom.authPassword.value = '';
        this._showAuthError('');
        this.dom.authModal.classList.add('active');
        setTimeout(() => this.dom.authEmail.focus(), 100);
    }

    _setAuthMode(mode) {
        this._authMode = mode;
        if (mode === 'signin') {
            this.dom.authModalTitle.textContent  = 'Giriş Yap';
            this.dom.btnAuthSubmit.textContent   = 'Giriş Yap';
            this.dom.btnAuthSwitch.textContent   = 'Hesabın yok mu? Kayıt ol';
        } else {
            this.dom.authModalTitle.textContent  = 'Kayıt Ol';
            this.dom.btnAuthSubmit.textContent   = 'Kayıt Ol';
            this.dom.btnAuthSwitch.textContent   = 'Zaten hesabın var mı? Giriş yap';
        }
    }

    _showAuthError(msg) {
        this.dom.authError.style.display = msg ? 'block' : 'none';
        this.dom.authError.textContent   = msg;
    }

    /* ── Context menu ──────────────────────────────── */
    showContextMenu(e, item) {
        e.preventDefault();
        e.stopPropagation();
        this._contextTarget = item;
        const isOwner = auth.isLoggedIn() && (auth.isAdmin() || auth.getUserId() === item.userId);
        this.dom.ctxShare.style.display  = item.type === 'file' ? 'flex' : 'none';
        this.dom.ctxRename.style.display = isOwner ? 'flex' : 'none';
        this.dom.ctxDelete.style.display = isOwner ? 'flex' : 'none';
        const m = this.dom.contextMenu;
        m.style.display = 'block';
        m.style.left = Math.min(e.clientX, window.innerWidth  - 200) + 'px';
        m.style.top  = Math.min(e.clientY, window.innerHeight - 130) + 'px';
        lucide.createIcons();
    }
    hideContextMenu() { this.dom.contextMenu.style.display = 'none'; this._contextTarget = null; }

    /* ── Rename modal ──────────────────────────────── */
    openRenameModal(item) {
        this._renameTargetId = item.id;
        this.dom.renameInput.value = item.name;
        this.dom.renameModal.classList.add('active');
        setTimeout(() => { this.dom.renameInput.focus(); this.dom.renameInput.select(); }, 100);
    }

    /* ── Share link ────────────────────────────────── */
    async copyShareLink(item) {
        const link = (item.type === 'file' && item.downloadUrl)
            ? item.downloadUrl
            : location.origin + location.pathname + '#file=' + item.id;
        try {
            await navigator.clipboard.writeText(link);
            this.showToast('Paylaşım linki kopyalandı!', 'success');
        } catch (_) { this.showToast('Link kopyalanamadı.', 'error'); }
    }

    /* ── Delete ────────────────────────────────────── */
    async deleteItem(item) {
        if (!auth.isLoggedIn()) { this.showToast('Silmek için giriş yapmalısınız.', 'error'); return; }
        if (!confirm('"' + item.name + '" silinsin mi?')) return;
        try {
            await storage.deleteItem(item.id);
            await this.refreshFileList();
            this.updateStorageUsage();
            this.showToast('"' + item.name + '" silindi.', 'success');
        } catch (err) { this.showToast(err.message || 'Silinemedi.', 'error'); }
    }

    /* ── Download ──────────────────────────────────── */
    async downloadItem(item) {
        if (item.type === 'file') {
            try {
                this.showToast('"' + item.name + '" indiriliyor...', 'success');
                const res = await fetch(item.downloadUrl);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            } catch (err) {
                this.showToast('İndirme başarısız.', 'error');
            }
        } else {
            // Tüm dosyaları topla
            this.showToast('"' + item.name + '" ZIP hazırlanıyor...', 'success');
            try {
                const zip = new window.JSZip();
                const allFiles = [];
                await this._collectFiles(allFiles, item.id, item.name);

                let done = 0;
                for (const f of allFiles) {
                    try {
                        const res = await fetch(f.url);
                        if (res.ok) {
                            const blob = await res.blob();
                            zip.file(f.path, blob);
                        }
                    } catch (_) {}
                    done++;
                    // Her 10 dosyada bir bildir
                    if (done % 10 === 0 || done === allFiles.length) {
                        this.showToast(done + ' / ' + allFiles.length + ' dosya işlendi...', 'success');
                    }
                }

                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name + '.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                this.showToast('"' + item.name + '.zip" indirildi (' + allFiles.length + ' dosya).', 'success');
            } catch (err) {
                console.error(err);
                this.showToast('ZIP oluşturulamadı: ' + err.message, 'error');
            }
        }
    }

    // Tüm dosyaları recursive olarak düz listeye topla
    async _collectFiles(list, folderId, folderPath) {
        const items = await storage.getItems(folderId);
        for (const item of items) {
            if (item.type === 'file') {
                list.push({ path: folderPath + '/' + item.name, url: item.downloadUrl });
            } else if (item.type === 'folder') {
                await this._collectFiles(list, item.id, folderPath + '/' + item.name);
            }
        }
    }

    /* ── Event binding ─────────────────────────────── */
    bindEvents() {

        /* theme */
        this.dom.themeToggle.addEventListener('click', () => {
            this.setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        });

        /* mobile sidebar */
        this.dom.mobileMenuBtn.addEventListener('click', () => this.openSidebar());
        this.dom.sidebarCloseBtn.addEventListener('click', () => this.closeSidebar());
        this.dom.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

        /* auth buttons */
        this.dom.btnSignin.addEventListener('click', () => this.openAuthModal('signin'));
        this.dom.btnSignout.addEventListener('click', async () => {
            await auth.signOut();
            this.updateAuthUI();
            this.showToast('Çıkış yapıldı.', 'success');
        });
        this.dom.closeAuthModal.addEventListener('click', () => this.dom.authModal.classList.remove('active'));
        this.dom.btnAuthSwitch.addEventListener('click', () => {
            this._setAuthMode(this._authMode === 'signin' ? 'signup' : 'signin');
            this._showAuthError('');
        });

        // Password visibility toggle
        this.dom.btnTogglePw.addEventListener('click', () => {
            const isText = this.dom.authPassword.type === 'text';
            this.dom.authPassword.type = isText ? 'password' : 'text';
            this.dom.pwEyeIcon.setAttribute('data-lucide', isText ? 'eye' : 'eye-off');
            lucide.createIcons();
        });

        this.dom.btnAuthSubmit.addEventListener('click', async () => {
            const email    = this.dom.authEmail.value.trim();
            const password = this.dom.authPassword.value;
            if (!email || !password) { this._showAuthError('E-posta ve şifre gerekli.'); return; }
            this.dom.btnAuthSubmit.disabled = true;
            try {
                if (this._authMode === 'signin') {
                    await auth.signIn(email, password);
                    this.showToast('Giriş yapıldı!', 'success');
                    this.dom.authModal.classList.remove('active');
                    this.updateAuthUI();
                } else {
                    const result = await auth.signUp(email, password);
                    if (result.loggedIn) {
                        this.showToast('Kayıt olundu, giriş yapıldı!', 'success');
                        this.dom.authModal.classList.remove('active');
                        this.updateAuthUI();
                    } else {
                        this._showAuthError('Kayıt olundu! E-postana gelen onay linkine tıkla, sonra giriş yap.');
                    }
                }
            } catch (err) {
                this._showAuthError(err.message);
            } finally {
                this.dom.btnAuthSubmit.disabled = false;
            }
        });
        this.dom.authPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.dom.btnAuthSubmit.click();
        });

        // Delete account modal
        this.dom.btnDeleteAccount.addEventListener('click', () => {
            this.dom.deleteAccountPassword.value = '';
            this.dom.deleteAccountModal.classList.add('active');
            setTimeout(() => this.dom.deleteAccountPassword.focus(), 100);
        });
        this.dom.closeDeleteAccountModal.addEventListener('click', () => this.dom.deleteAccountModal.classList.remove('active'));
        this.dom.btnCancelDeleteAccount.addEventListener('click', () => this.dom.deleteAccountModal.classList.remove('active'));
        this.dom.btnConfirmDeleteAccount.addEventListener('click', async () => {
            const password = this.dom.deleteAccountPassword.value;
            if (!password) return;
            this.dom.btnConfirmDeleteAccount.disabled = true;
            try {
                // Verify password by trying to sign in first
                const user = auth.getUser();
                await auth.signIn(user.email, password);
                await auth.deleteAccount();
                this.dom.deleteAccountModal.classList.remove('active');
                this.updateAuthUI();
                await this.refreshFileList();
                this.showToast('Hesabın silindi.', 'success');
            } catch (err) {
                this.showToast(err.message || 'Hesap silinemedi.', 'error');
            } finally {
                this.dom.btnConfirmDeleteAccount.disabled = false;
            }
        });

        /* nav categories */
        this.dom.navItems.forEach(navItem => {
            navItem.addEventListener('click', async (e) => {
                e.preventDefault();
                this.dom.navItems.forEach(i => i.classList.remove('active'));
                navItem.classList.add('active');
                this.currentCategory = navItem.getAttribute('data-tab');
                const isAll = this.currentCategory === 'all';
                this.dom.breadcrumbs.style.visibility = isAll ? 'visible' : 'hidden';
                if (auth.isLoggedIn()) this.dom.dropZone.style.display = isAll ? 'block' : 'none';
                await this.refreshFileList();
                this.closeSidebar();
            });
        });

        /* search */
        let searchTimeout;
        this.dom.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.refreshFileList(), 300);
        });

        /* grid / list */
        this.dom.viewGridBtn.addEventListener('click', () => {
            this.dom.viewGridBtn.classList.add('active');
            this.dom.viewListBtn.classList.remove('active');
            this.dom.filesContainer.className = 'files-container grid-view';
            this.viewMode = 'grid';
        });
        this.dom.viewListBtn.addEventListener('click', () => {
            this.dom.viewListBtn.classList.add('active');
            this.dom.viewGridBtn.classList.remove('active');
            this.dom.filesContainer.className = 'files-container list-view';
            this.viewMode = 'list';
        });

        /* dropdown */
        this.dom.btnNew.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dom.newDropdown.style.display =
                this.dom.newDropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
            this.dom.newDropdown.style.display = 'none';
            this.hideContextMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
                this.dom.renameModal.classList.remove('active');
                this.dom.folderModal.classList.remove('active');
                this.dom.authModal.classList.remove('active');
                this.dom.deleteAccountModal.classList.remove('active');
            }
        });

        /* folder modal */
        this.dom.btnNewFolder.addEventListener('click', () => {
            if (!auth.isLoggedIn()) { this.openAuthModal('signin'); return; }
            this.dom.folderModal.classList.add('active');
            this.dom.folderNameInput.value = '';
            this.dom.folderNameInput.focus();
        });
        this.dom.closeFolderModal.addEventListener('click', () => this.dom.folderModal.classList.remove('active'));
        this.dom.btnCancelFolder.addEventListener('click',  () => this.dom.folderModal.classList.remove('active'));
        this.dom.btnCreateFolder.addEventListener('click', async () => {
            const name = this.dom.folderNameInput.value.trim();
            if (!name) return;
            try {
                await storage.createFolder(name, this.currentFolderId);
                this.dom.folderModal.classList.remove('active');
                await this.refreshFileList();
                this.showToast('"' + name + '" klasörü oluşturuldu.', 'success');
            } catch (err) { this.showToast(err.message, 'error'); }
        });
        this.dom.folderNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.dom.btnCreateFolder.click();
        });

        /* rename modal */
        this.dom.closeRenameModal.addEventListener('click', () => this.dom.renameModal.classList.remove('active'));
        this.dom.btnCancelRename.addEventListener('click',  () => this.dom.renameModal.classList.remove('active'));
        this.dom.btnConfirmRename.addEventListener('click', async () => {
            const newName = this.dom.renameInput.value.trim();
            if (!newName || !this._renameTargetId) return;
            try {
                await storage.renameItem(this._renameTargetId, newName);
                this.dom.renameModal.classList.remove('active');
                await this.refreshFileList();
                this.showToast('"' + newName + '" olarak adlandırıldı.', 'success');
            } catch (err) { this.showToast(err.message, 'error'); }
        });
        this.dom.renameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.dom.btnConfirmRename.click();
        });

        /* file upload */
        this.dom.fileUpload.addEventListener('change', async (e) => {
            if (!auth.isLoggedIn()) { this.openAuthModal('signin'); return; }
            const files = Array.from(e.target.files);
            if (files.length) await this.uploadFiles(files);
            e.target.value = '';
        });

        /* drag & drop */
        this.dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.dom.dropZone.classList.add('dragover'); });
        this.dom.dropZone.addEventListener('dragleave', () => this.dom.dropZone.classList.remove('dragover'));
        this.dom.dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            this.dom.dropZone.classList.remove('dragover');
            if (!auth.isLoggedIn()) { this.openAuthModal('signin'); return; }
            const dtItems = e.dataTransfer.items;
            if (dtItems && dtItems.length > 0) {
                this.dom.uploadProgress.style.display = 'block';
                for (const dtItem of Array.from(dtItems)) {
                    if (dtItem.kind === 'file') {
                        const entry = dtItem.webkitGetAsEntry();
                        if (entry) await this.uploadEntry(entry, this.currentFolderId);
                    }
                }
                this.dom.uploadProgress.style.display = 'none';
                await this.refreshFileList();
                this.updateStorageUsage();
            } else {
                const files = Array.from(e.dataTransfer.files);
                if (files.length) await this.uploadFiles(files);
            }
        });
        this.dom.dropZone.addEventListener('click', () => {
            if (!auth.isLoggedIn()) { this.openAuthModal('signin'); return; }
            this.dom.fileUpload.click();
        });

        /* preview modal */
        this.dom.closePreviewModal.addEventListener('click', () => {
            this.dom.previewModal.classList.remove('active');
            preview.destroy3d();
            this.currentPreviewUrl = null;
        });
        this.dom.btnCopyLink.addEventListener('click', () => {
            navigator.clipboard.writeText(this.dom.shareLinkInput.value)
                .then(() => this.showToast('Paylaşım linki kopyalandı!', 'success'))
                .catch(() => { this.dom.shareLinkInput.select(); document.execCommand('copy'); this.showToast('Paylaşım linki kopyalandı!', 'success'); });
        });
        this.dom.btnGenerateShare.addEventListener('click', () => {
            this.dom.shareContainer.style.display =
                this.dom.shareContainer.style.display === 'flex' ? 'none' : 'flex';
        });

        /* 3D */
        this.dom.btn3dReset.addEventListener('click', () => preview.resetCamera());
        this.dom.select3dColor.addEventListener('change', (e) => preview.changeColor(e.target.value));

        /* clear all */
        this.dom.btnClearStorage.addEventListener('click', async () => {
            if (!auth.isLoggedIn()) { this.showToast('Bu işlem için giriş yapmalısınız.', 'error'); return; }
            if (!confirm('Tüm dosya ve klasörleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
            await storage.clearAll();
            this.currentFolderId = 'root';
            this.breadcrumbsHistory = [{ id: 'root', name: 'Kök Dizin' }];
            this.updateBreadcrumbs();
            await this.refreshFileList();
            this.updateStorageUsage();
            this.showToast('Tüm depolama alanı boşaltıldı.', 'success');
        });

        /* context menu */
        this.dom.ctxRename.addEventListener('click', () => { const t = this._contextTarget; this.hideContextMenu(); if (t) this.openRenameModal(t); });
        this.dom.ctxShare.addEventListener('click',  () => { const t = this._contextTarget; this.hideContextMenu(); if (t) this.copyShareLink(t); });
        this.dom.ctxDelete.addEventListener('click', async () => { const t = this._contextTarget; this.hideContextMenu(); if (t) await this.deleteItem(t); });
    }

    /* ── Upload ────────────────────────────────────── */
    async uploadFiles(files) {
        this.dom.uploadProgress.style.display = 'block';
        for (const file of files) {
            if (file.size > 250 * 1024 * 1024) { this.showToast('"' + file.name + '" çok büyük (Sınır: 250 MB)', 'error'); continue; }
            this.dom.uploadFileName.textContent = file.name;
            this.dom.uploadPercentage.textContent = '0%';
            this.dom.uploadBarFill.style.width = '0%';
            try {
                await storage.saveFile(file.name, file, this.currentFolderId, (p) => {
                    this.dom.uploadPercentage.textContent = Math.round(p) + '%';
                    this.dom.uploadBarFill.style.width = p + '%';
                });
                this.showToast('"' + file.name + '" yüklendi.', 'success');
            } catch (err) { this.showToast(err.message || 'Yükleme hatası.', 'error'); }
        }
        this.dom.uploadProgress.style.display = 'none';
        await this.refreshFileList();
        this.updateStorageUsage();
    }

    async uploadEntry(entry, parentId) {
        if (entry.isFile) {
            const file = await new Promise((res, rej) => entry.file(res, rej));
            if (file.size > 250 * 1024 * 1024) { this.showToast('"' + file.name + '" çok büyük', 'error'); return; }
            this.dom.uploadFileName.textContent = file.name;
            this.dom.uploadPercentage.textContent = '0%';
            this.dom.uploadBarFill.style.width = '0%';
            try {
                await storage.saveFile(file.name, file, parentId, (p) => {
                    this.dom.uploadPercentage.textContent = Math.round(p) + '%';
                    this.dom.uploadBarFill.style.width = p + '%';
                });
                this.showToast('"' + file.name + '" yüklendi.', 'success');
            } catch (err) { this.showToast(err.message || 'Yükleme hatası.', 'error'); }
        } else if (entry.isDirectory) {
            this.dom.uploadFileName.textContent = 'Klasör: ' + entry.name;
            try {
                const folder = await storage.createFolder(entry.name, parentId);
                const reader = entry.createReader();
                const entries = await new Promise((res, rej) => {
                    let all = [];
                    const read = () => reader.readEntries((r) => { if (!r.length) res(all); else { all = all.concat(r); read(); } }, rej);
                    read();
                });
                for (const child of entries) await this.uploadEntry(child, folder.id);
            } catch (err) { this.showToast('Klasör hatası: ' + entry.name, 'error'); }
        }
    }

    /* ── File list ─────────────────────────────────── */
    async refreshFileList() {
        const q = this.dom.searchInput.value.trim();
        try {
            let items;
            if (q) items = await storage.searchItems(q);
            else if (this.currentCategory !== 'all') items = await storage.getItemsByCategory(this.currentCategory);
            else items = await storage.getItems(this.currentFolderId);
            this.renderItems(items);
        } catch (err) {
            console.error('refreshFileList', err);
            this.showToast('Dosya listesi güncellenemedi.', 'error');
        }
    }

    renderItems(items) {
        this.dom.filesContainer.innerHTML = '';
        if (!items.length) { this.dom.emptyState.style.display = 'flex'; return; }
        this.dom.emptyState.style.display = 'none';

        const currentUserId = auth.getUserId();

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'file-item';
            el.dataset.id   = item.id;
            el.dataset.type = item.type;

            const icon     = this.getFileIcon(item);
            const sizeStr  = item.type === 'file' ? storage.formatBytes(item.fileSize) : '';
            const date     = new Date(item.createdAt).toLocaleDateString('tr-TR');
            const isOwner  = currentUserId && (auth.isAdmin() || currentUserId === item.userId);

            const shareBtn  = item.type === 'file'
                ? '<button class="btn-action-share" title="Paylaşım Linki Kopyala"><i data-lucide="share-2"></i></button>'
                : '';
            const downloadBtn = '<button class="btn-action-download" title="' + (item.type === 'folder' ? 'ZIP olarak indir' : 'İndir') + '"><i data-lucide="download"></i></button>';
            const ownerBtns = isOwner
                ? '<button class="btn-action-rename" title="Yeniden Adlandır"><i data-lucide="pencil"></i></button>' +
                  '<button class="btn-action-delete" title="Sil"><i data-lucide="trash-2"></i></button>'
                : '';

            el.innerHTML =
                '<div class="file-icon-wrapper"><i data-lucide="' + icon + '"></i></div>' +
                '<div class="file-name" title="' + item.name + '">' + item.name + '</div>' +
                '<div class="file-meta">' +
                    (sizeStr ? '<span class="size">' + sizeStr + '</span>' : '') +
                    '<span class="date">' + date + '</span>' +
                '</div>' +
                '<div class="file-actions" onclick="event.stopPropagation();">' +
                    downloadBtn + shareBtn + ownerBtns +
                '</div>';

            el.addEventListener('click',       () => this.handleItemClick(item));
            el.addEventListener('dblclick',    () => this.handleItemDblClick(item));
            el.addEventListener('contextmenu', (e) => this.showContextMenu(e, item));

            el.querySelector('.btn-action-download').addEventListener('click', (e) => { e.stopPropagation(); this.downloadItem(item); });
            if (item.type === 'file') {
                el.querySelector('.btn-action-share').addEventListener('click', (e) => { e.stopPropagation(); this.copyShareLink(item); });
            }
            if (isOwner) {
                el.querySelector('.btn-action-rename').addEventListener('click', (e) => { e.stopPropagation(); this.openRenameModal(item); });
                el.querySelector('.btn-action-delete').addEventListener('click', (e) => { e.stopPropagation(); this.deleteItem(item); });
            }

            this.dom.filesContainer.appendChild(el);
        });
        lucide.createIcons();
    }

    handleItemClick(item) { if (window.innerWidth <= 768) this.handleItemDblClick(item); }

    async handleItemDblClick(item) {
        if (item.type === 'folder') {
            this.currentFolderId = item.id;
            this.breadcrumbsHistory.push({ id: item.id, name: item.name });
            this.updateBreadcrumbs();
            await this.refreshFileList();
        } else {
            await this.openFilePreview(item.id);
        }
    }

    updateBreadcrumbs() {
        this.dom.breadcrumbs.innerHTML = '';
        this.breadcrumbsHistory.forEach((crumb, idx) => {
            const el = document.createElement('span');
            el.className = 'breadcrumb-item';
            el.textContent = crumb.name;
            if (idx < this.breadcrumbsHistory.length - 1) {
                el.addEventListener('click', async () => {
                    this.breadcrumbsHistory = this.breadcrumbsHistory.slice(0, idx + 1);
                    this.currentFolderId = crumb.id;
                    this.updateBreadcrumbs();
                    await this.refreshFileList();
                });
            }
            this.dom.breadcrumbs.appendChild(el);
        });
    }

    getFileIcon(item) {
        if (item.type === 'folder') return 'folder';
        const ext = item.name.split('.').pop().toLowerCase();
        if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return 'file-image';
        if (['stl','obj','step','igs','f3d'].includes(ext))        return 'layers';
        if (['py','cpp','h','ino','js','html','css','json','c'].includes(ext)) return 'code-2';
        if (ext === 'pdf')                                          return 'file-text';
        if (['zip','rar','tar','gz','7z'].includes(ext))            return 'file-archive';
        if (['mp4','avi','mkv','mov'].includes(ext))                return 'video';
        if (['mp3','wav','ogg'].includes(ext))                      return 'music';
        return 'file';
    }

    /* ── Preview modal ─────────────────────────────── */
    async openFilePreview(fileId) {
        try {
            const file = await storage.getItem(fileId);
            if (!file) return;

            this.dom.previewFilename.textContent = file.name;
            this.dom.previewIcon.setAttribute('data-lucide', this.getFileIcon(file));
            lucide.createIcons();

            this.dom.previewLoading.style.display = 'block';
            this.dom.preview3d.style.display      = 'none';
            this.dom.previewImage.style.display   = 'none';
            this.dom.previewCode.style.display    = 'none';
            this.dom.previewGeneric.style.display = 'none';
            this.dom.shareContainer.style.display = 'none';
            this.dom.previewModal.classList.add('active');

            this.currentPreviewUrl            = file.downloadUrl;
            this.dom.btnDownloadPreview.href  = file.downloadUrl;
            this.dom.btnDownloadPreview.download = file.name;
            this.dom.shareLinkInput.value     = file.downloadUrl;

            const ext = file.name.split('.').pop().toLowerCase();

            if (ext === 'stl') {
                this.dom.preview3d.style.display = 'block';
                preview.init3d(this.dom.canvas3d, this.dom.preview3d);
                await preview.loadSTL(file.downloadUrl);
            } else if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) {
                this.dom.previewImage.style.display = 'flex';
                this.dom.imgElement.src = file.downloadUrl;
            } else if (['py','cpp','h','ino','js','html','css','json','txt'].includes(ext) || file.fileType.startsWith('text/')) {
                this.dom.previewCode.style.display = 'block';
                const text = await (await fetch(file.downloadUrl)).text();
                this.dom.codeElement.innerHTML = preview.highlightCode(text, file.name);
            } else {
                this.dom.previewGeneric.style.display = 'flex';
                this.dom.genericFilename.textContent  = file.name;
                this.dom.genericFilesize.textContent  = 'Boyut: ' + storage.formatBytes(file.fileSize);
            }

            this.dom.previewLoading.style.display = 'none';
        } catch (err) {
            console.error('Preview error', err);
            this.showToast('Dosya önizlemesi yüklenemedi.', 'error');
            this.dom.previewLoading.style.display = 'none';
        }
    }

    /* ── Shared-link on load ───────────────────────── */
    async handleSharedLink() {
        const hash = location.hash;
        if (!hash.startsWith('#file=')) return;
        const fileId = hash.slice(6);
        try {
            const file = await storage.getItem(fileId);
            if (file) {
                if (file.parentId !== 'root') {
                    const folder = await storage.getItem(file.parentId);
                    if (folder) {
                        this.currentFolderId = folder.id;
                        this.breadcrumbsHistory = [{ id: 'root', name: 'Kök Dizin' }, { id: folder.id, name: folder.name }];
                        this.updateBreadcrumbs();
                    }
                }
                this.showToast('Paylaşılan dosya açılıyor: ' + file.name, 'success');
                setTimeout(() => this.openFilePreview(file.id), 500);
            } else {
                this.showToast('Paylaşılan dosya bulunamadı.', 'error');
            }
        } catch (err) { console.error(err); }
        history.replaceState('', document.title, location.pathname);
    }

    /* ── Storage usage ─────────────────────────────── */
    async updateStorageUsage() {
        try {
            const used  = await storage.getUsedSize();
            const limit = storage.storageLimit;
            const pct   = Math.min(Math.round((used / limit) * 100), 100);
            this.dom.storagePercentageText.textContent = pct + '%';
            this.dom.storageBarFill.style.width        = pct + '%';
            this.dom.storageUsedDesc.textContent       = storage.formatBytes(used) + ' / ' + storage.formatBytes(limit) + ' kullanıldı';
            this.dom.storageBarFill.style.background   = pct >= 70
                ? 'var(--color-danger)'
                : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))';
        } catch (err) { console.error('Storage usage error', err); }
    }

    /* ── Toast ─────────────────────────────────────── */
    showToast(message, type) {
        type = type || 'success';
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.innerHTML = '<i data-lucide="' + (type === 'success' ? 'check-circle' : 'alert-circle') + '"></i><span>' + message + '</span>';
        this.dom.toastContainer.appendChild(t);
        lucide.createIcons();
        setTimeout(() => {
            t.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => t.parentNode && t.parentNode.removeChild(t), 300);
        }, 3500);
    }
}

const _s = document.createElement('style');
_s.textContent = '@keyframes fadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-20px)}}';
document.head.appendChild(_s);

window.addEventListener('DOMContentLoaded', () => new App().start());
