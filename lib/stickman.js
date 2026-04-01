/**
 * ClimbWise 火柴人SVG渲染模块
 * 
 * 功能：
 * - 在岩壁照片上叠加火柴人动画
 * - 帧序列播放控制
 * - 手点脚点标注
 */

class StickmanRenderer {
  constructor(svgElement, bgImageElement) {
    this.svg = svgElement;        // <svg> 元素
    this.bgImage = bgImageElement; // <img> 背景元素
    this.frames = [];             // 帧数据
    this.currentFrame = 0;
    this.isPlaying = false;
    this.onFrameChange = null;    // 回调：帧变化时
  }

  /**
   * 设置帧数据
   * @param {Array} frames - 帧数组
   */
  setFrames(frames) {
    this.frames = frames || [];
    this.currentFrame = 0;
    this.render();
  }

  /**
   * 渲染当前帧
   */
  render() {
    if (!this.svg || this.frames.length === 0) return;
    
    const frame = this.frames[this.currentFrame];
    if (!frame) return;
    
    // 设置viewBox为0-1归一化坐标系
    this.svg.setAttribute('viewBox', '0 0 1 1');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    let svg = '';
    
    // 头
    svg += `<circle cx="${frame.head.cx}" cy="${frame.head.cy}" r="${frame.head.r}" fill="#f97316" stroke="#f97316" stroke-width="0.005"/>`;
    
    // 身体（头到臀部）
    svg += `<line x1="${frame.head.cx}" y1="${frame.head.cy + frame.head.r}" x2="${frame.hip.x}" y2="${frame.hip.y}" stroke="#f97316" stroke-width="0.008" stroke-linecap="round"/>`;
    
    // 左臂
    svg += `<line x1="${frame.hip.x}" y1="${frame.hip.y - 0.02}" x2="${frame.leftArm.elbow.x}" y2="${frame.leftArm.elbow.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    svg += `<line x1="${frame.leftArm.elbow.x}" y1="${frame.leftArm.elbow.y}" x2="${frame.leftArm.hand.x}" y2="${frame.leftArm.hand.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    
    // 右臂
    svg += `<line x1="${frame.hip.x}" y1="${frame.hip.y - 0.02}" x2="${frame.rightArm.elbow.x}" y2="${frame.rightArm.elbow.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    svg += `<line x1="${frame.rightArm.elbow.x}" y1="${frame.rightArm.elbow.y}" x2="${frame.rightArm.hand.x}" y2="${frame.rightArm.hand.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    
    // 左腿
    svg += `<line x1="${frame.hip.x}" y1="${frame.hip.y}" x2="${frame.leftLeg.knee.x}" y2="${frame.leftLeg.knee.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    svg += `<line x1="${frame.leftLeg.knee.x}" y1="${frame.leftLeg.knee.y}" x2="${frame.leftLeg.foot.x}" y2="${frame.leftLeg.foot.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    
    // 右腿
    svg += `<line x1="${frame.hip.x}" y1="${frame.hip.y}" x2="${frame.rightLeg.knee.x}" y2="${frame.rightLeg.knee.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    svg += `<line x1="${frame.rightLeg.knee.x}" y1="${frame.rightLeg.knee.y}" x2="${frame.rightLeg.foot.x}" y2="${frame.rightLeg.foot.y}" stroke="#f97316" stroke-width="0.006" stroke-linecap="round"/>`;
    
    // 手点（蓝色圆圈，更大更显眼）
    svg += `<circle cx="${frame.leftArm.hand.x}" cy="${frame.leftArm.hand.y}" r="0.02" fill="#38bdf8" stroke="#0f172a" stroke-width="0.003"/>`;
    svg += `<circle cx="${frame.rightArm.hand.x}" cy="${frame.rightArm.hand.y}" r="0.02" fill="#38bdf8" stroke="#0f172a" stroke-width="0.003"/>`;
    
    // 脚点（绿色圆圈）
    svg += `<circle cx="${frame.leftLeg.foot.x}" cy="${frame.leftLeg.foot.y}" r="0.015" fill="#22c55e" stroke="#0f172a" stroke-width="0.003"/>`;
    svg += `<circle cx="${frame.rightLeg.foot.x}" cy="${frame.rightLeg.foot.y}" r="0.015" fill="#22c55e" stroke="#0f172a" stroke-width="0.003"/>`;
    
    this.svg.innerHTML = svg;
    
    // 回调
    if (this.onFrameChange) {
      this.onFrameChange(this.currentFrame, this.frames.length);
    }
  }

  /**
   * 下一帧
   */
  next() {
    if (this.currentFrame < this.frames.length - 1) {
      this.currentFrame++;
      this.render();
    }
  }

  /**
   * 上一帧
   */
  prev() {
    if (this.currentFrame > 0) {
      this.currentFrame--;
      this.render();
    }
  }

  /**
   * 跳到指定帧
   */
  goTo(frameIndex) {
    if (frameIndex >= 0 && frameIndex < this.frames.length) {
      this.currentFrame = frameIndex;
      this.render();
    }
  }

  /**
   * 播放动画
   * @param {number} intervalMs - 每帧间隔（毫秒）
   */
  play(intervalMs = 800) {
    if (this.isPlaying) return;
    if (this.frames.length <= 1) return;
    
    this.isPlaying = true;
    this._playInterval = setInterval(() => {
      if (this.currentFrame < this.frames.length - 1) {
        this.currentFrame++;
        this.render();
      } else {
        this.pause();
      }
    }, intervalMs);
  }

  /**
   * 暂停
   */
  pause() {
    this.isPlaying = false;
    if (this._playInterval) {
      clearInterval(this._playInterval);
      this._playInterval = null;
    }
  }

  /**
   * 停止并重置
   */
  stop() {
    this.pause();
    this.currentFrame = 0;
    this.render();
  }

  /**
   * 获取当前帧/总帧数
   */
  getProgress() {
    return {
      current: this.currentFrame + 1,
      total: this.frames.length,
      percent: this.frames.length > 0 ? Math.round((this.currentFrame / (this.frames.length - 1)) * 100) : 0
    };
  }
}

// ===== 手点脚点标注渲染 =====

/**
 * 在SVG上标注所有手点和脚点
 * @param {HTMLElement} container - 容器div
 * @param {Array} holds - 手点脚点数组
 */
function renderHoldsOverlay(container, holds) {
  // 清除旧的标注
  const old = container.querySelector('.holds-overlay');
  if (old) old.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'holds-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  
  for (const hold of holds) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      left: ${hold.x * 100}%;
      top: ${hold.y * 100}%;
      width: ${hold.type === 'hand' ? '16px' : '12px'};
      height: ${hold.type === 'hand' ? '16px' : '12px'};
      border-radius: 50%;
      background: ${hold.type === 'hand' ? '#38bdf8' : '#22c55e'};
      border: 2px solid ${hold.type === 'hand' ? '#0f172a' : '#0f172a'};
      transform: translate(-50%, -50%);
      opacity: 0.9;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    `;
    overlay.appendChild(dot);
  }
  
  container.appendChild(overlay);
}

/**
 * 清除标注
 */
function clearHoldsOverlay(container) {
  const overlay = container.querySelector('.holds-overlay');
  if (overlay) overlay.remove();
}

// ===== 导出 =====

window.ClimbStickman = {
  StickmanRenderer,
  renderHoldsOverlay,
  clearHoldsOverlay
};
