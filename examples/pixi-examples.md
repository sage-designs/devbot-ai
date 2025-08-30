# PixiJS Interactive Examples

This file contains example PixiJS code that can be used to test the PixiJS artifact system.

## Example 1: Animated Bouncing Ball

```javascript
// Create PixiJS application
const app = new Application();
await app.init({
  canvas,
  width: 800,
  height: 600,
  backgroundColor: 0x1099bb,
});

// Create a bouncing ball
const ball = new Graphics();
ball.circle(0, 0, 20);
ball.fill(0xff0000);

// Position the ball
ball.x = 100;
ball.y = 100;

// Ball velocity
let vx = 5;
let vy = 3;

// Add ball to stage
app.stage.addChild(ball);

// Animation loop
app.ticker.add((delta) => {
  // Update position
  ball.x += vx * delta;
  ball.y += vy * delta;

  // Bounce off walls
  if (ball.x <= 20 || ball.x >= 780) {
    vx = -vx;
  }
  if (ball.y <= 20 || ball.y >= 580) {
    vy = -vy;
  }
});
```

## Example 2: Interactive Sprite with Mouse Events

```javascript
// Create PixiJS application
const app = new Application();
await app.init({
  canvas,
  width: 800,
  height: 600,
  backgroundColor: 0x2c3e50,
});

// Create a colorful square
const square = new Graphics();
square.rect(-50, -50, 100, 100);
square.fill(0xe74c3c);
square.x = 400;
square.y = 300;

// Make it interactive
square.eventMode = 'static';
square.cursor = 'pointer';

// Add hover effects
square.on('pointerover', () => {
  square.scale.set(1.2);
  square.tint = 0x3498db;
});

square.on('pointerout', () => {
  square.scale.set(1);
  square.tint = 0xffffff;
});

// Add click effect
square.on('pointerdown', () => {
  square.rotation += Math.PI / 4;
});

// Add to stage
app.stage.addChild(square);

// Add text instructions
const text = new Text({
  text: 'Hover and click the square!',
  style: {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
  }
});
text.x = 250;
text.y = 50;
app.stage.addChild(text);
```

## Example 3: Particle System

```javascript
// Create PixiJS application
const app = new Application();
await app.init({
  canvas,
  width: 800,
  height: 600,
  backgroundColor: 0x000000,
});

// Particle container for better performance
const particles = new Container();
app.stage.addChild(particles);

// Particle array
const particleArray = [];

// Create particles
for (let i = 0; i < 100; i++) {
  const particle = new Graphics();
  particle.circle(0, 0, Math.random() * 3 + 1);
  particle.fill(Math.random() * 0xffffff);
  
  particle.x = Math.random() * 800;
  particle.y = Math.random() * 600;
  particle.vx = (Math.random() - 0.5) * 4;
  particle.vy = (Math.random() - 0.5) * 4;
  particle.life = Math.random() * 100 + 50;
  particle.maxLife = particle.life;
  
  particles.addChild(particle);
  particleArray.push(particle);
}

// Animation loop
app.ticker.add((delta) => {
  particleArray.forEach((particle, index) => {
    // Update position
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    
    // Update life
    particle.life -= delta;
    particle.alpha = particle.life / particle.maxLife;
    
    // Wrap around screen
    if (particle.x < 0) particle.x = 800;
    if (particle.x > 800) particle.x = 0;
    if (particle.y < 0) particle.y = 600;
    if (particle.y > 600) particle.y = 0;
    
    // Reset particle when life is over
    if (particle.life <= 0) {
      particle.x = Math.random() * 800;
      particle.y = Math.random() * 600;
      particle.life = particle.maxLife;
      particle.alpha = 1;
    }
  });
});
```

## Example 4: Interactive Drawing Canvas

```javascript
// Create PixiJS application
const app = new Application();
await app.init({
  canvas,
  width: 800,
  height: 600,
  backgroundColor: 0xffffff,
});

// Create drawing container
const drawingLayer = new Graphics();
app.stage.addChild(drawingLayer);

// Drawing state
let isDrawing = false;
let lastPoint = { x: 0, y: 0 };

// Make stage interactive
app.stage.eventMode = 'static';

// Mouse/touch events
app.stage.on('pointerdown', (event) => {
  isDrawing = true;
  const position = event.global;
  lastPoint = { x: position.x, y: position.y };
});

app.stage.on('pointermove', (event) => {
  if (!isDrawing) return;
  
  const position = event.global;
  
  // Draw line from last point to current point
  drawingLayer.moveTo(lastPoint.x, lastPoint.y);
  drawingLayer.lineTo(position.x, position.y);
  drawingLayer.stroke({ width: 3, color: 0x000000 });
  
  lastPoint = { x: position.x, y: position.y };
});

app.stage.on('pointerup', () => {
  isDrawing = false;
});

// Add instructions
const instructions = new Text({
  text: 'Click and drag to draw!',
  style: {
    fontFamily: 'Arial',
    fontSize: 20,
    fill: 0x333333,
  }
});
instructions.x = 10;
instructions.y = 10;
app.stage.addChild(instructions);

// Clear button
const clearButton = new Graphics();
clearButton.rect(0, 0, 80, 30);
clearButton.fill(0xff4444);
clearButton.x = 700;
clearButton.y = 10;
clearButton.eventMode = 'static';
clearButton.cursor = 'pointer';

const clearText = new Text({
  text: 'Clear',
  style: {
    fontFamily: 'Arial',
    fontSize: 16,
    fill: 0xffffff,
  }
});
clearText.x = 715;
clearText.y = 17;

clearButton.on('pointerdown', () => {
  drawingLayer.clear();
});

app.stage.addChild(clearButton);
app.stage.addChild(clearText);
```

## Example 5: Simple Game - Catch the Dots

```javascript
// Create PixiJS application
const app = new Application();
await app.init({
  canvas,
  width: 800,
  height: 600,
  backgroundColor: 0x34495e,
});

// Game state
let score = 0;
let gameTime = 30;
let gameRunning = true;

// Player (controlled by mouse)
const player = new Graphics();
player.circle(0, 0, 15);
player.fill(0x2ecc71);
player.x = 400;
player.y = 300;
app.stage.addChild(player);

// Dots to catch
const dots = [];

// UI
const scoreText = new Text({
  text: `Score: ${score}`,
  style: { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff }
});
scoreText.x = 10;
scoreText.y = 10;
app.stage.addChild(scoreText);

const timerText = new Text({
  text: `Time: ${gameTime}`,
  style: { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff }
});
timerText.x = 10;
timerText.y = 40;
app.stage.addChild(timerText);

// Mouse tracking
app.stage.eventMode = 'static';
app.stage.on('pointermove', (event) => {
  if (gameRunning) {
    player.x = event.global.x;
    player.y = event.global.y;
  }
});

// Create dots
function createDot() {
  const dot = new Graphics();
  dot.circle(0, 0, 8);
  dot.fill(0xe74c3c);
  dot.x = Math.random() * 800;
  dot.y = Math.random() * 600;
  dot.vx = (Math.random() - 0.5) * 4;
  dot.vy = (Math.random() - 0.5) * 4;
  
  app.stage.addChild(dot);
  dots.push(dot);
}

// Game timer
let gameTimer = 0;
let dotTimer = 0;

// Game loop
app.ticker.add((delta) => {
  if (!gameRunning) return;
  
  // Update timer
  gameTimer += delta;
  if (gameTimer >= 60) { // 1 second at 60fps
    gameTime--;
    gameTimer = 0;
    timerText.text = `Time: ${gameTime}`;
    
    if (gameTime <= 0) {
      gameRunning = false;
      const gameOverText = new Text({
        text: `Game Over! Final Score: ${score}`,
        style: { fontFamily: 'Arial', fontSize: 32, fill: 0xffffff }
      });
      gameOverText.x = 200;
      gameOverText.y = 300;
      app.stage.addChild(gameOverText);
    }
  }
  
  // Create new dots
  dotTimer += delta;
  if (dotTimer >= 120) { // Every 2 seconds
    createDot();
    dotTimer = 0;
  }
  
  // Update dots
  dots.forEach((dot, index) => {
    dot.x += dot.vx * delta;
    dot.y += dot.vy * delta;
    
    // Bounce off walls
    if (dot.x <= 8 || dot.x >= 792) dot.vx = -dot.vx;
    if (dot.y <= 8 || dot.y >= 592) dot.vy = -dot.vy;
    
    // Check collision with player
    const dx = dot.x - player.x;
    const dy = dot.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 23) { // Player radius + dot radius
      app.stage.removeChild(dot);
      dots.splice(index, 1);
      score++;
      scoreText.text = `Score: ${score}`;
    }
  });
});

// Start with some dots
for (let i = 0; i < 3; i++) {
  createDot();
}
```
