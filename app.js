const readline = require('readline');
const { db, initializeDatabase, encrypt, decrypt, encryptItemName } = require('./database');
const { canSellItem, sellItem } = require('./menu');

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize the database (call this only once during the initial setup)
initializeDatabase();

async function main() {
  try {
    const products = await getAvailableProducts();
    if (products.length === 0) {
      console.log('No products available for sale.');
      return;
    }

    displayAvailableProducts(products);
    const selectedProductName = await askUserForProduct(products);

    if (!selectedProductName) {
      console.log('Invalid product selection.');
      return;
    }

    await handleProductSale(selectedProductName);
  } catch (error) {
    console.error(error);
  } finally {
    db.close();
  }
}

function displayAvailableProducts(products) {
  console.log('Available Products:');
  products.forEach((product, index) => {
    console.log(`${index + 1}. ${product}`);
  });
}

async function askUserForProduct(products) {
  return new Promise((resolve) => {
    rl.question('Enter the number of the product you want to sell: ', (selectedProduct) => {
      const productIndex = parseInt(selectedProduct) - 1;
      if (productIndex >= 0 && productIndex < products.length) {
        resolve(products[productIndex]);
      } else {
        resolve(null); // Invalid product selection
      }
    });
  });
}

async function handleProductSale(selectedProductName) {
  const isItemAvailable = await canSellItem(selectedProductName);

  if (isItemAvailable) {
    console.log(`Item "${selectedProductName}" can be sold.`);
    await sellItem(selectedProductName);
    console.log(`Sold one ${selectedProductName}.`);
  } else {
    // Log the encrypted data before it's decrypted
    console.log(`Item "${selectedProductName}" cannot be sold due to ingredient shortage.`);
  }
}

async function getAvailableProducts() {
  return new Promise((resolve, reject) => {
    const availableProducts = [];
    db.each('SELECT item, iv1 FROM menu', async (err, row) => {
      if (err) {
        reject(err.message);
      } else {
        // Decrypt each item before adding it to the array
        const decryptedItem = await decrypt({ content: row.item, iv: row.iv1 });
        if (decryptedItem) {
          availableProducts.push(decryptedItem);
        } else {
          // Handle decryption failure, perhaps by skipping the item or logging an error
          console.error('Failed to decrypt item:', row.item);
        }
      }
    }, () => {
      resolve(availableProducts);
    });
  });
}


main();
