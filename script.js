const API_KEY = "AIzaSyCoE4psjYwGvQ4Vgl6Yk93J3iBGvvQdILk";

// Performance optimizations
const RESPONSE_CACHE = new Map();
const MAX_CACHE_SIZE = 50;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Cache management functions
function getCacheKey(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedResponse(text) {
  const key = getCacheKey(text);
  const cached = RESPONSE_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.response;
  }
  return null;
}

function setCachedResponse(text, response) {
  const key = getCacheKey(text);
  if (RESPONSE_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = RESPONSE_CACHE.keys().next().value;
    RESPONSE_CACHE.delete(firstKey);
  }
  RESPONSE_CACHE.set(key, {
    response: response,
    timestamp: Date.now()
  });
}

// Chat history management
let chatHistory = [];
let currentChatId = null;
let conversationContext = [];

// Initialize
function init() {
  loadChatHistory();
  if (chatHistory.length > 0) {
    loadChat(chatHistory[0].id);
  } else {
    createNewChat();
  }
  
  setupMobileOptimizations();
  updateEventListenersForMobile();
}

// Mobile-specific optimizations
function setupMobileOptimizations() {
  // Prevent zoom on input focus for iOS
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      setTimeout(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
      }, 100);
    });
    
    input.addEventListener('blur', function() {
      setTimeout(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
      }, 100);
    });
  });
  
  // Handle virtual keyboard appearance
  window.addEventListener('resize', function() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setTimeout(scrollToBottom, 300);
    }
  });
}

// Enhanced send message for mobile
function mobileSendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  
  sendMessage();
  
  // On mobile, blur the input to hide keyboard after sending
  if (window.innerWidth <= 768) {
    setTimeout(() => {
      inputEl.blur();
    }, 100);
  }
}

// Update event listeners for mobile
function updateEventListenersForMobile() {
  // Update send functionality with mobile-optimized version
  sendBtn.addEventListener("click", mobileSendMessage);
  
  // Update enter key behavior
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      mobileSendMessage();
    }
  });
  
  // Update history panel for mobile
  document.getElementById("showHistory").addEventListener("click", showMobileHistoryPanel);
}

// Enhanced history panel for mobile
function showMobileHistoryPanel() {
  showHistoryPanel();
  
  // On mobile, add a close button at the bottom for easier access
  if (window.innerWidth <= 768) {
    const historyPanel = document.getElementById("historyPanel");
    let mobileCloseBtn = historyPanel.querySelector('.mobile-close-btn');
    if (!mobileCloseBtn) {
      mobileCloseBtn = document.createElement('button');
      mobileCloseBtn.className = 'mobile-close-btn';
      mobileCloseBtn.textContent = 'Close History';
      mobileCloseBtn.style.cssText = `
        position: sticky;
        bottom: 0;
        width: 100%;
        padding: 15px;
        background: #1a202c;
        border: none;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        border-top: 1px solid #2d3748;
      `;
      mobileCloseBtn.onclick = closeHistoryPanel;
      historyPanel.appendChild(mobileCloseBtn);
    }
  }
}

// Create a new chat
function createNewChat() {
  const newChatId = 'chat_' + Date.now();
  currentChatId = newChatId;
  
  const newChat = {
    id: newChatId,
    title: "New Chat",
    messages: [],
    timestamp: Date.now()
  };
  
  chatHistory.unshift(newChat);
  saveChatHistory();
  
  document.getElementById("messages").innerHTML = "";
  conversationContext = [];
  
  updateHistoryUI();
  
  return newChatId;
}

// Save chat to history
function saveChatToHistory(message, isUser) {
  if (!currentChatId) return;
  
  const chatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
  if (chatIndex === -1) return;
  
  chatHistory[chatIndex].messages.push({
    text: message,
    isUser: isUser,
    timestamp: Date.now()
  });
  
  if (isUser && chatHistory[chatIndex].title === "New Chat") {
    const title = message.split(' ').slice(0, 4).join(' ') + '...';
    chatHistory[chatIndex].title = title;
  }
  
  saveChatHistory();
  updateHistoryUI();
}

// Load a specific chat
function loadChat(chatId) {
  const chat = chatHistory.find(chat => chat.id === chatId);
  if (!chat) return;
  
  currentChatId = chatId;
  conversationContext = [];
  
  const messagesEl = document.getElementById("messages");
  messagesEl.innerHTML = "";
  
  chat.messages.forEach(msg => {
    createMessage(msg.text, msg.isUser);
    
    if (msg.isUser) {
      conversationContext.push({ role: "user", parts: [{ text: msg.text }] });
    } else {
      conversationContext.push({ role: "model", parts: [{ text: msg.text }] });
    }
  });
  
  updateHistoryUI();
  scrollToBottom();
}

// Delete a chat
function deleteChat(chatId) {
  chatHistory = chatHistory.filter(chat => chat.id !== chatId);
  
  if (currentChatId === chatId) {
    if (chatHistory.length > 0) {
      loadChat(chatHistory[0].id);
    } else {
      createNewChat();
    }
  }
  
  saveChatHistory();
  updateHistoryUI();
}

// Save chat history to localStorage
function saveChatHistory() {
  localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Load chat history from localStorage
function loadChatHistory() {
  const savedHistory = localStorage.getItem('chatHistory');
  if (savedHistory) {
    try {
      chatHistory = JSON.parse(savedHistory);
    } catch (e) {
      console.error('Error loading chat history:', e);
      chatHistory = [];
    }
  }
}

// Update the history UI panel
function updateHistoryUI() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = '';
  
  chatHistory.forEach(chat => {
    const historyItem = document.createElement("div");
    historyItem.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
    
    const title = document.createElement("div");
    title.className = "history-item-title";
    title.textContent = chat.title;
    
    const preview = document.createElement("div");
    preview.className = "history-item-preview";
    
    if (chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      preview.textContent = lastMessage.text.substring(0, 50) + 
                            (lastMessage.text.length > 50 ? '...' : '');
    } else {
      preview.textContent = "No messages yet";
    }
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chat-history-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.style.marginTop = "8px";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    };
    
    historyItem.appendChild(title);
    historyItem.appendChild(preview);
    historyItem.appendChild(deleteBtn);
    
    historyItem.onclick = () => {
      loadChat(chat.id);
      closeHistoryPanel();
    };
    
    historyList.appendChild(historyItem);
  });
}

// Show history panel
function showHistoryPanel() {
  document.getElementById("historyPanel").classList.add("open");
  document.getElementById("historyOverlay").classList.add("open");
}

// Close history panel
function closeHistoryPanel() {
  document.getElementById("historyPanel").classList.remove("open");
  document.getElementById("historyOverlay").classList.remove("open");
}

// Debounce
function debounce(fn, delay = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Clipboard
async function copyText(text) {
  if (!navigator.clipboard || !navigator.clipboard.writeText)
    throw new Error("Clipboard unsupported");
  await navigator.clipboard.writeText(text);
}

// Elements
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendButton");
const voiceBtn = document.getElementById("voiceButton");
let recognition = null;
let isListening = false;

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function toast(msg) {
  clearTimeout(window.__toastTimer);
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    Object.assign(t.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "rgba(255,255,255,0.9)",
      color: "#0b0f1f",
      padding: "10px 14px",
      borderRadius: "10px",
      boxShadow: "0 6px 18px rgba(0,0,0,.2)",
      zIndex: 9999,
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  window.__toastTimer = setTimeout(() => {
    t.style.opacity = "0";
  }, 1200);
}

// Enhanced function to format professional responses
function formatAnswerWithCode(text) {
  const codeBlockRegex = /(```|~~~)([\s\S]*?)(```|~~~)/g;
  let lastIndex = 0;
  let html = '';
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      html += formatTextAnswer(text.substring(lastIndex, match.index));
    }
    
    const codeContent = match[2].trim();
    const language = extractLanguage(codeContent);
    const escaped = escapeHtml(codeContent);
    html += `
      <div class="code-container">
        <div class="code-header">
          <span class="code-language">${language.toUpperCase()}</span>
          <button class="code-copy-btn" data-code="${encodeURIComponent(codeContent)}">Copy Code</button>
        </div>
        <pre class="code-content language-${language} rgb-code ${language}">${escaped}</pre>
      </div>
    `;
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    html += formatTextAnswer(text.substring(lastIndex));
  }
  
  if (lastIndex === 0) {
    html = `<div class="explanation-content">${formatTextAnswer(text)}</div>`;
  }
  
  return html;
}

// Extract programming language from code content
function extractLanguage(codeContent) {
  const firstLine = codeContent.split('\n')[0].toLowerCase();
  if (firstLine.includes('html') || firstLine.includes('<!doctype')) return 'html';
  if (firstLine.includes('css') || firstLine.includes('@import')) return 'css';
  if (firstLine.includes('javascript') || firstLine.includes('js') || firstLine.includes('function')) return 'javascript';
  if (firstLine.includes('python')) return 'python';
  if (firstLine.includes('react') || firstLine.includes('jsx')) return 'jsx';
  if (firstLine.includes('vue')) return 'vue';
  if (firstLine.includes('php')) return 'php';
  if (firstLine.includes('sql')) return 'sql';
  return 'generic';
}

// Clean text formatting for better readability
function formatTextAnswer(text) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  let html = esc(text)
    .replace(/^### (.*)$/gm, "<h3 class='section-header'>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2 class='main-header'>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1 class='title-header'>$1</h1>")
    .replace(/^- (.*)$/gm, "<li class='list-item'>$1</li>")
    .replace(/^\d+\. (.*)$/gm, "<li class='numbered-item'>$1</li>")
    .replace(/\*\*(.*?)\*\*/g, "<strong class='emphasis'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em class='highlight'>$1</em>")
    .replace(/`(.*?)`/g, "<code class='inline-code'>$1</code>");
  
  html = html.replace(/(<li class='list-item'>[\s\S]*?<\/li>)/g, "<ul class='bullet-list'>$1</ul>");
  html = html.replace(/(<li class='numbered-item'>[\s\S]*?<\/li>)/g, "<ol class='numbered-list'>$1</ol>");
  
  html = html.split(/\n{2,}/).map((p) => {
    if (p.trim()) {
      return `<p class='content-paragraph'>${p}</p>`;
    }
    return '';
  }).join("");
  
  return `<div class="explanation-content professional-response">${html}</div>`;
}

// Escape HTML for safe insertion
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createMessage(text, isUser = false, skeleton = false) {
  const div = document.createElement("div");
  div.className = "message " + (isUser ? "user" : "assistant");
  if (skeleton) div.classList.add("bot-skeleton");

  if (!isUser) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'A';

    const bubble = document.createElement('div');
    bubble.className = 'bubble msg-content';
    bubble.innerHTML = skeleton ? text : formatAnswerWithCode(text);

    div.appendChild(avatar);
    div.appendChild(bubble);

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy All";
    btn.addEventListener("click", () => {
      copyText(stripHtml(text)).then(() => toast("Copied!"));
    });
    bubble.appendChild(btn);

    requestAnimationFrame(() => {
      const codeCopyButtons = div.querySelectorAll('.code-copy-btn');
      codeCopyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const encoded = e.target.getAttribute('data-code') || '';
          const decoded = decodeURIComponent(encoded);
          copyText(decoded).then(() => {
            toast("Code copied!");
            const prev = e.target.textContent;
            e.target.textContent = "Copied!";
            setTimeout(() => { e.target.textContent = prev; }, 1500);
          }).catch(() => toast('Copy failed'));
        });
      });

      const pres = div.querySelectorAll('pre');
      pres.forEach(p => {
        try { Prism.highlightElement(p); } catch (e) { /* ignore */ }
      });
    });

  } else {
    const c = document.createElement("div");
    c.className = "msg-content";
    c.textContent = text;
    div.appendChild(c);
  }

  messagesEl.appendChild(div);
  requestAnimationFrame(() => scrollToBottom());
  return div;
}

// Clean system prompt for better responses
const SYSTEM_PROMPT = `You are QuantumSyntax, an expert AI assistant for web development and programming. Provide helpful, well-organized responses with:

- Clear explanations and complete code solutions
- Proper formatting with headers and lists when helpful
- Working code examples with comments
- Best practices and tips
- Professional but friendly tone

Focus on being helpful and practical. Use markdown formatting for better readability.`;

// Simple function to enhance user prompts
function enhanceUserPrompt(userText) {
  const lowerText = userText.toLowerCase();
  
  if (lowerText.includes('frontend') || lowerText.includes('html') || lowerText.includes('css') || 
      lowerText.includes('javascript') || lowerText.includes('website') || lowerText.includes('web page') ||
      lowerText.includes('ui') || lowerText.includes('interface') || lowerText.includes('page') ||
      lowerText.includes('code') || lowerText.includes('programming') || lowerText.includes('development')) {
    
    return `${userText}

Please provide a complete, working solution with clear explanations and best practices.`;
  }
  
  return userText;
}

// Function to improve code formatting in responses
function improveCodeFormatting(response) {
  return response
    .replace(/```html\n/g, '```html\n')
    .replace(/```css\n/g, '```css\n')
    .replace(/```javascript\n/g, '```javascript\n')
    .replace(/```js\n/g, '```javascript\n');
}

// Fast API call with optimizations
async function fastApiCall(requestBody, maxRetries = 2, delay = 1000, loadingElement = null) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await res.json();
      const responseTime = Date.now() - startTime;
      console.log(`API response time: ${responseTime}ms`);
      
      if (!res.ok) {
        if (data.error?.message?.includes("overloaded") || data.error?.message?.includes("quota")) {
          if (attempt < maxRetries) {
            console.log(`API overloaded, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
            if (loadingElement) {
              loadingElement.textContent = `API busy, retrying... (${attempt}/${maxRetries})`;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.2;
            continue;
          }
        }
        throw new Error(data.error?.message || "API request failed");
      }
      
      return { res, data, responseTime };
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
      if (loadingElement) {
        loadingElement.textContent = `Retrying... (${attempt}/${maxRetries})`;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.2;
    }
  }
}

// Chatbot function with conversation context
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";
  createMessage(text, true);
  saveChatToHistory(text, true);
  
  const loading = createMessage("thinking......", false);
  scrollToBottom();
  
  const startTime = Date.now();
  console.log("Starting chat request at:", new Date().toISOString());

  try {
    const cachedResponse = getCachedResponse(text);
    if (cachedResponse) {
      const cacheTime = Date.now() - startTime;
      console.log(`Using cached response for instant reply (${cacheTime}ms)`);
      loading.remove();
      createMessage(cachedResponse);
      saveChatToHistory(cachedResponse, false);
      return;
    }

    const enhancedText = enhanceUserPrompt(text);
    conversationContext.push({ role: "user", parts: [{ text: enhancedText }] });
    
    const requestBody = {
      contents: conversationContext,
    };
    
    if (conversationContext.length === 1) {
      requestBody.systemInstruction = {
        parts: [{ text: SYSTEM_PROMPT }]
      };
    }
    
    const { res, data, responseTime } = await fastApiCall(requestBody, 2, 1000, loading.querySelector('.msg-content'));
    
    console.log("API response:", data);
    console.log(`Total response time: ${responseTime}ms`);

    let reply = "";
    if (data.candidates?.length) {
      const parts = data.candidates[0].content?.parts || [];
      reply = parts.map((p) => p.text || "").join("\n");
    }
    reply = reply.trim() || "⚠️ No response from model.";

    reply = improveCodeFormatting(reply);
    setCachedResponse(text, reply);
    conversationContext.push({ role: "model", parts: [{ text: reply }] });
    
    if (conversationContext.length > 20) {
      conversationContext = conversationContext.slice(-20);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Total response time: ${totalTime}ms`);
    
    loading.remove();
    createMessage(reply);
    saveChatToHistory(reply, false);
  } catch (err) {
    console.error("Chatbot error:", err);
    loading.remove();
    
    let errorMsg = "⚠️ Error: ";
    let fallbackResponse = "";
    
    if (err.message.includes("overloaded")) {
      errorMsg += "API is currently overloaded. Please try again in a few moments.";
      fallbackResponse = `I'm experiencing high traffic right now. Here are some general tips for your request:

**For Frontend Development:**
- Use semantic HTML5 elements
- Implement responsive design with CSS Grid/Flexbox
- Add interactive JavaScript functionality
- Ensure cross-browser compatibility
- Follow accessibility guidelines

**Common Frontend Patterns:**
- Component-based architecture
- Mobile-first design approach
- Progressive enhancement
- Performance optimization

Please try your request again in a few minutes when the API is less busy.`;
    } else if (err.message.includes("API key")) {
      errorMsg += "Invalid API key. Please check your Gemini API key.";
    } else if (err.message.includes("quota")) {
      errorMsg += "API quota exceeded. Please try again later.";
    } else if (err.message.includes("network")) {
      errorMsg += "Network error. Please check your internet connection.";
    } else {
      errorMsg += err.message;
    }
    
    createMessage(errorMsg);
    saveChatToHistory(errorMsg, false);
    
    if (err.message.includes("overloaded") && fallbackResponse) {
      setTimeout(() => {
        createMessage(fallbackResponse);
        saveChatToHistory(fallbackResponse, false);
      }, 1000);
    }
  }
}

// Voice recognition setup (Web Speech API)
(function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.style.display = "none";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    voiceBtn.classList.add("listening");
    toast("Listening… speak now");
  };
  recognition.onend = () => {
    isListening = false;
    voiceBtn.classList.remove("listening");
  };
  recognition.onerror = (e) => {
    isListening = false;
    voiceBtn.classList.remove("listening");
    toast(`Voice error: ${e.error}`);
  };
  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalTranscript += res[0].transcript;
      else interimTranscript += res[0].transcript;
    }
    inputEl.value = (finalTranscript || interimTranscript).trim();
  };

  voiceBtn.addEventListener("click", () => {
    if (!recognition) return;
    try {
      if (isListening) {
        recognition.stop();
      } else {
        inputEl.value = "";
        recognition.start();
      }
    } catch (_) {}
  });

  recognition.addEventListener("result", (e) => {
    const last = e.results[e.results.length - 1];
    if (last && last.isFinal) {
      setTimeout(() => { if (inputEl.value.trim()) mobileSendMessage(); }, 250);
    }
  });
})();

// New chat button
document.getElementById("newChatBtn").addEventListener("click", () => {
  createNewChat();
});

// History panel buttons
document.getElementById("closeHistory").addEventListener("click", closeHistoryPanel);
document.getElementById("historyOverlay").addEventListener("click", closeHistoryPanel);

// ===== Code Separator =====
const inputEl2 = document.getElementById("combined");
const htmlEl = document.getElementById("html");
const cssEl = document.getElementById("css");
const jsEl = document.getElementById("js");

function extractParts(raw) {
  if (!raw) return { html: "", css: "", js: "" };

  const html = raw
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();

  const cssBlocks = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  for (const m of raw.matchAll(styleRegex)) {
    const block = (m[1] || "").trim();
    if (block) cssBlocks.push(block);
  }

  const linkRegex = /<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi;
  for (const m of raw.matchAll(linkRegex)) {
    const tag = m[0];
    const hrefMatch = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch ? (hrefMatch[2] || hrefMatch[3] || hrefMatch[4]) : null;
    if (href) cssBlocks.push(`/* External stylesheet: ${href} */`);
  }

  const css = cssBlocks.join("\n\n");

  const jsBlocks = [];
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const m of raw.matchAll(scriptRegex)) {
    const attrs = m[1] || "";
    const body = (m[2] || "").trim();
    const srcMatch = attrs.match(/src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = srcMatch ? (srcMatch[2] || srcMatch[3] || srcMatch[4]) : null;
    if (src) jsBlocks.push(`// External script: ${src}`);
    if (body) jsBlocks.push(body);
  }

  const js = jsBlocks.join("\n\n");

  return { html, css, js };
}

function separateAndPopulate(raw) {
  const parts = extractParts(raw);
  htmlEl.value = parts.html;
  cssEl.value = parts.css;
  jsEl.value = parts.js;
}

function separateCode() {
  const raw = inputEl2.value;
  if (!raw) return;
  separateAndPopulate(raw);
}

document.getElementById("btnSeparate").addEventListener("click", separateCode);

document.getElementById("btnClear").addEventListener("click", () => {
  inputEl2.value = htmlEl.value = cssEl.value = jsEl.value = "";
});

document.getElementById("btnRun").addEventListener(
  "click",
  debounce(() => {
    const iframe = document.getElementById("output");
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const code = `${htmlEl.value}
      <style>${cssEl.value}</style>
      <script>${jsEl.value}<\/script>`;
    doc.open();
    doc.write(code);
    doc.close();
  }, 400)
);

// Upload HTML flow
document.getElementById("btnUploadHtml").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    inputEl2.value = text;
    separateAndPopulate(text);
    toast("HTML uploaded and separated!");
  } catch (err) {
    console.error(err);
    toast("Failed to read file");
  } finally {
    e.target.value = "";
  }
});

// Copy buttons for HTML/CSS/JS outputs
document.getElementById("btnCopyHtml").addEventListener("click", () => {
  copyText(htmlEl.value).then(() => toast("HTML copied!"));
});
document.getElementById("btnCopyCss").addEventListener("click", () => {
  copyText(cssEl.value).then(() => toast("CSS copied!"));
});
document.getElementById("btnCopyJs").addEventListener("click", () => {
  copyText(jsEl.value).then(() => toast("JS copied!"));
});

// Initialize the app
init();
