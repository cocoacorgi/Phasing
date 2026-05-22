class SequenceStep {
    startStepIndex;
    midiPitch;
    midiVelocity;

    constructor(startStepIndex, midiPitch, midiVelocity) {
        this.startStepIndex = startStepIndex;
        this.midiPitch = midiPitch;
        this.midiVelocity = midiVelocity;
    }
}

class Sequence {
    #sequenceSteps;

    constructor() {
        this.#sequenceSteps = [];
    }

    getSequenceStepStartingAtStepIndex(stepIndex) {
        return this.#sequenceSteps.find((sequenceStep) => sequenceStep.startStepIndex == stepIndex);
    }

    toggleSequenceStepStartingAtStepIndex(stepIndex) {
        let sequenceStepIndex = this.#sequenceSteps.findIndex((sequenceStep) => sequenceStep.startStepIndex == stepIndex);
        if (sequenceStepIndex == -1) {
            this.#sequenceSteps.push(new SequenceStep(stepIndex, 60, 127));
        } else {
            this.#sequenceSteps.splice(sequenceStepIndex, 1);
        }
    }
}

mgraphics.init();

var numSteps = 16;
let sequence = new Sequence();

var stepRadius = 0;
let stepCenterCoordinates = new Array(numSteps).fill().map(() => ({ x: 0, y: 0 }));
var pointerDownAtStepIndex = -1;

function paint() {
    let [width, height] = mgraphics.size;
    let minDimension = Math.min(width, height);
    let stepTrackRadius = minDimension / (2 * (1 + Math.sin(Math.PI / numSteps)));
    let stepGap = 2;
    stepRadius = (minDimension / 2) - stepTrackRadius - stepGap;

    mgraphics.translate(minDimension / 2, minDimension / 2);
    mgraphics.scale(1, -1);

    var currentStepAngle = Math.PI / 2;
    let currentStepAngleDecrement = (2 * Math.PI) / 16;
    for (var i = 0; i < numSteps; i++) {
        let currentStepCenterX = stepTrackRadius * Math.cos(currentStepAngle);
        let currentStepCenterY = stepTrackRadius * Math.sin(currentStepAngle);
        stepCenterCoordinates[i].x = currentStepCenterX;
        stepCenterCoordinates[i].y = currentStepCenterY;
        mgraphics.ellipse(currentStepCenterX - stepRadius, currentStepCenterY - stepRadius, stepRadius * 2, stepRadius * 2);
        if (i == pointerDownAtStepIndex) {
            mgraphics.set_source_rgba(1, 1, 0, 0.5);
        } else if (sequence.getSequenceStepStartingAtStepIndex(i)) {
            mgraphics.set_source_rgba(1, 1, 0, 1);
        } else {
            mgraphics.set_source_rgba(1, 1, 0, 0.25);
        }        
        mgraphics.fill();
        currentStepAngle -= currentStepAngleDecrement;
    }
}

function onpointerdown(pointerEvent) {
    pointerDownAtStepIndex = getStepIndexAtPointerEvent(pointerEvent);
    mgraphics.redraw();
}

function onpointerup(pointerEvent) {
    if (pointerDownAtStepIndex == -1) {
        mgraphics.redraw();
        return;
    }

    if (pointerDownAtStepIndex == getStepIndexAtPointerEvent(pointerEvent)) {
        sequence.toggleSequenceStepStartingAtStepIndex(pointerDownAtStepIndex);
    }

    mgraphics.redraw();
    pointerDownAtStepIndex = -1;
}

function msg_int(value) {
    let sequenceStep = sequence.getSequenceStepStartingAtStepIndex(value);
    if (sequenceStep) {
        outlet(0, sequenceStep.startStepIndex, sequenceStep.midiPitch, sequenceStep.midiVelocity);
    } else {
        outlet(0, -1, -1, -1);
    }
}

function getCartesianCoordinates(pointerEvent) {
    return { 
        x: pointerEvent.clientX - (mgraphics.size[0] / 2), 
        y: (mgraphics.size[1] / 2) - pointerEvent.clientY
    };
}
getCartesianCoordinates.local = 1;

function getStepIndexAtPointerEvent(pointerEvent) {
    let pointerEventCoordinates = getCartesianCoordinates(pointerEvent);
    for (var i = 0; i < stepCenterCoordinates.length; i++) {
        let dx = pointerEventCoordinates.x - stepCenterCoordinates[i].x;
        let dy = pointerEventCoordinates.y - stepCenterCoordinates[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist < stepRadius) {
            return i;
        }
    }
    return -1;
}
getStepIndexAtPointerEvent.local = 1;