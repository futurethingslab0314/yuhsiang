/**
 * 像素硬幣堆疊系統
 * 基於 Figma 設計的像素藝術遊戲介面
 */

class PixelCoinSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.coins = [];
        this.lastSpawn = 0;
        this.animationId = null;
        
        // 設定參數
        this.COIN_SIZE = 28; // 像素大小，與語音指示器相同
        this.GRAVITY = 0.8;
        this.SPAWN_INTERVAL = 120; // 硬幣生成間隔（毫秒）
        this.MAX_COINS = 150;
        this.GROUND_Y = this.canvas.height - 100;
        this.LEFT_MARGIN = 100;
        this.RIGHT_MARGIN = this.canvas.width - 100;
        
        this.init();
    }
    
    init() {
        // 設定畫布大小
        this.canvas.width = 1080;
        this.canvas.height = 1920;
        
        // 開始動畫
        this.animate();
    }
    
    // 網格基礎的碰撞檢測
    isPositionOccupied(x, y) {
        for (const coin of this.coins) {
            if (coin.settled) {
                // 檢查位置是否重疊（網格對齊）
                if (Math.abs(coin.x - x) < this.COIN_SIZE && Math.abs(coin.y - y) < this.COIN_SIZE) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // 為硬幣找到最低可用位置
    findSettlePosition(currentX, currentY) {
        // 從地面開始向上搜尋
        for (let y = this.GROUND_Y; y >= 0; y -= this.COIN_SIZE) {
            // 嘗試當前 x 周圍的位置，優先選擇居中位置
            const xPositions = [
                Math.round(currentX / this.COIN_SIZE) * this.COIN_SIZE, // 將當前位置對齊到網格
                Math.round(currentX / this.COIN_SIZE) * this.COIN_SIZE - this.COIN_SIZE, // 左
                Math.round(currentX / this.COIN_SIZE) * this.COIN_SIZE + this.COIN_SIZE, // 右
            ];

            for (const x of xPositions) {
                // 保持在邊界內
                if (x < this.LEFT_MARGIN || x > this.RIGHT_MARGIN - this.COIN_SIZE) continue;
                
                // 檢查此位置是否空閒且有下方支撐
                const hasSupport = y >= this.GROUND_Y || this.isPositionOccupied(x, y + this.COIN_SIZE);
                const isFree = !this.isPositionOccupied(x, y);
                
                if (isFree && hasSupport && currentY >= y - this.COIN_SIZE) {
                    return { x, y };
                }
            }
        }
        return null;
    }
    
    // 動畫循環
    animate(timestamp = 0) {
        // 清除畫布，使用純黑背景
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 生成新硬幣
        if (timestamp - this.lastSpawn > this.SPAWN_INTERVAL && this.coins.length < this.MAX_COINS) {
            const newCoin = {
                x: Math.random() * (this.RIGHT_MARGIN - this.LEFT_MARGIN - this.COIN_SIZE) + this.LEFT_MARGIN,
                y: -this.COIN_SIZE * 2,
                velocityY: 0,
                size: this.COIN_SIZE,
                settled: false,
            };
            this.coins.push(newCoin);
            this.lastSpawn = timestamp;
        }

        // 更新和繪製硬幣
        this.coins.forEach((coin) => {
            if (!coin.settled) {
                // 應用重力
                coin.velocityY += this.GRAVITY;
                coin.y += coin.velocityY;

                // 嘗試找到定居位置
                const settlePos = this.findSettlePosition(coin.x, coin.y);
                
                if (settlePos && coin.y >= settlePos.y - this.COIN_SIZE / 2) {
                    coin.x = settlePos.x;
                    coin.y = settlePos.y;
                    coin.settled = true;
                    coin.velocityY = 0;
                }
            }

            // 繪製硬幣為簡單的金色方形像素塊
            this.ctx.fillStyle = '#FFD700'; // 純金色
            this.ctx.fillRect(Math.floor(coin.x), Math.floor(coin.y), coin.size, coin.size);
        });

        this.animationId = requestAnimationFrame((ts) => this.animate(ts));
    }
    
    // 停止動畫
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // 清除所有硬幣
    clear() {
        this.coins = [];
    }
    
    // 調整畫布大小
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.GROUND_Y = height - 100;
        this.RIGHT_MARGIN = width - 100;
    }
}

// 語音指示器類別
class VoiceIndicator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.dots = [];
        this.animationId = null;
        this.PIXEL_SIZE = 28; // 與硬幣相同大小
        
        this.init();
    }
    
    init() {
        // 創建三個點
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.style.width = `${this.PIXEL_SIZE}px`;
            dot.style.height = `${this.PIXEL_SIZE}px`;
            dot.style.backgroundColor = 'white';
            dot.style.display = 'inline-block';
            dot.style.marginRight = '8px';
            dot.style.imageRendering = 'pixelated';
            dot.className = 'voice-indicator-dot';
            this.dots.push(dot);
            this.container.appendChild(dot);
        }
        
        this.startAnimation();
    }
    
    startAnimation() {
        const animate = (timestamp) => {
            this.dots.forEach((dot, index) => {
                const delay = index * 200; // 每個點延遲 200ms
                const cycleTime = 1500; // 完整週期 1.5 秒
                const elapsed = (timestamp + delay) % cycleTime;
                const progress = elapsed / cycleTime;
                
                // 計算 Y 位置變化（0 到 -20 再回到 0）
                const y = Math.sin(progress * Math.PI * 2) * -10;
                dot.style.transform = `translateY(${y}px)`;
                dot.style.transition = 'transform 0.1s ease-in-out';
            });
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// 全域變數
let pixelCoinSystem = null;
let voiceIndicator = null;

// 初始化函數
function initializePixelArtSystem() {
    // 創建硬幣系統畫布
    const coinCanvas = document.getElementById('pixelCoinCanvas');
    if (!coinCanvas) {
        console.error('找不到像素硬幣畫布元素');
        return;
    }
    
    // 初始化硬幣系統
    pixelCoinSystem = new PixelCoinSystem('pixelCoinCanvas');
    
    // 創建語音指示器容器
    const voiceContainer = document.getElementById('voiceIndicatorContainer');
    if (voiceContainer) {
        // 初始化語音指示器
        voiceIndicator = new VoiceIndicator('voiceIndicatorContainer');
    }
    
    console.log('像素藝術系統初始化完成');
}

// 控制函數
function startPixelCoinAnimation() {
    if (pixelCoinSystem && !pixelCoinSystem.animationId) {
        pixelCoinSystem.animate();
    }
}

function stopPixelCoinAnimation() {
    if (pixelCoinSystem) {
        pixelCoinSystem.stop();
    }
}

function clearPixelCoins() {
    if (pixelCoinSystem) {
        pixelCoinSystem.clear();
    }
}

// 當頁面載入完成時初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延遲初始化以確保所有元素都已載入
    setTimeout(initializePixelArtSystem, 100);
});

// 導出給全域使用
window.PixelCoinSystem = PixelCoinSystem;
window.VoiceIndicator = VoiceIndicator;
window.startPixelCoinAnimation = startPixelCoinAnimation;
window.stopPixelCoinAnimation = stopPixelCoinAnimation;
window.clearPixelCoins = clearPixelCoins;
