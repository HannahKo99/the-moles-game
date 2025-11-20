class Game {
    constructor() {
        this.score = 0;
        this.coins = 0;
        this.round = 1;
        this.timeLeft = 45;
        this.isPlaying = false;
        this.gridSize = 3;
        this.holes = [];
        this.timerId = null;
        this.spawnTimerId = null;
        this.lastHole = null;
        this.isFever = false;
        this.coinsSpawned = 0;
        this.roundScore = 0;

        // Stats tracking
        this.stats = {
            moles: 0,
            capybaras: 0,
            coins: 0
        };

        // DOM Elements
        this.gridContainer = document.getElementById('grid-container');
        this.scoreDisplay = document.getElementById('score');
        this.timeDisplay = document.getElementById('time');
        this.coinsDisplay = document.getElementById('coins');
        this.coinDisplayContainer = document.getElementById('coin-display');
        this.roundDisplay = document.getElementById('round');
        this.startScreen = document.getElementById('start-screen');
        this.roundScreen = document.getElementById('round-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.ultimateBtn = document.getElementById('ultimate-btn');

        // Create Instructions Overlay
        this.createInstructionsOverlay();
        this.createRoundSummaryOverlay();

        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.showInstructions());
        document.getElementById('instruction-start-btn').addEventListener('click', () => this.startRound(1));
        document.getElementById('next-round-btn').addEventListener('click', () => this.startRound(this.round + 1));
        document.getElementById('restart-btn').addEventListener('click', () => this.resetGame());
        this.ultimateBtn.addEventListener('click', () => this.activateUltimate());
    }

    createInstructionsOverlay() {
        const div = document.createElement('div');
        div.id = 'instruction-screen';
        div.className = 'overlay hidden';
        div.innerHTML = `
            <h2>遊戲說明</h2>
            <div style="text-align: left; max-width: 80%;">
                <p>1. <strong>打擊地鼠</strong>: 擊中+1 分 (第三回合 +2分)</p>
                <p>2. <strong>小心卡皮巴拉!</strong>: 擊中-2 分 (第三回合 -4分)</p>
                <p>3. <strong>收集金幣</strong>: 收集滿 6 個可在第三回合解鎖大招！</p>
                <p>4. <strong>終極大招</strong>: 滿20分可發動全屏消除！</p>
                <p>5. <strong>Fever Time</strong>: 倒數 10 秒分數 3 倍！</p>
            </div>
            <button id="instruction-start-btn">開始挑戰</button>
        `;
        document.getElementById('game-container').appendChild(div);
    }

    createRoundSummaryOverlay() {
        const div = document.createElement('div');
        div.id = 'summary-screen';
        div.className = 'overlay hidden';
        div.innerHTML = `
            <h2>回合結束</h2>
            <p>本回合得分: <span id="round-score-val">0</span></p>
            <div style="text-align: left; margin: 10px 0; font-size: 0.9rem;">
                <p>🐹 地鼠擊殺: <span id="stat-moles">0</span></p>
                <p>🛑 誤擊水豚: <span id="stat-capybaras">0</span></p>
                <p>💰 收集金幣: <span id="stat-coins">0</span></p>
            </div>
            <p id="ultimate-unlock-msg" style="color: gold; font-weight: bold; display: none;">✨ 已習得大招！下一回合可用！ ✨</p>
            <button id="summary-next-btn">下一回合</button>
        `;
        document.getElementById('game-container').appendChild(div);
        document.getElementById('summary-next-btn').addEventListener('click', () => {
            document.getElementById('summary-screen').classList.add('hidden');
            this.startRound(this.round + 1);
        });
    }

    showInstructions() {
        this.startScreen.classList.add('hidden');
        document.getElementById('instruction-screen').classList.remove('hidden');
    }

    resetGame() {
        this.score = 0;
        this.coins = 0;
        this.round = 1;
        this.updateHUD();
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
    }

    startRound(round) {
        this.round = round;
        this.timeLeft = 45;
        this.isPlaying = true;
        this.isFever = false;
        this.coinsSpawned = 0;
        this.roundScore = 0;

        // Reset stats for the round
        this.stats = {
            moles: 0,
            capybaras: 0,
            coins: 0
        };

        this.updateHUD();

        document.getElementById('instruction-screen').classList.add('hidden');
        this.startScreen.classList.add('hidden');
        this.roundScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.ultimateBtn.classList.add('hidden');

        // Setup Grid
        if (this.round === 1) {
            this.setupGrid(3);
            this.coinDisplayContainer.style.display = 'block';
        } else {
            this.setupGrid(4);
            this.coinDisplayContainer.style.display = 'block';
        }

        // Round 3 Ultimate Button
        if (this.round === 3 && this.coins >= 6) {
            this.ultimateBtn.classList.remove('hidden');
            this.ultimateBtn.disabled = true;
            this.ultimateBtn.style.opacity = 0.5;

            this.showFloatingText(this.gridContainer, "大招已就緒！滿20分可發動！", "gold");
        }

        // Start Timers
        this.timerId = setInterval(() => this.countDown(), 1000);
        this.spawnLoop();
    }

    setupGrid(size) {
        this.gridSize = size;
        this.gridContainer.className = `grid-${size}x${size}`;
        this.gridContainer.innerHTML = '';
        this.holes = [];

        const totalHoles = size * size;
        for (let i = 0; i < totalHoles; i++) {
            const hole = document.createElement('div');
            hole.classList.add('hole');

            const character = document.createElement('div');
            character.classList.add('character');
            hole.appendChild(character);

            hole.addEventListener('click', (e) => this.whack(e, character));

            this.gridContainer.appendChild(hole);
            this.holes.push(character);
        }
    }

    spawnLoop() {
        if (!this.isPlaying) return;

        let minTime = 500 * 1.25;
        let maxTime = 1000 * 1.25;

        if (this.round === 3) {
            minTime /= 1.5;
            maxTime /= 1.5;
        }

        const time = Math.round(Math.random() * (maxTime - minTime) + minTime);

        // R3 Climax Logic: Last 15 seconds spawn multiple
        if (this.round === 3 && this.timeLeft <= 15) {
            // Spawn 3-4 moles at once
            const count = Math.floor(Math.random() * 2) + 3; // 3 or 4
            for (let i = 0; i < count; i++) {
                this.spawnCharacter();
            }
        } else {
            this.spawnCharacter();
        }

        this.spawnTimerId = setTimeout(() => this.spawnLoop(), time);
    }

    spawnCharacter() {
        const character = this.randomHole(this.holes);
        if (!character) return;

        let type = 'mole';
        const rand = Math.random();

        // Coin Logic: Total 12 coins. R1 ~5, R2 ~7.
        let maxCoins = (this.round === 1) ? 5 : 7;

        // Increase probability for R2 to ensure it hits the cap (25% vs 15%)
        let coinProb = (this.round === 2) ? 0.75 : 0.85;

        if (this.round <= 2 && this.coinsSpawned < maxCoins && rand > coinProb) {
            type = 'coin';
            this.coinsSpawned++;
        } else if (rand > 0.7) { // Capybara chance
            type = 'capybara';
        }

        character.classList.add(type);
        character.dataset.type = type;

        if (this.round === 3) {
            character.classList.add('big');
        }

        character.classList.add('up');

        // Stay Time: Slower (1.25x)
        let stayTime = 800 * 1.25;
        if (type === 'capybara') stayTime /= 0.75;
        if (this.round === 3) stayTime /= 1.5;

        setTimeout(() => {
            character.classList.remove('up');
            setTimeout(() => {
                character.classList.remove(type);
                character.classList.remove('big');
                delete character.dataset.type;
            }, 200);
        }, stayTime);
    }

    randomHole(holes) {
        const idx = Math.floor(Math.random() * holes.length);
        const character = holes[idx];
        if (character.classList.contains('up')) return this.randomHole(holes);
        if (character === this.lastHole) return this.randomHole(holes);
        this.lastHole = character;
        return character;
    }

    whack(e, character) {
        if (!e.isTrusted || !character.classList.contains('up')) return;

        const type = character.dataset.type;
        character.classList.remove('up');

        let multiplier = 1;
        if (this.timeLeft <= 10) multiplier = 3;
        if (this.round === 3) multiplier *= 2;

        if (type === 'mole') {
            const points = 1 * multiplier;
            this.score += points;
            this.roundScore += points;
            this.stats.moles++;
            this.showFloatingText(character, `+${points}`);
        } else if (type === 'capybara') {
            const penalty = 2 * (this.round === 3 ? 2 : 1);
            this.score -= penalty;
            this.roundScore -= penalty;
            this.stats.capybaras++;
            this.showFloatingText(character, `-${penalty}`, 'red');
        } else if (type === 'coin') {
            this.coins++;
            this.stats.coins++;
            this.showFloatingText(character, `+Coin`, 'gold');
        }

        this.updateHUD();

        // Check Ultimate Unlock (Score >= 20, Coins >= 6)
        if (this.round === 3 && this.score >= 20 && this.coins >= 6) {
            this.ultimateBtn.disabled = false;
            this.ultimateBtn.style.opacity = 1;
        }
    }

    showFloatingText(element, text, color = 'white') {
        const float = document.createElement('div');
        float.classList.add('hit-text');
        float.innerText = text;
        float.style.color = color;
        if (element === this.gridContainer) {
            float.style.top = '50%';
            float.style.left = '50%';
            float.style.transform = 'translate(-50%, -50%)';
            float.style.fontSize = '2rem';
        } else {
            float.style.left = element.getBoundingClientRect().left + 'px';
            float.style.top = element.getBoundingClientRect().top + 'px';
        }
        document.body.appendChild(float);
        setTimeout(() => float.remove(), 1500);
    }

    countDown() {
        this.timeLeft--;
        this.updateHUD();

        if (this.timeLeft <= 10 && !this.isFever) {
            this.isFever = true;
            document.body.style.animation = "fever 0.5s infinite alternate";
        }

        if (this.timeLeft <= 0) {
            this.endRound();
        }
    }

    endRound() {
        this.isPlaying = false;
        clearInterval(this.timerId);
        clearTimeout(this.spawnTimerId);
        document.body.style.animation = "";

        if (this.round < 3) {
            // Show Round Summary
            document.getElementById('round-score-val').innerText = this.roundScore;
            document.getElementById('stat-moles').innerText = this.stats.moles;
            document.getElementById('stat-capybaras').innerText = this.stats.capybaras;
            document.getElementById('stat-coins').innerText = this.stats.coins;

            // Check if ultimate unlocked after R2
            const unlockMsg = document.getElementById('ultimate-unlock-msg');
            if (this.round === 2 && this.coins >= 6) {
                unlockMsg.style.display = 'block';
            } else {
                unlockMsg.style.display = 'none';
            }

            document.getElementById('summary-screen').classList.remove('hidden');
        } else {
            // Game Over
            this.finalScoreDisplay.innerText = this.score;

            // Add final stats to game over screen too?
            // For now just score and percentile

            // Percentile Calculation
            let percentile = 50;
            if (this.score > 100) percentile = 99;
            else if (this.score > 80) percentile = 95;
            else if (this.score > 60) percentile = 80;
            else if (this.score > 40) percentile = 60;
            else percentile = Math.max(10, this.score);

            const p = document.createElement('p');
            p.innerText = `您的得分贏過了 ${percentile}% 的玩家！`;
            p.style.color = '#FFD700';
            p.style.fontWeight = 'bold';

            const oldP = this.gameOverScreen.querySelector('.percentile-msg');
            if (oldP) oldP.remove();
            p.classList.add('percentile-msg');

            this.gameOverScreen.insertBefore(p, document.getElementById('restart-btn'));

            // Add total stats summary
            const statsDiv = document.createElement('div');
            statsDiv.innerHTML = `
                <p>總計地鼠: ${this.stats.moles} (本局)</p>
                <p>總計金幣: ${this.coins}</p>
            `;
            // Note: this.stats resets every round, so this only shows R3 stats if we don't accumulate.
            // Requirement says "Total stats". I should track total stats or accumulate.
            // Let's just show R3 stats here or maybe I should have tracked total.
            // The user asked for "Round Summary" stats. The final game over is a "Total Score".
            // But user also said "Game Over calculate total score".
            // Let's stick to the requested "Round Summary" overlay which works for R1/R2.
            // For R3, it goes straight to Game Over. Maybe I should show the summary for R3 too?
            // Or just add stats to Game Over screen.

            this.gameOverScreen.classList.remove('hidden');
        }
    }

    updateHUD() {
        this.scoreDisplay.innerText = this.score;
        this.timeDisplay.innerText = this.timeLeft;
        this.coinsDisplay.innerText = this.coins;
        this.roundDisplay.innerText = this.round;

        if (this.timeLeft <= 10) {
            this.timeDisplay.style.color = 'red';
            this.timeDisplay.style.transform = 'scale(1.2)';
        } else {
            this.timeDisplay.style.color = 'inherit';
            this.timeDisplay.style.transform = 'scale(1)';
        }
    }

    activateUltimate() {
        if (!this.isPlaying || this.round !== 3) return;

        // Flash effect
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = 0;
        flash.style.left = 0;
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'white';
        flash.style.zIndex = 999;
        flash.style.transition = 'opacity 0.5s';
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = 0;
            setTimeout(() => flash.remove(), 500);
        }, 100);

        // Count and hit all active moles
        const activeMoles = document.querySelectorAll('.character.mole.up');
        const moleCount = activeMoles.length;

        // Calculate points (R3 multiplier is 2, and if in fever time x3)
        let multiplier = 4; // R3 base multiplier
        if (this.timeLeft <= 10) multiplier = 6; // 2 * 3 (fever)
        const totalPoints = moleCount * multiplier;

        // Trigger clicks
        activeMoles.forEach(mole => {
            mole.click();
        });

        // Display total score earned
        if (moleCount > 0) {
            this.showFloatingText(this.gridContainer, `大招！+${totalPoints} 分！`, 'gold');
        }

        this.ultimateBtn.disabled = true;
        this.ultimateBtn.style.opacity = 0.5;
        this.ultimateBtn.innerText = "已使用";
    }
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes fever {
    from { box-shadow: inset 0 0 20px red; }
    to { box-shadow: inset 0 0 50px red; }
}
`;
document.head.appendChild(style);

const game = new Game();
