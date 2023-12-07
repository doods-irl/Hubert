const { app: electronApp, BrowserWindow, ipcMain } = require('electron');
const moment = require('moment');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const promises = fs.promises;
const constants = fs.constants;
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

// Serve home.html for mobile clients
server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile', 'home.html'));
});

// Activate server for mobile clients
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Create the electron Window
electronApp.whenReady().then(createWindow);

// Electron catch-all for MacOS
electronApp.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electronApp.quit();
  }
});

// Electron error handling
electronApp.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('request-processed-tasks', async (event) => {
  console.log("Main: Tasks requested by renderer");
  // await processTasks(); // Ensure tasks are processed
  const processedTasks = await getProcessedTasks(); // Function to fetch processed tasks
  event.reply('processed-tasks-response', processedTasks);
});

async function getProcessedTasks() {
  const filePath = './store/tasks-processed.json';
  try {
    await fs.promises.access(filePath, constants.F_OK);
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error fetching processed tasks:", err);
    return {}; // Return empty object in case of an error
  }
}

// Write people back to the json
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
    res.json({
      message: 'People added to file with unique IDs'
    });
  } catch (readErr) {
    if (readErr.code === 'ENOENT') {
      console.log("File not found. Creating a new file with added people.");
      // Handle the scenario where the file doesn't exist
      // This is where you'd create a new file with the new people
    } else {
      console.error("An error occurred while processing the file.", readErr);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  } finally {
    release();
  }
});

// Get people from the JSON
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
      res.status(500).json({
        error: "Internal server error"
      });
    }
  } finally {
    release();
  }
});

//Delete people from the JSON
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
    res.json({
      message: 'Person deleted successfully'
    });
  } catch (err) {
    console.error("Error processing file", err);
    res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    // Release the lock
    release();
  }
});

//Delete people from the JSON
server.delete('/complete-task/:id', async (req, res) => {
  console.log("Trying to complete a task");
  const recurrenceId = req.params.id;

  const release = await mutex.acquire();

  try {
    let data = await fs.promises.readFile('./store/tasks-processed.json', 'utf8');
    let processedTasks = JSON.parse(data);

    let taskFoundAndUpdated = false;
    for (const category in processedTasks) {
      for (const taskId in processedTasks[category]) {
        const recurrences = processedTasks[category][taskId].recurrences;
        for (const recurrence of recurrences) {
          if (recurrence.recurrenceId === recurrenceId) {
            recurrence.dismissed = true;
            taskFoundAndUpdated = true;
            break;
          }
        }
        if (taskFoundAndUpdated) break;
      }
      if (taskFoundAndUpdated) break;
    }

    if (taskFoundAndUpdated) {
      await fs.promises.writeFile('./store/tasks-processed.json', JSON.stringify(processedTasks, null, 2), 'utf8');
      console.log("Recurrence with ID " + recurrenceId + " has been marked as dismissed.");
      res.json({
        message: 'Recurrence marked as dismissed successfully'
      });
    } else {
      res.status(404).json({
        message: 'Recurrence not found'
      });
    }
  } catch (err) {
    console.error("Error processing file", err);
    res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    release();
  }
});


// TASK ACTIONS
server.post('/save-task', async (req, res) => {
  const newTask = req.body;
  const filePath = './store/tasks.json';

  const release = await mutex.acquire();

  try {
    let tasks = await checkFile(filePath);

    // Assign a unique taskId
    newTask.taskId = uuidv4();

    // Add a 'disabled' property set to false by default
    newTask.disabled = false;

    // Add the new task to the appropriate category
    if (!tasks[newTask.taskCategory]) {
      tasks[newTask.taskCategory] = [];
    }
    tasks[newTask.taskCategory].push(newTask);

    // Write the updated tasks to the file
    await fs.promises.writeFile(filePath, JSON.stringify(tasks), 'utf8');
    console.log("JSON file with tasks has been updated.");

    // Process tasks after saving the new task
    await processTasks();

    // Respond to the request
    res.json({
      message: 'Task Saved and Processed'
    });
  } catch (error) {
    console.error("An error occurred.", error);
    res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    release();
  }
});


server.get('/get-tasks', async (req, res) => {
  const release = await mutex.acquire();
  const filePath = './store/tasks.json';

  try {
    // Process tasks before fetching them
    console.log("/get-task route: processTasks called");

    // After processing, fetch and filter tasks
    const tasks = await checkFile(filePath, []);
    const activeTasks = {};

    // Iterate over each category and filter out disabled tasks
    Object.keys(tasks).forEach(category => {
      activeTasks[category] = tasks[category].filter(task => !task.disabled);
    });

    console.log(activeTasks);
    res.json(activeTasks); // Send the processed tasks as response
  } catch (err) {
    console.error("Error accessing/reading file", err);
    res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    release();
  }
});

server.delete('/delete-task/:id', async (req, res) => {
  const taskId = req.params.id;
  console.log(`Disabling task with ID: ${taskId}`);

  // Acquire a lock before reading and writing to the file
  const release = await mutex.acquire();

  try {
    // Read the current contents of the file
    let data = await fs.promises.readFile('./store/tasks.json', 'utf8');
    let tasks = JSON.parse(data);

    // Set disabled to true for the task with the given ID in each category
    let taskFoundAndDisabled = false;
    Object.keys(tasks).forEach(category => {
      tasks[category].forEach(task => {
        if (task.taskId === taskId) {
          task.disabled = true;
          taskFoundAndDisabled = true;
        }
      });
    });

    // Only proceed if the task was found and disabled
    if (taskFoundAndDisabled) {
      // Write the updated tasks back to the file
      await fs.promises.writeFile('./store/tasks.json', JSON.stringify(tasks), 'utf8');
      console.log("Task with ID " + taskId + " has been disabled.");

      // Process tasks after disabling the task
      await processTasks();
      console.log("/delete-task route: processTasks called");

      res.json({
        message: 'Task disabled successfully'
      });
    } else {
      res.status(404).json({
        message: 'Task not found'
      });
    }
  } catch (err) {
    console.error("Error processing file", err);
    res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    // Release the lock
    release();
  }
});

server.get('/get-processed-tasks', async (req, res) => {
  const release = await mutex.acquire();
  const processedFilePath = './store/tasks-processed.json';

  try {
    // Fetch processed tasks
    const processedTasks = await checkFile(processedFilePath, {});
    console.log("/get-processed-tasks route: Responding with processed tasks");

    const activeProcessedTasks = {};
    Object.keys(processedTasks).forEach(category => {
      activeProcessedTasks[category] = {};
      Object.keys(processedTasks[category]).forEach(taskId => {
        // Ensure that we are dealing with the recurrences array
        const taskRecurrences = processedTasks[category][taskId].recurrences;
        if (Array.isArray(taskRecurrences)) {
          activeProcessedTasks[category][taskId] = taskRecurrences.filter(recurrence => !recurrence.disabled);
        }
      });
    });

    res.json(activeProcessedTasks); // Send the filtered active processed tasks
  } catch (err) {
    console.error("Error accessing/reading file", err);
    res.status(500).json({
      error: "Internal server error"
    });
  } finally {
    release();
  }
});


async function checkFile(filePath, initialContent = {}) {
  try {
    await fs.promises.access(filePath, constants.F_OK);
    let data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (accessErr) {
    if (accessErr.code === 'ENOENT') {
      console.log("File not found. Creating a new file.");
      await fs.promises.writeFile(filePath, JSON.stringify(initialContent), 'utf8');
      return initialContent;
    } else {
      throw accessErr;
    }
  }
}

let lastProcessedTasks = {};

async function processTasks() {
  console.log("Processing tasks");
  const sourceFile = "./store/tasks.json";
  const destFile = "./store/tasks-processed.json";
  await checkFile(sourceFile);
  await checkFile(destFile);

  try {
    const sourceData = await promises.readFile(sourceFile, 'utf8');
    const destData = await promises.readFile(destFile, 'utf8');
    const tasks = JSON.parse(sourceData);
    let processedTasks = JSON.parse(destData) || {};

    for (const category in tasks) {
      if (!processedTasks[category]) {
        processedTasks[category] = {};
      }

      tasks[category].forEach(task => {
        if (!processedTasks[category][task.taskId]) {
          // Initialize the task in processedTasks
          processedTasks[category][task.taskId] = {
            title: task.title,
            type: task.type,
            time: task.time, // Ensure this property exists in your original tasks
            taskId: task.taskId,
            recurrences: []
          };
        }

        if (task.repeat === 'off') {
          addUniqueRecurrence(processedTasks[category][task.taskId].recurrences, task.date, task);
        } else {
          const taskRepetitions = processTask(task);
          taskRepetitions.forEach(rep => {
            addUniqueRecurrence(processedTasks[category][task.taskId].recurrences, rep.date, task);
          });
        }
      });
    }

    await promises.writeFile(destFile, JSON.stringify(processedTasks, null, 2), 'utf8');
    const currentProcessedTasks = JSON.stringify(processedTasks);
    if (currentProcessedTasks !== lastProcessedTasks) {
      sendTasksUpdatedMessage();
      lastProcessedTasks = currentProcessedTasks;
    }
  } catch (err) {
    console.error("Error accessing/reading file:", err);
    throw err;
  }
}

function addUniqueRecurrence(recurrences, date, task) {
  const existingRecurrence = recurrences.find(recurrence => recurrence.date === date);
  if (!existingRecurrence) {
    const newRecurrence = {
      recurrenceId: uuidv4(),
      date: date,
      disabled: task.disabled,
      dismissed: false
    };
    recurrences.push(newRecurrence);
  }
}

function processTask(task) {
  const repetitions = [];
  let currentDate = moment.utc(task.date);
  let count = 0;

  while (shouldContinueRepeating(task, currentDate, count)) {
    const standardizedTask = {
      ...task, // Spread syntax to copy all properties from the original task
      date: currentDate.format('YYYY-MM-DD'), // Overwrite date for each repetition
    };
    repetitions.push(standardizedTask);

    let newDate = getNextOccurrenceDate(currentDate, task.repeatType);
    if (!newDate.isValid()) {
      console.error("Invalid new date encountered, stopping repetition:", newDate);
      break;
    }
    currentDate = newDate;
    count++;
  }

  return repetitions;
}


function shouldContinueRepeating(task, currentDate, count) {
  if (!currentDate.isValid()) {
    console.error("Invalid date encountered in shouldContinueRepeating:", currentDate);
    return false;
  }

  const maxDate = moment().add(90, 'days');

  if (task.repeatTimes === 'forever') {
    return currentDate.isSameOrBefore(maxDate);
  } else if (task.repeatTimes === 'limited') {
    return (count < task.repeatTimesNumber) && currentDate.isSameOrBefore(maxDate);
  }

  // If repeatTimes is neither 'forever' nor 'limited', or if some other case needs handling.
  return false;
}

function getNextOccurrenceDate(currentDate, repeatType) {
  let nextDate = currentDate.clone();

  switch (repeatType) {
    case 'daily':
      nextDate.add(1, 'days');
      break;
    case 'weekly':
      nextDate.add(7, 'days');
      break;
    case 'month':
      nextDate.add(1, 'month');
      break;
      // ... other cases ...
  }
  return nextDate;
}

function sendTasksUpdatedMessage() {
  if (mainWindow) {
    mainWindow.webContents.send('tasks-updated');
  }
}

processTasks();