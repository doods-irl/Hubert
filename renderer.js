var selectedDate;

document.addEventListener('DOMContentLoaded', () => {
  generateMonthDays();
  scrollToCurrentDay();
});

function generateMonthDays() {
  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth(); // Note: January is 0
  let daysContainer = document.getElementById('days-container');

  let date = new Date(currentYear, currentMonth, 1);
  while (date.getMonth() === currentMonth) {
      let dayElement = createDayElement(date);
      daysContainer.appendChild(dayElement);
      date.setDate(date.getDate() + 1);
  }
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
