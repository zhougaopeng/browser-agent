// overlay-init.js — 通过 --init-script 注入每个页面
// 此脚本在页面的任何 JS 执行前运行，包括导航后的新页面

window.__agentOverlay = {
  _mode: 'hidden',

  show(mode, text) {
    this._mode = mode;
    const p = mode === 'waiting'
      ? { bg: '#6B8E23', border: '#6B8E23' }
      : { bg: '#3B82F6', border: '#3B82F6' };

    let style = document.getElementById('__agent_style');
    if (!style) {
      style = document.createElement('style');
      style.id = '__agent_style';
      document.head.appendChild(style);
    }
    style.textContent = `
      @keyframes __agentPulse { 0%,100%{opacity:1} 50%{opacity:.6} }
      #__agent_bar {
        position:fixed; top:0; left:0; right:0; height:28px;
        z-index:2147483647; background:${p.bg};
        display:flex; align-items:center; padding:0 10px; gap:6px;
        font:12px/28px system-ui; color:#fff; pointer-events:none;
      }
      #__agent_bar .dot {
        width:6px;height:6px;border-radius:50%;background:#fff;
        animation:__agentPulse 1.5s ease-in-out infinite;
      }
      #__agent_frame {
        position:fixed; inset:0; z-index:2147483646;
        border:3px solid ${p.border};
        animation:__agentPulse 2s ease-in-out infinite;
        pointer-events:none;
      }
    `;
    document.body.style.marginTop = '28px';

    let bar = document.getElementById('__agent_bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = '__agent_bar';
      bar.innerHTML = '<span class="dot"></span><span class="text"></span>';
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
