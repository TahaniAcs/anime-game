/* ==========================================
   CLASS: Player (اللاعب)
   ========================================== */
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey) {
        const key = textureKey || 'zoro';
        super(scene, x, y, key); 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setGravityY(800);
        
        // الحجم الكلاسيكي
        this.setDisplaySize(100, 150);
        this.body.setSize(this.width, this.height); 

        this.cursors = scene.input.keyboard.createCursorKeys();
    }

    update() {
        const speed = 300; 
        
        if (this.cursors.left.isDown) {
            this.setVelocityX(-speed);
            this.flipX = true; 
        } 
        else if (this.cursors.right.isDown) {
            this.setVelocityX(speed);
            this.flipX = false; 
        } 
        else {
            this.setVelocityX(0);
        }

        if ((this.cursors.space.isDown || this.cursors.up.isDown) && this.body.touching.down) {
            this.setVelocityY(-550);
        }
    }
}

/* ==========================================
   CLASS: SelectionScene (شاشة الاختيار)
   ========================================== */
class SelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SelectionScene' });
    }

    preload() {
        this.load.image('luffy', 'see.png');
        this.load.image('goku', 'yellow.png');
        this.load.image('girl', 'binck.png');
        this.load.image('nezuko', 'image3.png');
        this.load.image('gon', 'green.png');
        this.load.image('zoro', 'anime.png');
    }

    create() {
        // إخفاء الرسائل
        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.style.opacity = '0';
            msgEl.style.pointerEvents = 'none';
        }
        
        const livesEl = document.getElementById('livesVal');
        if (livesEl) livesEl.parentElement.style.display = 'none';

        // عنوان
        this.add.text(400, 80, 'اختر بطلك', {
            fontSize: '40px',
            fontFamily: 'Tajawal',
            fill: '#ffffff',
            stroke: '#00fff2',
            strokeThickness: 4
        }).setOrigin(0.5);

        // === الإحداثيات الثابتة التي كانت تعمل معك (800x600) ===
        // الصف الأول
        this.createCharacterButton(200, 250, 'luffy', 'لوفي');
        this.createCharacterButton(400, 250, 'goku', 'غوكو');
        this.createCharacterButton(600, 250, 'girl', 'ساكورا'); // الاسم: ساكورا

        // الصف الثاني
        this.createCharacterButton(200, 450, 'nezuko', 'نيزوكو');
        this.createCharacterButton(400, 450, 'gon', 'غون');
        this.createCharacterButton(600, 450, 'zoro', 'زورو');
    }

    createCharacterButton(x, y, key, name) {
        this.add.circle(x, y, 70, 0x000000, 0.5);

        if (this.textures.exists(key)) {
            const img = this.add.image(x, y, key).setInteractive();
            img.setDisplaySize(100, 100);
            
            const originalScale = img.scaleX; 
            img.on('pointerover', () => img.setScale(originalScale * 1.1));
            img.on('pointerout', () => img.setScale(originalScale));

            img.on('pointerdown', () => {
                this.scene.start('MainScene', { character: key });
            });
        }

        this.add.text(x, y + 85, name, {
            fontSize: '20px',
            fontFamily: 'Tajawal',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }
}

/* ==========================================
   CLASS: MainScene (اللعبة)
   ========================================== */
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.score = 0;
        this.lives = 3; 
        this.timeLeft = 60;
        this.requiredScore = 50; 
        this.isGameOver = false;
        this.selectedCharacter = 'zoro'; 
    }

    init(data) {
        if (data.character) this.selectedCharacter = data.character;
    }

    preload() {
        this.load.image('taqat', 'taqat.png');   
        this.load.image('ertwaa', 'ertwaa.png');
    }

    create() {
        this.lives = 3; 
        this.score = 0;
        this.timeLeft = 60;
        this.isGameOver = false;
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.style.opacity = '0';
            msgEl.style.pointerEvents = 'none';
        }

        this.setupHTMLUI();

        // الأرضية (مضبوطة على 800)
        const ground = this.add.rectangle(400, 580, 800, 20, 0x00fff2).setAlpha(0);
        this.physics.add.existing(ground, true);

        this.player = new Player(this, 100, 400, this.selectedCharacter);
        this.physics.add.collider(this.player, ground);

        this.collectibles = this.physics.add.group();
        this.hazards = this.physics.add.group();
        this.boxes = this.physics.add.group();
        this.drinks = this.physics.add.group();

        this.physics.add.overlap(this.player, this.collectibles, this.collectWord, null, this);
        this.physics.add.overlap(this.player, this.hazards, this.hitHazard, null, this);
        this.physics.add.overlap(this.player, this.drinks, this.collectDrink, null, this); 
        this.physics.add.collider(this.player, this.boxes);
        this.physics.add.collider(this.boxes, ground);
        this.physics.add.collider(this.boxes, this.boxes);

        this.time.addEvent({ delay: 1000, callback: this.updateTimer, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 1000, callback: this.spawnCollectible, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 2000, callback: this.spawnHazards, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 8000, callback: this.spawnDrink, callbackScope: this, loop: true });

        this.updateUI();
        this.updateLivesUI();
    }

    setupHTMLUI() {
        const goalEl = document.getElementById('goal');
        if (goalEl) goalEl.innerHTML = `الهدف: <span style="color:var(--neon-blue)">${this.requiredScore}</span>`;

        const topbar = document.getElementById('topbar');
        let livesContainer = document.getElementById('livesContainer');
        if (!livesContainer && topbar) {
            livesContainer = document.createElement('div');
            livesContainer.id = 'livesContainer';
            livesContainer.innerHTML = `الصحة: <span id="livesVal" style="letter-spacing:2px">❤️❤️❤️</span>`;
            topbar.appendChild(livesContainer);
        } else if (livesContainer) {
            livesContainer.style.display = 'block';
        }
    }

    update() {
        if (this.isGameOver) return;
        this.player.update();
    }

    spawnCollectible() {
        if (this.isGameOver) return;
        const x = Phaser.Math.Between(50, 750);
        const keys = ['taqat', 'ertwaa'];
        const key = Phaser.Math.RND.pick(keys);

        if (this.textures.exists(key)) {
            const item = this.collectibles.create(x, -50, key);
            item.setDisplaySize(60, 60);
            item.setVelocityY(Phaser.Math.Between(150, 250)); 
            item.setAngularVelocity(60); 
            item.keyVal = key; 
        }
    }

    spawnHazards() {
        if (this.isGameOver) return;
        const x = Phaser.Math.Between(50, 750);
        const rand = Math.random();

        if (rand < 0.4) this.createEmojiHazard(x, '💣', 'bomb');
        else if (rand < 0.8) this.createEmojiHazard(x, '🔥', 'fire');
        else this.createEmojiBox(x, '📦');
    }

    spawnDrink() {
        if (this.isGameOver) return;
        const x = Phaser.Math.Between(50, 750);
        const drink = this.add.text(x, -50, '🥤', { fontSize: '50px' });
        drink.setOrigin(0.5);
        this.physics.add.existing(drink);
        this.drinks.add(drink);
        drink.body.setVelocityY(200);
        drink.body.setCircle(20);
        this.tweens.add({ targets: drink, angle: 360, duration: 2000, repeat: -1 });
    }

    createEmojiHazard(x, emoji, type) {
        const item = this.add.text(x, -50, emoji, { fontSize: '50px' });
        item.setOrigin(0.5);
        this.physics.add.existing(item);
        this.hazards.add(item);
        item.body.setVelocityY(Phaser.Math.Between(200, 300));
        item.body.setCircle(20); 
        item.typeVal = type;
        this.tweens.add({ targets: item, angle: 360, duration: 1000, repeat: -1 });
    }

    createEmojiBox(x, emoji) {
        const box = this.add.text(x, -50, emoji, { fontSize: '60px' });
        box.setOrigin(0.5);
        this.physics.add.existing(box);
        this.boxes.add(box);
        box.body.setVelocityY(250);
        box.body.setDragX(500); 
        box.body.setBounce(0.2);
        box.body.setCollideWorldBounds(false);
        box.body.setSize(50, 50);
        this.tweens.add({ targets: box, angle: 360, duration: 3000, repeat: -1 });
    }

    showFloatingText(x, y, message, color) {
        const text = this.add.text(x, y, message, {
            fontFamily: 'Tajawal',
            fontSize: '32px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: y - 100, alpha: 0, duration: 800, onComplete: () => text.destroy() });
    }

    collectWord(player, item) {
        this.showFloatingText(item.x, item.y, '+3', '#00fff2');
        item.destroy();
        this.score += 3; 
        this.updateUI();
        this.pulseUI();
    }

    collectDrink(player, drink) {
        drink.destroy();
        if (this.lives < 5) {
            this.lives++;
            this.showFloatingText(player.x, player.y - 50, 'حياة +1', '#00ff00');
            this.updateLivesUI();
        } else {
            this.score += 10;
            this.showFloatingText(player.x, player.y - 50, '+10', '#ffff00');
            this.updateUI();
            this.pulseUI();
        }
    }

    hitHazard(player, item) {
        item.destroy();
        if (item.typeVal === 'bomb') {
            this.lives--;
            this.updateLivesUI();
            this.showFloatingText(player.x, player.y - 50, '💔', '#ff0000');
            this.cameras.main.shake(300, 0.03); 
            player.setTint(0x000000); 
            this.time.delayedCall(300, () => player.clearTint());
            if (this.lives <= 0) this.endGame("bomb");
        } else if (item.typeVal === 'fire') {
            this.showFloatingText(player.x, player.y - 50, '-5', '#ff3366');
            this.score -= 5;
            this.cameras.main.shake(200, 0.01); 
            player.setTint(0xff0000); 
            this.time.delayedCall(200, () => player.clearTint()); 
            this.updateUI();
        }
    }

    pulseUI() {
        const scoreEl = document.getElementById('scoreVal');
        if (scoreEl) {
            scoreEl.style.transform = "scale(1.5)"; scoreEl.style.color = "#00fff2"; 
            setTimeout(() => { scoreEl.style.transform = "scale(1)"; scoreEl.style.color = "white"; }, 150);
        }
    }

    updateLivesUI() {
        const livesEl = document.getElementById('livesVal');
        if (livesEl) {
            let hearts = '';
            for (let i = 0; i < this.lives; i++) hearts += '❤️';
            livesEl.textContent = hearts;
        }
    }

    updateTimer() {
        if (this.isGameOver) return;
        this.timeLeft--;
        this.updateUI();
        if (this.timeLeft <= 0) this.endGame("time");
    }

    updateUI() {
        const scoreEl = document.getElementById('scoreVal');
        const timeEl = document.getElementById('timeVal');
        if (scoreEl) scoreEl.innerText = this.score;
        if (timeEl) timeEl.innerText = this.timeLeft;
        if (scoreEl) scoreEl.style.color = (this.score < 0) ? 'red' : 'white';
    }

    endGame(reason) {
        this.isGameOver = true;
        this.physics.pause();
        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.style.opacity = '1'; msgEl.style.pointerEvents = 'auto';
            msgEl.style.background = 'rgba(0, 0, 0, 0.85)'; msgEl.style.borderRadius = '20px';
            msgEl.style.border = '2px solid rgba(255, 255, 255, 0.2)'; msgEl.style.backdropFilter = 'blur(10px)';
            
            let title = "", subText = "", color = "", icon = "";
            if (reason === "bomb") { icon = "💀"; title = "نفذت حياتك!"; subText = "لقد خسرت كل القلوب."; color = "#ff3366"; }
            else if (this.score >= this.requiredScore) { icon = "🏆"; title = "مبروك!"; subText = "لقد حققت الهدف."; color = "#00fff2"; }
            else { icon = "⏰"; title = "انتهى الوقت"; subText = `نقاطك ${this.score}. المطلوب ${this.requiredScore}`; color = "#ffaa00"; }

            msgEl.innerHTML = `
                <div style="font-size: 60px; margin-bottom: 10px;">${icon}</div>
                <h2 style="color: ${color}; margin: 0; font-size: 36px;">${title}</h2>
                <p style="color: #ddd; font-size: 18px; margin: 5px 0 20px 0;">${subText}</p>
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 10px; margin-bottom: 20px;">
                    <span style="display:block; font-size:14px; color:#aaa">مجموع النقاط</span>
                    <span style="font-size: 32px; font-weight:bold; color:white">${this.score}</span>
                </div>
                <button id="restartBtn" style="background: ${color}; color: #000; border: none; padding: 12px 30px; border-radius: 50px; font-size: 20px; font-weight: bold; font-family: 'Tajawal'; cursor: pointer; box-shadow: 0 0 15px ${color}; transition: transform 0.2s;">إعادة اللعب</button>
            `;
            const btn = document.getElementById('restartBtn');
            btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';
            btn.onclick = () => {
                msgEl.style.opacity = '0'; msgEl.style.pointerEvents = 'none';
                this.scene.start('SelectionScene');
            };
        }
    }
}

/* ==========================================
   إعدادات اللعبة (Config) - رجعناها 800x600
   ========================================== */
const config = {
    type: Phaser.AUTO,
    parent: "gameContainer",
    width: 800, // الدقة السابقة
    height: 600,
    transparent: true,
    physics: {
        default: "arcade",
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: [SelectionScene, MainScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { pixelArt: false, antialias: true, roundPixels: true }
};

const game = new Phaser.Game(config);

document.body.addEventListener("click", () => {
    const video = document.getElementById("bgvideo");
    if (video) { video.muted = false; video.play().catch(e => {}); }
}, { once: true });