class Sequence {
    #steps;

    constructor() {
        this.#steps = [];
    }

    get steps() {
        return this.#steps;
    }

    addStep(newStep) {
        // post(JSON.stringify(newStep) + "\n" + JSON.stringify(this.#steps) + "\n");
        const newSteps = [];
        for (const step of this.#steps) {
            // Case: Total overlap.
            if (newStep.startGridStep <= step.startGridStep && newStep.endGridStep >= step.endGridStep) {
                continue;
            }

            // Case: No overlap.
            if (newStep.startGridStep > step.endGridStep || newStep.endGridStep < step.startGridStep) {
                newSteps.push(step);
                continue;
            }

            // Case: Inside overlap - New step is completely bounded by current step.
            if (newStep.startGridStep > step.startGridStep && newStep.endGridStep < step.endGridStep) {
                newSteps.push(new Sequence.Step(step.startGridStep, newStep.startGridStep - 1, step.midiPitch, step.midiVelocity));
                newSteps.push(new Sequence.Step(newStep.endGridStep + 1, step.endGridStep, step.midiPitch, step.midiVelocity));
                continue;
            }

            // Case: Trailing overlap - New step overlaps end of current step.
            if (newStep.startGridStep > step.startGridStep && newStep.endGridStep >= step.endGridStep) {
                newSteps.push(new Sequence.Step(step.startGridStep, newStep.startGridStep - 1, step.midiPitch, step.midiVelocity));
                continue;
            }

            // Case: Leading overlap - New step overlaps start of current step.
            if (newStep.startGridStep <= step.startGridStep && newStep.endGridStep < step.endGridStep) {
                newSteps.push(new Sequence.Step(newStep.endGridStep + 1, step.endGridStep, step.midiPitch, step.midiVelocity));
                continue;
            }
        }

        newSteps.push(newStep);
        newSteps.sort((stepA, stepB) => stepA.startGridStep - stepB.startGridStep);
        this.#steps = newSteps;
    }

    removeStep(stepToRemove) {
        this.#steps = this.#steps.filter((step) => step !== stepToRemove);
    }

    getStep(startGridStep) {
        return this.#steps.find((step) => step.startGridStep == startGridStep);
    }

    static Step = class {
        startGridStep;
        endGridStep;
        midiPitch;
        midiVelocity;

        constructor(startGridStep, endGridStep, midiPitch, midiVelocity) {
            this.startGridStep = startGridStep;
            this.endGridStep = endGridStep;
            this.midiPitch = midiPitch;
            this.midiVelocity = midiVelocity;
        }

        get duration() {
            return this.endGridStep - this.startGridStep + 1;
        }
    }
}

mgraphics.init();

let numGridSteps = 16;
let sequence = new Sequence();

let gridStepRadius = 0;
let gridStepCenterCoordinates = new Array(numGridSteps).fill().map(() => ({ x: 0, y: 0 }));
let pointerDownAtGridStep = -1;
let movePointerEvent = null;

function paint() {
    let [width, height] = mgraphics.size;
    let minDimension = Math.min(width, height);
    let gridStepTrackRadius = minDimension / (2 * (1 + Math.sin(Math.PI / numGridSteps)));
    let gridStepGap = 2;
    gridStepRadius = (minDimension / 2) - gridStepTrackRadius - gridStepGap;

    mgraphics.translate(minDimension / 2, minDimension / 2);
    mgraphics.scale(1, -1);

    // Draw grid.
    let currentGridStepAngle = Math.PI / 2;
    let currentGridStepAngleDecrement = (2 * Math.PI) / 16;
    for (let i = 0; i < numGridSteps; i++) {
        let currentGridStepCenterX = gridStepTrackRadius * Math.cos(currentGridStepAngle);
        let currentGridStepCenterY = gridStepTrackRadius * Math.sin(currentGridStepAngle);
        gridStepCenterCoordinates[i].x = currentGridStepCenterX;
        gridStepCenterCoordinates[i].y = currentGridStepCenterY;
        mgraphics.ellipse(currentGridStepCenterX - gridStepRadius, currentGridStepCenterY - gridStepRadius, gridStepRadius * 2, gridStepRadius * 2);
        mgraphics.set_source_rgba(1, 1, 0, 0.25);
        mgraphics.fill();
        currentGridStepAngle -= currentGridStepAngleDecrement;
    }

    // Draw transient/uncommitted sequence step.
    if (pointerDownAtGridStep != -1) {
        let sequenceStepStartCoordinates = gridStepCenterCoordinates[pointerDownAtGridStep];
        let sequenceStepStartAngle = Math.atan2(sequenceStepStartCoordinates.y, sequenceStepStartCoordinates.x);

        if (movePointerEvent) {
            let movePointerEventCoordinates = getCartesianCoordinates(movePointerEvent);
            let movePointerEventAngle = Math.atan2(movePointerEventCoordinates.y, movePointerEventCoordinates.x);
            let movePointerEventNearestGridStep = getNearestGridStepToPointerEvent(movePointerEvent);
            // post(`${pointerDownAtGridStep}->${movePointerEventNearestGridStep}\n`);

            if (movePointerEventNearestGridStep > pointerDownAtGridStep) {
                let endAngle = movePointerEventAngle;
                if (movePointerEventNearestGridStep == 15) {
                    let lastGridStepCoordinates = gridStepCenterCoordinates[15];
                    endAngle = Math.atan2(lastGridStepCoordinates.y, lastGridStepCoordinates.x);
                }
                mgraphics.arc_negative(0, 0, gridStepTrackRadius, sequenceStepStartAngle, endAngle);
                mgraphics.set_line_width(2 * gridStepRadius);
                mgraphics.set_line_cap("round");
                mgraphics.stroke();
            } else if (movePointerEventNearestGridStep < pointerDownAtGridStep) {
                let endAngle = movePointerEventAngle;
                if (movePointerEventNearestGridStep == 0) {
                    endAngle = Math.PI / 2;
                }
                mgraphics.arc(0, 0, gridStepTrackRadius, sequenceStepStartAngle, endAngle);
                mgraphics.set_line_width(2 * gridStepRadius);
                mgraphics.set_line_cap("round");
                mgraphics.stroke();
            } else {
                let sequenceStepAngle = (Math.PI / 2) - (pointerDownAtGridStep * ((2 * Math.PI) / 16));
                let sequenceStepCenterX = gridStepTrackRadius * Math.cos(sequenceStepAngle);
                let sequenceStepCenterY = gridStepTrackRadius * Math.sin(sequenceStepAngle);
                mgraphics.ellipse(sequenceStepCenterX - gridStepRadius, sequenceStepCenterY - gridStepRadius, gridStepRadius * 2, gridStepRadius * 2);
                mgraphics.fill();
            }
        } else {
            let sequenceStepAngle = (Math.PI / 2) - (pointerDownAtGridStep * ((2 * Math.PI) / 16));
            let sequenceStepCenterX = gridStepTrackRadius * Math.cos(sequenceStepAngle);
            let sequenceStepCenterY = gridStepTrackRadius * Math.sin(sequenceStepAngle);
            mgraphics.ellipse(sequenceStepCenterX - gridStepRadius, sequenceStepCenterY - gridStepRadius, gridStepRadius * 2, gridStepRadius * 2);
            mgraphics.fill();
        }
    }

    // Draw sequence steps.
    for (const sequenceStep of sequence.steps) {
        if (sequenceStep.duration == 1) {
            let sequenceStepAngle = (Math.PI / 2) - (sequenceStep.startGridStep * ((2 * Math.PI) / 16));
            let sequenceStepCenterX = gridStepTrackRadius * Math.cos(sequenceStepAngle);
            let sequenceStepCenterY = gridStepTrackRadius * Math.sin(sequenceStepAngle);
            mgraphics.ellipse(sequenceStepCenterX - gridStepRadius, sequenceStepCenterY - gridStepRadius, gridStepRadius * 2, gridStepRadius * 2);
            mgraphics.set_source_rgba(1, 1, 0, 1);
            mgraphics.fill();
        } else {
            let sequenceStepStartAngle = (Math.PI / 2) - (sequenceStep.startGridStep * ((2 * Math.PI) / 16));
            let sequenceStepEndAngle = (Math.PI / 2) - (sequenceStep.endGridStep * ((2 * Math.PI) / 16));
            mgraphics.arc_negative(0, 0, gridStepTrackRadius, sequenceStepStartAngle, sequenceStepEndAngle);
            mgraphics.set_line_width(2 * gridStepRadius);
            mgraphics.set_line_cap("round");
            mgraphics.set_source_rgba(1, 1, 0, 1);
            mgraphics.stroke();
        }
    }
}

function onpointerdown(pointerEvent) {
    pointerDownAtGridStep = getGridStepAtPointerEvent(pointerEvent);
    mgraphics.redraw();
}

function onpointerup(pointerEvent) {
    if (pointerDownAtGridStep == -1) {
        mgraphics.redraw();
        return;
    }

    let pointerUpAtGridStep = getGridStepAtPointerEvent(pointerEvent);
    if (pointerUpAtGridStep == -1) {
        pointerDownAtGridStep = -1;
        mgraphics.redraw();
        return;
    }

    if (pointerDownAtGridStep == pointerUpAtGridStep) {
        let sequenceStep = sequence.getStep(pointerDownAtGridStep);
        if (sequenceStep && sequenceStep.duration == 1) {
            sequence.removeStep(sequenceStep);
        } else {
            sequence.addStep(new Sequence.Step(pointerDownAtGridStep, pointerDownAtGridStep, 60, 127));
        }
    } else {
        let startGridStep = Math.min(pointerDownAtGridStep, pointerUpAtGridStep);
        let endGridStep = Math.max(pointerDownAtGridStep, pointerUpAtGridStep);
        sequence.addStep(new Sequence.Step(startGridStep, endGridStep, 60, 127));
    }

    pointerDownAtGridStep = -1;
    movePointerEvent = null;
    mgraphics.redraw();
}

function onpointermove(pointerEvent) {
    if (pointerDownAtGridStep == -1) {
        return;
    }

    movePointerEvent = pointerEvent;
    mgraphics.redraw();
}

function msg_int(value) {
    let sequenceStep = sequence.getStep(value);
    if (sequenceStep) {
        outlet(0, sequenceStep.startGridStep, sequenceStep.duration, sequenceStep.midiVelocity, sequenceStep.midiPitch);
    } else {
        outlet(0, -1, -1, -1, -1);
    }
}

function getCartesianCoordinates(pointerEvent) {
    return { 
        x: pointerEvent.clientX - (mgraphics.size[0] / 2), 
        y: (mgraphics.size[1] / 2) - pointerEvent.clientY
    };
}
getCartesianCoordinates.local = 1;

function getGridStepAtPointerEvent(pointerEvent) {
    let pointerEventCoordinates = getCartesianCoordinates(pointerEvent);
    for (let i = 0; i < gridStepCenterCoordinates.length; i++) {
        let dx = pointerEventCoordinates.x - gridStepCenterCoordinates[i].x;
        let dy = pointerEventCoordinates.y - gridStepCenterCoordinates[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist < gridStepRadius) {
            return i;
        }
    }
    return -1;
}
getGridStepAtPointerEvent.local = 1;

function getNearestGridStepToPointerEvent(pointerEvent) {
    let pointerEventCoordinates = getCartesianCoordinates(pointerEvent);
    let nearestGridStep = -1;
    let nearestGridStepDistance = Number.MAX_VALUE;
    for (let i = 0; i < gridStepCenterCoordinates.length; i++) {
        let dx = pointerEventCoordinates.x - gridStepCenterCoordinates[i].x;
        let dy = pointerEventCoordinates.y - gridStepCenterCoordinates[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist < nearestGridStepDistance) {
            nearestGridStepDistance = dist;
            nearestGridStep = i;
        }
    }
    return nearestGridStep;
}
getNearestGridStepToPointerEvent.local = 1;