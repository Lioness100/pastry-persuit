// Oh how I wish I could use ES6 :(
preloadSounds();

var TileType = {
  Wall: 1,
  Exit: 2,
  Entrance: 3,
  Key: 4,
  Gap: 5,
};

var mazeWidth = 4;
var mazeHeight = 3;

var rows = 2 * mazeHeight + 1;
var cols = 2 * mazeWidth + 1;

var maze;
var player;
var entrance;
var exit;
var bonus;
var walls = createGroup();
var vines = createGroup();
var decors = createGroup();
var boxes = createGroup();
var exitColumn;
var levelSprites = [];
var level = 0;
var frameCount = 0;
var unlocked = false;
var transitionFrames = 0;

var ingredientIds = ["flour", "baking soda", "baking powder", "butter", "sugar", "egg", "vanilla"];
var ingredientIdx = 0;

var inventory = [0, 0, 0, 0, 0, 0, 0, 0, 0];

var bar = createSprite(200, 375, 400, 70);
bar.setAnimation("bar");

// Map ingredients to sprites.
var barItems = ["cookie"].concat(ingredientIds.concat(["rot"])).map(function (id, i) {
  var sprite = createSprite(140 + i * 29, 375, 50, 50);
  sprite.setAnimation(id);
  sprite.pause();
  sprite.setFrame(3);
  sprite.scale = i ? 0.6 : 0.5;
  return sprite;
});

var overBarItems = createSprite(255, 375, 270, 38);
overBarItems.shapeColor = "rgba(0, 0, 0, 0.25)";

generateMaze();
display();

var heldKey = createSprite(player.x + 20, player.y + 10, 10, 10);
heldKey.scale = 0.5;

setAnimations();

// Note: this speeds up the timer & the speed
World.frameRate = 60;

var font = loadFont("https://studio.code.org/v3/assets/BHRMtYzqUNOuPC2daf0IQw_cD9CXf88criQkd7VZ3ws/04B_03__.png");
textFont(font);
noStroke();

showMobileControls(false, true, false, true);
playSound("Jingle-bell-Rock--Christmas-in-8-bit.mp3", true);

var book = createSprite(200, 200, 400, 400);
book.setAnimation("cookie display");

var selectingCookie = true;
var cookieIdx = -1;

var hasMoved = false;
var hasClaimedRot = false;
var gameOver = false;
var isTransitioningToGameOver = false;
var isPaused = false;

// Update and display screen.
function draw() {
  // Cookie select screen.
  if (selectingCookie) {
    drawSprites();
    textAlign(CENTER, CENTER);
    textSize(30);
    
    var color = World.seconds % 2 !== 0 ? "black" : "white";
    fill(color);
    text(recipes[cookieIdx].name, 200, 55);
    
    textAlign(LEFT, TOP);
    textSize(15);
    
    var ingredients = recipes[cookieIdx].ingredients.join("\n");
    fill("black");
  
    text(ingredients, 20, 135);
    
    if (keyWentDown("right")) {
      cookieIdx = (cookieIdx + 1) % recipes.length;
    } else if (keyWentDown("left")) {
      cookieIdx = cookieIdx === 0 ? recipes.length - 1 : cookieIdx - 1;
    }
    
    if (keyWentDown(ENTER)) {
      book.visible = false;
      selectingCookie = false;
      stopSound();
      playSound("We-Wish-You-A-Merry-Christmas---Christmas-in-8-bit.mp3", true);
    }
  // Game over screen.
  } else if (gameOver) {
    if (isTransitioningToGameOver) {
      return;
    }

    book.visible = true;
    book.x = camera.x;
    book.y = camera.y;

    book.depth = player.depth + 100;

    drawSprites();
    
    textAlign(CENTER, CENTER);
    textSize(25);
    
    var color = World.seconds % 2 !== 0 ? "black" : "white";
    fill(color);
    text("You made " + inventory[0] + " cookies!", 200, 55 - 200 + camera.y);
    
    textAlign(LEFT, TOP);
    textSize(20);
    
    fill("black");
    text("Have a happy holidays!\nSpend time with your family!\nBake cookies!!", 20, 135 - 200 + camera.y);
  // Game screen.
  } else {
    textAlign(LEFT, CENTER);
    bar.y = camera.y + 175;
  
    if (hasMoved) {
      frameCount++;
    }

    background("#89CFF0");
    player.collide(walls);
  
    if (!unlocked) {
      player.collide(exit);
    }
  
    heldKey.depth = player.depth + 1;
    bar.depth = player.depth + 2;
    
    for (var i = 0; i < barItems.length; i++) {
      barItems[i].depth = player.depth + 3;
      barItems[i].y = camera.y + 175;
    }
    
    overBarItems.depth = player.depth + 4;
    overBarItems.y = camera.y + 175;

    if (transitionFrames) {
      transitionFrames--;
      camera.y -= 10;
    }
  
    drawSprites();
  
    var timeLeft = 5 - frameCount / 60;
    var color = generateColorFromTime(timeLeft);
  
    textSize(40);
    fill(color);
    text(Math.max(0, timeLeft).toFixed(2), 18, 173 + camera.y + (transitionFrames ? 10 : 0));
  
    textSize(20);
    fill("white");

    for (var i = 0; i < inventory.length; i++) {
      text(inventory[i], 135 + i * 29, 175 + camera.y + (transitionFrames ? 10 : 0));
    }
  
    if (keyDown("space")) {
      textSize(20);
      fill("white");
      text("FPS: " + World.frameRate.toFixed(0) + "\nTarget: 60", 275, 375 - 400 * level + 50 * level);
    }
    
    if (timeLeft < 0 && !hasClaimedRot) {
      playSound("sound://category_alerts/cartoon_negative_bling.mp3");

      hasClaimedRot = true;
      heldKey.setAnimation("rot");
      bonus.setAnimation("rot");

      if (heldKey.visible) {
        inventory[8]++;
        inventory[ingredientIdx + 1]--;
      }
      
      if (inventory[8] === (heldKey.visible ? 5 : 4)) {
        background("#89CFF0");
        drawSprites();
        stopSound();

        playSound("sound://category_music/gameover.mp3", false);
        setTimeout(function() {
          playSound("Silver-Bells---Chrstmas-in-8-bit.mp3", true);
          isTransitioningToGameOver = false;
        }, 3500);

        isTransitioningToGameOver = true;
        gameOver = true;
        return;
      }
    }
  
    if (player.isTouching(bonus)) {
      inventory[hasClaimedRot ? 8 : ingredientIdx + 1]++;
      heldKey.visible = true;
      bonus.destroy();
      exit.play();
      unlocked = true;
      playSound("sound://category_achievements/bubbly_game_achievement_sound.mp3");
    } else if (player.isTouching(exit)) {
      playSound("sound://category_achievements/puzzle_game_achievement_01.mp3");
      transitionFrames = 35;
  
      if (!hasClaimedRot) {
        ingredientIdx++;
        if (ingredientIdx > ingredientIds.length - 1) {
          inventory = [inventory[0] + 1, 0, 0, 0, 0, 0, 0, 0, inventory[8]];
          ingredientIdx = 0;
        }
      }

      level++;
      generateMaze();
      display();
      setAnimations();
  
      frameCount = 0;
      unlocked = false;
      hasClaimedRot = false;
    }
  
    if (keyDown("left") || keyDown("a")) {
      player.x -= 5;
      hasMoved = true;
    }
  
    if (keyDown("right") || keyDown("d")) {
      player.x += 5;
      hasMoved = true;
    }
  
    if (keyDown("down") || keyDown("s")) {
      player.y += 5;
      hasMoved = true;
    }
  
    if (keyDown("up") || keyDown("w")) {
      player.y -= 5;
      hasMoved = true;
    }
    
    if (keyWentDown("space")) {
      hasMoved = false;
      isPaused = true;
    }
    
    if (isPaused && hasMoved) {
      isPaused = false;
    }
    
    if (isPaused) {
      fill("rgba(0, 0, 0, 0.4)");
      rect(0, camera.y - 200, 400, 400);

      fill("rgba(255, 255, 255, 0.8)");
      textAlign(CENTER, CENTER);
      textSize(50);
      text("PAUSE", 200, camera.y);
    }
  
    if (heldKey) {
      heldKey.x = player.x + 20;
      heldKey.y = player.y + 10;
    }
  }
}

function generateColorFromTime(time) {
  var r = Math.min(255, 255 * 2 * (1 - time / 5));
  var g = Math.min(255, 255 * 2 * (time / 5));
  var b = 0;

  return rgb(r, g, b);
}

// Animations have to be reset each time new elements are added (every level)
function setAnimations() {
  walls.setAnimationEach("tile2");
  vines.setAnimationEach("vine");
  decors.setAnimationEach("decor" + (Math.random() < 0.5 ? 1 : 2));
  boxes.setAnimationEach("box");
  exit.setAnimation("exit");
  bonus.setAnimation(ingredientIds[ingredientIdx]);
  heldKey.setAnimation(ingredientIds[ingredientIdx]);

  exit.pause();
  heldKey.visible = false;
}

// Create a 2d array for the grid.
function fillGrid(cb) {
  return Array.apply(null, Array(rows)).map(function (row, r) {
    return Array.apply(null, Array(cols)).map(function (col, c) {
      return cb ? cb(r, c) : undefined;
    });
  });
}

function generateMaze() {
  maze = fillGrid(function (r, c) {
    if (!r || r === rows - 1) {
      return TileType.Wall;
    }

    if (r % 2 == 1) {
      if (!c || c == cols - 1) {
        return TileType.Wall;
      }
    } else if (c % 2 == 0) {
      return TileType.Wall;
    }

    return TileType.Gap;
  });

  var exitColumn2 = columnsToSpace(randomNumber(1, mazeWidth));
  maze[0][exitColumn2] = TileType.Exit;

  var entranceColumn = exitColumn || columnsToSpace(randomNumber(1, mazeWidth));
  maze[rows - 1][entranceColumn] = TileType.Entrance;

  partition(1, mazeHeight - 1, 1, mazeWidth - 1);

  var loc = getKeyLocation();
  maze[loc[0]][loc[1]] = TileType.Key;

  return maze;
}

function columnsToSpace(x) {
  return 2 * (x - 1) + 1;
}

function columnsToWall(x) {
  return 2 * x;
}

function shuffle(array) {
  // https://stackoverflow.com/a/12646864
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
}

// Create maze
function partition(r1, r2, c1, c2) {
  // https://en.wikipedia.org/wiki/Maze_generation_algorithm#Recursive_division_method

  var horiz, vert, x, y, start, end;

  if (r2 < r1 || c2 < c1) {
    return false;
  }

  if (r1 == r2) {
    horiz = r1;
  } else {
    x = r1 + 1;
    y = r2 - 1;
    start = Math.round(x + (y - x) / 4);
    end = Math.round(x + (3 * (y - x)) / 4);
    horiz = randomNumber(start, end);
  }

  if (c1 == c2) {
    vert = c1;
  } else {
    x = c1 + 1;
    y = c2 - 1;
    start = Math.round(x + (y - x) / 3);
    end = Math.round(x + (2 * (y - x)) / 3);
    vert = randomNumber(start, end);
  }

  for (var i = columnsToWall(r1) - 1; i <= columnsToWall(r2) + 1; i++) {
    for (var j = columnsToWall(c1) - 1; j <= columnsToWall(c2) + 1; j++) {
      if (i == columnsToWall(horiz) || j == columnsToWall(vert)) {
        maze[i][j] = TileType.Wall;
      }
    }
  }

  var gaps = shuffle([true, true, true, false]);

  if (gaps[0]) {
    var gapPosition = randomNumber(c1, vert);
    maze[columnsToWall(horiz)][columnsToSpace(gapPosition)] = TileType.Gap;
  }

  if (gaps[1]) {
    var gapPosition = randomNumber(vert + 1, c2 + 1);
    maze[columnsToWall(horiz)][columnsToSpace(gapPosition)] = TileType.Gap;
  }

  if (gaps[2]) {
    var gapPosition = randomNumber(r1, horiz);
    maze[columnsToSpace(gapPosition)][columnsToWall(vert)] = TileType.Gap;
  }

  if (gaps[3]) {
    var gapPosition = randomNumber(horiz + 1, r2 + 1);
    maze[columnsToSpace(gapPosition)][columnsToWall(vert)] = TileType.Gap;
  }

  // Recursively partition newly created chambers.
  partition(r1, horiz - 1, c1, vert - 1);
  partition(horiz + 1, r2, c1, vert - 1);
  partition(r1, horiz - 1, vert + 1, c2);
  partition(horiz + 1, r2, vert + 1, c2);
}

// Find the number of steps to get from point A to stop
function countSteps(array, r, c, val, stop) {
  if (!maze[r] || !maze[r][c]) {
    return false;
  }

  // Shorter route already mapped.
  if (array[r][c] <= val) {
    return false;
  }

  if ([TileType.Entrance, TileType.Exit, TileType.Gap].indexOf(maze[r][c]) === -1) {
    return false;
  }

  array[r][c] = val;

  if (maze[r][c] === stop) {
    return true;
  }

  countSteps(array, r - 1, c, val + 1, stop);
  countSteps(array, r, c + 1, val + 1, stop);
  countSteps(array, r + 1, c, val + 1, stop);
  countSteps(array, r, c - 1, val + 1, stop);
}

// Find the tile with the highest sum of steps from the exit and entrance; put the key there.
function getKeyLocation() {
  var fromEntrance = fillGrid();
  var fromExit = fillGrid();

  var totalSteps = -1;

  for (var j = 1; j < cols - 1; j++) {
    if (maze[rows - 1][j] === TileType.Entrance) {
      countSteps(fromEntrance, rows - 1, j, 0, TileType.Exit);
    }

    if (maze[0][j] === TileType.Exit) {
      countSteps(fromExit, 0, j, 0, TileType.Entrance);
    }
  }

  var fc = -1;
  var fr = -1;

  for (var i = 0; i < maze.length; i++) {
    for (var j = 0; j < maze[i].length; j++) {
      if (typeof fromEntrance[i][j] === "undefined") {
        continue;
      }

      var stepCount = fromEntrance[i][j] + fromExit[i][j];
      if (stepCount > totalSteps) {
        fr = i;
        fc = j;
        totalSteps = stepCount;
      }
    }
  }

  return [fr, fc];
}

// Display sprites for mazes
function display() {
  if (levelSprites[level - 2]) {
    levelSprites[level - 2].destroyEach();
  }

  if (!levelSprites[level]) {
    levelSprites[level] = createGroup();
  }

  if (!levelSprites[level + 1]) {
    levelSprites[level + 1] = createGroup();
  }

  var sprites = levelSprites[level];
  var nextSprites = levelSprites[level + 1];

  if (level === 0) {
    for (var i = 0; i < 9; i++) {
      var wall = createSprite(i * 50, 7 * 50 + 25 - 400 * level, 50, 50);
      walls.add(wall);
      sprites.add(wall);
    }
  }

  for (var r = 0; r < maze.length; r++) {
    var row = maze[r];
    var decor = false;
    for (var c = 0; c < row.length; c++) {
      var cell = row[c];
      var y = r * 50 + 25 - 400 * level + 50 * level;

      switch (cell) {
        case TileType.Wall: {
          var wall = createSprite(c * 50, y, 50, 50);
          walls.add(wall);

          if (r) {
            sprites.add(wall);
          } else {
            nextSprites.add(wall);
          }

          break;
        }
        case TileType.Entrance: {
          entrance = createSprite(c * 50, y, 50, 50);
          entrance.depth = 3;
          entrance.shapeColor = level ? "green" : "red";
          sprites.push(entrance);

          if (!player) {
            player = createSprite(c * 50, y, 30, 30);
            player.setAnimation("elf.jpg");
          }

          break;
        }
        case TileType.Exit: {
          exitColumn = c;
          exit = createSprite(c * 50, y, 50, 50);
          nextSprites.add(exit);
          break;
        }
        case TileType.Key: {
          bonus = createSprite(c * 50, y, 50, 50);
          sprites.add(bonus);
          break;
        }
        case TileType.Gap: {
          if ((!maze[r + 1] || maze[r + 1][c] === TileType.Wall) && Math.random() < 0.1) {
            var box = createSprite(c * 50 + randomNumber(-10, 10), y, 50, 50);
            boxes.add(box);
            sprites.add(box);
          }

          if (r && maze[r - 1][c] === TileType.Wall && Math.random() < 0.2) {
            var vine = createSprite(c * 50 + randomNumber(-10, 10), y - 15, 25, 25);
            vines.add(vine);
            sprites.add(vine);
          }
          
          if (row[c - 1] === TileType.Gap && row[c + 1] === TileType.Gap && (!maze[r + 1] || (maze[r + 1][c - 1] === TileType.Wall && maze[r + 1][c] === TileType.Wall && maze[r + 1][c + 1] === TileType.Wall)) && !decor && Math.random() < 0.3) {
            decor = true;
            var newDecor = createSprite(c * 50, y, 150, 50);
            decors.add(newDecor);
            sprites.add(newDecor);
          }
          
          break;
        }
      }
    }
  }

  player.depth += sprites.length + 1;
}

// Loop through sounds, load them, and immediately stop them.
function preloadSounds() {
  var sounds = [
    "We-Wish-You-A-Merry-Christmas---Christmas-in-8-bit.mp3",
    "sound://category_alerts/cartoon_negative_bling.mp3",
    "Silver-Bells---Chrstmas-in-8-bit.mp3",
    "sound://category_music/gameover.mp3",
    "sound://category_achievements/puzzle_game_achievement_01.mp3",
    "sound://category_achievements/bubbly_game_achievement_sound.mp3"
  ];
  
  sounds.forEach(function(sound) {
    playSound(sound, false, function() {
      console.log("preloaded " + sound);
      stopSound(sound);
    });
  });
}

var recipes = [
    {
      name: "Classic Sugar Cookies",
      ingredients: [
        "2 3/4 cups all-purpose flour",
        "1 teaspoon baking soda",
        "1/2 teaspoon baking powder",
        "1 cup unsalted butter, softened",
        "1 1/2 cups granulated sugar",
        "1 large egg",
        "1 teaspoon vanilla extract",
        "1/4 cup granulated sugar (for rolling)"
      ]
    },
    {
      name: "Gingerbread Cookies",
      ingredients: [
        "3 cups all-purpose flour",
        "1 1/2 teaspoons baking powder",
        "3/4 teaspoon baking soda",
        "1/4 teaspoon salt",
        "1 tablespoon ground ginger",
        "1 3/4 teaspoons ground cinnamon",
        "1/2 teaspoon ground cloves",
        "6 tablespoons unsalted butter, softened",
        "3/4 cup dark brown sugar, packed",
        "1 large egg",
        "1/2 cup molasses"
      ]
    },
    {
      name: "Peppermint Chocolate",
      ingredients: [
        "2 1/4 cups all-purpose flour",
        "1/2 teaspoon baking soda",
        "1 cup unsalted butter, softened",
        "1/2 cup granulated sugar",
        "1 cup packed light-brown sugar",
        "1 teaspoon salt",
        "2 teaspoons pure vanilla extract",
        "2 large eggs",
        "2 cups semisweet and/or milk chocolate chips",
        "1 cup crushed peppermint candies"
      ]
    },
        {
      name: "Chocolate Peppermint",
      ingredients: [
        "2 cups all-purpose flour",
        "1/2 cup unsweetened cocoa powder",
        "1 teaspoon baking soda",
        "1/2 teaspoon salt",
        "1 cup unsalted butter, softened",
        "1 cup granulated sugar",
        "1 cup packed brown sugar",
        "2 large eggs",
        "1 teaspoon vanilla extract",
        "1 cup chocolate chips",
        "1 cup crushed peppermint candies"
      ]
    },
    {
      name: "Cranberry Orange",
      ingredients: [
        "2 cups all-purpose flour",
        "1/2 cup powdered sugar",
        "1 cup unsalted butter, softened",
        "1/2 cup dried cranberries",
        "1 tablespoon orange zest",
        "1/2 teaspoon vanilla extract",
        "1/4 teaspoon salt"
      ]
    },
    {
      name: "Almond Snowball",
      ingredients: [
        "1 cup unsalted butter, softened",
        "1/2 cup powdered sugar",
        "1 teaspoon almond extract",
        "2 1/4 cups all-purpose flour",
        "1/4 teaspoon salt",
        "1 cup finely chopped almonds",
        "Additional powdered sugar for rolling"
      ]
    },
    {
      name: "Peanut Butter Reindeer",
      ingredients: [
        "1/2 cup unsalted butter, softened",
        "1/2 cup granulated sugar",
        "1/2 cup packed brown sugar",
        "1/2 cup creamy peanut butter",
        "1 large egg",
        "1 teaspoon vanilla extract",
        "1 3/4 cups all-purpose flour",
        "1/2 teaspoon baking soda",
        "1/2 teaspoon salt",
        "Mini pretzels for decorating"
      ]
    },
    {
      name: "Macadamia Nut Cookies",
      ingredients: [
        "1 cup unsalted butter, softened",
        "1 cup granulated sugar",
        "1 cup packed brown sugar",
        "2 large eggs",
        "1 teaspoon vanilla extract",
        "3 cups all-purpose flour",
        "1 teaspoon baking soda",
        "1/2 teaspoon salt",
        "1 1/2 cups white chocolate chips",
        "1 cup chopped macadamia nuts"
      ]
    },
    {
      name: "Maple Pecan Cookies",
      ingredients: [
        "1 cup unsalted butter, softened",
        "1 cup packed brown sugar",
        "1/4 cup pure maple syrup",
        "2 large eggs",
        "1 teaspoon vanilla extract",
        "3 cups all-purpose flour",
        "1 teaspoon baking soda",
        "1/2 teaspoon salt",
        "1 1/2 cups chopped pecans"
      ]
    },
    {
      name: "Oatmeal Raisin Cookies",
      ingredients: [
        "1 cup unsalted butter, softened",
        "1 cup packed brown sugar",
        "1/2 cup granulated sugar",
        "2 large eggs",
        "1 teaspoon vanilla extract",
        "1 1/2 cups old-fashioned oats",
        "1 1/2 cups all-purpose flour",
        "1/2 teaspoon baking soda",
        "1/2 teaspoon cinnamon",
      "1/2 teaspoon salt",
      "1 cup raisins"
    ]
  }
];
  
recipes[-1] = { 
  name: "Your Mission",
  ingredients: ["You forgot to bake Santa cookies!\n7 billion people remember, but you,\nhis closest friend, don't??\n\nStart baking, and quick! Before he leaves\nor the ingredients oxidize!\n\nFirst, pick your cookie using arrow keys.\nWhen you finish, press ENTER."] 
};
