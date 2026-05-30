import { useState, useEffect, useRef } from 'react';

const QUICK_CHIPS = [
  { label: '🔥 Trending', query: 'trending events' },
  { label: '💰 Cheapest', query: 'cheapest events' },
  { label: '🛠️ Workshops', query: 'show workshops' },
  { label: '💻 Technical', query: 'technical events' },
  { label: '🎫 Available', query: 'events with tickets available' },
  { label: '🤖 AI Events', query: 'AI and data science events' },
];

function buildQueryEngine(events) {
  return function processQuery(input) {
    const q = input.toLowerCase().trim();

    if (!events || events.length === 0) {
      return { text: "I'm still loading event data. Please try again in a moment! 🔄" };
    }

    // ── GREETINGS ──────────────────────────────────────────────
    if (/^(hi|hello|hey|hii|helo|howdy|sup)\b/.test(q)) {
      return {
        text: "Hey there! 👋 I'm your EventSphere assistant. I can help you find events by department, price, popularity, and more. What are you looking for?",
      };
    }

    if (/help|what can you do|commands/.test(q)) {
      return {
        text: "Here's what I can help you with:\n\n• 🔥 **Trending events** — popular picks\n• 💰 **Price queries** — e.g. 'events under ₹200'\n• 🏛️ **Department** — e.g. 'show CSE events'\n• 🛠️ **Category** — e.g. 'show workshops'\n• 🎫 **Availability** — 'events with tickets left'\n• 📅 **Upcoming** — 'next event'\n• 💡 **Suggestions** — 'suggest an event for me'",
      };
    }

    // ── TRENDING / POPULARITY ───────────────────────────────────
    if (/trending|popular|hot|most booked|highly rated|top|best|famous|loved|hit|craze|hyped|viral/.test(q)) {
      const sorted = [...events]
        .filter(e => e.availableTickets > 0)
        .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
        .slice(0, 3);
      return {
        text: `🔥 Here are the hottest events on campus right now! These are selling out fast:`,
        events: sorted,
      };
    }

    // ── CHEAPEST / PRICE ───────────────────────────────────────
    if (/cheapest|cheapest event|lowest price|budget|free|most affordable|inexpensive|low cost|pocket friendly|cheap/.test(q)) {
      const sorted = [...events]
        .filter(e => e.availableTickets > 0)
        .sort((a, b) => parseFloat(a.ticketPrice) - parseFloat(b.ticketPrice))
        .slice(0, 3);
      const lowest = parseFloat(sorted[0]?.ticketPrice || 0).toFixed(0);
      return {
        text: `💰 Looking for value? The most affordable events start at just ₹${lowest}:`,
        events: sorted,
      };
    }

    const underMatch = q.match(/under\s*[₹rs]?\s*(\d+)|less than\s*[₹rs]?\s*(\d+)|below\s*[₹rs]?\s*(\d+)|max\s*[₹rs]?\s*(\d+)/);
    if (underMatch) {
      const limit = parseInt(underMatch[1] || underMatch[2] || underMatch[3] || underMatch[4]);
      const filtered = events.filter(e => parseFloat(e.ticketPrice) <= limit && e.availableTickets > 0);
      if (filtered.length === 0) {
        return { text: `😕 No available events found under ₹${limit}. Try a higher budget!` };
      }
      return {
        text: `💸 Found ${filtered.length} event(s) under ₹${limit}:`,
        events: filtered.slice(0, 4),
      };
    }

    const overMatch = q.match(/over\s*[₹rs]?\s*(\d+)|more than\s*[₹rs]?\s*(\d+)|above\s*[₹rs]?\s*(\d+)|min\s*[₹rs]?\s*(\d+)/);
    if (overMatch) {
      const limit = parseInt(overMatch[1] || overMatch[2] || overMatch[3] || overMatch[4]);
      const filtered = events.filter(e => parseFloat(e.ticketPrice) >= limit && e.availableTickets > 0);
      if (filtered.length === 0) {
        return { text: `😕 No events found above ₹${limit}.` };
      }
      return {
        text: `💎 Found ${filtered.length} premium event(s) above ₹${limit}:`,
        events: filtered.slice(0, 4),
      };
    }

    // ── ALMOST SOLD OUT / AVAILABILITY ──────────────────────────
    if (/almost sold out|selling fast|last few|limited seats|hurry|running out|filling up/.test(q)) {
      const filtered = events
        .filter(e => e.availableTickets > 0 && (e.availableTickets / e.totalTickets) < 0.2)
        .sort((a, b) => a.availableTickets - b.availableTickets)
        .slice(0, 3);
      if (filtered.length === 0) {
        return { text: "Great news! No events are critically low on tickets right now. 🎉" };
      }
      return {
        text: `⚡ These events are almost sold out — book fast before they're gone!`,
        events: filtered,
      };
    }

    if (/available|tickets left|has tickets|open|not sold out|seats left|any tickets|can i book|spots available|still open|not full/.test(q)) {
      const filtered = events.filter(e => e.availableTickets > 0).slice(0, 4);
      return {
        text: `🎫 There are ${events.filter(e => e.availableTickets > 0).length} events with tickets still available. Here are some great picks:`,
        events: filtered,
      };
    }

    if (/sold out|no tickets|full|fully booked|no seats|housefull|closed/.test(q)) {
      const filtered = events.filter(e => e.availableTickets === 0);
      if (filtered.length === 0) return { text: "All events currently have tickets available! 🎉 Go book one now." };
      return {
        text: `These events are completely sold out (${filtered.length} total). Better luck next time! 😔`,
        events: filtered.slice(0, 3),
      };
    }

    // ── DEPARTMENT QUERIES ──────────────────────────────────────
    const deptKeywords = {
      'it': 'IT',
      'information technology': 'IT',
      'cse': 'CSE',
      'computer science': 'CSE',
      'ece': 'ECE',
      'electronics': 'ECE',
      'mechanical': 'Mechanical',
      'civil': 'Civil',
      'electrical': 'Electrical',
      'ai': 'AI & Data Science',
      'artificial intelligence': 'AI & Data Science',
      'data science': 'AI & Data Science',
      'machine learning': 'AI & Data Science',
      'cyber': 'Cyber Security',
      'cyber security': 'Cyber Security',
      'cybersecurity': 'Cyber Security',
      'security': 'Cyber Security',
    };

    for (const [keyword, dept] of Object.entries(deptKeywords)) {
      if (q.includes(keyword)) {
        const filtered = events.filter(e =>
          e.department?.toLowerCase() === dept.toLowerCase() && e.availableTickets > 0
        );
        if (filtered.length === 0) {
          return { text: `😕 No available events found for the ${dept} department right now. Check back later!` };
        }
        return {
          text: `🏛️ Here are the available events from the **${dept}** department:`,
          events: filtered.slice(0, 4),
        };
      }
    }

    // ── CATEGORY QUERIES ────────────────────────────────────────
    if (/workshop|hands.?on|practical/.test(q)) {
      const filtered = events.filter(e => e.category === 'Workshops' && e.availableTickets > 0);
      if (filtered.length === 0) return { text: "No workshops are available right now. Check back soon! 🛠️" };
      return {
        text: `🛠️ Here are the workshops you can sign up for right now:`,
        events: filtered.slice(0, 4),
      };
    }

    if (/seminar|talk|lecture|speaker/.test(q)) {
      const filtered = events.filter(e => e.category === 'Seminars' && e.availableTickets > 0);
      if (filtered.length === 0) return { text: "No seminars are available right now. 🎙️" };
      return {
        text: `🎙️ Great picks for knowledge seekers! Here are the upcoming seminars:`,
        events: filtered.slice(0, 4),
      };
    }

    if (/technical|tech|coding|programming|hackathon/.test(q)) {
      const filtered = events.filter(e => e.category === 'Technical' && e.availableTickets > 0);
      if (filtered.length === 0) return { text: "No technical events available right now. 💻" };
      return {
        text: `💻 Here are the top technical events for you:`,
        events: filtered.slice(0, 4),
      };
    }

    if (/non.?technical|fun|cultural|entertainment|games/.test(q)) {
      const filtered = events.filter(e => e.category === 'Non-Technical' && e.availableTickets > 0);
      if (filtered.length === 0) return { text: "No non-technical events right now. 🎯" };
      return {
        text: `🎯 Looking for some fun? Here are non-technical events to enjoy:`,
        events: filtered.slice(0, 4),
      };
    }

    // ── DATE / UPCOMING ─────────────────────────────────────────
    if (/upcoming|next|soon|this week|today|latest|new|recently added|coming up|future events/.test(q)) {
      const now = new Date();
      const sorted = [...events]
        .filter(e => new Date(e.dateTime) > now && e.availableTickets > 0)
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
        .slice(0, 3);
      if (sorted.length === 0) return { text: "No upcoming events found at the moment. Stay tuned! 📅" };
      const next = sorted[0];
      return {
        text: `📅 The next event is **${next.name}** on ${new Date(next.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}. Here are the upcoming events:`,
        events: sorted,
      };
    }

    // ── SUGGEST / RECOMMEND ──────────────────────────────────────
    if (/suggest|recommend|which should i|best event|what to attend|surprise me|random|help me choose|i don't know what to attend|pick for me|ideas|give me an idea/.test(q)) {
      const available = events.filter(e => e.availableTickets > 0);
      if (available.length === 0) return { text: "Sadly, all events are sold out right now. 😔" };
      const sorted = [...available].sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
      const pick = sorted[Math.floor(Math.random() * Math.min(sorted.length, 5))]; // Pick randomly from top 5
      return {
        text: `💡 My top recommendation for you is **${pick.name}** from the ${pick.department} department — it's one of the most sought-after events right now with ${pick.availableTickets} seats remaining!`,
        events: [pick],
      };
    }

    // ── SHOW ALL ─────────────────────────────────────────────────
    if (/all events|show all|list all|every event/.test(q)) {
      return {
        text: `📋 There are ${events.length} events on campus. Here's a taste — use the department or category filters for more:`,
        events: events.filter(e => e.availableTickets > 0).slice(0, 4),
      };
    }

    // ── FALLBACK ─────────────────────────────────────────────────
    return {
      text: `🤔 I'm not sure about that one! Try asking me about:\n• "trending events"\n• "workshops"\n• "events under ₹300"\n• "CSE department events"\n• "suggest an event for me"`,
    };
  };
}

function EventCard({ event, onClick }) {
  const pct = event.totalTickets > 0 ? (event.availableTickets / event.totalTickets) * 100 : 0;
  const status = event.availableTickets === 0 ? 'sold-out' : pct < 20 ? 'almost' : 'available';
  const statusLabel = event.availableTickets === 0 ? 'Sold Out' : pct < 20 ? '⚡ Almost Gone' : '✅ Available';

  return (
    <div className="chat-event-card" onClick={() => onClick(event)}>
      <img
        src={event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&h=120&fit=crop'}
        alt={event.name}
        className="chat-event-card__img"
      />
      <div className="chat-event-card__body">
        <div className="chat-event-card__dept">{event.department}</div>
        <div className="chat-event-card__name">{event.name}</div>
        <div className="chat-event-card__footer">
          <span className="chat-event-card__price">₹{parseFloat(event.ticketPrice).toFixed(0)}</span>
          <span className={`chat-event-card__status chat-event-card__status--${status}`}>{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg--bot">
      <div className="chat-bubble chat-bubble--bot chat-typing">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
}

export default function EventAssistant({ events, onEventClick }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! 👋 I'm your EventSphere assistant. Need help finding the perfect event? Ask me anything, or use the quick buttons below!", timestamp: new Date() }
  ]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const processQuery = buildQueryEngine(events);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = (text) => {
    const query = text || input.trim();
    if (!query) return;
    setInput('');

    const userMsg = { role: 'user', text: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    // Simulate thinking delay
    const delay = 600 + Math.random() * 600;
    setTimeout(() => {
      const result = processQuery(query);
      const botMsg = { role: 'bot', ...result, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, delay);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEventClick = (event) => {
    setOpen(false);
    onEventClick(event);
  };

  // Format text with basic markdown (bold, newlines)
  const formatText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        className={`assistant-fab ${open ? 'assistant-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Open Event Assistant"
      >
        {open ? '✕' : '🤖'}
        {!open && <span className="assistant-fab__pulse"></span>}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="assistant-window">
          {/* Header */}
          <div className="assistant-header">
            <div className="assistant-header__avatar">🤖</div>
            <div>
              <div className="assistant-header__name">EventSphere Assistant</div>
              <div className="assistant-header__status">● Online • Powered by smart logic</div>
            </div>
            <button className="assistant-header__close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="assistant-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="chat-bubble chat-bubble--bot">
                    <p>{formatText(msg.text)}</p>
                    {msg.events && msg.events.length > 0 && (
                      <div className="chat-events-list">
                        {msg.events.map(ev => (
                          <EventCard key={ev.id} event={ev} onClick={handleEventClick} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="chat-bubble chat-bubble--user">{msg.text}</div>
                )}
              </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick Chips */}
          <div className="assistant-chips">
            {QUICK_CHIPS.map(chip => (
              <button key={chip.label} className="assistant-chip" onClick={() => sendMessage(chip.query)}>
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="assistant-input-bar">
            <input
              ref={inputRef}
              className="assistant-input"
              placeholder="Ask about events..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="assistant-send"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
