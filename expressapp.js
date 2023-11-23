const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // Ensure crypto is imported if used
const { getProducts, getInventory, getMenu, initializeDatabase, encrypt, decrypt, encryptItemName, getDecryptedInventory } = require('./database');
const { sendLowInventoryEmail } = require('./emailer');
const app = express();
const PORT = 3000;

const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// API Endpoints
app.get('/api/products', async (req, res) => {
    const products = await getProducts();
    res.json(products);
});

app.get('/api/inventory', async (req, res) => {
  try {
    const decryptedInventory = await getDecryptedInventory();
    // Do something with decryptedInventory
  } catch (error) {
      console.error('Error fetching decrypted inventory:', error);
      res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});



app.post('/api/encryptItemName', express.json(), (req, res) => {
  const { itemName } = req.body;
  const encryptedItem = encrypt(itemName); // This should be your server-side encryption logic
  res.json({ encryptedItem: encryptedItem.content });
});


app.post('/api/decryptItemName', express.json(), (req, res) => {
  const { iv, content } = req.body;
  if (!iv || !content) {
    return res.status(400).json({ error: 'Invalid request body, missing iv or content' });
  }
  try {
    const decryptedItem = decrypt({ iv, content });
    if (decryptedItem !== 'Invalid Data' && decryptedItem !== 'Decryption Error') {
      res.json({ name: decryptedItem });
    } else {
      res.status(500).json({ error: decryptedItem });
    }
  } catch (error) {
    console.error('Error during decryption:', error);
    res.status(500).json({ error: 'Server error during decryption.' });
  }
});

app.post('/api/encryptData', express.json(), (req, res) => {
  const { data } = req.body;
  if (typeof data !== 'string') {
    return res.status(400).json({ error: 'Invalid data format. Data must be a string.' });
  }

  const encryptedData = encrypt(data);
  if (!encryptedData) {
    return res.status(500).json({ error: 'Encryption failed.' });
  }

  // Save encryptedData to database or perform other operations
  // ...

  res.json({ message: 'Data encrypted successfully', encryptedData });
});

app.post('/api/decryptData', express.json(), (req, res) => {
  const { encryptedData } = req.body;
  if (!encryptedData || typeof encryptedData !== 'object') {
    return res.status(400).json({ error: 'Invalid encrypted data format.' });
  }

  const decryptedData = decrypt(encryptedData);
  if (decryptedData === null) {
    return res.status(500).json({ error: 'Decryption failed.' });
  }

  res.json({ message: 'Data decrypted successfully', decryptedData });
});

// Refactored decryption logic for menu items
const decryptMenuItems = async (menu) => {
  return Promise.all(menu.map(async (item) => {
    try {
      const decryptedItemName = decrypt(item.item);
      return { item: decryptedItemName, quantity: item.quantity };
    } catch (error) {
      console.error('Decryption error for item:', item.item, error);
      return { item: null, quantity: item.quantity };
    }
  }));
};

app.get('/api/menu', async (req, res) => {
  try {
    const menu = await getMenu();
    const decryptedMenu = await decryptMenuItems(menu);
    res.json(decryptedMenu);
  } catch (error) {
    console.error('Failed to retrieve menu items:', error);
    res.status(500).json({ error: 'Failed to retrieve menu items.' });
  }
});



app.post('/sell/:productName', async (req, res) => {
    const productName = req.params.productName;
    try {
        const result = await sellItem(productName);
        if (result) {
            io.emit('itemSold', productName); // Emit an event to update the frontend
            res.status(200).send({ message: `Sold one ${productName}.` });
        } else {
            res.status(400).send({ message: `Item "${productName}" cannot be sold due to ingredient shortage.` });
        }
    } catch (error) {
        console.error('Error selling product:', error); // Log fejlmeddelelsen
        res.status(500).send({ message: 'Error selling product' });
    }
});

// Refactored checkInventoryLevels function
const checkInventoryLevels = async () => {
  try {
    const inventory = await getInventory();
    inventory.forEach(item => {
      if (item.quantity < 50) {
        sendLowInventoryEmail(item.name);
      }
    });
  } catch (error) {
    console.error('Failed to check inventory levels:', error);
  }
};

// Start the server
http.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

setInterval(checkInventoryLevels, 3600000); // Check inventory every hour