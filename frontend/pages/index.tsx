import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { FiMessageSquare, FiZap, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function Home() {
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [chatTitles, setChatTitles] = useState<Record<number, string>>({});

    const handleChatRename = (chatId: number, newTitle: string) => {
        setChatTitles(prev => ({
            ...prev,
            [chatId]: newTitle
        }));
    };

    const WelcomeScreen = () => (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#292c2f]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center text-[#fffef8] p-6"
            >
                <div className="mb-8">
                    <FiMessageSquare className="mx-auto text-5xl mb-4 opacity-70" />
                    <h3 className="text-2xl font-medium mb-2">Gemma Chat</h3>
                    <p className="opacity-80 max-w-md mx-auto">
                        Select or start a chat to begin your conversation
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
        </div>
    );

    return (
        <div className="flex h-screen">
            <Sidebar
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                isVisible={sidebarVisible}
                toggleVisibility={() => setSidebarVisible(!sidebarVisible)}
                onChatRename={handleChatRename}
                chatTitles={chatTitles}
            />

            <div className={`flex-1 flex flex-col relative ${!sidebarVisible ? 'max-w-[100vw]' : ''}`}>
                {activeChatId ? (
                    <ChatWindow
                        activeChatId={activeChatId}
                        chatTitle={chatTitles[activeChatId] || `Chat ${activeChatId}`}
                        sidebarVisible={sidebarVisible}
                    />
                ) : (
                    <WelcomeScreen />
                )}
            </div>
        </div>
    );
}