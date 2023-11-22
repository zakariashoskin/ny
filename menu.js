const { db, encrypt, decrypt, encryptItemName } = require('./database');

// Funktion til at hente mængden af et specifikt element fra databasen
function getInventoryItemQuantity(itemName) {
  return new Promise((resolve, reject) => {
    const encryptedItem = encrypt(itemName);
    db.get('SELECT quantity FROM inventory WHERE item = ?', [encryptedItem.content], (err, row) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(row ? row.quantity : 0);
      }
    });
  });
}

// Funktion til at opdatere mængden af et element i lageret
async function updateInventoryItemQuantity(itemName, quantityChange) {
  return new Promise((resolve, reject) => {
    const encryptedItem = encrypt(itemName);
    db.run(
      'UPDATE inventory SET quantity = quantity + ? WHERE item = ?',
      [quantityChange, encryptedItem.content],
      (err) => {
        if (err) {
          reject(err.message);
        } else {
          resolve(true);
        }
      }
    );
  });
}

// Hjælpefunktion til at hente opskriften for et produkt
// Funktion til at hente opskriften for et produkt


    async function getRecipe(itemName) {
      const encryptedItemName = encrypt(itemName).content;    
      console.log(`Item name before encryption: ${itemName}`);
    console.log(`Item name after encryption: ${encryptedItemName}`);
  return new Promise(async (resolve, reject) => {
    const encryptedItemName = encrypt(itemName).content; // Encrypt the item name for the query

    db.get(
      'SELECT ingredient1, quantity1, iv1, ingredient2, quantity2, iv2, ingredient3, quantity3, iv3 FROM menu WHERE item = ?',
      [encryptedItemName],
      async (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          console.log('Recipe data:', row); // Add this line for debugging
          const ingredients = [];

          // Helper function to add ingredient
          const addIngredient = (ingredientName, quantity) => {
            if (ingredientName) {
              ingredients.push({ name: ingredientName, quantity });
            }
          };

          // Add ingredients without decryption
          addIngredient(row.ingredient1, row.quantity1);
          addIngredient(row.ingredient2, row.quantity2);
          addIngredient(row.ingredient3, row.quantity3);

          resolve({ ingredients });
        } else {
          resolve(null);
        }
      }
    );
  });
}
async function canSellItem(itemName) {
  try {
    console.log(`Checking item: ${itemName}`);
    const recipe = await getRecipe(itemName);
    if (!recipe) {
      console.error('Opskrift ikke fundet for:', itemName);
      return false;
    }

    for (const ingredient of recipe.ingredients) {
      const quantityAvailable = await getInventoryItemQuantity(ingredient.name);
      console.log(`Checking ingredient: ${ingredient.name}, Required: ${ingredient.quantity}, Available: ${quantityAvailable}`);
      if (quantityAvailable < ingredient.quantity) {
        console.error(`Not enough of ${ingredient.name} to sell ${itemName}. Required: ${ingredient.quantity}, Available: ${quantityAvailable}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Fejl i canSellItem:', error);
    return false;
  }
}

async function sellItem(itemName) {
  console.log(`Item name before encryption: ${itemName}`);
  const encryptedItemName = encrypt(itemName); // This is an object now, not a string.
  console.log(`Item name after encryption: ${encryptedItemName.content}`);
  
  if (!await canSellItem(itemName)) {
    throw new Error(`Not enough ingredients to sell ${itemName}.`);
  }

  const recipe = await getRecipe(itemName);
  console.log(`Recipe for ${itemName}:`, recipe);
  for (const ingredient of recipe.ingredients) {
    await updateInventoryItemQuantity(ingredient.name, -ingredient.quantity);
  }

  return true;
}


module.exports = { getInventoryItemQuantity, updateInventoryItemQuantity, sellItem, canSellItem, getRecipe };
