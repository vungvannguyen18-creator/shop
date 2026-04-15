const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'backend', 'data');
const getFilePath = (filename) => path.join(DATA_DIR, filename);

function readData(filename, defaultVal = []) {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return defaultVal;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return defaultVal;
  }
}

function writeData(filename, data) {
  try {
    fs.writeFileSync(getFilePath(filename), JSON.stringify(data, null, 2));
    console.log(`Successfully wrote to ${filename}`);
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

// TEST: Simulate adding a product
const pFile = 'products.json';
let products = readData(pFile);
console.log('Initial products count:', products.length);

const testProduct = { name: "Test Product " + Date.now(), price: 99000 };
products.push(testProduct);
writeData(pFile, products);

let productsAfter = readData(pFile);
console.log('After write count:', productsAfter.length);
if (productsAfter.length > products.length - 1) {
    console.log('TEST PASSED: Write/Read works.');
} else {
    console.log('TEST FAILED: Data not saved.');
}
