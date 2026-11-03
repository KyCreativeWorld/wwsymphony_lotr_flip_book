/*
 * Shows the live data a LiveMotion motion server is sending, to check the tracker works
 * before opening the flip book.
 *
 * The flip book connects to the same server itself: press T in the book and click Connect next
 * to "LiveMotion server" (src/motion/live-motion.ts reads the same prop data).
 */

// Create LiveMotion client to receive rigid body data from a motion server.

// var motion = new LiveMotion( { host: "localhost", port: 8081 } );
// connect to server on localhost port 8080
var motion = new LiveMotion(  );

// Open WebSocket connection to motion server.
motion.makeConnection(onStatus);

// Begin receiving callbacks to our onPropData function.
motion.startTrackedProps(onPropData);

// Readings received since the rate was last shown.
var readingCount = 0;
setInterval(onSecond, 1000);

/*
 * onStatus
 * Show whether the server is connected.
 * @param {string} message describing the connection.
 */
function onStatus(message) {
	document.getElementById("STATUS").textContent = message;
}

/*
 * onSecond
 * Show how many readings arrived in the last second.
 */
function onSecond() {
	document.getElementById("RATE").textContent = readingCount + " readings/s";
	readingCount = 0;
}

/*
 * onPropData
 * Callback function runs each time new rigid body prop data arrives.
 * @param {prop} has pos attribute for x, y, and z coordinates.
 */
function onPropData(prop) {
	readingCount++;

	// The whole prop, so any orientation fields the server sends are visible too.
	// The book uses the position, plus the orientation if it finds one (see live-motion.ts).
	document.getElementById("PROP").textContent = JSON.stringify(prop, null, 2);
}
