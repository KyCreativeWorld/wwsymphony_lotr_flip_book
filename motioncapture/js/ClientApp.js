/*
 * Move a rigid body marker around to change the background color.
 *
 * Click one of three buttons X, Y, Z to set the current axis of motion.
 */

// Initialize active axis and range of minimum to maximum coordinate values.
var activeAxis = "X";
var rangeBounds;
clearRangeBounds();

// Create LiveMotion client to receive rigid body data from a motion server.

// var kTron = new LiveMotion( { host: "localhost", port: 8081 } );
// connect to server on localhost port 8080
var kTron = new LiveMotion(  );
	
// Open WebSocket connection to motion server.
kTron.makeConnection();

// Begin receiving callbacks to our onPropData function.
kTron.startTrackedProps(onPropData);

// Initialize button click callbacks to change current axis of motion.
document.getElementById("BUTTON_X").addEventListener("click", onAxisX);
document.getElementById("BUTTON_Y").addEventListener("click", onAxisY);
document.getElementById("BUTTON_Z").addEventListener("click", onAxisZ);


/*
 * onAxisX
 * Set active axis as the X-axis
 */
function onAxisX() {
	activeAxis = "X";
	clearRangeBounds();
}

/*
 * onAxisY
 * Set active axis as the Y-axis
 */
function onAxisY() {
	activeAxis = "Y";
	clearRangeBounds();
}

/*
 * onAxisZ
 * Set active axis as the Z-axis
 */
function onAxisZ() {
	activeAxis = "Z";
	clearRangeBounds();
}

/*
 * clearRangeBounds
 * Resets minimum to maximum coordinate bounds to the empty interval.
 */
function clearRangeBounds() {
	rangeBounds = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
}

/*
 * paintBackground
 * Paint canvas background solid shade of gray.
 * @param {integer} shadeLevel intensity between 0-255.
 */
function paintBackground(shadeLevel) {
  let canvas = document.getElementById("myCanvas");
  let context = canvas.getContext("2d");

	// Use the RGB (red, green, blue) color notation so we can
	// specify a range of shades of color.
	// fillStyle RGB must be expressed as a quoted string.
	context.fillStyle = "rgb(" + shadeLevel + "," + shadeLevel + "," + shadeLevel + ")";
	context.fillRect(0,0, canvas.width, canvas.height);
}

/*
 * onPropData
 * Callback function runs each time new rigid body prop data arrives.
 * @param {prop} has pos attribute for x, y, and z coordinates.
 */
function onPropData(prop) {
	
	// Get coordinate value from active motion axis.
	let axisValue = 0;
	if(activeAxis == "X")
	  axisValue = prop.pos.x;
	else if(activeAxis == "Y")
	  axisValue = prop.pos.y;
	else if(activeAxis == "Z")
	  axisValue = prop.pos.z;
	
	// Since motion tracking devices can vary in the sizes of their
	// coordinate spaces and units of measure, we need to find the
	// minimum to maximum position values along the active axis of motion.
	
	// Update minimum to maximum range of position values that
	// have been observed along the currently selected coordinate axis.
  if(axisValue < rangeBounds.min)
		rangeBounds.min = axisValue;
	if(axisValue > rangeBounds.max)
		rangeBounds.max = axisValue;
	
	// Positive size of the range of motion from smallest to largest values.
	let rangeSize = rangeBounds.max - rangeBounds.min;
	// Confirm that the size range is positive.
	if(rangeSize > 0) {
		// Normalize axisValue to be between 0.0 to 1.0
		let normalizedShade = (axisValue - rangeBounds.min)/rangeSize;
		// Convert to RGB color shade value in the integer range 0-255
		let rgbShade = Math.floor( normalizedShade * 255 );
		// Paint background using current RGB color shade.
		paintBackground(rgbShade);
	}
}