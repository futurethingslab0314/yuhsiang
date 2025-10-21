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
    
    // 設定 Canvas 尺寸
    canvas.width = 1080;
    canvas.height = 1920;
    
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
        
        // 生成新硬幣
        if (timestamp - lastSpawnTime > SPAWN_INTERVAL && coins.length < MAX_COINS) {
            const newCoin = new Coin(
                Math.random() * (RIGHT_MARGIN - LEFT_MARGIN - COIN_SIZE) + LEFT_MARGIN,
                -COIN_SIZE * 2,
                0,
                COIN_SIZE
            );
            coins.push(newCoin);
            lastSpawnTime = timestamp;
        }
        
        // 更新和繪製硬幣
        coins.forEach((coin) => {
            if (!coin.settled) {
                // 應用重力
                coin.velocityY += GRAVITY;
                coin.y += coin.velocityY;
                
                // 嘗試找到落腳位置
                const settlePos = findSettlePosition(coin.x, coin.y);
                
                if (settlePos && coin.y >= settlePos.y - COIN_SIZE / 2) {
                    coin.x = settlePos.x;
                    coin.y = settlePos.y;
                    coin.settled = true;
                    coin.velocityY = 0;
                }
            }
            
            // 繪製硬幣為簡單的金色方塊像素
            ctx.fillStyle = '#FFD700'; // 純金色
            ctx.fillRect(Math.floor(coin.x), Math.floor(coin.y), coin.size, coin.size);
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
}

// 檢查位置是否被佔用
function isPositionOccupied(x, y) {
    for (const coin of coins) {
        if (coin.settled) {
            // 檢查位置是否重疊（網格對齊）
            if (Math.abs(coin.x - x) < COIN_SIZE && Math.abs(coin.y - y) < COIN_SIZE) {
                return true;
            }
        }
    }
    return false;
}

// 找到最低可用位置
function findSettlePosition(currentX, currentY) {
    // 從地面開始向上尋找
    for (let y = GROUND_Y; y >= 0; y -= COIN_SIZE) {
        // 嘗試當前 x 位置周圍的位置，優先選擇居中位置
        const xPositions = [
            Math.round(currentX / COIN_SIZE) * COIN_SIZE, // 對齊到網格
            Math.round(currentX / COIN_SIZE) * COIN_SIZE - COIN_SIZE, // 左邊
            Math.round(currentX / COIN_SIZE) * COIN_SIZE + COIN_SIZE, // 右邊
        ];
        
        for (const x of xPositions) {
            // 保持在邊界內
            if (x < LEFT_MARGIN || x > RIGHT_MARGIN - COIN_SIZE) continue;
            
            // 檢查這個位置是否空閒且有下方支撐
            const hasSupport = y >= GROUND_Y || isPositionOccupied(x, y + COIN_SIZE);
            const isFree = !isPositionOccupied(x, y);
            
            if (isFree && hasSupport && currentY >= y - COIN_SIZE) {
                return { x, y };
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

// 頁面卸載時清理
window.addEventListener('beforeunload', cleanup);