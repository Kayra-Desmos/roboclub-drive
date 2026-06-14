/**
 * RoboClub Drive - Supabase Storage Engine
 */
import { supabaseConfig } from './config.js';
import { auth } from './auth.js';

const REST     = supabaseConfig.url + '/rest/v1';
const STORAGE  = supabaseConfig.url + '/storage/v1';
const BUCKET   = supabaseConfig.bucket;

/** Build headers using current auth token */
function headers(extra) {
    const token = auth.getToken();
    return Object.assign({
        'apikey':        supabaseConfig.anonKey,
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
    }, extra || {});
}

class SupabaseStorageEngine {
    constructor() {
        this.storageLimit = 1 * 1024 * 1024 * 1024; // 1 GB
    }

    async init() {
        await auth.refreshIfNeeded();
        const res = await fetch(`${STORAGE}/bucket/${BUCKET}`, { headers: headers() });
        if (res.status === 404) {
            const cr = await fetch(`${STORAGE}/bucket`, {
                method: 'POST', headers: headers(),
                body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 262144000 })
            });
            if (!cr.ok) {
                const e = await cr.json();
                if (!String(e.error || '').includes('already exists'))
                    throw new Error('Bucket oluşturulamadı: ' + (e.message || JSON.stringify(e)));
            }
        }
        await this._ensureTable();
        console.log('Supabase storage engine initialized.');
    }

    async _ensureTable() {
        const res = await fetch(`${REST}/items?limit=1`, { headers: headers() });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            if (body.code === '42P01') throw new Error('"items" tablosu bulunamadı. Supabase SQL Editor\'dan tabloyu oluşturun.');
        }
    }

    /** GET items in folder */
    async getItems(parentId = 'root') {
        const res = await fetch(
            `${REST}/items?parent_id=eq.${encodeURIComponent(parentId)}&order=type.desc,name.asc`,
            { headers: headers() }
        );
        if (!res.ok) throw new Error('Dosyalar alınamadı');
        return (await res.json()).map(this._rowToItem);
    }

    /** GET single item */
    async getItem(id) {
        const res = await fetch(`${REST}/items?id=eq.${encodeURIComponent(id)}&limit=1`, { headers: headers() });
        if (!res.ok) return null;
        const rows = await res.json();
        return rows.length ? this._rowToItem(rows[0]) : null;
    }

    /** CREATE folder */
    async createFolder(name, parentId = 'root') {
        const userId = auth.getUserId();
        if (!userId) throw new Error('Klasör oluşturmak için giriş yapmalısınız.');
        const id = 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const row = {
            id, name, type: 'folder',
            parent_id: parentId,
            file_size: 0, file_type: '', storage_path: '', download_url: '',
            created_at: Date.now(),
            user_id: userId
        };
        const res = await fetch(`${REST}/items`, { method: 'POST', headers: headers(), body: JSON.stringify(row) });
        if (!res.ok) throw new Error('Klasör oluşturulamadı');
        return this._rowToItem(row);
    }

    /** UPLOAD file */
    saveFile(name, fileBlob, parentId = 'root', onProgress = null) {
        return new Promise(async (resolve, reject) => {
            const userId = auth.getUserId();
            if (!userId) { reject(new Error('Dosya yüklemek için giriş yapmalısınız.')); return; }

            try {
                const used = await this.getUsedSize();
                if (used + fileBlob.size > this.storageLimit) {
                    reject(new Error('Yetersiz depolama alanı.')); return;
                }

                const id = 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
                const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `uploads/${id}_${safeName}`;
                const uploadUrl = `${STORAGE}/object/${BUCKET}/${storagePath}`;

                const xhr = new XMLHttpRequest();
                xhr.open('POST', uploadUrl, true);
                xhr.setRequestHeader('apikey', supabaseConfig.anonKey);
                xhr.setRequestHeader('Authorization', 'Bearer ' + auth.getToken());
                xhr.setRequestHeader('Content-Type', fileBlob.type || 'application/octet-stream');
                xhr.setRequestHeader('x-upsert', 'true');

                if (onProgress) {
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
                    };
                }

                xhr.onload = async () => {
                    if (xhr.status < 200 || xhr.status >= 300) {
                        reject(new Error('Yükleme hatası HTTP ' + xhr.status + ': ' + xhr.responseText)); return;
                    }
                    const downloadUrl = `${STORAGE}/object/public/${BUCKET}/${storagePath}`;
                    const row = {
                        id, name, type: 'file',
                        parent_id: parentId,
                        file_size: fileBlob.size,
                        file_type: fileBlob.type || 'application/octet-stream',
                        storage_path: storagePath,
                        download_url: downloadUrl,
                        created_at: Date.now(),
                        user_id: userId
                    };
                    const metaRes = await fetch(`${REST}/items`, { method: 'POST', headers: headers(), body: JSON.stringify(row) });
                    if (!metaRes.ok) {
                        const e = await metaRes.json().catch(() => ({}));
                        reject(new Error('Metadata kaydedilemedi: ' + (e.message || JSON.stringify(e)))); return;
                    }
                    resolve(this._rowToItem(row));
                };
                xhr.onerror = () => reject(new Error('Ağ hatası'));
                xhr.send(fileBlob);
            } catch (err) { reject(err); }
        });
    }

    /** RENAME item — only owner can rename (enforced by RLS) */
    async renameItem(id, newName) {
        const res = await fetch(`${REST}/items?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH', headers: headers(), body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error('Yeniden adlandırılamadı. Bu dosya size ait olmayabilir.');
    }

    /** DELETE item recursively — RLS enforces ownership */
    async deleteItem(id) {
        const item = await this.getItem(id);
        if (!item) return;

        const toDelete = item.type === 'folder' ? await this._getAllDescendants(id) : [item];

        const paths = toDelete.filter(i => i.type === 'file' && i.storagePath).map(i => i.storagePath);
        if (paths.length) {
            await fetch(`${STORAGE}/object/${BUCKET}`, {
                method: 'DELETE', headers: headers(), body: JSON.stringify({ prefixes: paths })
            }).catch(() => {});
        }

        const ids = [...toDelete.map(i => i.id), id];
        await fetch(`${REST}/items?id=in.(${ids.map(i => '"' + i + '"').join(',')})`, {
            method: 'DELETE', headers: headers()
        });
    }

    async _getAllDescendants(folderId) {
        const res = await fetch(`${REST}/items`, { headers: headers() });
        if (!res.ok) return [];
        const all = (await res.json()).map(this._rowToItem);
        const result = [];
        const queue = [folderId];
        let i = 0;
        while (i < queue.length) {
            const cur = queue[i++];
            all.filter(it => it.parentId === cur).forEach(child => {
                result.push(child);
                if (child.type === 'folder') queue.push(child.id);
            });
        }
        return result;
    }

    async searchItems(q) {
        const res = await fetch(`${REST}/items?name=ilike.*${encodeURIComponent(q)}*`, { headers: headers() });
        if (!res.ok) return [];
        return (await res.json()).map(this._rowToItem);
    }

    async getItemsByCategory(category) {
        const res = await fetch(`${REST}/items?type=eq.file`, { headers: headers() });
        if (!res.ok) return [];
        return (await res.json()).map(this._rowToItem).filter(item => {
            const ext = item.name.split('.').pop().toLowerCase();
            if (category === 'images') return item.fileType.startsWith('image/');
            if (category === 'cad')    return ['stl', 'obj'].includes(ext);
            if (category === 'code')   return ['py','cpp','h','ino','js','html','css','json'].includes(ext) || item.fileType.startsWith('text/');
            return false;
        });
    }

    async getUsedSize() {
        const res = await fetch(`${REST}/items?type=eq.file&select=file_size`, { headers: headers() });
        if (!res.ok) return 0;
        return (await res.json()).reduce((s, r) => s + (r.file_size || 0), 0);
    }

    async clearAll() {
        const res = await fetch(`${REST}/items?type=eq.file&select=storage_path`, { headers: headers() });
        const files = res.ok ? await res.json() : [];
        const paths = files.map(f => f.storage_path).filter(Boolean);
        if (paths.length) {
            await fetch(`${STORAGE}/object/${BUCKET}`, {
                method: 'DELETE', headers: headers(), body: JSON.stringify({ prefixes: paths })
            }).catch(() => {});
        }
        await fetch(`${REST}/items`, { method: 'DELETE', headers: { ...headers(), 'Prefer': 'return=minimal' } });
    }

    _rowToItem(row) {
        return {
            id:          row.id,
            name:        row.name,
            type:        row.type,
            parentId:    row.parent_id,
            fileSize:    row.file_size    || 0,
            fileType:    row.file_type    || '',
            storagePath: row.storage_path || '',
            downloadUrl: row.download_url || '',
            createdAt:   row.created_at   || Date.now(),
            userId:      row.user_id      || null
        };
    }

    formatBytes(bytes, decimals = 2) {
        if (!bytes) return '0 Bytes';
        const k = 1024, dm = Math.max(decimals, 0);
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

export const storage = new SupabaseStorageEngine();
