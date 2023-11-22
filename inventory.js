const { db, encrypt, decrypt, encryptItemName } = require('./database');

// Function to get the quantity of a specific item from the database
function getInventoryItemQuantity(itemName) {
  const encryptedItem = encrypt(itemName);
  return new Promise((resolve, reject) => {
    db.get('SELECT quantity, iv FROM inventory WHERE item = ? AND iv = ?', [encryptedItem.content, encryptedItem.iv], (err, row) => {
      if (err) {
        reject(err);
      } else if (row) {
        resolve(row.quantity);
      } else {
        resolve(0);
      }
    });
  });
}

async function updateInventoryItemQuantity(itemName, quantityChange) {
  return new Promise((resolve, reject) => {
    db.get('SELECT iv FROM inventory WHERE item = ?', [itemName], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        reject('Item not found');
        return;
      }

      const encryptedItem = encrypt(itemName, row.iv); // Encrypt using the existing IV
      db.run(
        'UPDATE inventory SET quantity = quantity + ? WHERE item = ?',
        [quantityChange, encryptedItem.content],
        (updateErr) => {
          if (updateErr) {
            reject(updateErr.message);
          } else {
            resolve(true);
          }
        }
      );
    });
  });
};



module.exports = { getInventoryItemQuantity, updateInventoryItemQuantity };
