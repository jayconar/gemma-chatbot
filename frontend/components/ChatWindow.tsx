import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FiSend, FiStopCircle, FiMessageSquare, FiZap, FiClock, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatWindowProps {
  activeChatId: number;
  sidebarVisible: boolean;
  chatTitle: string;
}

export default function ChatWindow({ activeChatId, sidebarVisible, chatTitle }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [textareaRows, setTextareaRows] = useState(1);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  
  const fetchControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounter = useRef(0);

  const fetchChatMessages = useCallback(async () => {
    if (!activeChatId) return;
    
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}/chat/${activeChatId}`);
      setMessages(res.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  }, [activeChatId]);

  useEffect(() => {
    return () => {
      if (isStreaming && fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        if (activeChatId) {
          axios.post(`${process.env.NEXT_PUBLIC_API_BASE}/chat/${activeChatId}/stop`)
            .catch(console.error);
        }
      }
    };
  }, [activeChatId, isStreaming]);

  useEffect(() => {
    if (!activeChatId) return;
    
    if (isStreaming && fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      setIsStreaming(false);
      setIsSending(false);
    }
    
    fetchChatMessages();
  }, [activeChatId, fetchChatMessages]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setUserScrolledUp(scrollHeight - (scrollTop + clientHeight) > 100);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!userScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [messages, userScrolledUp]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    const textareaLineHeight = 24;
    const minRows = 1;
    const maxRows = 8;
    const previousRows = e.target.rows;
    
    e.target.rows = minRows;
    const currentRows = Math.floor(e.target.scrollHeight / textareaLineHeight);
    
    if (currentRows >= maxRows) {
      e.target.rows = maxRows;
      e.target.scrollTop = e.target.scrollHeight;
    } else {
      e.target.rows = currentRows;
    }
    
    setTextareaRows(Math.min(currentRows, maxRows));
  };

  const handleSend = async (content?: string) => {
    const messageContent = content || newMessage;
    if (!messageContent.trim() || !activeChatId) return;
    
    setIsSending(true);
    setIsConnecting(true);
    
    if (!content) {
      const newId = Date.now() % 1000000000;
      const userMsg: Message = {
        id: newId,
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      setNewMessage('');
      setTextareaRows(1);
    }
    
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/chat/${activeChatId}/message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageContent }),
          signal: controller.signal,
        }
      );
      
      if (!response.body) throw new Error('No response body');
      
      setIsConnecting(false);
      setIsStreaming(true);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = Date.now() % 1000000000;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantContent += chunk;
        
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: assistantContent }
            ];
          }
          return [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content: assistantContent,
              timestamp: new Date().toISOString(),
            },
          ];
        });
      }
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        console.error('Streaming error:', err);
      }
    } finally {
      setIsStreaming(false);
      setIsSending(false);
      setIsConnecting(false);
      fetchControllerRef.current = null;
      
      // Refresh messages to get database IDs
      await fetchChatMessages();
    }
  };

  const handleStop = async () => {
    if (!activeChatId) return;
    
    fetchControllerRef.current?.abort();
    await axios.post(`${process.env.NEXT_PUBLIC_API_BASE}/chat/${activeChatId}/stop`);
    setIsStreaming(false);
    setIsSending(false);
    setIsConnecting(false);
  };

  const handleRetry = async (messageId: number) => {
    if (!activeChatId || isSending) return;
    
    try {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return;
      
      const retryMessage = messages[messageIndex];
      
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_BASE}/chat/${activeChatId}/messages/after/${messageId}`
        );
      } catch (error) {
        console.warn('Deletion API error, proceeding with frontend cleanup', error);
      }
      
      // Keep all messages up to and including the retry point
      setMessages(prev => prev.slice(0, messageIndex + 1));
      
      // Resend the message with full context
      handleSend(retryMessage.content);
    } catch (error) {
      console.error('Error retrying message:', error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#292c2f] overflow-hidden">
      <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto p-6 space-y-3"
      >
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full -mt-16 text-[#fffef8]"
          >
            <div className="mb-8 text-center">
              <FiMessageSquare className="mx-auto text-5xl mb-4 text-[#fffef8] opacity-70" />
              <h3 className="text-2xl font-medium mb-2">{chatTitle}</h3>
              <p className="text-[#fffef8] opacity-80 max-w-md mx-auto">
                Start a conversation by typing your message below.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full mt-8">
              {[
                { 
                  icon: <FiZap className="text-xl" />, 
                  title: "Quick Start", 
                  text: "Ask me anything to get started" 
                },
                { 
                  icon: <FiClock className="text-xl" />, 
                  title: "History", 
                  text: "Your previous chats are saved" 
                },
                { 
                  icon: <FiMessageSquare className="text-xl" />, 
                  title: "Examples", 
                  text: "Try asking about various topics" 
                }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ y: -5 }}
                  className="bg-[#3a3d40] p-4 rounded-lg border border-[#4a4d50]"
                >
                  <div className="flex items-center mb-2">
                    <div className="p-2 bg-[#4a4d50] rounded-full mr-3">
                      {item.icon}
                    </div>
                    <h4 className="font-medium">{item.title}</h4>
                  </div>
                  <p className="text-sm opacity-80">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-3 rounded-xl relative leading-relaxed break-words transition-all duration-200 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#3a3d40] self-end text-[#fffef8]' 
                    : 'bg-[#4a4d50] self-start text-[#fffef8] shadow-md'
                } ${
                  sidebarVisible ? 'max-w-[47%]' : 'max-w-[50%] mx-36'
                } ${
                  msg.role === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  {msg.role === 'user' && (
                    <button
                      onClick={(e) => {
                        if (!isSending) {
                          e.stopPropagation();
                          handleRetry(msg.id);
                        }
                      }}
                      className={`p-1 bg-[#3a3d40] rounded-full border border-[#4a4d50] shadow-md transition-colors ${
                        isSending 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-[#4a4d50] cursor-pointer'
                      }`}
                      title={isSending ? "Please wait until generation completes" : "Retry this message"}
                      disabled={isSending}
                    >
                      <FiRefreshCw className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-xs text-[#fffef8] opacity-60">
                    {new Date(msg.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {isConnecting && (
              <div 
                className={`p-3 rounded-xl text-sm ${
                  sidebarVisible ? 'max-w-[47%]' : 'max-w-[50%] mx-36'
                } mr-auto bg-[#4a4d50] self-start text-[#fffef8] shadow-md`}
              >
                <div className="flex items-center gap-1">
                  <div className="flex space-x-1">
                    <div 
                      className="w-1.5 h-1.5 rounded-full bg-[#fffef8] opacity-60 animate-bounce" 
                      style={{ animationDelay: '0ms' }} 
                    />
                    <div 
                      className="w-1.5 h-1.5 rounded-full bg-[#fffef8] opacity-60 animate-bounce" 
                      style={{ animationDelay: '150ms' }} 
                    />
                    <div 
                      className="w-1.5 h-1.5 rounded-full bg-[#fffef8] opacity-60 animate-bounce" 
                      style={{ animationDelay: '300ms' }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="bg-[#3a3d40] p-4 border-t border-[#4a4d50]">
        <div className="flex items-end space-x-3">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-[#4a4d50] border border-[#5a5d60] text-[#fffef8] rounded-lg p-3 placeholder-[#fffef8] placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-[#fffef8] resize-none"
            rows={textareaRows}
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isSending}
            placeholder="Type your message..."
            style={{ 
              minHeight: '44px', 
              maxHeight: '192px',
              overflowY: textareaRows >= 8 ? 'auto' : 'hidden'
            }}
          />
          
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition flex items-center gap-2 mb-1"
            >
              <FiStopCircle />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!newMessage.trim() || isStreaming}
              className="px-4 py-2 bg-[#fffef8] text-[#292c2f] rounded-lg shadow hover:bg-opacity-90 transition disabled:opacity-50 flex items-center gap-2 font-medium mb-1"
            >
              <FiSend />
              <span>Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}