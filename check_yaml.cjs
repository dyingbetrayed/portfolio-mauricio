const fs = require('fs');
const yaml = require('js-yaml');

try {
  const fileContents = fs.readFileSync('./public/admin/config.yml', 'utf8');
  const data = yaml.load(fileContents);
  
  const names = data.collections.map(c => c.name);
  console.log("Collection names:", names);
  
  const hasDuplicates = new Set(names).size !== names.length;
  console.log("Has duplicates:", hasDuplicates);
} catch (e) {
  console.log("Error:", e);
}
