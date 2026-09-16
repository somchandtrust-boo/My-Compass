/* =========================================================
   CBRND REAL COMPASS
   SCRIPT.JS
   Real Device Orientation Compass
   No API Key Required
   ========================================================= */

"use strict";

/* =========================================================
   ELEMENTS
   ========================================================= */

const headingEl = document.getElementById("heading");
const headingSmallEl = document.getElementById("headingSmall");

const directionNameEl = document.getElementById("directionName");
const directionSmallEl = document.getElementById("directionSmall");
const directionSubtitleEl = document.getElementById("directionSubtitle");

const compassFace = document.getElementById("compassFace");

const sensorStatus = document.getElementById("sensorStatus");
const sensorStatusText = document.getElementById("sensorStatusText");
const sensorType = document.getElementById("sensorType");

const startCompassButton =
    document.getElementById("startCompass");

const calibrateCompassButton =
    document.getElementById("calibrateCompass");

const voiceButton =
    document.getElementById("voiceButton");

const permissionButton =
    document.getElementById("permissionButton");

const permissionPanel =
    document.getElementById("permissionPanel");

const calibrationPanel =
    document.getElementById("calibrationPanel");

const calibrationProgress =
    document.getElementById("calibrationProgress");

const closeCalibration =
    document.getElementById("closeCalibration");


/* =========================================================
   COMPASS STATE
   ========================================================= */

let currentHeading = 0;
let displayedHeading = 0;

let compassStarted = false;
let sensorListening = false;

let lastEventTime = 0;

let calibrationRunning = false;
let calibrationStartTime = 0;

let lastVoiceHeading = null;


/* =========================================================
   DIRECTION DATA
   ========================================================= */

const directions = [
    {
        min: 337.5,
        max: 360,
        name: "NORTH",
        hindi: "उत्तर"
    },
    {
        min: 0,
        max: 22.5,
        name: "NORTH",
        hindi: "उत्तर"
    },
    {
        min: 22.5,
        max: 67.5,
        name: "NORTHEAST",
        hindi: "उत्तर-पूर्व"
    },
    {
        min: 67.5,
        max: 112.5,
        name: "EAST",
        hindi: "पूर्व"
    },
    {
        min: 112.5,
        max: 157.5,
        name: "SOUTHEAST",
        hindi: "दक्षिण-पूर्व"
    },
    {
        min: 157.5,
        max: 202.5,
        name: "SOUTH",
        hindi: "दक्षिण"
    },
    {
        min: 202.5,
        max: 247.5,
        name: "SOUTHWEST",
        hindi: "दक्षिण-पश्चिम"
    },
    {
        min: 247.5,
        max: 292.5,
        name: "WEST",
        hindi: "पश्चिम"
    },
    {
        min: 292.5,
        max: 337.5,
        name: "NORTHWEST",
        hindi: "उत्तर-पश्चिम"
    }
];


/* =========================================================
   NORMALIZE ANGLE
   ========================================================= */

function normalizeHeading(value) {

    if (!Number.isFinite(value)) {
        return 0;
    }

    value = value % 360;

    if (value < 0) {
        value += 360;
    }

    return value;
}


/* =========================================================
   GET DIRECTION
   ========================================================= */

function getDirection(degrees) {

    const heading = normalizeHeading(degrees);

    for (const direction of directions) {

        if (
            heading >= direction.min &&
            heading < direction.max
        ) {
            return direction;
        }
    }

    return directions[0];
}


/* =========================================================
   SMOOTH ANGLE
   Prevents compass from jumping 359° -> 0°
   ========================================================= */

function shortestAngleDifference(
    target,
    current
) {

    let difference =
        target - current;

    while (difference > 180) {
        difference -= 360;
    }

    while (difference < -180) {
        difference += 360;
    }

    return difference;
}


/* =========================================================
   UPDATE UI
   ========================================================= */

function updateCompassUI(heading) {

    const normalized =
        normalizeHeading(heading);

    const rounded =
        Math.round(normalized);

    const direction =
        getDirection(normalized);


    /* Heading */

    headingEl.textContent =
        rounded;

    headingSmallEl.textContent =
        rounded;


    /* Direction */

    directionNameEl.textContent =
        direction.name;

    directionSmallEl.textContent =
        direction.name;

    directionSubtitleEl.textContent =
        direction.hindi;


    /* Compass rotation */

    compassFace.style.transform =
        `rotate(${-normalized}deg)`;


    /* Document title */

    document.title =
        `${String(rounded).padStart(3, "0")}° ${direction.name} | CBRND Compass`;
}


/* =========================================================
   SMOOTH ANIMATION
   ========================================================= */

function animateCompass() {

    const difference =
        shortestAngleDifference(
            currentHeading,
            displayedHeading
        );

    displayedHeading +=
        difference * 0.18;

    displayedHeading =
        normalizeHeading(displayedHeading);

    updateCompassUI(
        displayedHeading
    );

    requestAnimationFrame(
        animateCompass
    );
}


/* =========================================================
   SET SENSOR STATUS
   ========================================================= */

function setSensorStatus(
    text,
    active = false
) {

    sensorStatusText.textContent =
        text;

    if (active) {

        sensorStatus.classList.add(
            "sensor-active"
        );

        document.body.classList.add(
            "sensor-active"
        );

    } else {

        sensorStatus.classList.remove(
            "sensor-active"
        );

        document.body.classList.remove(
            "sensor-active"
        );
    }
}


/* =========================================================
   DEVICE ORIENTATION HANDLER
   ========================================================= */

function handleOrientation(event) {

    const now =
        performance.now();

    /*
       Avoid processing thousands of events
       unnecessarily.
    */

    if (
        now - lastEventTime < 16
    ) {
        return;
    }

    lastEventTime = now;


    let heading = null;


    /* =====================================================
       iOS / Safari
       webkitCompassHeading is usually already
       compass heading relative to magnetic north.
       ===================================================== */

    if (
        typeof event.webkitCompassHeading === "number" &&
        Number.isFinite(
            event.webkitCompassHeading
        )
    ) {

        heading =
            event.webkitCompassHeading;

        sensorType.textContent =
            "IOS SENSOR";
    }


    /* =====================================================
       Standard DeviceOrientation
       ===================================================== */

    else if (
        typeof event.alpha === "number" &&
        Number.isFinite(event.alpha)
    ) {

        /*
           For normal portrait orientation,
           alpha increases clockwise.

           DeviceOrientation alpha is referenced
           differently across browsers/devices,
           so screen orientation is considered.
        */

        const screenAngle =
            getScreenAngle();

        heading =
            normalizeHeading(
                360 -
                event.alpha +
                screenAngle
            );

        sensorType.textContent =
            "DEVICE";
    }


    /* =====================================================
       No usable sensor
       ===================================================== */

    if (
        heading === null ||
        !Number.isFinite(heading)
    ) {

        return;
    }


    currentHeading =
        normalizeHeading(heading);

    sensorListening = true;

    setSensorStatus(
        "Sensor Active",
        true
    );


    /* Calibration */

    if (calibrationRunning) {
        updateCalibration();
    }
}


/* =========================================================
   SCREEN ORIENTATION
   ========================================================= */

function getScreenAngle() {

    /*
       Modern browsers
    */

    if (
        screen.orientation &&
        typeof screen.orientation.angle === "number"
    ) {

        return screen.orientation.angle;
    }


    /*
       Older iOS / browsers
    */

    if (
        typeof window.orientation === "number"
    ) {

        return window.orientation;
    }

    return 0;
}


/* =========================================================
   START LISTENING
   ========================================================= */

function startListening() {

    if (
        sensorListening
    ) {
        return;
    }

    window.addEventListener(
        "deviceorientation",
        handleOrientation,
        true
    );

    /*
       Some browsers expose the absolute
       orientation event.
    */

    window.addEventListener(
        "deviceorientationabsolute",
        handleOrientation,
        true
    );

    sensorListening = true;

    setSensorStatus(
        "Listening...",
        false
    );
}


/* =========================================================
   STOP LISTENING
   ========================================================= */

function stopListening() {

    window.removeEventListener(
        "deviceorientation",
        handleOrientation,
        true
    );

    window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation,
        true
    );

    sensorListening = false;

    setSensorStatus(
        "Sensor Stopped",
        false
    );
}


/* =========================================================
   IOS PERMISSION
   ========================================================= */

async function requestIOSPermission() {

    /*
       iOS 13+ requires permission to be requested
       from a user interaction such as a button click.
    */

    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {

        try {

            const permission =
                await DeviceOrientationEvent.requestPermission(
                    true
                );

            if (
                permission === "granted"
            ) {

                permissionPanel.classList.add(
                    "hidden"
                );

                startListening();

                compassStarted = true;

                startCompassButton.textContent =
                    "🧭 COMPASS ACTIVE";

                return true;
            }

            permissionPanel.classList.remove(
                "hidden"
            );

            setSensorStatus(
                "Permission Denied",
                false
            );

            return false;

        } catch (error) {

            console.error(
                "Sensor permission error:",
                error
            );

            permissionPanel.classList.remove(
                "hidden"
            );

            return false;
        }
    }


    /*
       Android / browsers that don't need
       explicit permission.
    */

    permissionPanel.classList.add(
        "hidden"
    );

    startListening();

    compassStarted = true;

    startCompassButton.textContent =
        "🧭 COMPASS ACTIVE";

    return true;
}


/* =========================================================
   START COMPASS
   ========================================================= */

async function startCompass() {

    if (compassStarted) {

        /*
           Allow user to restart sensor.
        */

        stopListening();

        compassStarted = false;

        startCompassButton.textContent =
            "🧭 START COMPASS";

        setSensorStatus(
            "Sensor Stopped",
            false
        );

        return;
    }


    /*
       HTTPS check
    */

    if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
    ) {

        alert(
            "Compass sensor usually requires HTTPS.\n\n" +
            "Please open this website through GitHub Pages or another HTTPS website."
        );

        return;
    }


    await requestIOSPermission();
}


/* =========================================================
   PERMISSION BUTTON
   ========================================================= */

if (permissionButton) {

    permissionButton.addEventListener(
        "click",
        async () => {

            await requestIOSPermission();

        }
    );
}


/* =========================================================
   START BUTTON
   ========================================================= */

if (startCompassButton) {

    startCompassButton.addEventListener(
        "click",
        async () => {

            await startCompass();

        }
    );
}


/* =========================================================
   CALIBRATION
   ========================================================= */

function startCalibration() {

    calibrationRunning = true;

    calibrationStartTime =
        performance.now();

    calibrationProgress.style.width =
        "0%";

    calibrationPanel.classList.remove(
        "hidden"
    );

    updateCalibration();
}


function updateCalibration() {

    if (!calibrationRunning) {
        return;
    }

    const elapsed =
        performance.now() -
        calibrationStartTime;

    const duration =
        8000;

    const progress =
        Math.min(
            100,
            (elapsed / duration) * 100
        );

    calibrationProgress.style.width =
        `${progress}%`;


    if (progress >= 100) {

        calibrationRunning = false;

        calibrationProgress.style.width =
            "100%";

        setTimeout(() => {

            calibrationPanel.classList.add(
                "hidden"
            );

        }, 600);

        return;
    }

    requestAnimationFrame(
        updateCalibration
    );
}


/* =========================================================
   CALIBRATION BUTTON
   ========================================================= */

if (calibrateCompassButton) {

    calibrateCompassButton.addEventListener(
        "click",
        () => {

            startCalibration();

        }
    );
}


/* =========================================================
   CLOSE CALIBRATION
   ========================================================= */

if (closeCalibration) {

    closeCalibration.addEventListener(
        "click",
        () => {

            calibrationRunning = false;

            calibrationPanel.classList.add(
                "hidden"
            );

        }
    );
}


/* =========================================================
   VOICE DIRECTION
   ========================================================= */

function speakDirection() {

    if (
        !("speechSynthesis" in window)
    ) {

        alert(
            "Speech synthesis is not supported by this browser."
        );

        return;
    }


    const rounded =
        Math.round(
            normalizeHeading(
                displayedHeading
            )
        );

    const direction =
        getDirection(
            displayedHeading
        );


    /*
       Cancel previous speech
    */

    window.speechSynthesis.cancel();


    const message =
        `Heading ${rounded} degrees. ` +
        `${direction.name}. ` +
        `${direction.hindi}.`;


    const speech =
        new SpeechSynthesisUtterance(
            message
        );

    speech.lang =
        "en-IN";

    speech.rate =
        0.9;

    speech.pitch =
        1;

    speech.volume =
        1;


    window.speechSynthesis.speak(
        speech
    );


    lastVoiceHeading =
        displayedHeading;
}


/* =========================================================
   VOICE BUTTON
   ========================================================= */

if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        speakDirection
    );
}


/* =========================================================
   DEVICE SENSOR AVAILABILITY CHECK
   ========================================================= */

function checkSensorAvailability() {

    if (
        typeof DeviceOrientationEvent ===
        "undefined"
    ) {

        setSensorStatus(
            "Sensor Not Supported",
            false
        );

        sensorType.textContent =
            "NOT SUPPORTED";

        startCompassButton.disabled =
            true;

        return false;
    }

    return true;
}


/* =========================================================
   VISIBILITY CHANGE
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        /*
           Browser tab hidden होने पर sensor events
           कुछ devices पर pause हो सकते हैं.
        */

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (
                compassStarted &&
                !sensorListening
            ) {

                startListening();
            }
        }

    }
);


/* =========================================================
   SCREEN ROTATION
   ========================================================= */

if (
    screen.orientation &&
    screen.orientation.addEventListener
) {

    screen.orientation.addEventListener(
        "change",
        () => {

            /*
               Orientation बदलने पर next sensor event
               नया screen angle automatically use करेगा.
            */

        }
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeCompass() {

    /*
       Initial display
    */

    currentHeading = 0;
    displayedHeading = 0;

    updateCompassUI(0);


    /*
       Start animation loop
    */

    requestAnimationFrame(
        animateCompass
    );


    /*
       Check browser
    */

    checkSensorAvailability();


    /*
       Default status
    */

    setSensorStatus(
        "Waiting for Sensor",
        false
    );
}


/* =========================================================
   KEYBOARD SHORTCUT
   ========================================================= */

document.addEventListener(
    "keydown",
    (event) => {

        /*
           C = Calibration
        */

        if (
            event.key.toLowerCase() === "c"
        ) {

            startCalibration();
        }


        /*
           V = Voice
        */

        if (
            event.key.toLowerCase() === "v"
        ) {

            speakDirection();
        }

    }
);


/* =========================================================
   START
   ========================================================= */

initializeCompass();