const fs = require('fs');
const readme = fs.readFileSync('./README.md');
const path = require('path');
const blacklistedDirectories = [".yalc", "node_modules", "deps"]

function *getAllCodeFiles(dir) {
    const codeFiles = fs.readdirSync(`./examples${dir?'/'+dir:''}`, { withFileTypes: true });
    for (const file of codeFiles) {
        if (file.isDirectory() && !blacklistedDirectories.includes(file.name)) {
            yield *getAllCodeFiles(file.name)
        } else if (file.isFile() && (path.extname(file.name) === ".ts")) {
            yield `${dir}/${file.name}`
        }
    }
}

function addContent() {
    let readme = fs.readFileSync('./README.md').toString();
    for (const file of getAllCodeFiles()) {
        const beginTag = `<!-- BEGIN-CODE: ./examples/${file} -->`;
        const endTag = `<!-- END-CODE: ./examples/${file} -->`; 
        const beginEmbedIndex = readme.indexOf(beginTag);
        const endEmbedIndex = readme.indexOf(endTag);
        const filePath = `./examples/${file}`
        if (beginEmbedIndex > 0 && endEmbedIndex > 0) {
            const newContent = fs.readFileSync(filePath).toString();
            if (newContent) {
                console.log('Embedding content for '+filePath)
                const cutFrom = beginEmbedIndex + beginTag.length;
                const cutTo = endEmbedIndex;
                readme = readme.replace(readme.substring(cutFrom, cutTo), '\r\n```typescript\r\n'+newContent+'\r\n```\r\n');
            }
        }
    }
    console.log('Writing content')
    fs.writeFileSync('README.md', readme);
}

addContent();
