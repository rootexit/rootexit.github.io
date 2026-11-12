/**
 * 工具页公共剪贴板模块
 * 用法：
 *   const { copyText, bindOutput } = ToolClipboard;
 *   copyText(text);                    // 复制文本（含非安全上下文降级），返回 Promise<boolean>
 *   bindOutput(el);                    // 输出区绑定 Ctrl+A（只全选结果）/ Ctrl+X（复制选中内容）
 *   bindOutput(el, { getFullText, onCopy }); // 可选：无选中时复制的完整内容、复制完成回调
 */
(function () {
  'use strict';

  /**
   * 复制文本到剪贴板
   * @param {string} text
   * @returns {Promise<boolean>} 是否成功
   */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error('clipboard unavailable');
    } catch {
      // 非安全上下文（file:// / http）降级方案
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {}
      ta.remove();
      return ok;
    }
  }

  /**
   * 为只读输出区绑定键盘操作：
   * - Ctrl+A / Cmd+A：只全选输出区内容（避免整页被选中）
   * - Ctrl+X / Cmd+X：复制选中内容（无选中则复制全部）；输出区只读，浏览器默认禁止剪切，故剪切 = 复制
   * @param {Element} el 输出元素（textarea / input / pre 均可）
   * @param {Object} [options]
   * @param {() => string} [options.getFullText] 无选中时复制的完整内容，默认取 value / textContent
   * @param {(ok: boolean) => void} [options.onCopy] 复制完成回调（用于 toast 等提示）
   */
  function bindOutput(el, options) {
    options = options || {};
    const isFormField = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;

    function selectAll() {
      if (isFormField) {
        el.select();
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function getSelected() {
      if (isFormField) return el.value.substring(el.selectionStart, el.selectionEnd);
      return window.getSelection().toString();
    }

    function getFull() {
      if (options.getFullText) return options.getFullText();
      return isFormField ? el.value : el.textContent;
    }

    el.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.code === 'KeyA') {
        e.preventDefault();
        selectAll();
      } else if (e.code === 'KeyX') {
        const text = getSelected() || getFull();
        if (text) {
          e.preventDefault();
          copyText(text).then(ok => {
            if (options.onCopy) options.onCopy(ok);
          });
        }
      }
    });
  }

  window.ToolClipboard = { copyText, bindOutput };
})();
