var main = function () {
    var simulatorCanvas = document.getElementById(SIMULATOR_CANVAS_ID),
        overlayDiv = document.getElementById(OVERLAY_DIV_ID),
        uiDiv = document.getElementById(UI_DIV_ID),
        cameraDiv = document.getElementById(CAMERA_DIV_ID),
        windDiv = document.getElementById(WIND_SPEED_DIV_ID),
        windSpeedSpan = document.getElementById(WIND_SPEED_SPAN_ID),
        choppinessDiv = document.getElementById(CHOPPINESS_DIV_ID),
        sizeSpan = document.getElementById('size-value');

    setText(choppinessDiv, INITIAL_CHOPPINESS, CHOPPINESS_DECIMAL_PLACES);
    setText(sizeSpan, INITIAL_SIZE, SIZE_DECIMAL_PLACES);

    var camera = new Camera(),
        projectionMatrix = makePerspectiveMatrix(new Float32Array(16), FOV, MIN_ASPECT, NEAR, FAR);
    
    var simulator = new Simulator(simulatorCanvas, window.innerWidth, window.innerHeight);

    var profile = new Profile(document.getElementById(PROFILE_CANVAS_ID)),
        sizeSlider = new Slider(cameraDiv, SIZE_SLIDER_X, SIZE_SLIDER_Z,
            SIZE_SLIDER_LENGTH, MIN_SIZE, MAX_SIZE, INITIAL_SIZE, SIZE_SLIDER_BREADTH, SIZE_HANDLE_SIZE),
        choppinessSlider = new Slider(cameraDiv, CHOPPINESS_SLIDER_X, CHOPPINESS_SLIDER_Z,
            CHOPPINESS_SLIDER_LENGTH, MIN_CHOPPINESS, MAX_CHOPPINESS, INITIAL_CHOPPINESS, CHOPPINESS_SLIDER_BREADTH, CHOPPINESS_HANDLE_SIZE);

    var width = window.innerWidth,
        height = window.innerHeight;

    var lastMouseX = 0;
    var lastMouseY = 0;
    var mode = NONE;

    var setUIPerspective = function (height) {
        var fovValue = 0.5 / Math.tan(FOV / 2) * height;
        setPerspective(uiDiv, fovValue + 'px');
    };

    var windArrow = new Arrow(cameraDiv, INITIAL_WIND[0], INITIAL_WIND[1]);
    setText(windSpeedSpan, windArrow.getValue(), WIND_SPEED_DECIMAL_PLACES);
    setTransform(windDiv, 'translate3d(' + WIND_SPEED_X + 'px, 0px, ' + Math.max(MIN_WIND_SPEED_Z, windArrow.getTipZ() + WIND_SPEED_OFFSET) + 'px) rotateX(90deg)');

    var inverseProjectionViewMatrix = [],
        nearPoint = [],
        farPoint = [];
    var unproject = function (viewMatrix, x, y, width, height) {
        premultiplyMatrix(inverseProjectionViewMatrix, viewMatrix, projectionMatrix);
        invertMatrix(inverseProjectionViewMatrix, inverseProjectionViewMatrix);

        setVector4(nearPoint, (x / width) * 2.0 - 1.0, ((height - y) / height) * 2.0 - 1.0, 1.0, 1.0);
        transformVectorByMatrix(nearPoint, nearPoint, inverseProjectionViewMatrix);

        setVector4(farPoint, (x / width) * 2.0 - 1.0, ((height - y) / height) * 2.0 - 1.0, -1.0, 1.0);
        transformVectorByMatrix(farPoint, farPoint, inverseProjectionViewMatrix);

        projectVector4(nearPoint, nearPoint);
        projectVector4(farPoint, farPoint);

        var t = -nearPoint[1] / (farPoint[1] - nearPoint[1]);
        var point = [
            nearPoint[0] + t * (farPoint[0] - nearPoint[0]),
            nearPoint[1] + t * (farPoint[1] - nearPoint[1]),
            nearPoint[2] + t * (farPoint[2] - nearPoint[2]),
        ];

        return point;
    };

    var onMouseDown = function (event) {
        event.preventDefault();

        var mousePosition = getMousePosition(event, uiDiv);
        var mouseX = mousePosition.x,
            mouseY = mousePosition.y;

        var point = unproject(camera.getViewMatrix(), mouseX, mouseY, width, height);

        if (windArrow.distanceToTip(point) < ARROW_TIP_RADIUS) {
            mode = ROTATING;
        } else if (sizeSlider.distanceToHandle(point) < SIZE_HANDLE_RADIUS) {
            mode = SLIDING_SIZE;
        } else if (choppinessSlider.distanceToHandle(point) < CHOPPINESS_HANDLE_RADIUS) {
            mode = SLIDING_CHOPPINESS;
        } else {
            mode = ORBITING;
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        }
    };
    overlayDiv.addEventListener('mousedown', onMouseDown, false);

    overlayDiv.addEventListener('mousemove', function (event) {
        event.preventDefault();

        var mousePosition = getMousePosition(event, uiDiv),
            mouseX = mousePosition.x,
            mouseY = mousePosition.y;

        var point = unproject(camera.getViewMatrix(), mouseX, mouseY, width, height);

        if (windArrow.distanceToTip(point) < ARROW_TIP_RADIUS || mode === ROTATING) {
            overlayDiv.style.cursor = 'move';
        } else if (sizeSlider.distanceToHandle(point) < SIZE_HANDLE_RADIUS || 
            choppinessSlider.distanceToHandle(point) < CHOPPINESS_HANDLE_RADIUS || 
            mode === SLIDING_SIZE || mode === SLIDING_CHOPPINESS) {
            overlayDiv.style.cursor = 'ew-resize';
        } else if (mode === ORBITING) {
            overlayDiv.style.cursor = '-webkit-grabbing';
            overlayDiv.style.cursor = '-moz-grabbing';
            overlayDiv.style.cursor = 'grabbing';
        } else {
            overlayDiv.style.cursor = '-webkit-grab';
            overlayDiv.style.cursor = '-moz-grab';
            overlayDiv.style.cursor = 'grab';
        }

        if (mode === ORBITING) {
            camera.changeAzimuth((mouseX - lastMouseX) / width * SENSITIVITY);
            camera.changeElevation((mouseY - lastMouseY) / height * SENSITIVITY);
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        } else if (mode === ROTATING) {
            windArrow.update(point[0], point[2]);
            simulator.setWind(windArrow.getValueX(), windArrow.getValueY());
            setText(windSpeedSpan, windArrow.getValue(), WIND_SPEED_DECIMAL_PLACES);

            setTransform(windDiv, 'translate3d(' + WIND_SPEED_X + 'px, 0px, ' + Math.max(MIN_WIND_SPEED_Z, windArrow.getTipZ() + WIND_SPEED_OFFSET) + 'px) rotateX(90deg)');
        } else if (mode === SLIDING_SIZE) {
            sizeSlider.update(point[0], function (size) {
                simulator.setSize(size);
                setText(sizeSpan, size, SIZE_DECIMAL_PLACES);
            });
        } else if (mode === SLIDING_CHOPPINESS) {
            choppinessSlider.update(point[0], function (choppiness) {
                simulator.setChoppiness(choppiness);
                setText(choppinessDiv, choppiness, CHOPPINESS_DECIMAL_PLACES);
                profile.render(choppiness);
            });
        }
    });

    overlayDiv.addEventListener('mouseup', function (event) {
        event.preventDefault();
        mode = NONE;
    });

    window.addEventListener('mouseout', function (event) {
        var from = event.relatedTarget || event.toElement;
        if (!from || from.nodeName === 'HTML') {
            mode = NONE;
        }
    });

    var onresize = function () {
        var windowWidth = window.innerWidth,
        windowHeight = window.innerHeight;

        overlayDiv.style.width = windowWidth + 'px';
        overlayDiv.style.height = windowHeight + 'px';

        if (windowWidth / windowHeight > MIN_ASPECT) {
            makePerspectiveMatrix(projectionMatrix, FOV, windowWidth / windowHeight, NEAR, FAR);
            simulator.resize(windowWidth, windowHeight);
            uiDiv.style.width = windowWidth + 'px';
            uiDiv.style.height = windowHeight + 'px';
            cameraDiv.style.width = windowWidth + 'px';
            cameraDiv.style.height = windowHeight + 'px';
            simulatorCanvas.style.top = '0px';
            uiDiv.style.top = '0px';
            setUIPerspective(windowHeight);
            width = windowWidth;
            height = windowHeight;
        } else {
            var newHeight = windowWidth / MIN_ASPECT;
            makePerspectiveMatrix(projectionMatrix, FOV, windowWidth / newHeight, NEAR, FAR);
            simulator.resize(windowWidth, newHeight);
            simulatorCanvas.style.top = (windowHeight - newHeight) * 0.5 + 'px';
            uiDiv.style.top = (windowHeight - newHeight) * 0.5 + 'px';
            setUIPerspective(newHeight);
            uiDiv.style.width = windowWidth + 'px';
            uiDiv.style.height = newHeight + 'px';
            cameraDiv.style.width = windowWidth + 'px';
            cameraDiv.style.height = newHeight + 'px';
            width = windowWidth;
            height = newHeight;
        }
    };

    window.addEventListener('resize', onresize);
    onresize();

    var lastTime = (new Date()).getTime();
    var render = function render (currentTime) {
        var deltaTime = (currentTime - lastTime) / 1000 || 0.0;
        lastTime = currentTime;

        var fovValue = 0.5 / Math.tan(FOV / 2) * height;
        setTransform(cameraDiv, 'translate3d(0px, 0px, ' + fovValue + 'px) ' + toCSSMatrix(camera.getViewMatrix()) + ' translate3d(' + width / 2 + 'px, ' + height / 2 + 'px, 0px)');
        simulator.render(deltaTime, projectionMatrix, camera.getViewMatrix(), camera.getPosition());

        requestAnimationFrame(render);
    };
    render();
};

if (hasWebGLSupportWithExtensions(['OES_texture_float', 'OES_texture_float_linear'])) {
    main();
} else {
    document.getElementById('error').style.display = 'block';
    document.getElementById('footer').style.display = 'none';
}