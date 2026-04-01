/**
 * ClimbWise 火柴人SVG渲染模块 v3
 * 
 * 改进：
 * - 平滑帧间过渡动画
 * - 发光效果标注手点脚点
 * - 动态运动轨迹
 * - 当前步骤相关的手点/脚点高亮
 * - Beta步骤驱动的姿态控制
 */

class StickmanRenderer {
  constructor(svgElement, bgImageElement) {
    this.svg = svgElement;
    this.bgImage = bgImageElement;
    this.frames = [];
    this.currentFrame = 0;
    this.isPlaying = false;
    this.onFrameChange = null;
    this._prevPositions = null;  // 上一帧位置，用于插值
    this._animFrame = null;       // 动画帧ID
    this.betaSteps = [];          // beta步骤数据
    this.currentStepHolds = { hands: [], feet: [] }; // 当前步骤用到的手点/脚点
    this.betaSteps = [];          // beta步骤数据（用于高亮手点脚点）
  }

  /**
   * 设置beta步骤数据（用于高亮当前手点和脚点）
   * @param {Array} betaSteps - beta步骤数组，每步包含handPosition等
   */
  setBetaSteps(betaSteps) {
    this.betaSteps = betaSteps || [];
  }

  setFrames(frames) {
    this.frames = frames || [];
    this.currentFrame = 0;
    this._prevPositions = null;
    this.stop();
    this.render();
  }

  render() {
    if (!this.svg || this.frames.length === 0) return;
    const frame = this.frames[this.currentFrame];
    if (!frame) return;

    this.svg.setAttribute('viewBox', '0 0 1 1');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // 应用插值平滑
    const smoothFrame = this._prevPositions ? this._interpolate(frame, this._prevPositions, 0.3) : frame;
    this._prevPositions = JSON.parse(JSON.stringify(frame));

    const svg = this._buildSVG(smoothFrame);
    this.svg.innerHTML = svg;

    if (this.onFrameChange) {
      this.onFrameChange(this.currentFrame, this.frames.length);
    }
  }

  _interpolate(current, prev, t) {
    // 浅拷贝
    const result = JSON.parse(JSON.stringify(current));
    const lerp = (a, b, k) => a + (b - a) * k;
    const lerpPos = (c, p, k) => ({ x: lerp(c.x, p.x, k), y: lerp(c.y, p.y, k) });
    
    result.head = lerpPos(current.head, prev.head, t);
    result.hip = lerpPos(current.hip, prev.hip, t);
    result.leftArm.elbow = lerpPos(current.leftArm.elbow, prev.leftArm.elbow, t);
    result.leftArm.hand = lerpPos(current.leftArm.hand, prev.leftArm.hand, t);
    result.rightArm.elbow = lerpPos(current.rightArm.elbow, prev.rightArm.elbow, t);
    result.rightArm.hand = lerpPos(current.rightArm.hand, prev.rightArm.hand, t);
    result.leftLeg.knee = lerpPos(current.leftLeg.knee, prev.leftLeg.knee, t);
    result.leftLeg.foot = lerpPos(current.leftLeg.foot, prev.leftLeg.foot, t);
    result.rightLeg.knee = lerpPos(current.rightLeg.knee, prev.rightLeg.knee, t);
    result.rightLeg.foot = lerpPos(current.rightLeg.foot, prev.rightLeg.foot, t);
    
    return result;
  }

  _buildSVG(frame) {
    // 发光滤镜
    let defs = `
    <defs>
      <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.015" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.02" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff8c5a"/>
        <stop offset="100%" style="stop-color:#ff6b35"/>
      </linearGradient>
      <linearGradient id="arm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff8c5a"/>
        <stop offset="100%" style="stop-color:#ff6b35"/>
      </linearGradient>
      <radialGradient id="head-grad" cx="35%" cy="35%">
        <stop offset="0%" style="stop-color:#ffb088"/>
        <stop offset="100%" style="stop-color:#ff6b35"/>
      </radialGradient>
    </defs>`;

    let svg = defs;

    // 运动轨迹（显示移动方向）
    if (this._prevPositions) {
      const trail = this._getTrail(frame);
      if (trail) {
        svg += `<line x1="${trail.x1}" y1="${trail.y1}" x2="${trail.x2}" y2="${trail.y2}" 
          stroke="rgba(255,107,53,0.25)" stroke-width="0.015" stroke-linecap="round" stroke-dasharray="0.02,0.01"/>`;
      }
    }

    // --- 身体骨架 ---
    const lw = 0.009;  // 腿宽
    const aw = 0.007;  // 臂宽
    const sw = 0.012;  // 肩膀宽

    // 左腿
    svg += `<line x1="${frame.hip.x}" y1="${frame.hip.y}" x2="${frame.leftLeg.knee.x}" y2="${frame.leftLeg.knee.y}" stroke="url(#body-grad)" stroke-width="${lw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;
    svg += `<line x1="${frame.leftLeg.knee.x}" y1="${frame.leftLeg.knee.y}" x2="${frame.leftLeg.foot.x}" y2="${frame.leftLeg.foot.y}" stroke="url(#body-grad)" stroke-width="${lw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;

    // 右腿
    svg += `<line x1="${frame.hip.x}" y1="${frame.hip.y}" x2="${frame.rightLeg.knee.x}" y2="${frame.rightLeg.knee.y}" stroke="url(#body-grad)" stroke-width="${lw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;
    svg += `<line x1="${frame.rightLeg.knee.x}" y1="${frame.rightLeg.knee.y}" x2="${frame.rightLeg.foot.x}" y2="${frame.rightLeg.foot.y}" stroke="url(#body-grad)" stroke-width="${lw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;

    // 身体（头到臀部）加粗
    svg += `<line x1="${frame.head.cx}" y1="${frame.head.cy + frame.head.r}" x2="${frame.hip.x}" y2="${frame.hip.y}" stroke="url(#body-grad)" stroke-width="0.012" stroke-linecap="round" filter="url(#glow-orange)"/>`;

    // 左臂
    svg += `<line x1="${frame.hip.x - sw/2}" y1="${frame.head.cy + frame.head.r + 0.01}" x2="${frame.leftArm.elbow.x}" y2="${frame.leftArm.elbow.y}" stroke="url(#arm-grad)" stroke-width="${aw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;
    svg += `<line x1="${frame.leftArm.elbow.x}" y1="${frame.leftArm.elbow.y}" x2="${frame.leftArm.hand.x}" y2="${frame.leftArm.hand.y}" stroke="url(#arm-grad)" stroke-width="${aw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;

    // 右臂
    svg += `<line x1="${frame.hip.x + sw/2}" y1="${frame.head.cy + frame.head.r + 0.01}" x2="${frame.rightArm.elbow.x}" y2="${frame.rightArm.elbow.y}" stroke="url(#arm-grad)" stroke-width="${aw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;
    svg += `<line x1="${frame.rightArm.elbow.x}" y1="${frame.rightArm.elbow.y}" x2="${frame.rightArm.hand.x}" y2="${frame.rightArm.hand.y}" stroke="url(#arm-grad)" stroke-width="${aw}" stroke-linecap="round" filter="url(#glow-orange)"/>`;

    // --- 关节圆点 ---
    // 肩点
    svg += `<circle cx="${frame.hip.x}" cy="${frame.head.cy + frame.head.r + 0.01}" r="0.008" fill="#ff8c5a" opacity="0.9"/>`;
    // 肘点
    svg += `<circle cx="${frame.leftArm.elbow.x}" cy="${frame.leftArm.elbow.y}" r="0.006" fill="#ff8c5a" opacity="0.8"/>`;
    svg += `<circle cx="${frame.rightArm.elbow.x}" cy="${frame.rightArm.elbow.y}" r="0.006" fill="#ff8c5a" opacity="0.8"/>`;
    // 膝点
    svg += `<circle cx="${frame.leftLeg.knee.x}" cy="${frame.leftLeg.knee.y}" r="0.007" fill="#ff8c5a" opacity="0.8"/>`;
    svg += `<circle cx="${frame.rightLeg.knee.x}" cy="${frame.rightLeg.knee.y}" r="0.007" fill="#ff8c5a" opacity="0.8"/>`;

    // --- 头部 ---
    svg += `<circle cx="${frame.head.cx}" cy="${frame.head.cy}" r="${frame.head.r}" fill="url(#head-grad)" filter="url(#glow-orange)"/>`;
    // 眼睛（两个小点）
    const eyeOffset = frame.head.r * 0.3;
    const eyeY = frame.head.cy - frame.head.r * 0.1;
    svg += `<circle cx="${frame.head.cx - eyeOffset}" cy="${eyeY}" r="${frame.head.r * 0.15}" fill="#1a1a2e" opacity="0.7"/>`;
    svg += `<circle cx="${frame.head.cx + eyeOffset}" cy="${eyeY}" r="${frame.head.r * 0.15}" fill="#1a1a2e" opacity="0.7"/>`;

    // --- 手点（蓝色发光，当前步骤用到的高亮） ---
    const leftHandInStep = this._isInStepHold(frame.leftArm.hand, this.currentStepHolds.hands);
    const rightHandInStep = this._isInStepHold(frame.rightArm.hand, this.currentStepHolds.hands);
    
    // 左手
    svg += `<circle cx="${frame.leftArm.hand.x}" cy="${frame.leftArm.hand.y}" r="0.025" fill="#38bdf8" opacity="${leftHandInStep ? '0.6' : '0.25'}" filter="url(#glow-blue)"/>`;
    svg += `<circle cx="${frame.leftArm.hand.x}" cy="${frame.leftArm.hand.y}" r="${leftHandInStep ? '0.022' : '0.015'}" fill="#38bdf8" stroke="${leftHandInStep ? '#fff' : '#0ea5e9'}" stroke-width="${leftHandInStep ? '0.006' : '0.003'}"/>`;
    if (leftHandInStep) svg += `<circle cx="${frame.leftArm.hand.x}" cy="${frame.leftArm.hand.y}" r="0.035" fill="none" stroke="#38bdf8" stroke-width="0.004" opacity="0.5"/>`;
    
    // 右手
    svg += `<circle cx="${frame.rightArm.hand.x}" cy="${frame.rightArm.hand.y}" r="0.025" fill="#38bdf8" opacity="${rightHandInStep ? '0.6' : '0.25'}" filter="url(#glow-blue)"/>`;
    svg += `<circle cx="${frame.rightArm.hand.x}" cy="${frame.rightArm.hand.y}" r="${rightHandInStep ? '0.022' : '0.015'}" fill="#38bdf8" stroke="${rightHandInStep ? '#fff' : '#0ea5e9'}" stroke-width="${rightHandInStep ? '0.006' : '0.003'}"/>`;
    if (rightHandInStep) svg += `<circle cx="${frame.rightArm.hand.x}" cy="${frame.rightArm.hand.y}" r="0.035" fill="none" stroke="#38bdf8" stroke-width="0.004" opacity="0.5"/>`;

    // --- 脚点（绿色，当前步骤用到的高亮） ---
    const leftFootInStep = this._isInStepHold(frame.leftLeg.foot, this.currentStepHolds.feet);
    const rightFootInStep = this._isInStepHold(frame.rightLeg.foot, this.currentStepHolds.feet);
    const footColor = '#22c55e';
    const footGlow = 'rgba(34,197,94,0.3)';
    
    // 左脚
    svg += `<circle cx="${frame.leftLeg.foot.x}" cy="${frame.leftLeg.foot.y}" r="0.012" fill="${footColor}" opacity="${leftFootInStep ? '1' : '0.8'}"/>`;
    if (leftFootInStep) svg += `<circle cx="${frame.leftLeg.foot.x}" cy="${frame.leftLeg.foot.y}" r="0.022" fill="none" stroke="${footColor}" stroke-width="0.004" opacity="0.6"/>`;
    
    // 右脚
    svg += `<circle cx="${frame.rightLeg.foot.x}" cy="${frame.rightLeg.foot.y}" r="0.012" fill="${footColor}" opacity="${rightFootInStep ? '1' : '0.8'}"/>`;
    if (rightFootInStep) svg += `<circle cx="${frame.rightLeg.foot.x}" cy="${frame.rightLeg.foot.y}" r="0.022" fill="none" stroke="${footColor}" stroke-width="0.004" opacity="0.6"/>`;

    return svg;
  }

  _getTrail(frame) {
    if (!this._prevPositions) return null;
    const handMove = Math.hypot(
      frame.leftArm.hand.x - this._prevPositions.leftArm.hand.x,
      frame.leftArm.hand.y - this._prevPositions.leftArm.hand.y
    );
    if (handMove < 0.005) return null;
    return {
      x1: this._prevPositions.leftArm.hand.x,
      y1: this._prevPositions.leftArm.hand.y,
      x2: frame.leftArm.hand.x,
      y2: frame.leftArm.hand.y
    };
  }

  goTo(frameIndex) {
    if (frameIndex >= 0 && frameIndex < this.frames.length) {
      this.currentFrame = frameIndex;
      // 更新当前步骤用到的手点/脚点
      this._updateStepHolds(frameIndex);
      this.render();
    }
  }

  /**
   * 根据当前步骤更新用到的手点/脚点
   * 用于在岩壁图上高亮
   */
  _updateStepHolds(frameIndex) {
    if (!this.betaSteps || !this.betaSteps.length) {
      this.currentStepHolds = { hands: [], feet: [] };
      return;
    }
    
    const step = this.betaSteps[frameIndex];
    if (!step) {
      this.currentStepHolds = { hands: [], feet: [] };
      return;
    }
    
    // 从beta步骤的描述中提取用到的手点和脚点坐标
    // handPosition格式："右手伸直到(x:0.72, y:0.18)，OpenCrimp..."
    // footPosition格式："左脚内侧边缘踩在(x:0.28, y:0.55)..."
    const handMatches = step.handPosition ? [...step.handPosition.matchAll(/\(x:([\d.]+),\s*y:([\d.]+)\)/g)] : [];
    const footMatches = step.footPosition ? [...step.footPosition.matchAll(/\(x:([\d.]+),\s*y:([\d.]+)\)/g)] : [];
    
    this.currentStepHolds = {
      hands: handMatches.map(m => ({ x: parseFloat(m[1]), y: parseFloat(m[2]) })),
      feet: footMatches.map(m => ({ x: parseFloat(m[1]), y: parseFloat(m[2]) }))
    };
  }

  next() {
    if (this.currentFrame < this.frames.length - 1) {
      this.currentFrame++;
      this.render();
    }
  }

  prev() {
    if (this.currentFrame > 0) {
      this.currentFrame--;
      this.render();
    }
  }

  play(intervalMs = 900) {
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

  pause() {
    this.isPlaying = false;
    if (this._playInterval) {
      clearInterval(this._playInterval);
      this._playInterval = null;
    }
  }

  stop() {
    this.pause();
    this.currentFrame = 0;
    this._prevPositions = null;
    if (this.svg) this.svg.innerHTML = '';
  }

  getProgress() {
    return {
      current: this.currentFrame + 1,
      total: this.frames.length,
      percent: this.frames.length > 1 ? Math.round((this.currentFrame / (this.frames.length - 1)) * 100) : 0
    };
  }

  /**
   * 判断一个位置是否在当前步骤用到的手点/脚点中
   * 使用距离判断（容差0.03）
   */
  _isInStepHold(pos, stepHolds) {
    if (!stepHolds || !stepHolds.length || !pos) return false;
    const threshold = 0.03;
    return stepHolds.some(h => Math.hypot(h.x - pos.x, h.y - pos.y) < threshold);
  }
}

// ===== 手点脚点标注 =====
function renderHoldsOverlay(container, holds) {
  const old = container.querySelector('.holds-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'holds-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';

  for (const hold of holds) {
    const dot = document.createElement('div');
    const isHand = hold.type === 'hand';
    const size = isHand ? 18 : 14;
    dot.style.cssText = `
      position: absolute;
      left: ${hold.x * 100}%;
      top: ${hold.y * 100}%;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${isHand ? '#38bdf8' : '#22c55e'};
      border: 2.5px solid ${isHand ? '#0ea5e9' : '#16a34a'};
      transform: translate(-50%, -50%);
      opacity: 0.9;
      box-shadow: 0 2px 8px ${isHand ? 'rgba(56,189,248,0.5)' : 'rgba(34,197,94,0.5)'};
    `;
    overlay.appendChild(dot);
  }
  container.appendChild(overlay);
}

function clearHoldsOverlay(container) {
  const overlay = container.querySelector('.holds-overlay');
  if (overlay) overlay.remove();
}

window.ClimbStickman = { StickmanRenderer, renderHoldsOverlay, clearHoldsOverlay };
