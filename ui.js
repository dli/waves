//waves in simulation are not actually Gerstner waves but Gerstner waves are used for visualisation purposes
var Profile = function (canvas) {
    var context = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;

    context.strokeStyle = PROFILE_COLOR;
    context.lineWidth = PROFILE_LINE_WIDTH;

    var evaluateX = function (x, choppiness) {
        return x - choppiness * CHOPPINESS_SCALE * PROFILE_AMPLITUDE * Math.sin(x * PROFILE_OMEGA + PROFILE_PHI);
    };

    var evaluateY = function (x) {
        return PROFILE_AMPLITUDE * Math.cos(x * PROFILE_OMEGA + PROFILE_PHI) + PROFILE_OFFSET;
    };

    this.render = function (choppiness) {
        context.clearRect(0, 0, width, height);
        context.beginPath();
        context.moveTo(evaluateX(0, choppiness), evaluateY(0));
        for (var x = 0; x <= width; x += PROFILE_STEP) {
            context.lineTo(evaluateX(x, choppiness), evaluateY(x)
            );
        }
        context.stroke();
    };
    this.render(INITIAL_CHOPPINESS);
};

var Arrow = function (parent, valueX, valueY) {
    var arrow = [valueX * WIND_SCALE, 0.0, valueY * WIND_SCALE];
    var tip = addToVector([], ARROW_ORIGIN, arrow);

    var shaftDiv = document.createElement('div');
    shaftDiv.style.position = 'absolute';
    shaftDiv.style.width = ARROW_SHAFT_WIDTH + 'px';
    shaftDiv.style.background = UI_COLOR;
    setTransformOrigin(shaftDiv, 'center top');
    setTransform(shaftDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_SHAFT_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg)');
    parent.appendChild(shaftDiv);

    var headDiv = document.createElement('div');
    headDiv.style.position = 'absolute';
    headDiv.style.borderStyle = 'solid';
    headDiv.style.borderColor = UI_COLOR + ' transparent transparent transparent';
    headDiv.style.borderWidth = ARROW_HEAD_HEIGHT + 'px ' + ARROW_HEAD_WIDTH / 2 + 'px 0px ' + ARROW_HEAD_WIDTH / 2 + 'px';
    setTransformOrigin(headDiv, 'center top');
    setTransform(headDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_HEAD_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg)');
    parent.appendChild(headDiv);

    var render = function () {
        var angle = Math.atan2(arrow[2], arrow[0]);

        var arrowLength = lengthOfVector(arrow);

        shaftDiv.style.height = (arrowLength - ARROW_HEAD_HEIGHT + 1 + ARROW_OFFSET) + 'px';
        setTransform(shaftDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_SHAFT_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg) rotateZ(' + (angle - Math.PI / 2) + 'rad) translateY(' + -ARROW_OFFSET + 'px)');
        setTransform(headDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_HEAD_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg) rotateZ(' + (angle - Math.PI / 2) + 'rad) translateY(' + (arrowLength - ARROW_HEAD_HEIGHT - 1) + 'px)');
    };

    this.update = function (mouseX, mouseZ) {
        arrow = [mouseX, 0, mouseZ];
        subtractFromVector(arrow, arrow, ARROW_ORIGIN);

        var arrowLength = lengthOfVector(arrow);
        if (arrowLength > MAX_WIND_SPEED * WIND_SCALE) {
            multiplyVectorByScalar(arrow, arrow, (MAX_WIND_SPEED * WIND_SCALE) / arrowLength);
        } else if (lengthOfVector(arrow) < MIN_WIND_SPEED * WIND_SCALE) {
            multiplyVectorByScalar(arrow, arrow, (MIN_WIND_SPEED * WIND_SCALE) / arrowLength);
        }

        addToVector(tip, ARROW_ORIGIN, arrow);

        render();

        valueX = arrow[0] / WIND_SCALE;
        valueY = arrow[2] / WIND_SCALE;
    };

    this.getValue = function () {
        return lengthOfVector(arrow) / WIND_SCALE;
    };

    this.getValueX = function () {
        return valueX;
    };

    this.getValueY = function () {
        return valueY;
    };

    this.distanceToTip = function (vector) {
        return distanceBetweenVectors(tip, vector);
    };

    this.getTipZ = function () {
        return tip[2];
    };

    render();
};

var Slider = function (parent, x, z, length, minValue, maxValue, value, sliderBreadth, handleSize) {
    var sliderLeftDiv = document.createElement('div');
    sliderLeftDiv.style.position = 'absolute';
    sliderLeftDiv.style.width = length + 'px';
    sliderLeftDiv.style.height = sliderBreadth + 'px';
    sliderLeftDiv.style.backgroundColor = SLIDER_LEFT_COLOR;
    setTransformOrigin(sliderLeftDiv, 'center top');
    setTransform(sliderLeftDiv, 'translate3d(' + x + 'px, 0, ' + z + 'px) rotateX(90deg)');
    parent.appendChild(sliderLeftDiv);

    var sliderRightDiv = document.createElement('div');
    sliderRightDiv.style.position = 'absolute';
    sliderRightDiv.style.width = length + 'px';
    sliderRightDiv.style.height = sliderBreadth + 'px';
    sliderRightDiv.style.backgroundColor = SLIDER_RIGHT_COLOR;
    setTransformOrigin(sliderRightDiv, 'center top');
    setTransform(sliderRightDiv, 'translate3d(' + x + 'px, 0, ' + z + 'px) rotateX(90deg)');
    parent.appendChild(sliderRightDiv);

    var handleDiv = document.createElement('div');
    handleDiv.style.position = 'absolute';
    handleDiv.style.width = handleSize + 'px';
    handleDiv.style.height = handleSize + 'px';
    handleDiv.style.borderRadius = handleSize * 0.5 + 'px';
    handleDiv.style.background = HANDLE_COLOR;
    setTransformOrigin(handleDiv, 'center top');
    setTransform(handleDiv, 'translate3d(' + x + 'px, 0px, ' + z + 'px) rotateX(90deg)');
    parent.appendChild(handleDiv);

    var handleX = (x + ((value - minValue) / (maxValue - minValue)) * length) - handleDiv.offsetWidth / 2;

    var render = function () {
        var fraction = (value - minValue) / (maxValue - minValue);

        setTransform(handleDiv, 'translate3d(' + (handleX - handleDiv.offsetWidth * 0.5) + 'px, 0, ' + (z - handleDiv.offsetHeight * 0.5) + 'px) rotateX(90deg)');
        sliderLeftDiv.style.width = fraction * length + 'px';
        sliderRightDiv.style.width = (1.0 - fraction) * length + 'px';
        setTransform(sliderRightDiv, 'translate3d(' + (x + fraction * length) + 'px, 0, ' + z + 'px) rotateX(90deg)');
    };

    this.update = function (mouseX, callback) {
        handleX = clamp(mouseX, x, x + length);
        var fraction = clamp((mouseX - x) / length, 0.0, 1.0);
        value = minValue + fraction * (maxValue - minValue);

        callback(value);

        render();
    };

    this.getValue = function () {
        return value;
    };

    this.distanceToHandle = function (vector) {
        return distanceBetweenVectors([handleX, 0, z], vector);
    };

    render();
};