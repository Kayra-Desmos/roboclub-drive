/**
 * RoboClub Drive - File Preview Engine
 * Handles 3D STL rendering using Three.js and code highlighting.
 */

class PreviewEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentMesh = null;
        this.animationFrameId = null;
        this.grid = null;
        this.color = '#3b82f6'; // Default blue
    }

    /**
     * Initialize the 3D STL Preview Scene
     */
    init3d(canvas, container) {
        // Clean up previous instance just in case
        this.destroy3d();

        const width = container.clientWidth;
        const height = container.clientHeight || 400;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e293b); // Dark slate

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 100);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(1, 1, 1).normalize();
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x555555, 0.5);
        dirLight2.position.set(-1, -1, -1).normalize();
        this.scene.add(dirLight2);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 100, 0);
        this.scene.add(pointLight);

        // Grid (Build plate simulation)
        this.grid = new THREE.GridHelper(200, 50, 0x06b6d4, 0x475569);
        this.grid.position.y = -20;
        this.scene.add(this.grid);

        // Handle resize
        this.resizeHandler = () => {
            if (!container || !this.camera || !this.renderer) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        };
        window.addEventListener('resize', this.resizeHandler);

        // Animation Loop
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            if (this.controls) this.controls.update();
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();
    }

    /**
     * Load STL File from blob and add to scene
     */
    loadSTL(fileSource) {
        return new Promise(async (resolve, reject) => {
            if (!this.scene) {
                reject(new Error("Three.js is not initialized."));
                return;
            }

            // Remove existing mesh
            if (this.currentMesh) {
                this.scene.remove(this.currentMesh);
                this.currentMesh.geometry.dispose();
                this.currentMesh.material.dispose();
                this.currentMesh = null;
            }

            try {
                let arrayBuffer;
                if (fileSource instanceof Blob) {
                    arrayBuffer = await new Promise((res, rej) => {
                        const reader = new FileReader();
                        reader.onload = (e) => res(e.target.result);
                        reader.onerror = () => rej(reader.error);
                        reader.readAsArrayBuffer(fileSource);
                    });
                } else {
                    // It's a URL string
                    const response = await fetch(fileSource);
                    arrayBuffer = await response.arrayBuffer();
                }

                const loader = new THREE.STLLoader();
                const geometry = loader.parse(arrayBuffer);

                // Material (sleek, metallic robotic feel)
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(this.color),
                    roughness: 0.4,
                    metalness: 0.7,
                    flatShading: true
                });

                const mesh = new THREE.Mesh(geometry, material);
                
                // Center the geometry
                geometry.center();

                // Adjust grid to match the bottom of the object
                geometry.computeBoundingBox();
                const boundingBox = geometry.boundingBox;
                const objectHeight = boundingBox.max.y - boundingBox.min.y;
                
                this.grid.position.y = -objectHeight / 2 - 2;

                this.scene.add(mesh);
                this.currentMesh = mesh;

                // Fit camera to object
                this.fitCameraToObject(geometry);

                resolve();
            } catch (error) {
                console.error("Error parsing STL file:", error);
                reject(error);
            }
        });
    }

    /**
     * Fit camera distance automatically based on model size
     */
    fitCameraToObject(geometry) {
        geometry.computeBoundingSphere();
        const sphere = geometry.boundingSphere;
        const radius = sphere.radius;

        // Position camera back based on model bounding radius
        this.camera.position.set(0, radius * 1.5, radius * 2.2);
        this.camera.lookAt(0, 0, 0);

        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    /**
     * Reset camera view
     */
    resetCamera() {
        if (this.currentMesh) {
            this.fitCameraToObject(this.currentMesh.geometry);
        }
    }

    /**
     * Change STL Mesh color
     */
    changeColor(hexColor) {
        this.color = hexColor;
        if (this.currentMesh) {
            this.currentMesh.material.color.setHex(parseInt(hexColor.replace('#', '0x')));
        }
    }

    /**
     * Destroy 3D Instance and clean memory to avoid WebGL context loss
     */
    destroy3d() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh.geometry.dispose();
            this.currentMesh.material.dispose();
            this.currentMesh = null;
        }

        if (this.grid) {
            this.scene.remove(this.grid);
            this.grid.geometry.dispose();
            this.grid.material.dispose();
            this.grid = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        this.scene = null;
        this.camera = null;
        this.controls = null;
    }

    /**
     * Highlight code using simple regex rules for py/cpp/ino
     */
    highlightCode(codeText, fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        let html = this.escapeHtml(codeText);

        // Syntax highlighting patterns
        const rules = [];

        // Comments
        rules.push({
            pattern: /(\/\/.*|#.*|\/\*[\s\S]*?\*\/)/g,
            class: 'token-comment'
        });

        // Strings
        rules.push({
            pattern: /(["'`])(.*?)\1/g,
            class: 'token-string'
        });

        // Numbers
        rules.push({
            pattern: /\b(\d+)\b/g,
            class: 'token-number'
        });

        // Keywords
        const keywords = {
            py: ['def', 'class', 'import', 'from', 'as', 'if', 'elif', 'else', 'for', 'while', 'in', 'return', 'and', 'or', 'not', 'try', 'except', 'with', 'print', 'None', 'True', 'False'],
            cpp: ['int', 'float', 'double', 'char', 'void', 'bool', 'class', 'struct', 'public', 'private', 'protected', 'if', 'else', 'for', 'while', 'return', 'include', 'define', 'namespace', 'std', 'using', 'new', 'delete', 'true', 'false', 'const', 'virtual'],
            ino: ['setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'Serial', 'begin', 'print', 'println', 'int', 'float', 'void', 'high', 'low', 'input', 'output', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'const', 'define', 'include']
        };

        const activeKeywords = keywords[ext] || keywords.cpp; // fallback to cpp/ino rules

        activeKeywords.forEach(kw => {
            rules.push({
                pattern: new RegExp(`\\b(${kw})\\b`, 'g'),
                class: 'token-keyword'
            });
        });

        // Preprocessor or decorators
        rules.push({
            pattern: /(#include|#define|@\w+)/g,
            class: 'token-preprocessor'
        });

        // Functions
        rules.push({
            pattern: /\b(\w+)(?=\()/g,
            class: 'token-function'
        });

        // Apply rules (avoid messing up already applied HTML tags by grouping and running matches)
        // A simple custom tokenizer for standard code:
        let lines = html.split('\n');
        lines = lines.map(line => {
            // Apply comments first as block
            let hasComment = false;
            let commentPart = '';
            
            // Basic line comments highlight
            if (line.includes('//')) {
                const parts = line.split('//');
                line = parts[0];
                commentPart = `<span class="token-comment">//${parts.slice(1).join('//')}</span>`;
                hasComment = true;
            } else if (line.includes('#') && ext === 'py') {
                const parts = line.split('#');
                line = parts[0];
                commentPart = `<span class="token-comment">#${parts.slice(1).join('#')}</span>`;
                hasComment = true;
            }

            // Highlight keywords
            activeKeywords.forEach(kw => {
                const regex = new RegExp(`\\b(${kw})\\b`, 'g');
                line = line.replace(regex, `<span class="token-keyword">$1</span>`);
            });

            // Highlight preprocessor/headers
            if (ext === 'cpp' || ext === 'ino') {
                line = line.replace(/(#include &lt;.*?&gt;|#define \w+)/g, `<span class="token-preprocessor">$1</span>`);
            }

            // Highlight strings (very simple regex)
            line = line.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, `<span class="token-string">$1</span>`);

            // Highlight functions
            line = line.replace(/\b(\w+)(?=\()/g, `<span class="token-function">$1</span>`);

            // Highlight numbers
            line = line.replace(/\b(\d+)\b/g, `<span class="token-number">$1</span>`);

            return line + commentPart;
        });

        return lines.join('\n');
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// Add CSS classes for code token rendering inside stylesheet dynamically
const style = document.createElement('style');
style.textContent = `
    .token-comment { color: #6a9955; font-style: italic; }
    .token-string { color: #ce9178; }
    .token-keyword { color: #569cd6; font-weight: 700; }
    .token-number { color: #b5cea8; }
    .token-function { color: #dcdcaa; }
    .token-preprocessor { color: #c586c0; }
`;
document.head.appendChild(style);

export const preview = new PreviewEngine();
