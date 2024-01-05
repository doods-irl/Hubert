Hi there!

This is the first project I'll make public because I have too many projects and maybe this will be a start or inspiration for someone to expand on what I've kicked off.

# Meet **HUBERT**  
An open-source "hub" application, meant to be a screen that sits in your house to show you the things you need to get done. With ADHD I find trying to organise the things I need to do through Google Calendar wuite exhausting, the interface gets cluttered with tasks, and I get overwhelmed.  
The intent is to create an application that can show me what I need to focus on for any particular day and get the dopamine hit that makes me run when I tap the task to complete it (maybe with a nice dopamine inducing sound I haven't implemented yet.)  
Hubert hosts the tasks natively, so there are no connections out to anywhere else (yet). Maybe in the future it can connect to external calendars, but for the moment everything is local which means what you need to get done is safe on the hub (but also the app is the only place the data is hosted, so there is danger of loss if something fundamentally breaks.)  
  
Grab that unused surface tablet, install Hubert, then see the tasks for the day, and tap them to dismiss them once they're complete.  
Running the app shows a full screen Electron interface and is broadcasting a mobile interface with Express. Connecting through the express routes shows an interface where People and Tasks can be managed.  

"People" is where you manage the people that tasks can be assigned to.  
"Tasks" is where you manage individual tasks. Each task created is a "root" task, and several actions the application takes will process these into a collection of "processed tasks" with their own ID for individual task management. The task processing fires on most events, for example, creating a task will be enough for the hub screen to process everything and should update immediately. (These need to be reviewed for consistency)  
All of the data it creates and handles is stored as JSON in the Store folder.  

## Each task type has a different purpose
**Daily**
Tasks to be completed at a certain time of a certain day e.g. Walk the dog, Do the laundry
- These tasks should show when the day begins 
- These tasks should disappear once tap-completed or the day has passed
**To-Do**
Tasks that have a date they need to be done by e.g. Update car registration, Pay Phone Bill
- These tasks should show prior to the date
- These tasks do not disappear until tap-completed (If you miss the date of registering your car, you still need to register your car)
**Reminder**
Tasks that occur on a date, but don't need to exist after the date has passed e.g. Birthdays, Dinner Parties
- These tasks will show a reminder leading up to the task, and will only disappear once the date has passed
**Alarm**
This task type will sound an alarm until dismissed e.g. Take pills, wake up
- These tasks will appear on the day they're needed
- These tasks will disappear if tap-completed, or when the alarm is dismissed

## Off the top of the dome, these are the intended features which do not yet feature/functionality that is not yet functional:
- Tasks displaying all relevant information
- Assigned tasks showing who they're assigned to
- The task types differentiating in function on the hub (No alarms for alarms, tasks are currently only shown for the day they occur on rather than reminders showing ahead of time)
- Some task types not behaving like the others do in their half baked state (Alarms and dailies dismiss normally, I think reminders behave differently/broken somehow?)
- Code is ugly, because I was throwing this together on a whim, don't judge
- External connections (might require port forwarding at the moment?) don't work, only local network connections
- Landscape and portrait mode instead of just landscape
- People assignment filters (the data is in the task, just not displayed)
- Deleting tasks marks the task as inactive, which should also update the hub. This doesn't work for all task types.
- Sometimes, it just locks up. Deleting the tasks and processed tasks json should let it all load again, but obviously you don't want to have to recreate all of your tasks when this happens.

## Cool features that I was thinking of doing:
- Child/master hubs - One hub runs the home, additional hubs connect and sync from it
- Google calendar integration
- Better security for when external connections work
- The "Reminder" task type has a task category called "Follow-up". When completed, this task category will prompt the user to create another task as an outcome of completing the first task (You completed a task to book an appointment? When's the appointment?)
- I don't like the task done animation I got working, but the js that makes it work is fucking bonkers
- Set timers directly on the Hub

## How to try it out
1. Download the files
2. Do all the node installation stuff
3. "npm start" to run the hub
4. Connect to 127.0.0.1:3000 on the same machine for the task management interface, or grab the IP address of your device and go to [ipaddress]:3000 on another device on the local network
