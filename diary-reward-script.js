// === 像素風格硬幣堆疊系統 - 完全符合 Pixel Art Game Interface ===

// 硬幣類別
class Coin {
    constructor(x, y, velocityY, size) {
        this.x = x;
        this.y = y;
        this.velocityY = velocityY;
        this.size = size;
        this.settled = false;
    }
}

// 全域變數
let canvas;
let ctx;
let animationId;
let coins = [];

// 設定參數
const COIN_SIZE = 28; // 像素大小
const GRAVITY = 0.8;
const MAX_COINS = 150;
const GROUND_Y = 1920 - 100; // 地面位置
const LEFT_MARGIN = 100;
const RIGHT_MARGIN = 1080 - 100;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('coinCanvas');
    ctx = canvas.getContext('2d');
    
    // 設定 Canvas 尺寸
    canvas.width = 1080;
    canvas.height = 1920;
    
    // 設定像素化渲染
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    // 設定語音指示器點擊互動
    setupVoiceIndicator();
    
    // 開始動畫循環
    startAnimation();
});

// 開始動畫
function startAnimation() {
    function animate(timestamp) {
        if (!ctx || !canvas) return;
        
        // 清除畫布，純黑背景
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 更新和繪製硬幣
        coins.forEach((coin) => {
            if (!coin.settled) {
                // 應用重力
                coin.velocityY += GRAVITY;
                coin.y += coin.velocityY;
                
                // 檢查是否應該落腳
                const settlePos = findSettlePosition(coin.x, coin.y);
                
                if (settlePos) {
                    coin.x = settlePos.x;
                    coin.y = settlePos.y;
                    coin.settled = true;
                    coin.velocityY = 0;
                }
            }
            
            // 繪製硬幣為完美的正方形
            ctx.fillStyle = '#FFD700'; // 純金色
            const x = Math.floor(coin.x);
            const y = Math.floor(coin.y);
            const size = Math.floor(coin.size);
            
            ctx.fillRect(x, y, size, size);
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
}

// 檢查位置是否被佔用
function isPositionOccupied(x, y) {
    for (const coin of coins) {
        if (coin.settled) {
            const coinX = Math.floor(coin.x);
            const coinY = Math.floor(coin.y);
            const checkX = Math.floor(x);
            const checkY = Math.floor(y);
            
            if (coinX === checkX && coinY === checkY) {
                return true;
            }
        }
    }
    return false;
}

// 找到最低可用位置
function findSettlePosition(currentX, currentY) {
    // 對齊到網格
    const gridX = Math.floor(currentX / COIN_SIZE) * COIN_SIZE;
    
    // 從地面開始向上尋找
    for (let y = GROUND_Y; y >= 0; y -= COIN_SIZE) {
        // 檢查這個位置是否空閒
        const isFree = !isPositionOccupied(gridX, y);
        
        if (isFree) {
            // 檢查是否有下方支撐
            const hasSupport = y >= GROUND_Y || isPositionOccupied(gridX, y + COIN_SIZE);
            
            if (hasSupport) {
                return { x: gridX, y: y };
            }
        }
    }
    return null;
}

// 掉落三枚硬幣
function dropThreeCoins() {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const x = Math.random() * (RIGHT_MARGIN - LEFT_MARGIN - COIN_SIZE) + LEFT_MARGIN;
            const newCoin = new Coin(
                Math.floor(x),
                -COIN_SIZE * 2,
                0,
                COIN_SIZE
            );
            coins.push(newCoin);
        }, i * 200); // 每 200ms 掉落一個
    }
}

// 設定語音指示器點擊互動
function setupVoiceIndicator() {
    const voiceIndicator = document.querySelector('.voice-indicator');
    
    if (voiceIndicator) {
        voiceIndicator.addEventListener('click', function() {
            // 添加 active 類別觸發動畫
            this.classList.add('active');
            
            // 掉落三枚硬幣
            dropThreeCoins();
            
            // 1.5秒後移除 active 類別
            setTimeout(() => {
                this.classList.remove('active');
            }, 1500);
        });
    }
}

// 清理函數
function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// 頁面卸載時清理
window.addEventListener('beforeunload', cleanup);