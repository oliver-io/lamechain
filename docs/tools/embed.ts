import fs from 'fs';
import path from 'path';
const blacklistedDirectories = [".yalc", "node_modules", "deps"]

function *getAllCodeFiles(dir: string):Iterable<string> {
    const codeFiles = fs.readdirSync(`${dir ?? './'}`, { withFileTypes: true });
    for (const file of codeFiles) {
        if (file.isDirectory() && !blacklistedDirectories.includes(file.name)) {
            yield *getAllCodeFiles(`${dir}/${file.name}`)
        } else if (file.isFile() && (path.extname(file.name) === ".ts")) {
            yield `${dir}/${file.name}`
        }
    }
}

function addContent() {
    let readme = fs.readFileSync('./README.md').toString();
    for (const file of getAllCodeFiles('./docs/examples')) {
        const beginTag = `<!-- BEGIN-CODE: ./docs/examples/${file} -->`;
        const endTag = `<!-- END-CODE: ./docs/examples/${file} -->`; 
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