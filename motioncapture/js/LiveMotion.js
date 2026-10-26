class LiveMotion {

  /*
	 * constructor
	 * Create an instance of LiveMotion Web client interface to
	 * access data streamed by a LiveMotion server.
	 *
	 * @param {object} config - Optional object that specifies the WebSocket
	 *        host - IP address as 'localhost', or a dotted decimal such as '172.16.219.19'
	 *        port - port number as an integer such as 8000
   *      	path: '/'}
	 *                 
	 * Check your LiveMotion server to determine its exact IP address and port number.
	 */
  constructor(config) {
		// Initialize default connection attributes.
		this.connection = { host: "localhost", port: 8080, path: "/" };
		
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
			
			if(config.path != undefined) {
				if(typeof config.path == 'string') {
					this.connection.path = config.path;
				}
			}
		}// end if config is defined.
			
		// WebSocket that communicates with Kinectron server.
		this.socket = undefined;
		
		// Programmer-defined function that will receive data packets
		this.bodiesCallback = undefined;
		this.propsCallback = undefined;
		this.touchesCallback = undefined;
		this.eyesCallback = undefined;
		
		// Hash Map of callbacks per joint ID
		this.jointCallbacks = [];
		for(let j = 0; j <= 24; j++)
			this.jointCallbacks.push(undefined);
		
		this.initJointNames();
		
		this.isListening = false;
		
		if(errors.length > 0)
			console.log(JSON.stringify(errors));
	}
	
	/* 
	 * makeConnection
	 * pre-condition: constructor initialized WebSocket IP address and port number of
	 *                the LiveMotion server.
	 * post-condition: if successful WebSocket connection with LiveMotion server is opened.
	 */
	makeConnection() {
		let wsAddr = "ws://" + this.connection.host + ":" + this.connection.port.toString();
		console.log("Connecting to motion server at " + wsAddr);
		
		this.socket = new WebSocket(wsAddr);
		
		// Connection opened
		this.socket.addEventListener('open', this.onSocketOpened.bind(this) );
	}
	
	/*
	 * startTrackedBodies
	 * @param {function} [bodiesCallback] - programmer-defined function that will receive data packets
	 *        for any detected human bodies.
	 *        The callback function will receive a Bodies object.
	 */
	startTrackedBodies(bodiesCallback) {
		if(this.socket != undefined) {
			if(bodiesCallback != undefined && typeof bodiesCallback === "function") {
				this.bodiesCallback = bodiesCallback;
				
				if(!this.isListening)
					this.socket.addEventListener( 'message', this.onMessageEvent.bind(this) );
				this.isListening = true;
			}
		}
	}
	
	startTrackedJoint(jointId, jointCallback) {
		if(this.socket != undefined) {
			if(jointId != undefined && !NaN(jointId) && Number.isInteger(jointId) &&
			   jointId >= kinectron.SPINEBASE && jointId <= kinectron.THUMBRIGHT &&
				 jointCallback != undefined && typeof jointCallback === "function") {
			
				this.jointCallbacks[jointId] = jointCallback;
				if(!this.isListening)
					this.socket.addEventListener( 'message', this.onMessageEvent.bind(this) );
				this.isListening = true;
			}
		}
	}
	
	/*
	 * startTrackedProps
	 * @param {function} [propsCallback] - programmer-defined function that will receive data packets
	 *        for any detected rigid body props.
	 *        The callback function will receive a Prop object.
	 */
	startTrackedProps(propsCallback) {
		if(this.socket != undefined) {
			if(propsCallback != undefined && typeof propsCallback === "function") {
				this.propsCallback = propsCallback;
				
				if(!this.isListening)
					this.socket.addEventListener( 'message', this.onMessageEvent.bind(this) );
				this.isListening = true;
			}
		}
	}

	startTrackedTouches(touchesCallback) {
		if(this.socket != undefined) {
			if(touchesCallback != undefined && typeof touchesCallback === "function") {
				this.touchesCallback = touchesCallback;
				
				if(!this.isListening)
					this.socket.addEventListener( 'message', this.onMessageEvent.bind(this) );
				this.isListening = true;
			}
		}
	}
	
	startTrackedEyes(eyesCallback) {
		if(this.socket != undefined) {
			if(eyesCallback != undefined && typeof eyesCallback === "function") {
				this.eyesCallback = eyesCallback;
				
				if(!this.isListening)
					this.socket.addEventListener( 'message', this.onMessageEvent.bind(this) );
				this.isListening = true;
			}
		}
	}
	
	stopAll() {
		if(this.socket != undefined) {
			this.socket.removeEventListener('message', this.onMessageEvent.bind(this));
			this.isListening = false;
		}
	}
	
	/*
	 * idToName
	 * @param {integer} id - unique integer type id of a Kinectron Skeleton Joint.
	 *        Valid values range from 0 to 24, inclusive.
	 * @return {string} label name for the joint.
	 */
	idToName(id) {
		return this.idToNameMap.get(id);
	}
	
	//-------------- PRIVATE ------------------------
	
	onSocketOpened() {
		console.log("Socket opened!");
	}
	
	onMessageEvent(event) {
		
		let data = JSON.parse(event.data);  
	
		if(data.bodies != undefined && data.bodies.length > 0) {
			if(this.bodiesCallback != undefined) {
				for(let b = 0; b < data.bodies.length; b++) {
					// Call bodies callback for each available body.
					// Each body has a unique bodyId
					this.bodiesCallback( data.bodies[b] );
				}// end for b loop over bodies.
			}// end if bodies callback function is defined.
		}// end if message data has bodies.
		
		if(data.props != undefined && data.props.length > 0) {
			if(this.propsCallback != undefined) {
				for(let p = 0; p < data.props.length; p++) {
					// Call props callback for each available prop.
					// Each prop has a unique id
					this.propsCallback( data.props[p] );
				}// end for p loop over props.
			}// end if props callback function is defined.
		}// end if message data has props.	
		
		if(data.contacts != undefined && data.contacts.length > 0) {
			if(this.touchesCallback != undefined) {
				for(let c = 0; c < data.contacts.length; c++) {
					// Call touches callback for each available touch contact.
					// Each touch contact has a unique id
					this.touchesCallback( data.contacts[c] );
				}// end for c loop over touch contacts.
			}// end if touches callback function is defined.			
		}
		
		if(data != undefined && data.x != undefined && data.y != undefined) {
			if(this.eyesCallback != undefined) {
					// Call eyes callback for each available eye track.
					this.eyesCallback( data );
			}// end if eyes callback function is defined.			
		}// end if data has eye track point.
		
	}// end onMessageEvent
	
	initJointNames() {
		this.idToNameMap = new Map();
		
		this.idToNameMap.set(kinectron.SPINEBASE, "spine base");
		this.idToNameMap.set(kinectron.SPINEMID, "spine middle");
		this.idToNameMap.set(kinectron.NECK, "neck");
		this.idToNameMap.set(kinectron.HEAD, "head");
		this.idToNameMap.set(kinectron.SHOULDERLEFT, "shoulder left");
		this.idToNameMap.set(kinectron.ELBOWLEFT, "elbow left");
		this.idToNameMap.set(kinectron.WRISTLEFT, "wrist left");
		this.idToNameMap.set(kinectron.HANDLEFT, "hand left");
		this.idToNameMap.set(kinectron.SHOULDERRIGHT, "shoulder right");
		this.idToNameMap.set(kinectron.ELBOWRIGHT, "elbow right");
		this.idToNameMap.set(kinectron.WRISTRIGHT, "wrist right");
		this.idToNameMap.set(kinectron.HANDRIGHT, "hand right");
		this.idToNameMap.set(kinectron.HIPLEFT, "hip left");
		this.idToNameMap.set(kinectron.KNEELEFT, "knee left");
		this.idToNameMap.set(kinectron.ANKLELEFT, "ankle left");
		this.idToNameMap.set(kinectron.FOOTLEFT, "foot left");
		this.idToNameMap.set(kinectron.HIPRIGHT, "hip right");
		this.idToNameMap.set(kinectron.KNEERIGHT, "knee right");
		this.idToNameMap.set(kinectron.ANKLERIGHT, "ankle right");
		this.idToNameMap.set(kinectron.FOOTRIGHT, "foot right");
		this.idToNameMap.set(kinectron.SPINESHOULDER, "spine shoulder");
		this.idToNameMap.set(kinectron.HANDTIPLEFT, "hand tip left");
		this.idToNameMap.set(kinectron.THUMBLEFT, "thumb left");
		this.idToNameMap.set(kinectron.HANDTIPRIGHT, "hand tip right");
		this.idToNameMap.set(kinectron.THUMBRIGHT, "thumb right");			
	}
	
	// Source: https://stackoverflow.com/questions/42345/how-to-evaluate-an-ip
	isDottedIPv4(s) {
		let match = s.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
		return match != null &&
        match[1] <= 255 && match[2] <= 255 &&
        match[3] <= 255 && match[4] <= 255;
	}

}
