// overlay-init.js — 通过 --init-script 注入每个页面
// 此脚本在页面的任何 JS 执行前运行，包括导航后的新页面

window.__agentOverlay = {
  _mode: 'hidden',

  show(mode, text) {
    this._mode = mode;
    const isWaiting = mode === 'waiting';
    const color = isWaiting ? '#6B8E23' : '#3B82F6';
    const colorLight = isWaiting ? '#8DB600' : '#60A5FA';

    let style = document.getElementById('__agent_style');
    if (!style) {
      style = document.createElement('style');
      style.id = '__agent_style';
      document.head.appendChild(style);
    }
    style.textContent = `
      @keyframes __agentGlow {
        0%,100% { box-shadow: inset 0 0 6px 2px ${color}; border-color: ${color}; }
        50%     { box-shadow: inset 0 0 12px 4px ${colorLight}; border-color: ${colorLight}; }
      }
      @keyframes __agentDot {
        0%,80%,100% { transform: scale(0.4); opacity: 0.3; }
        40% { transform: scale(1); opacity: 1; }
      }
      #__agent_bar {
        position: fixed; top: 0; left: 0; right: 0; height: 28px;
        z-index: 2147483647; background: ${color};
        display: flex; align-items: center; padding: 0 12px; gap: 8px;
        font: 500 12px/28px system-ui, -apple-system, sans-serif;
        color: #fff; pointer-events: none;
      }
      #__agent_bar .dots {
        display: flex; gap: 3px; align-items: center;
      }
      #__agent_bar .dots span {
        width: 5px; height: 5px; border-radius: 50%; background: #fff;
        animation: __agentDot 1.4s ease-in-out infinite;
      }
      #__agent_bar .dots span:nth-child(2) { animation-delay: 0.16s; }
      #__agent_bar .dots span:nth-child(3) { animation-delay: 0.32s; }
      #__agent_frame {
        position: fixed; inset: 0; z-index: 2147483646;
        pointer-events: none;
        border: 3px solid ${color};
        animation: __agentGlow 1.5s ease-in-out infinite;
      }
    `;
    document.body.style.marginTop = '28px';

    let bar = document.getElementById('__agent_bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = '__agent_bar';
      bar.innerHTML = '<div class="dots"><span></span><span></span><span></span></div><span class="text"></span>';
      document.body.appendChild(bar);
    }
    bar.querySelector('.text').textContent = text || 'AI Agent 自动执行中...';

    if (!document.getElementById('__agent_frame')) {
      const frame = document.createElement('div');
      frame.id = '__agent_frame';
      document.body.appendChild(frame);
    }
  },

  hide() {
    this._mode = 'hidden';
    document.getElementById('__agent_style')?.remove();
    document.getElementById('__agent_bar')?.remove();
    document.getElementById('__agent_frame')?.remove();
    document.body.style.removeProperty('margin-top');
  }
};
