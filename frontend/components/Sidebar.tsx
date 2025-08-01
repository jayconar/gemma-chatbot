import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiMessageSquare, FiClock, FiChevronLeft, FiChevronRight, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface Chat {
    id: number;
    title: string;
    created_at: string;
}

interface SidebarProps {
    activeChatId: number | null;
    setActiveChatId: (id: number | null) => void;
    isVisible: boolean;
    toggleVisibility: () => void;
    onChatRename: (chatId: number, newTitle: string) => void;
    chatTitles: Record<number, string>;
}

export default function Sidebar({
    activeChatId,
    setActiveChatId,
    isVisible,
    toggleVisibility,
    onChatRename,
    chatTitles
}: SidebarProps) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingChatId, setEditingChatId] = useState<number | null>(null);
    const [newTitle, setNewTitle] = useState('');

    const fetchChats = async () => {
        try {
            const res = await axios.get<Chat[]>(`${process.env.NEXT_PUBLIC_API_BASE}/chat`);
            setChats(res.data);
        } catch (error) {
            console.error('Failed to fetch chats', error);
        }
    };

    const createNewChat = async () => {
        setLoading(true);
        try {
            const res = await axios.post<Chat>(`${process.env.NEXT_PUBLIC_API_BASE}/chat`);
            setChats(prev => [res.data, ...prev]);
            setActiveChatId(res.data.id);
        } catch (error) {
            console.error('Failed to create chat', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteChat = async (chatId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE}/chat/${chatId}`);
            setChats(prev => prev.filter(chat => chat.id !== chatId));
            
            if (activeChatId === chatId) {
                setActiveChatId(null);
            }
        } catch (error) {
            console.error('Failed to delete chat', error);
        }
    };

    const startEditing = (chat: Chat, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setNewTitle(chatTitles[chat.id] || chat.title);
    };

    const cancelEditing = () => {
        setEditingChatId(null);
        setNewTitle('');
    };

    const saveTitle = async (chatId: number) => {
        if (!newTitle.trim()) return;
        
        try {
            const res = await axios.put(`${process.env.NEXT_PUBLIC_API_BASE}/chat/${chatId}`, {
                title: newTitle.trim()
            });
            
            setChats(prev => prev.map(chat => 
                chat.id === chatId ? { ...chat, title: res.data.title } : chat
            ));
            
            onChatRename(chatId, res.data.title);
            setEditingChatId(null);
        } catch (error) {
            console.error('Failed to rename chat', error);
        }
    };

    useEffect(() => {
        fetchChats();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: 288 }}
                        exit={{ width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="h-full bg-[#292c2f] overflow-hidden flex-shrink-0"
                    >
                        <div className="flex flex-col h-full p-4 w-72">
                            <div className="flex justify-between items-center mb-4">
                                <motion.button
                                    onClick={createNewChat}
                                    disabled={loading}
                                    className="p-3 bg-[#fffef8] text-[#292c2f] rounded-lg shadow hover:shadow-lg transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2 font-medium"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? (
                                        <span className="inline-block h-4 w-4 border-2 border-[#292c2f] border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        <FiPlus className="text-lg" />
                                    )}
                                    <span>{loading ? 'Creating...' : 'New Chat'}</span>
                                </motion.button>
                                
                                <button
                                    onClick={toggleVisibility}
                                    className="p-2 text-[#fffef8] hover:bg-[#3a3d40] rounded-full"
                                >
                                    <FiChevronLeft />
                                </button>
                            </div>
                            
                            <div className="mb-2 px-2 text-xs font-semibold text-[#fffef8] opacity-70 uppercase tracking-wider">
                                Recent Chats
                            </div>
                            
                            <div className="overflow-y-auto flex-1">
                                <AnimatePresence>
                                    {chats.map(chat => (
                                        <motion.div
                                            key={chat.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div
                                                onClick={() => {
                                                    setActiveChatId(chat.id);
                                                    setEditingChatId(null);
                                                }}
                                                className={`p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 flex items-start ${
                                                    activeChatId === chat.id
                                                        ? 'bg-[#fffef8] shadow-md border-l-4 border-[#292c2f]'
                                                        : 'hover:bg-[#3a3d40]'
                                                }`}
                                            >
                                                <div
                                                    className={`p-2 rounded-full mr-3 ${
                                                        activeChatId === chat.id
                                                            ? 'bg-[#292c2f] text-[#fffef8]'
                                                            : 'bg-[#3a3d40] text-[#fffef8]'
                                                    }`}
                                                >
                                                    <FiMessageSquare />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    {editingChatId === chat.id ? (
                                                        <div className="flex flex-col gap-2">
                                                            <input
                                                                type="text"
                                                                value={newTitle}
                                                                onChange={(e) => setNewTitle(e.target.value)}
                                                                className={`w-full bg-transparent border-b ${
                                                                    activeChatId === chat.id
                                                                        ? 'border-[#292c2f] text-[#292c2f]'
                                                                        : 'border-[#fffef8] text-[#fffef8]'
                                                                } focus:outline-none`}
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveTitle(chat.id);
                                                                    if (e.key === 'Escape') cancelEditing();
                                                                }}
                                                            />
                                                            
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => saveTitle(chat.id)}
                                                                    className={`px-2 py-1 rounded text-xs ${
                                                                        activeChatId === chat.id
                                                                            ? 'bg-[#292c2f] text-[#fffef8]'
                                                                            : 'bg-[#3a3d40] text-[#fffef8]'
                                                                    }`}
                                                                >
                                                                    Save
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={cancelEditing}
                                                                    className={`px-2 py-1 rounded text-xs ${
                                                                        activeChatId === chat.id
                                                                            ? 'bg-gray-300 text-[#292c2f]'
                                                                            : 'bg-gray-500 text-[#fffef8]'
                                                                    }`}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div
                                                                className={`font-medium truncate ${
                                                                    activeChatId === chat.id
                                                                        ? 'text-[#292c2f]'
                                                                        : 'text-[#fffef8]'
                                                                }`}
                                                            >
                                                                {chatTitles[chat.id] || chat.title}
                                                            </div>
                                                            
                                                            <div className="flex justify-between items-center">
                                                                <div
                                                                    className={`flex items-center text-xs mt-1 ${
                                                                        activeChatId === chat.id
                                                                            ? 'text-gray-600'
                                                                            : 'text-[#fffef8] opacity-60'
                                                                    }`}
                                                                >
                                                                    <FiClock className="mr-1" />
                                                                    {formatDate(chat.created_at)}
                                                                </div>
                                                                
                                                                <div className="flex gap-2 ml-2">
                                                                    <button
                                                                        onClick={(e) => startEditing(chat, e)}
                                                                        className={`${
                                                                            activeChatId === chat.id
                                                                                ? 'text-[#292c2f] hover:text-blue-500'
                                                                                : 'text-[#fffef8] hover:text-blue-500'
                                                                        }`}
                                                                    >
                                                                        <FiEdit2 size={14} />
                                                                    </button>
                                                                    
                                                                    <button
                                                                        onClick={(e) => deleteChat(chat.id, e)}
                                                                        className={`${
                                                                            activeChatId === chat.id
                                                                                ? 'text-[#292c2f] hover:text-red-500'
                                                                                : 'text-[#fffef8] hover:text-red-500'
                                                                        }`}
                                                                    >
                                                                        <FiTrash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {!isVisible && (
                <button
                    onClick={toggleVisibility}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-[#292c2f] text-[#fffef8] rounded-r-full shadow-md hover:bg-[#3a3d40]"
                >
                    <FiChevronRight />
                </button>
            )}
        </>
    );
}