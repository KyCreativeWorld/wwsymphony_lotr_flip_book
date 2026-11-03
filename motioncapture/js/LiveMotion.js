class LiveMotion {

  /*
	 * constructor
	 * Create an instance of LiveMotion Web client interface to
	 * access data streamed by a LiveMotion server.
	 *
	 * @param {object} config - Optional object that specifies the WebSocket
	 *        host - IP address as 'localhost', or a dotted decimal such as '172.16.219.19'
	 *        port - port number as an integer such as 8000
	 *
	 * Check your LiveMotion server to determine its exact IP address and port number.
	 */
  constructor(config) {
		// Initialize default connection attributes.
		this.connection = { host: "localhost", port: 8080 };

		let errors = [ ];

		if(config != undefined) {
			if(config.host != undefined) {
				if(typeof config.host == 'string') {
					if(config.host.toLowerCase() != "localhost") {
						if(this.isDottedIPv4(config.host))
							this.connection.host = config.host;
						else
							errors.push( "IP address must be a dotted decimal format." );
					}
				}
				else
					errors.push( "IP address must be given as a string. Found instead " + config.host );
			}// end if host is defined.

			if(config.port != undefined) {
				if(!isNaN(config.port) && Number.isInteger(config.port) && config.port >= 1) {
					this.connection.port = config.port;
				}
				else
					errors.push("Port must be given as a positive integer.");
			}
		}// end if config is defined.

		// WebSocket that communicates with the LiveMotion server.
		this.socket = undefined;

		// Programmer-defined function that will receive tracked prop data.
		this.propsCallback = undefined;

		if(errors.length > 0)
			console.log(JSON.stringify(errors));
	}

	/*
	 * makeConnection
	 * pre-condition: constructor initialized WebSocket IP address and port number of
	 *                the LiveMotion server.
	 * post-condition: if successful WebSocket connection with LiveMotion server is opened.
	 * @param {function} [onStatus] - optional function that receives a status message
	 *        whenever the connection opens or closes.
	 */
	makeConnection(onStatus) {
		let wsAddr = "ws://" + this.connection.host + ":" + this.connection.port.toString();
		let report = (message) => {
			console.log(message);
			if(onStatus != undefined)
				onStatus(message);
		};
		report("Connecting to motion server at " + wsAddr);

		this.socket = new WebSocket(wsAddr);
		this.socket.addEventListener('open', () => report("Connected to " + wsAddr + "."));
		this.socket.addEventListener('close', () => report("Can't reach the motion server at " + wsAddr + ". Is it running?"));
		this.socket.addEventListener('message', this.onMessageEvent.bind(this));
	}

	/*
	 * startTrackedProps
	 * @param {function} [propsCallback] - programmer-defined function that will receive data packets
	 *        for any detected rigid body props.
	 *        The callback function will receive a Prop object.
	 */
	startTrackedProps(propsCallback) {
		if(propsCallback != undefined && typeof propsCallback === "function")
			this.propsCallback = propsCallback;
	}

	stopAll() {
		this.propsCallback = undefined;
	}

	//-------------- PRIVATE ------------------------

	onMessageEvent(event) {

		let data = JSON.parse(event.data);

		if(data.props != undefined && data.props.length > 0) {
			if(this.propsCallback != undefined) {
				for(let p = 0; p < data.props.length; p++) {
					// Call props callback for each available prop.
					// Each prop has a unique id
					this.propsCallback( data.props[p] );
				}// end for p loop over props.
			}// end if props callback function is defined.
		}// end if message data has props.

	}// end onMessageEvent

	// Source: https://stackoverflow.com/questions/42345/how-to-evaluate-an-ip
	isDottedIPv4(s) {
		let match = s.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
		return match != null &&
        match[1] <= 255 && match[2] <= 255 &&
        match[3] <= 255 && match[4] <= 255;
	}

}
