const { ipcRenderer } = require('electron');

ipcRenderer.on('tasks-updated', () => {
  console.log("Tasks updated event received");
  // Your code to handle the event
});


ipcRenderer.on('tasks-updated', async () => {
  console.log("AAAAAAHHHHH");
  await fetchProcessedTasks();
  updateTaskDisplay();
});

function updateTaskDisplay() {
  let daysContainer = document.getElementById('days-container');
  daysContainer.innerHTML = ''; // Clear existing content
  generateMonthDays(); // Regenerate days with updated tasks
}

var selectedDate;

var processedTasks = {};

async function fetchProcessedTasks() {
  try {
    const response = await fetch('http://localhost:3000/get-processed-tasks'); // Adjust URL as needed
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    processedTasks = await response.json();

    // Console log to check the fetched tasks
    console.log('Fetched processed tasks:', processedTasks);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchProcessedTasks();
  generateMonthDays();
  scrollToCurrentDay();
});

function generateMonthDays() {
  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth();
  let daysContainer = document.getElementById('days-container');

  let date = new Date(currentYear, currentMonth, 1);
  while (date.getMonth() === currentMonth) {
      let pageElement = createPageContainer(date);
      daysContainer.appendChild(pageElement);
      date.setDate(date.getDate() + 1);
  }
}

function createPageContainer(date) {
  let pageContainer = document.createElement('div');
  pageContainer.className = 'page-container';

  let dayElement = createDayElement(date);
  let laneContainer = createLaneContainer(date);

  pageContainer.appendChild(dayElement);
  pageContainer.appendChild(laneContainer);

  return pageContainer;
}

function scrollToCurrentDay() {
  const currentDate = new Date();
  selectedDate = currentDate;

  // Manually format the date to ensure it's in local time
  const dateString = currentDate.getFullYear() + '-' +
                     String(currentDate.getMonth() + 1).padStart(2, '0') + '-' +
                     String(currentDate.getDate()).padStart(2, '0');

  const currentDayElement = document.querySelector(`[data-date='${dateString}']`);
  console.log('current date: ', currentDate);
  console.log('date string: ', dateString);
  console.log('current date element: ', currentDayElement);

  if (currentDayElement) {
    currentDayElement.scrollIntoView();
  }
}

function createLaneContainer(date) {
  if (!date) {
    console.error('createLaneContainer called without a date');
    return document.createElement('div');
  }

  // Format the date as YYYY-MM-DD without converting to UTC
  const formattedDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const laneContainer = document.createElement('div');
  laneContainer.className = 'lane-container';

  const lanes = ['alarm', 'reminder', 'todo', 'daily'];
  lanes.forEach(lane => {
    const laneDiv = document.createElement('div');
    laneDiv.id = lane;
    laneDiv.className = 'lane';
    laneDiv.innerHTML = `<div class="lane-header">${lane.charAt(0).toUpperCase() + lane.slice(1)}</div>`;

    // Add tasks to lane
    const laneTasks = processedTasks[lane];
    if (laneTasks) {
      Object.values(laneTasks).forEach(tasks => {
        tasks.forEach(task => {
          if (task.date === formattedDate && !task.disabled && !task.dismissed) {
            console.log(`Adding task to ${lane}:`, task, `Target date: ${formattedDate}`);
            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.textContent = task.title;
            laneDiv.appendChild(taskElement);
          }
        });
      });
    }
    laneContainer.appendChild(laneDiv);
  });

  return laneContainer;
}


function createDayElement(date) {
  let dayElement = document.createElement('div');
  dayElement.className = 'day-container';
  
  let formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  dayElement.setAttribute('data-date', formattedDate); // Set a data attribute

  // Add day, date, month, and year information
  dayElement.innerHTML = `
    <span class="day">${date.toLocaleString('en-us', { weekday: 'long' })}</span>
    <span class="date">${date.getDate()}</span>
    <span class="month">${date.toLocaleString('en-us', { month: 'long' })}</span>
    <span class="year">${date.getFullYear()}</span>
  `;

  // Check if the date being created is today's date
  const today = new Date();
  if (today.getFullYear() === date.getFullYear() && today.getMonth() === date.getMonth() && today.getDate() === date.getDate()) {
    // Create a span for the current time
    let timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    
    // Function to update time
    function updateTime() {
      const now = new Date();
      timeSpan.textContent = `${now.toLocaleTimeString()}`;
    }

    // Update the time immediately and then every second
    updateTime();
    setInterval(updateTime, 1000);

    dayElement.insertBefore(timeSpan, dayElement.firstChild); // Insert at the beginning
  }
return dayElement;
}

function smoothScrollTo(element, duration) {
  const startPosition = window.scrollY;
  const targetPosition = element.getBoundingClientRect().top + window.scrollY;
  let startTime = null;

  function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = timeElapsed / duration;
      
      // Ease-out cubic function
      const ease = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, startPosition + (targetPosition - startPosition) * ease);

      if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  requestAnimationFrame(animation);
}

// Event listener for the 'previous-button'
document.getElementById('previous-button').addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  const dateString = selectedDate.toISOString().split('T')[0];
  const targetDayElement = document.querySelector(`[data-date='${dateString}']`);

  if (targetDayElement) {
      smoothScrollTo(targetDayElement, 200); // Duration in milliseconds
  }
});

document.getElementById('next-button').addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() + 1);

  const dateString = selectedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  const targetDayElement = document.querySelector(`[data-date='${dateString}']`);

  if (targetDayElement) {
    smoothScrollTo(targetDayElement, 200); // Duration in milliseconds
  }
});
