const fs = require('fs');
const path = require('path');
const os = require('os');

class ObsidianManager {
    constructor(vaultPath) {
        this.vaultPath = vaultPath || path.join(os.homedir(), 'obsidian_vault');
        if (!fs.existsSync(this.vaultPath)) {
            fs.mkdirSync(this.vaultPath, { recursive: true });
            console.log(`[OBSIDIAN] Created mock vault at ${this.vaultPath}`);
        }
    }

    createNode(topic, title, content) {
        const topicFolder = path.join(this.vaultPath, topic);
        if (!fs.existsSync(topicFolder)) {
            fs.mkdirSync(topicFolder, { recursive: true });
        }

        // Sanitize title for filename
        const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
        const filePath = path.join(topicFolder, filename);

        const markdownContent = `---
topic: ${topic}
created: ${new Date().toISOString()}
tags: [${topic.toLowerCase()}]
---

# ${title}

${content}
`;
        fs.writeFileSync(filePath, markdownContent, 'utf-8');
        return filePath;
    }

    getVaultStructure() {
        const structure = [];
        try {
            const topics = fs.readdirSync(this.vaultPath);
            topics.forEach(topic => {
                const topicPath = path.join(this.vaultPath, topic);
                if (fs.statSync(topicPath).isDirectory()) {
                    const files = fs.readdirSync(topicPath)
                        .filter(f => f.endsWith('.md'))
                        .map(f => f.replace('.md', ''));
                    structure.push({ topic, files: files });
                }
            });
        } catch (e) {
            console.error('[OBSIDIAN] Error reading vault:', e);
        }
        return structure;
    }

    readNodeContent(topic, title) {
        const filename = title.endsWith('.md') ? title : title + '.md';
        const filePath = path.join(this.vaultPath, topic, filename);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        return null;
    }
}

module.exports = ObsidianManager;
