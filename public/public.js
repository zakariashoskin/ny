document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    fetchMenu();
    setupSocket();
});
function fetchInventory() {
  fetch('/api/inventory')
    .then(response => response.json())
    .then(data => {
      const inventoryList = document.getElementById('inventory-list');
      inventoryList.innerHTML = ''; // Clear the list before appending new items
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.name && typeof item.quantity === 'number') {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.name}: ${item.quantity}`;
            inventoryList.appendChild(listItem);
          } else {
            console.log('Received unexpected data:', item);
          }
        });
      } else {
        console.log('Received data is not an array:', data);
      }
    })
    .catch(error => {
      console.error('Error fetching inventory:', error);
    });
}

  
function fetchMenu() {
    fetch('/api/menu')
      .then(response => response.json())
      .then(menuData => {
        const menuList = document.getElementById('menu-list');
        menuList.innerHTML = '';
        menuData.forEach(itemData => {
          const listItem = document.createElement('li');
          listItem.textContent = itemData.item ? `${itemData.item}: ${itemData.quantity}` : 'Menu item unavailable';
          menuList.appendChild(listItem);
        });
      })
      .catch(error => {
        console.error('Error fetching menu:', error);
      });
  }
  

function sellProduct(productName) {
    // Encrypt the item name on the server before sending the request to sell
    encryptItemNameOnServer(productName).then(encryptedItemName => {
        fetch(`/sell/${encryptedItemName}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error selling product:', error);
        });
    }).catch(error => {
        console.error('Error encrypting item name:', error);
    });
}

async function encryptItemNameOnServer(itemName) {
    // This should be an endpoint that handles encryption logic server-side
    const response = await fetch('/api/encryptItemName', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemName: itemName }),
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.encryptedItem;
}

function getDecryptedData() {
    return new Promise((resolve, reject) => {
      db.all('SELECT item, quantity, iv FROM inventory', (err, rows) => {
        if (err) {
          console.error('Error fetching data:', err);
          reject(err);
        } else {
          const decryptedData = rows.map(row => {
            try {
              return {
                ...row,
                item: decrypt({ iv: row.iv, content: row.item }),
              };
            } catch (error) {
              console.error('Error decrypting item:', error);
              return { ...row, item: 'Decryption Error' };
            }
          });
          resolve(decryptedData);
        }
      });
    });
  }
  

function setupSocket() {
    const socket = io.connect();
    socket.on('itemSold', (productName) => {
        console.log(`Item sold: ${productName}`);
        fetchInventory();
    });
}

