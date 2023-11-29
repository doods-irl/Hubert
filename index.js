const { app: electronApp, BrowserWindow, ipcMain } = require('electron');
const moment = require('moment');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { constants } = require('fs');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  mainWindow.loadFile("index.html");
}

// Set up Express
const server = express();
const port = 3000;

// Serve static files from 'public' directory (if needed)
server.use(express.static('mobile'));
server.use(express.static('assets'));
server.use(express.json());

// Serve browser.html for browser clients
server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile', 'home.html'));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

electronApp.whenReady().then(createWindow);

electronApp.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electronApp.quit();
  }
});

electronApp.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

server.post('/save-people', async (req, res) => {
  const newNames = req.body; // Array of new names

  const release = await mutex.acquire();
  try {
      let data = await fs.promises.readFile('./store/people.json', 'utf8');
      let people = JSON.parse(data);

      const peopleWithIDs = newNames.map(name => ({
          id: uuidv4(),
          name: name
      }));
      people = people.concat(peopleWithIDs);

      await fs.promises.writeFile('./store/people.json', JSON.stringify(people), 'utf8');
      console.log("JSON file with people has been updated.");
      res.json({ message: 'People added to file with unique IDs' });
  } catch (readErr) {
      if (readErr.code === 'ENOENT') {
          console.log("File not found. Creating a new file with added people.");
          // Handle the scenario where the file doesn't exist
          // This is where you'd create a new file with the new people
      } else {
          console.error("An error occurred while processing the file.", readErr);
          res.status(500).json({ error: "Internal server error" });
      }
  } finally {
      release();
  }
});

server.get('/get-people', async (req, res) => {
    const release = await mutex.acquire();
    const filePath = './store/people.json';

    try {
        // Check if the file exists
        await fs.promises.access(filePath, constants.F_OK);

        // If the file exists, read and send its content
        const data = await fs.promises.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        // If the file does not exist
        if (err.code === 'ENOENT') {
            console.log("File not found. Creating a new file.");
            const initialContent = []; // Or any other initial content
            await fs.promises.writeFile(filePath, JSON.stringify(initialContent), 'utf8');
            res.json(initialContent);
        } else {
            // Handle other errors
            console.error("Error accessing/reading file", err);
            res.status(500).json({ error: "Internal server error" });
        }
    } finally {
        release();
    }
});


server.delete('/delete-people/:id', async (req, res) => {
  const personId = req.params.id;
  console.log(`Deleting person with ID: ${personId}`);

  // Acquire a lock before reading and writing to the file
  const release = await mutex.acquire();

  try {
      // Read the current contents of the file
      let data = await fs.promises.readFile('./store/people.json', 'utf8');
      let people = JSON.parse(data);

      // Remove the person with the given ID
      people = people.filter(person => person.id !== personId);

      // Write the updated list back to the file
      await fs.promises.writeFile('./store/people.json', JSON.stringify(people), 'utf8');
      console.log("JSON file with people has been updated.");
      res.json({ message: 'Person deleted successfully' });
  } catch (err) {
      console.error("Error processing file", err);
      res.status(500).json({ error: "Internal server error" });
  } finally {
      // Release the lock
      release();
  }
});

