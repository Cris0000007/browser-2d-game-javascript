var { Engine, World, Bodies, Body, Runner } = Matter;

var engine;
var world;
var balls = [];
var pockets = [];
var cueBall;
var cue = { power: 0, angle: 0, maxPower: 5, isVisible: true };
var isCharging = false;
var score = 0;

// Table and ball size calculations
var tableLength = 800; // Table length
var tableWidth = tableLength / 2; // Table width
var ballDiameter = tableWidth / 36; // Ball diameter
var pocketDiameter = 1.5 * ballDiameter; // Adjusted pocket size
var velocityBar = { x: 500, y: tableWidth +90, width: 300, height: 20, min: 0, max: 5, value: 2 };
var allBalls = []; // Keeps track of all balls, including pocketed ones


function setupPocketsWithCollision() {
  pockets = []; // Reset pockets array

  const adjustedPocketDiameter = ballDiameter * 2; // Increase the pocket size to 2x the ball diameter
  const pocketPositions = [
    { x: 50, y: 50 },
    { x: tableLength - 50, y: 50 },
    { x: 50, y: tableWidth + 50 },
    { x: tableLength - 50, y: tableWidth + 50 },
    { x: tableLength / 2, y: 50 },
    { x: tableLength / 2, y: tableWidth + 50 },
  ];

  pocketPositions.forEach((pos) => {
    const pocketBody = Bodies.circle(pos.x, pos.y, adjustedPocketDiameter / 2, {
      isStatic: true,
      isSensor: true,
    });

    pockets.push({ x: pos.x, y: pos.y, r: adjustedPocketDiameter / 2, body: pocketBody });
    World.add(world, pocketBody);
  });
}



function setup() {
  createCanvas(900,600);

  engine = Engine.create();
  engine.world.gravity.y = 0; // Disable gravity
  world = engine.world;

  setupTable();
  setupBalls();
  setupPocketsWithCollision();

  cue.maxPower = velocityBar.max; // Sync cue power with velocity bar

  const runner = Runner.create();
  Runner.run(runner, engine);
}


function draw() {
  background(255,248,220);

  drawTable();
  drawPockets();
  drawBalls();
  drawCue(); // Draw the cue stick
  drawScore();
  drawInstructions();               drawVelocityBar(); // Render the velocity bar


  handleBallPocketing();
  handleCueInteraction();
  handleWallCollisions(); // Handle ball-wall collisions
}

// Setup the table with edges
function setupTable() {
  const wallThickness = 10; // Adjusted thickness of the walls
  const tableEdges = [
    // Top and bottom walls
    Bodies.rectangle(tableLength / 2, 50, tableLength, wallThickness, { isStatic: true, restitution: 1 }),
    Bodies.rectangle(tableLength / 2, tableWidth + 50, tableLength, wallThickness, { isStatic: true, restitution: 1 }),

    // Left and right walls
    Bodies.rectangle(50, tableWidth / 2 + 50, wallThickness, tableWidth, { isStatic: true, restitution: 1 }),
    Bodies.rectangle(tableLength - 50, tableWidth / 2 + 50, wallThickness, tableWidth, { isStatic: true, restitution: 1 }),
  ];

  World.add(world, tableEdges);
}


// Setup the balls (cue ball and others)
function setupBalls() {
  const addBall = (x, y, color) => {
    const isCueBall = color === "white";
    const ball = Bodies.circle(x, y, ballDiameter / 2, {
      restitution: 0.9,
      friction: 0.01,
      frictionAir: isCueBall ? 0.02 : 0.005,
      render: { fillStyle: color },
    });
    balls.push(ball);
    allBalls.push(ball); // Add to the master array
    World.add(world, ball);
  };

  // Add cue ball, special balls, and red balls as usual
  addBall(160, tableWidth / 2 + 50, "white");
  cueBall = balls[0];

  const specialPositions = [
    { x: 200, y: tableWidth / 2, color: "yellow" },
    { x: 200, y: tableWidth / 2 + 50, color: "pink" },
    { x: 200, y: tableWidth / 2 + 100, color: "green" },
  ];
  specialPositions.forEach((pos) => addBall(pos.x, pos.y, pos.color));

  let xStart = tableLength - 300;
  let yStart = tableWidth / 2 + 50;
  let rows = 5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      const x = xStart + row * ballDiameter * 0.9;
      const y = yStart + (col - row / 2) * ballDiameter * 1.1;
      addBall(x, y, "red");
    }
  }
}



function handlePocketedBall(ball) {
  if (ball === cueBall) {
    resetCueBall();
  } else {
    score += ball.render.fillStyle === "red" ? 1 : 2;
    balls.splice(balls.indexOf(ball), 1); // Remove from the active array
    World.remove(world, ball); // Remove from physics world
  }
}




// Draw the table
function drawTable() {
  // Outer Border
  fill(255); 
  stroke(165,42,42); // White outer outline
  strokeWeight(10);
  rect(45, 45, tableLength - 90, tableWidth + 10); // Outer frame

  // Green Surface
  fill(0, 100, 0); // Snooker green
  noStroke();
  rect(50, 50, tableLength - 100, tableWidth);

  // Baulk Line
  stroke(255); // White for lines
  strokeWeight(2);
  line(200, 50, 200, tableWidth + 50); // Baulk line

  // "D" Zone
  noFill();
  arc(200, tableWidth / 2 + 50, 100, 100, HALF_PI, -HALF_PI); // Half-circle

}




// Draw the pockets
function drawPockets() {
  pockets.forEach((pocket) => {
    fill(0); // Black color for pockets
    noStroke();
    ellipse(pocket.x, pocket.y, pocket.r * 2); // Draw pocket
  });
}


// Draw the balls
function drawBalls() {
  noStroke();
  balls.forEach(ball => {
    const { position } = ball;
    fill(ball.render.fillStyle);
    ellipse(position.x, position.y, ballDiameter);
  });
}

// Draw the cue stick
function drawCue() {
  if (cue.isVisible) {
    stroke(178, 34, 34); // Cue stick color
    strokeWeight(10);

    const cueLength = 350;
    const dx = cueLength * cos(cue.angle);
    const dy = cueLength * sin(cue.angle);

    // Position the cue stick relative to the ball
    line(
      cueBall.position.x - dx * 0.3, // Start closer to the ball
      cueBall.position.y - dy * 0.3,
      cueBall.position.x - dx * 0.8, // Extend backward independently
      cueBall.position.y - dy * 0.8
    );
  }
}


// Draw the score
function drawScore() {
  noStroke();
  fill(0);
  textSize(20);
  textAlign(LEFT);                                                                                                                             textFont('Courier New');
  text(`Score: ${score}`, 20, tableWidth + 100); // Below the table
}

//Velocity Bar
function drawVelocityBar() {
  // Bar background
  noStroke();
  fill(0);
  rect(velocityBar.x, velocityBar.y, velocityBar.width, velocityBar.height);

  // Filled part indicating the current power
  fill(233,150,122);
  const filledWidth = map(velocityBar.value, velocityBar.min, velocityBar.max, 0, velocityBar.width);
  rect(velocityBar.x, velocityBar.y, filledWidth, velocityBar.height);

  // Text labels
  fill(0);
  textSize(16);
  textAlign(LEFT);                 textFont('Courier New');
  text("Power", velocityBar.x - 50, velocityBar.y + velocityBar.height / 2 + 5);
  textAlign(CENTER);
  text(velocityBar.value.toFixed(1), velocityBar.x + velocityBar.width / 2, velocityBar.y - 10);
}


// Draw instructions outside the table
function drawInstructions() {
  noStroke();
  fill(0);
  textSize(16);
  textAlign(CENTER);                               textFont('Courier New');
  text("1: Reset Balls | 2: Random All Balls | 3: Random Red Balls", tableLength / 2, tableWidth + 150); // Below the table
  text("Arrow Keys: Adjust Cue Angle | Spacebar: Shoot Cue Ball", tableLength / 2, tableWidth + 170); // Below the table
}

// Handle ball pocketing
function handleBallPocketing() {
  balls.forEach((ball) => {
    pockets.forEach((pocket) => {
      const d = dist(ball.position.x, ball.position.y, pocket.x, pocket.y);

      // Increase detection range for pocketing
      if (d < pocket.r + ballDiameter * 0.75) { // Easier pocketing by allowing a buffer
        handlePocketedBall(ball); // Delegate to handlePocketedBall
      }
    });
  });
}





// Handle collisions with table walls
function handleWallCollisions() {
    balls.forEach(ball => {
        // Adjusting wall boundaries to ensure balls stay within the table
        const leftLimit = 60;
        const rightLimit = tableLength - 60;
        const topLimit = 60;
        const bottomLimit = tableWidth + 40;

        if (ball.position.x < leftLimit || ball.position.x > rightLimit) {
            Body.setVelocity(ball, {
                x: -ball.velocity.x * 0.8, // Adjusted restitution
                y: ball.velocity.y
            });
            Body.setPosition(ball, {
                x: constrain(ball.position.x, leftLimit, rightLimit),
                y: ball.position.y
            });
        }

        if (ball.position.y < topLimit || ball.position.y > bottomLimit) {
            Body.setVelocity(ball, {
                x: ball.velocity.x,
                y: -ball.velocity.y * 0.8
            });
            Body.setPosition(ball, {
                x: ball.position.x,
                y: constrain(ball.position.y, topLimit, bottomLimit)
            });
        }
    });
}

// Cue interaction logic
function handleCueInteraction() {
  if (keyIsDown(32)) { // Charging the cue
    isCharging = true;
    cue.isVisible = true;
    cue.power = velocityBar.value; // Use velocity bar's value as the power
  } else if (isCharging) { // When Spacebar is released
    isCharging = false;

    // Apply scaled force
    const force = {
      x: cue.power * 0.02 * cos(cue.angle),
      y: cue.power * 0.02 * sin(cue.angle),
    };
    Body.applyForce(cueBall, cueBall.position, force);

    // Reset cue power
    cue.isVisible = false;
  }

  if (keyIsDown(LEFT_ARROW)) {
    cue.angle -= 0.03;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    cue.angle += 0.03;
  }
}



// Reset the cue ball to its starting position when pocketed
function resetCueBall() {
  Body.setPosition(cueBall, { x: 175, y: tableWidth / 2 + 50 }); // Centered in the "D" zone
  Body.setVelocity(cueBall, { x: -0.5, y: 0 });
}

// Reset all balls to initial positions
function resetBalls() {
  balls = [...allBalls]; // Restore all balls to the active array

  Body.setPosition(cueBall, { x: 160, y: tableWidth / 2 + 50 });
  Body.setVelocity(cueBall, { x: 0, y: 0 });

  const specialPositions = [
    { x: 200, y: tableWidth / 2  },
    { x: 200, y: tableWidth / 2 + 50 },
    { x: 200, y: tableWidth / 2 +100 },
  ];

  for (let i = 1; i <= 3; i++) {
    Body.setPosition(allBalls[i], specialPositions[i - 1]);
    Body.setVelocity(allBalls[i], { x: 0, y: 0 });
  }

  let xStart = tableLength - 300;
  let yStart = tableWidth / 2 + 50;
  let rows = 5;
  let ballIndex = 4;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      const x = xStart + row * ballDiameter * 0.9;
      const y = yStart + (col - row / 2) * ballDiameter * 1.1;
      Body.setPosition(allBalls[ballIndex], { x, y });
      Body.setVelocity(allBalls[ballIndex], { x: 0, y: 0 });
      ballIndex++;
    }
  }
}



// Randomize ball positions
function randomizeBalls(onlyRed = false) {
  balls = [...allBalls]; // Restore all balls to the active array

  allBalls.forEach((ball, index) => {
    if (!onlyRed || ball.render.fillStyle === "red") {
      Body.setPosition(ball, {
        x: random(250, tableLength - 250),
        y: random(100, tableWidth - 100),
      });
      Body.setVelocity(ball, { x: 0, y: 0 });
    }
  });
}


function mouseDragged() {
  if (
    mouseY > velocityBar.y &&
    mouseY < velocityBar.y + velocityBar.height &&
    mouseX > velocityBar.x &&
    mouseX < velocityBar.x + velocityBar.width
  ) {
    const newValue = map(mouseX, velocityBar.x, velocityBar.x + velocityBar.width, velocityBar.min, velocityBar.max);
    velocityBar.value = constrain(newValue, velocityBar.min, velocityBar.max);
  }
}

// Handle keypresses for interactions
function keyPressed() {
  if (key === '1') {
    resetBalls(); // Reset all balls to starting positions
    score = 0;    // Reset score
  } else if (key === '2') {
    randomizeBalls(false); // Randomize all balls
    score = 0;    // Reset score
  } else if (key === '3') {
    randomizeBalls(true); // Randomize only red balls
    score = 0;    // Reset score
  }
}



