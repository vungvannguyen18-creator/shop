const fs = require('fs');
const path = require('path');

// Target the actual server file path
const DATA_DIR = path.join('d:', 'shopthoitrang', 'backend', 'data');
const pFile = path.join(DATA_DIR, 'products.json');

console.log('Target file:', pFile);

function testWrite() {
    try {
        let products = JSON.parse(fs.readFileSync(pFile, "utf-8"));
        console.log('Current count:', products.length);
        
        const newP = { id: 'test-' + Date.now(), name: 'Final Sync Test', sizes: ['S', 'M'], colors: ['Den'] };
        products.push(newP);
        
        fs.writeFileSync(pFile, JSON.stringify(products, null, 2));
        console.log('Write successful.');
        
        let after = JSON.parse(fs.readFileSync(pFile, "utf-8"));
        console.log('New count:', after.length);
    } catch (e) {
        console.error('Test Error:', e);
    }
}

testWrite();
