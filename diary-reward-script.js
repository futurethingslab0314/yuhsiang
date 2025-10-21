// === 像素風格硬幣堆疊系統 - 完全符合 Pixel Art Game Interface ===

// 硬幣介面
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
let lastSpawnTime = 0;

// 設定參數
const COIN_SIZE = 28; // 像素大小，與語音指示器相同
const GRAVITY = 0.8;
const SPAWN_INTERVAL = 120; // 硬幣生成間隔（毫秒）
const MAX_COINS = 150;
const GROUND_Y = 1920 - 100; // 地面位置
const LEFT_MARGIN = 100;
const RIGHT_MARGIN = 1080 - 100;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('coinCanvas');
    ctx = canvas.getContext('2d');
    
    // 設定 Canvas 尺寸（確保 1:1 像素比例）
    canvas.width = 1080;
    canvas.height = 1920;
    
    // 設定像素化渲染
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    // 確保 Canvas 不會被縮放 - 使用 devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = '1080px';
    canvas.style.height = '1920px';
    
    // 設定實際 Canvas 尺寸
    canvas.width = 1080 * dpr;
    canvas.height = 1920 * dpr;
    ctx.scale(dpr, dpr);
    
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
        
        // 停止自動生成硬幣，改為點擊觸發
        // 硬幣現在只通過點擊語音指示器生成
        
        // 更新和繪製硬幣
        coins.forEach((coin) => {
            if (!coin.settled) {
                // 應用重力
                coin.velocityY += GRAVITY;
                coin.y += coin.velocityY;
                
                // 檢查是否應該落腳
                const settlePos = findSettlePosition(coin.x, coin.y);
                
                if (settlePos) {
                    // 直接設定到落腳位置
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
        
        // 確保像素完美對齊，繪製正方形
        ctx.fillRect(x, y, size, size);
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
}

// 檢查位置是否被佔用（確保正方形對齊）
function isPositionOccupied(x, y) {
    for (const coin of coins) {
        if (coin.settled) {
            // 檢查位置是否重疊（網格對齊）
            const coinX = Math.floor(coin.x);
            const coinY = Math.floor(coin.y);
            const checkX = Math.floor(x);
            const checkY = Math.floor(y);
            
            // 精確的網格碰撞檢測
            if (coinX === checkX && coinY === checkY) {
                return true;
            }
        }
    }
    return false;
}

// 找到最低可用位置（確保正方形對齊）
function findSettlePosition(currentX, currentY) {
    // 對齊到網格
    const gridX = Math.floor(currentX / COIN_SIZE) * COIN_SIZE;
    
    // 從地面開始向上尋找
    for (let y = GROUND_Y; y >= 0; y -= COIN_SIZE) {
        // 檢查這個位置是否空閒
        const isFree = !isPositionOccupied(gridX, y);
        
        if (isFree) {
            // 檢查是否有下方支撐（地面或其他硬幣）
            const hasSupport = y >= GROUND_Y || isPositionOccupied(gridX, y + COIN_SIZE);
            
            if (hasSupport) {
                console.log(`硬幣落腳在: (${gridX}, ${y}), 已落腳硬幣數: ${coins.filter(c => c.settled).length}`);
                return { x: gridX, y: y };
            }
        }
    }
    return null;
}

// 清理函數
function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// 掉落三枚硬幣
function dropThreeCoins() {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const x = Math.random() * (RIGHT_MARGIN - LEFT_MARGIN - COIN_SIZE) + LEFT_MARGIN;
            const newCoin = new Coin(
                Math.floor(x), // 確保整數位置
                -COIN_SIZE * 2,
                0,
                COIN_SIZE // 28x28 正方形
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

// 頁面卸載時清理
window.addEventListener('beforeunload', cleanup);