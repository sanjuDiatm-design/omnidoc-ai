import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Bot, User, Sparkles, Copy, Check, Terminal, ArrowDown,
  Table as TableIcon, FileSpreadsheet, ListChecks, Wallet, FileText
} from 'lucide-react';

// Copy helper with a short "copied" flag and failure safety
function useCopy(duration = 2000) {
  const [copiedKey, setCopiedKey] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text, key = true) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), duration);
    } catch {
      setCopiedKey(null);
    }
  }, [duration]);

  return [copiedKey, copy];
}

// Table with 1-click CSV export
function MarkdownTable({ children }) {
  const [copiedKey, copy] = useCopy();
  const tableRef = useRef(null);

  const handleCopyCSV = () => {
    if (!tableRef.current) return;
    const rows = Array.from(tableRef.current.querySelectorAll('tr'));
    const csv = rows
      .map((row) =>
        Array.from(row.querySelectorAll('th, td'))
          .map((cell) => `"${(cell.innerText || '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    copy(csv);
  };

  return (
    <div className="chat-table-container">
      <div className="chat-table-header">
        <div className="chat-table-badge">
          <TableIcon size={13} color="var(--primary)" />
          <span>Structured Table</span>
        </div>
        <button className="chat-table-btn" onClick={handleCopyCSV} title="Copy table as CSV">
          {copiedKey ? <Check size={12} color="var(--accent-emerald)" /> : <FileSpreadsheet size={12} />}
          <span>{copiedKey ? 'CSV copied!' : 'Export CSV'}</span>
        </button>
      </div>
      <div className="chat-table-scroll">
        <table ref={tableRef} className="chat-table">
          {children}
        </table>
      </div>
    </div>
  );
}

// Code block. react-markdown v9 dropped the `inline` prop, so detect it ourselves.
function MarkdownCode({ inline, className, children, node, ...props }) {
  const [copiedKey, copy] = useCopy();
  const raw = String(children ?? '');
  const match = /language-(\w+)/.exec(className || '');
  const isInline = inline ?? (!match && !raw.includes('\n'));

  if (isInline) {
    return (
      <code className="chat-inline-code" {...props}>
        {children}
      </code>
    );
  }

  const language = match ? match[1] : '';
  const codeString = raw.replace(/\n$/, '');

  return (
    <div className="chat-code-block">
      <div className="chat-code-header">
        <div className="chat-code-lang">
          <Terminal size={12} color="var(--text-muted)" />
          <span>{language || 'code'}</span>
        </div>
        <button className="chat-table-btn" onClick={() => copy(codeString)}>
          {copiedKey ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
          <span>{copiedKey ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="chat-pre">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  table: MarkdownTable,
  code: MarkdownCode,
  pre: ({ children }) => <>{children}</>,
  h1: ({ children }) => <h3 className="chat-h1">{children}</h3>,
  h2: ({ children }) => <h3 className="chat-h2">{children}</h3>,
  h3: ({ children }) => <h4 className="chat-h3">{children}</h4>,
  h4: ({ children }) => <h5 className="chat-h4">{children}</h5>,
  ul: ({ children }) => <ul className="chat-ul">{children}</ul>,
  ol: ({ children }) => <ol className="chat-ol">{children}</ol>,
  li: ({ children }) => <li className="chat-li">{children}</li>,
  blockquote: ({ children }) => <blockquote className="chat-blockquote">{children}</blockquote>,
  p: ({ children }) => <p className="chat-p">{children}</p>,
  a: ({ href, children }) => (
    <a className="chat-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

const QUICK_PROMPTS = [
  {
    label: 'Tabulate key data',
    icon: TableIcon,
    prompt: 'Extract all key metrics, line items, and figures into a clear Markdown Table.',
  },
  {
    label: 'Executive summary',
    icon: FileText,
    prompt: 'Provide a structured executive summary with section headings and bullet points.',
  },
  {
    label: 'Amounts & dates',
    icon: Wallet,
    prompt: 'Identify all monetary amounts, fees, percentages, and dates, and organize them into a table.',
  },
  {
    label: 'Action items',
    icon: ListChecks,
    prompt: 'List any action items, deliverables, terms, or next steps in a structured checklist.',
  },
];

export default function ChatTab({ messages, isTyping, onSendMessage }) {
  const [input, setInput] = useState('');
  const [copiedMsg, copyMsg] = useCopy();
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const stickToBottom = useRef(true);

  // Auto-scroll only when the reader is already near the bottom
  useEffect(() => {
    if (stickToBottom.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const jumpToBottom = () => {
    stickToBottom.current = true;
    setShowJump(false);
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  // Auto-growing textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const send = (text) => {
    const value = text.trim();
    if (!value || isTyping) return;
    stickToBottom.current = true;
    onSendMessage(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    send(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-scroll-wrap">
        <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <Bot size={26} />
              </div>
              <h4>Ask your document anything</h4>
              <p>
                Get answers with Markdown tables, structured sections and highlighted key
                figures. Try one of these to start:
              </p>
              <div className="chat-welcome-grid">
                {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
                  <button
                    key={label}
                    className="chat-welcome-card"
                    onClick={() => send(prompt)}
                  >
                    <span className="chat-welcome-card-icon">
                      <Icon size={15} />
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`chat-bubble ${msg.role}`}>
                <div className="bubble-avatar">
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="bubble-content">
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="chat-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <div className="chat-msg-footer">
                        <button
                          className="chat-msg-copy-btn"
                          onClick={() => copyMsg(msg.content, index)}
                          title="Copy message content"
                        >
                          {copiedMsg === index ? (
                            <>
                              <Check size={12} color="var(--accent-emerald)" />
                              <span className="copied-label">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy output</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="chat-user-text">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="chat-bubble assistant">
              <div className="bubble-avatar">
                <Sparkles size={16} className="pulse" />
              </div>
              <div className="bubble-content bubble-typing">
                <span className="typing-dots" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {showJump && (
          <button className="chat-jump-btn" onClick={jumpToBottom} aria-label="Jump to latest message">
            <ArrowDown size={14} />
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="chat-quick-bar">
          <span className="chat-quick-label">
            <Sparkles size={11} color="var(--primary)" /> Format as:
          </span>
          {QUICK_PROMPTS.slice(0, 3).map(({ label, prompt }) => (
            <button
              key={label}
              className="chat-quick-chip"
              onClick={() => send(prompt)}
              disabled={isTyping}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          rows={1}
          className="chat-input chat-textarea"
          placeholder="Ask a question or request a structured breakdown…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          aria-label="Message"
        />
        <button
          type="submit"
          className="btn btn-primary chat-send-btn"
          disabled={isTyping || !input.trim()}
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </form>
      <div className="chat-hint">Enter to send · Shift+Enter for a new line</div>
    </div>
  );
}
