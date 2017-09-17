window.addEventListener("load",function() {

var Q = window.Q = Quintus({audioSupported: [ 'wav','mp3' ]})
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio")
        .setup({ maximize: true })
        .controls().touch().enableSound();
        
        
var MAX_DISTANCE = Q.width/2.5; //Para mantener siempre una referencia a ellos


var MIN_SPEED = MAX_DISTANCE/2.5;
if(MIN_SPEED < 400){
  MIN_SPEED = 400;
}

var MAX_SPEED = 2 * MIN_SPEED;

var SPRITE_ENEMY = 1;
var SPRITE_PLAYER = 2;

Q.gravityY = 2000;

Q.highScore = 0;


//--- PLAYER
Q.Sprite.extend("Player",{

  init: function(p) {

    this._super(p,{
      sheet: "player",
      sprite: "player",
      x: 500,
      y: 570,
      collisionMask: SPRITE_ENEMY,
      standingPoints: [ [ 0, 11], [ 0, 9 ], [-8,-16], [8,-16], [6, 9 ], [ 4, 11 ]],
      duckingPoints : [ [ 0, 11], [ 0, 9 ], [-8,0], [8,0], [6, 9 ], [ 4, 11 ]],
      speed: MIN_SPEED * 1.2,
      jump: -555,
      slowed: 0,
      invincible: 0,
      scale: 2,
      speedBeforeInvincible: MIN_SPEED * 1.2,
      health: 100,
      invincibleDelay: 0.25,
      hasTurboEnabled: false
    });

    this.p.points = this.p.standingPoints;

    this.add("2d, animation");

    this.on("bump",function(collision) {
      if(collision.obj.isA("Walker") && this.p.health > 0) {
        this.p.health = 0;
        this.p.collisionMask = Q.SPRITE_NONE;
        this.p.type = 0;
        Q.stageScene("endGame",1, { label: "You Died" });
        Q.audio.play("die.wav");
      }
    });

    this.on("bump.right", function(collision){
      if(collision.obj.p.type == SPRITE_ENEMY && this.p.speed > MIN_SPEED && this.p.invincibleDelay <= 0
        && this.p.health > 0 && collision.obj.p.health > 0){
        var newSpeed = this.p.speed - this.p.speed/4;
        this.p.speed = newSpeed > MIN_SPEED ? newSpeed : MIN_SPEED;
        this.p.speedBeforeInvincible = this.p.speed;
        this.p.slowed = collision.obj.p.slowTime;
        this.trigger("hit_enemy", this);
      } else if(collision.obj.isA("Booster") && this.p.speed < 2*MAX_SPEED){
        this.p.speed += MAX_SPEED/4;
        this.p.speedBeforeInvincible = this.p.speed;
        Q.audio.play("boost.wav");
      }
    });

    this.on("bump.bottom", function(collision){
      if(collision.obj.p.type == SPRITE_ENEMY && this.p.slowed <= 0 && 
        collision.obj.p.health > 0 && !collision.obj.p.hasHit){
        Q.state.inc("enemiesKilled", 1);
        Q.state.inc("score",collision.obj.p.score);
        console.log("ENEMIES KILLED: " + Q.state.get("enemiesKilled"));
        if(!this.p.hasTurboEnabled && Q.state.get("enemiesKilled") % 5 == 0){
          this.p.hasTurboEnabled = true;
          Q.state.inc("turbo", 1);
        }
        collision.obj.p.health = 0;
        Q.audio.play("enemy_kill.wav");
      }
    });

    this.on("jump");
    this.on("jumped");
    this.on("hit_enemy");
    this.on("turbo");
  },

  jump: function(obj) {
    // Only play sound once.
    if (!obj.p.playedJump) {
      Q.audio.play('jump.wav');
      obj.p.playedJump = true;
    }
  },

  jumped: function(obj) {
    obj.p.playedJump = false;
  },

  hit_enemy: function(obj){
    Q.audio.play("hit_enemy.wav");
  },

  turbo: function(obj){
    Q.audio.play("turbo.wav");
  },

  dead: function(obj){
    Q.audio.play("die.wav");
  },

  step: function(dt) {
    if(this.p.invincible > 0){
      this.p.invincible -= dt;
      this.p.invincibleDelay = 0.25;
    } else if(this.p.invincibleDelay > 0){
      this.p.invincibleDelay -=dt;
    } else if(this.p.slowed > 0){
      this.p.slowed -= dt;
    } else if(this.p.health == 0){
      this.p.speed = 0;
    } else if(this.p.slowed <= 0){
      this.p.collisionMask = 1;
      this.p.speed = this.p.speedBeforeInvincible;
    }

    if(this.p.slowed <= 0){
      Q.state.inc("score",(this.p.speed/75)*dt);
    }

    if(this.p.health <= 0 && this.p.hasTurboEnabled){
      this.p.hasTurboEnabled = false;
      Q.state.inc("turbo", -1);
    }

    this.p.vx += (this.p.speed - this.p.vx)/4;

    if(this.p.y > 570) {
      this.p.y = 570;
      this.p.landed = 1;
      this.trigger("jumped", this);
      this.p.vy = 0;
    } else {
      this.p.landed = 0;
    }

    if(Q.inputs['up'] && this.p.landed > 0 && this.p.health > 0) {
      this.p.vy = this.p.jump;
      this.trigger("jump", this);
    }

    if(Q.inputs['right'] && this.p.speed < MAX_SPEED && this.p.slowed <= 0 && this.p.health > 0){
      this.p.speed += MIN_SPEED/100;
      this.p.speedBeforeInvincible = this.p.speed;
    } 

    if(Q.inputs['left'] && this.p.speed > MIN_SPEED && this.p.slowed <= 0 && this.p.health > 0){
      this.p.speed -= MIN_SPEED/100;
      this.p.speedBeforeInvincible = this.p.speed;
    }

    if(Q.inputs['fire'] && this.p.slowed <= 0 && this.p.hasTurboEnabled){
      this.p.speedBeforeInvincible = this.p.speed;
      this.p.speed = 3*MAX_SPEED;
      this.p.invincible = 3;
      this.p.collisionMask = Q.SPRITE_NONE;
      this.p.hasTurboEnabled = false;
      Q.state.inc("turbo", -1);
      this.trigger("turbo", this);
    }

    this.p.points = this.p.standingPoints;
    if(this.p.health == 0){
      this.play("die");
      this.p.speed = 0;
      this.p.y = 585;
      this.p.points = this.p.duckingPoints;
      this.p.type = 0;
    } else if (this.p.slowed > 0){
      this.play("hit_right");
    } else if(this.p.landed) {
      if(Q.inputs['down']) { 
        this.play("duck_right");
        this.p.points = this.p.duckingPoints;
      } else if(this.p.invincible > 0){
        this.play("turbo_right");
      } else if(this.p.speed > MAX_SPEED){
        this.play("run_right");
      } else {
        this.play("walk_right");
      }
    } else {
      this.play("jump_right");
    }

    this.stage.viewport.centerOn(this.p.x + 100, 400 );

  }
});

//--- ENEMIES AND BOOSTERS
Q.Sprite.extend("Enemy",{
  init: function(speed) {

    var enemyTypes = [ "skeleton", "skeleton2", "gargoyle" ];

    var eType = enemyTypes[Math.floor(Math.random() * 3)];
    var sheetName = "";
    var spriteName = "";
    var score = 0;
    var enemyScale = 1;
    var y = 585;
    var sTime = 1;
    switch(eType){
      case enemyTypes[0]:
        sheetName = "skeleton";
        spriteName = "skeleton";
        enemyScale = 1.5;
        score = 25;
        y = 585;
        sTime = 1.25;
        break;
      case enemyTypes[1]:
        sheetName = "skeleton2";
        spriteName = "skeleton2";
        enemyScale = 2;
        score = 50;
        y = 580;
        sTime = 0.75;
        break;
     default:
        sheetName = "gargoyle";
        spriteName = "gargoyle";
        enemyScale = 1.5;
        score = 100;
        sTime = 1;
        y = 535;
    }

    var player = Q("Player").first();
    this._super({
      x: player.p.x + Q.width + 50,
      y: y,
      initialY: y,
      frame: Math.random() < 0.5 ? 1 : 0,
      sheet: sheetName,
      sprite: spriteName,
      type: SPRITE_ENEMY,
      collisionMask: SPRITE_PLAYER,
      vx: -speed,
      vy: 0,
      ay: 0,
      score: score,
      scale: enemyScale,
      health: 100,
      delay: 1,
      delayHit: 0.25,
      hasHit: false,
      slowTime: sTime
    });

    this.add("2d, animation");

    this.on("bump.left", function(collision) {
      if(this.p.health > 0 && collision.obj.isA("Player") && collision.obj.p.health > 0){
        this.p.type = 0;
        this.p.collisionMask = Q.SPRITE_NONE;
        this.p.vx = 300;
        this.p.ay = 400;
        this.p.vy = -500;
        this.p.opacity = 0.5;
        this.p.hasHit = true;
        this.p.health = 0;
      } else {
        this.p.collisionMask = Q.SPRITE_NONE;
        this.p.type = 0;
      }
    });
  },

  step: function(dt) {
    this.p.x += this.p.vx * dt;
    this.p.y = this.p.initialY;
    this.p.vy = 0;
    if(this.p.y > 800) { 
      this.destroy(); 
    }

    if(this.p.health > 0 || this.p.hasHit){
      this.play("walk_left");
      if(this.p.hasHit){
        this.p.delayHit -= dt;
        if(this.p.delayHit <= 0){
          this.destroy();
        }
      }
    } else {
      this.play("die");
      this.p.vx = 0;
      this.p.delay -= dt;
      if(this.p.delay <= 0){
        this.destroy();
      }
    }
  },  
});

Q.Sprite.extend("Booster",{
  init: function(speed){
    var levels = [ 520, 540, 560 ];
    var y = levels[Math.floor(Math.random() * 3)];

    var player = Q("Player").first();
    this._super({
      x: player.p.x + Q.width + 50,
      y: y,
      initialY: y,
      frame: Math.random() < 0.5 ? 1 : 0,
      asset: "booster.png",
      collisionMask: SPRITE_PLAYER,
      vx: -speed,
      vy: 0,
      ay: 0,
      scale: 2,
      health: 100
    });

    this.add("2d, animations");

    this.on("bump", function(collision){
      if(collision.obj.isA("Player")){
        this.destroy();
      }
    });
  },

  step: function(dt){
    this.p.y = this.p.initialY
    this.p.vy = 0;
  },
});

//--- WALKERS
Q.Sprite.extend("Walker", {
  init: function(p){
    this._super(p,{
      sheet: "walkers",
      sprite: "walkers",
      x: 300,
      y: 575,
      speed: MIN_SPEED * 1.5,
      scale: 2,
      delay: 1,
      collisionMask: SPRITE_PLAYER
    });
    this.p.speedBeforeSlow = this.p.speed;

    this.add("2d, animation");
    this.play("walk_right");
  },

  step: function(dt) {
    this.p.delay -= dt;

    this.p.vx += (this.p.speed - this.p.vx)/4;
    this.p.y = 575;
    this.p.vy = 0;

    var player = Q("Player").first();
    var distance = player.p.x - this.p.x;

    //Velocidad dependiente del jugador
    if(player.p.slowed > 0){
      this.p.speed += distance/MAX_SPEED; //Si el jugador se ha chocado, aceleran momentáneamente
    } else if (player.p.invincible > 0 && this.p.speed > MIN_SPEED*1.5){
      this.p.speed -= MAX_SPEED*dt; //Si el jugador activa el turbo, frenan
      this.p.speedBeforeSlow = this.p.speedBeforeSlow;
    } else {
      this.p.speed = this.p.speedBeforeSlow;
    }
    
    //Por defecto, aceleran con el tiempo
    if(this.p.delay <= 0 && this.p.speed < 1.5*MAX_SPEED && player.p.slowed <= 0){
      this.p.speed += distance*dt/4;
      console.log(this.p.speed); 
      this.p.speedBeforeSlow = this.p.speed;
      this.p.delay = 1;
    }

    //Mantener la distancia para que los walkers no desaparezcan de la pantalla
    if(distance > MAX_DISTANCE){
      var maxDistanceInvincible = MAX_DISTANCE + 50 * player.p.invincible;
      if(player.p.invincible > 0 && distance > maxDistanceInvincible){
        this.p.x = player.p.x - (maxDistanceInvincible);
      } else if(player.p.invincible <= 0){
        this.p.x = player.p.x - MAX_DISTANCE;
      } 
    }

  },
});


//--- SPAWNERS
Q.GameObject.extend("EnemySpawner",{
  init: function() {
    this.p = {
      timeElapsed: 0,
      launchDelay: 1,
      launchRandom: 1,
      launch: 2
    }
  },

  update: function(dt) {
    this.p.launch -= dt;
    this.p.timeElapsed += dt;

    if(this.p.launch < 0) {
      var enemySpeed = this.p.timeElapsed < MAX_SPEED / 2.5 ? this.p.timeElapsed : MAX_SPEED / 2.5;
      this.stage.insert(new Q.Enemy(enemySpeed + 100 * Math.random()));
      this.p.launch = this.p.launchDelay + this.p.launchRandom * Math.random();
      if(this.p.launchDelay > 0.25){
        this.p.launchDelay -= 0.01;
      }
    }
  }
});

Q.GameObject.extend("BoosterSpawner",{
  init: function(){
    this.p = {
      launchDelay: 12,
      launchRandom: 6,
      launch: 10
    }
  },

  update: function(dt){
    this.p.launch -= dt;

    if(this.p.launch < 0){
      this.stage.insert(new Q.Booster(0));
      this.p.launch = this.p.launchDelay + this.p.launchRandom*Math.random();
    }

    if(this.p.launchDelay > 5){
      this.p.launchDelay -= dt;
    }
  }
});


//--- HUD ELEMENTS
Q.UI.Text.extend("Score",{ 
    init: function(p) {
      this._super({
        label: "SCORE: 0",
        x: 0,
        y: 0,
        color: "white"
      });

      Q.state.on("change.score",this,"score");
    },

    score: function(score) {
      this.p.label = "SCORE: " + Math.floor(score);
    }
});

Q.UI.Text.extend("hasTurboEnabled", {
    init: function(p) {
      this._super({
        label: "TURBO ENABLED\nPRES SPACE FOR TURBO",
        x: 0,
        y: 0,
        color: "white",
        hidden: true
      });

      Q.state.on("change.turbo",this,function(){
        this.p.hidden = !this.p.hidden;
      });
    },
});

Q.UI.Text.extend("EnemiesKilled",{ 
    init: function(p) {
      this._super({
        label: "Enemies killed: 0",
        x: 0,
        y: 0,
        color: "white"
      });

      Q.state.on("change.enemiesKilled",this,"score");
    },

    score: function(score) {
      this.p.label = "Enemies killed: " + Math.floor(score);
    }
});

//--- SCENES
Q.scene('hud', function(stage){
    var container = stage.insert(new Q.UI.Container({
      x: Q.width - Q.width/5,
      y: Q.height/12
    }));

    var turboContainer = stage.insert(new Q.UI.Container({
      x: Q.width/2,
      y: Q.height/4
    }));

    var enemiesContainer = stage.insert(new Q.UI.Container({
      x: Q.width/5,
      y: Q.height/12
    }));

    stage.insert(new Q.Score(), container);
    stage.insert(new Q.hasTurboEnabled(), turboContainer);
    stage.insert(new Q.EnemiesKilled(), enemiesContainer);

    container.fit(10,10);
});

Q.scene('startGame',function(stage) {
		stage.insert(new Q.Repeater({ asset: "background-wall.png",
                                repeatY: false,
                                speedX: 1,
                                y: 0 }));

        stage.insert(new Q.Repeater({ asset: "background-floor.png",
                                repeatY: false,
                                speedX: 1.5,
                                y: 300 }));
		
		var container = stage.insert(new Q.UI.Container({
			x: Q.width/2, y: Q.height/2
		}));

    var title = container.insert(new Q.UI.Button({x: 0, y: -Q.height/6, asset:"title.png", w:900}));

		var buttonStart = container.insert(new Q.UI.Button({ x: 0, y: title.p.y + title.p.h, fill: "#CCCCCC",
                                                  label: "Start running!" }));
    var buttonCredits = container.insert(new Q.UI.Button({ x: 0, y: buttonStart.p.y + buttonStart.p.h + 5, fill: "#CCCCCC", w: buttonStart.p.w,
                                                  label: "Credits" }));

    //Meter fotos usando buttons

		buttonStart.on("click",function() {
			Q.clearStages();
			Q.stageScene('level1');
		});

    buttonCredits.on("click",function() {
      Q.clearStages();
      Q.stageScene('credits');
    });

		Q.input.on("confirm", function(){
			Q.clearStages();
			Q.stageScene('level1');
		});

		container.fit(20);

		Q.state.reset({score: 0, enemiesKilled: 0, highScore: stage.options.resetHighscore ? 0 : Q.state.get("highScore")});
	});

Q.scene('credits',function(stage) {
    stage.insert(new Q.Repeater({ asset: "background-wall.png",
                                repeatY: false,
                                speedX: 1,
                                y: 0 }));

        stage.insert(new Q.Repeater({ asset: "background-floor.png",
                                repeatY: false,
                                speedX: 1.5,
                                y: 300 }));
    
    var container = stage.insert(new Q.UI.Container({
      x: Q.width/2, y: Q.height/3
    }));

    var label = container.insert(new Q.UI.Text({color: "white", x:0, y: 0, 
                                                     label: "CREDITS", size: 24 }));
    var labelDesigner = container.insert(new Q.UI.Text({color: "white", x:0, y: label.p.y + label.p.h + 10, 
                                                     label: "Designer / programmer: Juan Antonio Palacios Galván", size: 16 }));
    var labelGraphics = container.insert(new Q.UI.Text({color: "white", x:0, y: 5 + labelDesigner.p.y + labelDesigner.p.h, 
                                                     label: "Graphics: Kazzador & Space Gecko", size: 16 }));
    var labelSoundEffects = container.insert(new Q.UI.Text({color: "white", x:0, y: 5 + labelGraphics.p.y + labelGraphics.p.h, 
                                                     label: "Sound effects: DownloadFreeSound.com", size: 16 }));
    var labelMusic = container.insert(new Q.UI.Text({color: "white", x:0, y: 5 + labelSoundEffects.p.y + labelSoundEffects.p.h, 
                                                     label: "Music: Eric Skiff", size: 16 }));

    var buttonBack = container.insert(new Q.UI.Button({ x: 0, y: labelMusic.p.y + labelMusic.p.h + 50, fill: "#CCCCCC",
                                                  label: "Back" }));

    //Meter fotos usando buttons

    buttonBack.on("click",function() {
      Q.clearStages();
      Q.stageScene('startGame',1,{resetHighscore : true});
    });

    Q.input.on("confirm", function(){
      Q.clearStages();
      Q.stageScene('level1');
    });

    container.fit(20);
  });

Q.scene("level1",function(stage) {
  Q.audio.play("backtrack.wav", {loop: true});
  Q.input.off("confirm");
  Q.state.reset({score: 0, turbo: 0, enemiesKilled: 0});
  Q.stageScene('hud',2);

  stage.insert(new Q.Repeater({ asset: "background-wall.png",
                                repeatY: false,
                                speedX: 1,
                                y: 0 }));

  stage.insert(new Q.Repeater({ asset: "background-floor.png",
                                repeatY: false,
                                speedX: 1.5,
                                y: 300 }));

  var container = stage.insert(new Q.UI.Container({

  }));

  stage.insert(new Q.EnemySpawner());
  stage.insert(new Q.BoosterSpawner());
  stage.insert(new Q.Walker());
  stage.insert(new Q.Player());
  stage.add("viewport");
});

Q.scene('endGame',function(stage) {
  Q.audio.stop("backtrack.wav");
  Q.input.on("confirm", function(){
		Q.clearStages();
		Q.stageScene('level1');
	});

  var newHighScore = Q.state.get("score") > Q.highScore;
  if(newHighScore){
    Q.highScore = Q.state.get("score");
  }

  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
  }));

  var buttonAgain = container.insert(new Q.UI.Button({ x: 0, y: 0, w: 250, fill: "#CCCCCC",
                                                  label: "Play Again" }));
  buttonAgain.on("click",function() {
    Q.clearStages();
    Q.stageScene('level1');
  });
  
  var button = container.insert(new Q.UI.Button({ x: 0, y: buttonAgain.p.h + 5, w: 250, fill: "#CCCCCC",
                                                  label: "Back to main menu" }));
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene("startGame",1,{resetHighscore : false});
  });         
  var label = container.insert(new Q.UI.Text({color: "white", x:0, y: buttonAgain.p.y - buttonAgain.p.h - 20, 
                                                   label: stage.options.label }));
  var labelScore = container.insert(new Q.UI.Text({color: "white", x:0, y: button.p.y + button.p.h - 20, 
                                                   label: "Score: " + Math.floor(Q.state.get("score")) }));
  var labelEnemies = container.insert(new Q.UI.Text({color: "white", x:0, y: 5 + labelScore.p.y + labelScore.p.h, 
                                                   label: "Enemies killed: " + Q.state.get("enemiesKilled") }));
  if(newHighScore){
    container.insert(new Q.UI.Text({color: "white", x:0, y: 5 + labelEnemies.p.y + labelEnemies.p.h, 
                                                   label: "It's a new high score!" }));
  } else {
    container.insert(new Q.UI.Text({color: "white", x:0, y: 5 + labelEnemies.p.y + labelEnemies.p.h, 
                                                   label: "High Score: " + Math.floor(Q.highScore) }));
  }
  container.fit(20);
});

  
Q.load("title.png, player.json, player.png," 
        +"background-wall.png, background-floor.png, "
        +"walkers.json, walkers.png, "
        +"skeleton.json, skeleton.png, "
        +"skeleton2.json, skeleton2.png, "
        +"gargoyle.json, gargoyle.png, "
        +"booster.png, "

        + "jump.wav, hit_enemy.wav, enemy_kill.wav, turbo.wav, die.wav, boost.wav, backtrack.wav",
  function() {
    Q.compileSheets("player.png","player.json");
    Q.compileSheets("walkers.png","walkers.json");
    Q.compileSheets("skeleton.png","skeleton.json");
    Q.compileSheets("skeleton2.png","skeleton2.json");
    Q.compileSheets("gargoyle.png","gargoyle.json");
    Q.animations("player", {
      walk_right: { frames: [0,1,2,3,4,5,6,7], rate: 1/5, flip: false, loop: true },
      run_right: { frames: [0,1,2,3,4,5,6,7], rate: 1/10, flip: false, loop: true },
      turbo_right: { frames: [0,1,2,3,4,5,6,7], rate: 1/15, flip: false, loop: true },
      jump_right: { frames: [8], rate: 1/10, flip: false },
      stand_right: { frames:[10], rate: 1/10, flip: false },
      duck_right: { frames: [9], rate: 1/10, flip: false },
      hit_right: { frames: [11], rate: 1/10, flip: false },
      die: { frames: [12], rate: 1/10, flip: false },
    });
    Q.animations("walkers", {
      walk_right: { frames: [0,1,2], rate: 1/2, flip: false, loop: true}
    });
    Q.animations("skeleton", {
      walk_left: { frames: [0,1,2,3,4,5,6,7], rate: 1/5, flip: false, loop: true},
      die: {frames: [8], rate: 1/2, flip: false}
    });
    Q.animations("skeleton2", {
      walk_left: { frames: [0,1,2,3,4,5,6,7], rate: 1/5, flip: false, loop: true},
      die: {frames: [8], rate: 1/2, flip: false}
    });
    Q.animations("gargoyle", {
      walk_left: { frames: [0,1,2,3], rate: 1/5, flip: false, loop: true},
      die: {frames: [4], rate: 1/2, flip: false}
    });
    Q.stageScene("startGame",1,{resetHighscore : true});
  }
);


});
