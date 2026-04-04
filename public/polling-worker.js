// ポーリング用Web Worker
// バックグラウンドタブでも動作し続ける

let pollTimer = null;
let currentGenerationId = null;
let pollUrl = null;
let pollInterval = 500;
let consecutiveErrors = 0;
let startTime = null;
const MAX_CONSECUTIVE_ERRORS = 5;
const MAX_POLLING_DURATION = 5 * 60 * 1000; // 5 minutes

async function checkStatus() {
  if (!currentGenerationId || !pollUrl) return;

  // Check for max duration
  if (startTime && (Date.now() - startTime > MAX_POLLING_DURATION)) {
    self.postMessage({
      type: 'error',
      error: '献立生成の待機時間が5分を超えたため、タイムアウトしました。',
      generationId: currentGenerationId,
      isFatal: true
    });
    stopPolling();
    return;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s individual request timeout
    
    const response = await fetch(`${pollUrl}/${currentGenerationId}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    consecutiveErrors = 0;
    
    // メインスレッドに結果を送信
    self.postMessage({
      type: 'status',
      status: data.status,
      data: data,
      generationId: currentGenerationId
    });
    
    // 完了または失敗したら停止
    if (data.status === 'completed' || data.status === 'failed') {
      stopPolling();
    }
  } catch (error) {
    consecutiveErrors++;
    
    // 連続エラーが閾値を超えた場合のみエラーを報告
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      self.postMessage({
        type: 'error',
        error: `Failed to check status after ${MAX_CONSECUTIVE_ERRORS} attempts: ${error.message}`,
        generationId: currentGenerationId,
        isFatal: true
      });
      stopPolling();
    } else {
      self.postMessage({
        type: 'error',
        error: error.message,
        generationId: currentGenerationId,
        isFatal: false,
        attempt: consecutiveErrors
      });
    }
  }
}

function startPolling(generationId, url, interval) {
  // 既存のタイマーをクリア
  stopPolling();
  
  currentGenerationId = generationId;
  pollUrl = url;
  pollInterval = interval || 500;
  consecutiveErrors = 0;
  startTime = Date.now();
  
  // 即座に最初のチェックを実行
  checkStatus();
  
  // 定期的にチェック
  pollTimer = setInterval(checkStatus, pollInterval);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  currentGenerationId = null;
  consecutiveErrors = 0;
}

self.onmessage = function(e) {
  const { type, generationId, url, interval } = e.data;
  
  switch (type) {
    case 'start':
      if (generationId && url) {
        startPolling(generationId, url, interval);
      } else {
        self.postMessage({
          type: 'error',
          error: 'Missing required parameters: generationId and url',
          isFatal: true
        });
      }
      break;
    case 'stop':
      stopPolling();
      break;
  }
};
