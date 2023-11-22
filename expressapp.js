const express = require('express');
const cors = require('cors');
const { getProducts, getInventory, getMenu, initializeDatabase, encrypt, decrypt, encryptItemName, getDecryptedInventory } = require('./database');
const { sendLowInventoryEmail } = require('./emailer');

const app = express();
const PORT = 3000;

const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { getInventoryItemQuantity, updateInventoryItemQuantity, sellItem, canSellItem, getRecipe } = require('./menu');

// Middleware
app.use(cors());
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(express.json()); // Parse JSON request bodies

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


app.get('/api/menu', async (req, res) => {
  try {
    const menu = await getMenu();
    const decryptedMenu = menu.map(item => {
      // Attempt to decrypt each item
      try {
        const decryptedItemName = decrypt(item.item);
        return { item: decryptedItemName, quantity: item.quantity };
      } catch (error) {
        console.error('Decryption error for item:', item.item);
        // Return a placeholder or null if decryption fails
        return { item: null, quantity: item.quantity };
      }
    });
    res.json(decryptedMenu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve menu items.' });
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
    // The client-side will receive this message.
    return res.status(400).json({ error: 'Invalid request body, missing iv or content' });
  }
  try {
      const decryptedItem = decrypt({ iv, content });
      if (decryptedItem) {
          res.json({ name: decryptedItem });
      } else {
          res.status(500).json({ error: 'Decryption failed.' });
      }
  } catch (error) {
      console.error('Error during decryption:', error);
      res.status(500).json({ error: 'Server error during decryption.' });
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

// Node mailer. Function to check inventory levels
const checkInventoryLevels = () => {
    getInventory().then(inventory => {
        inventory.forEach(item => {
            if (item.quantity < 50) {
                sendLowInventoryEmail(item.name);
            }
        });
    }).catch(error => {
        console.error('Failed to check inventory levels:', error);
    });
};

// Start the server
http.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// You might want to call checkInventoryLevels() at a regular interval or after certain actions
// For example, using setInterval to check every hour
setInterval(checkInventoryLevels, 3600000); // 3600000 milliseconds = 1 hour
