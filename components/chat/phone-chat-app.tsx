"use client";

import { memo, useState, useEffect, useRef } from "react";
import { ChatMessageList } from "./chat-message-list";
import { ChatContactsList } from "./chat-contacts-list";
import { MomentsFeed } from "./moments-feed";
import { ChatRoom } from "./chat-room";
import { MascotChatRoom } from "./mascot-chat-room";
import { UserProfilePanel } from "./user-profile-panel";
import { ChatSession, loadChatSessions, hydrateChatStorage } from "@/lib/chat-storage";

type TabKey = "messages" | "contacts" | "feeds" | "me";

export type PhoneChatAppProps = {
    onClose: () => void;
    initialSessionId?: string | null;
    onSessionChange?: (session: ChatSession | null) => void;
    sharePayload?: any | null;
    onShareDone?: () => void;
};

export const PhoneChatApp = memo(function PhoneChatApp({ onClose, initialSessionId, onSessionChange }: PhoneChatAppProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("messages");
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [activeMascot, setActiveMascot] = useState(false);
    const [dbReady, setDbReady] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);

    useEffect(() => {
        hydrateChatStorage().then(() => {
            setDbReady(true);
            if (initialSessionId) {
                const s = loadChatSessions().find(s => s.id === initialSessionId);
                if (s) setActiveSession(s);
            }
        });
    }, [initialSessionId]);

    useEffect(() => {
        onSessionChange?.(activeSession);
    }, [activeSession, onSessionChange]);

    const handleSelectContact = (sess: ChatSession | null) => {
        setActiveMascot(false);
        setActiveSession(sess);
        setActiveTab("messages");
    };

    const handleSelectMascot = () => {
        setActiveSession(null);
        setActiveMascot(true);
        setActiveTab("messages");
    };

    // 恢复加号功能：切换到联系人并弹出添加
    const handleAddAction = () => {
        setActiveTab("contacts");
        // 模拟触发添加好友事件，原代码中聊天列表会监听到此事件并弹窗
        window.dispatchEvent(new CustomEvent("chat-open-add-contact", { detail: { characterId: "" } }));
    };

    if (!dbReady) return null;

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10, backgroundColor: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            
            {/* 聊天主功能层 */}
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activeTab === "messages" && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                        
                        {/* 1. 顶部导航栏：微信灰色背景，居中，加宽高度 */}
                        <div style={{ backgroundColor: '#EDEDED', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: '56px', borderBottom: '1px solid #E5E5E5' }}>
                            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#181818', padding: 0, cursor: 'pointer' }}>‹</button>
                            <span style={{ fontWeight: 'bold', fontSize: '17px', color: '#000000', letterSpacing: '1px' }}>微信</span>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {/* 搜索按钮 */}
                                <button onClick={() => setIsSearchActive(!isSearchActive)} style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#181818', padding: 0, cursor: 'pointer' }}>🔍</button>
                                {/* 加号按钮 */}
                                <button onClick={handleAddAction} style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#181818', padding: 0, lineHeight: 1, cursor: 'pointer' }}>＋</button>
                            </div>
                        </div>

                        {/* 2. 搜索框弹窗（仅点击放大镜出现） */}
                        {isSearchActive && (
                           <div style={{ padding: '12px 16px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', gap: '12px' }}>
                               <div style={{ flex: 1, backgroundColor: '#F4F5F7', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   <span style={{ color: '#999' }}>🔍</span>
                                   <input autoFocus placeholder="搜索" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '15px' }} />
                               </div>
                               <button onClick={() => setIsSearchActive(false)} style={{ background: 'transparent', border: 'none', fontSize: '15px', color: '#000' }}>取消</button>
                           </div>
                        )}

                        {/* 3. 聊天列表（没有绿点，纯白底） */}
                        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
                            <div onClick={handleSelectMascot} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F0F8FF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', border: '1px solid #EBEBEB', flexShrink: 0 }}>
                                    🐱
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111' }}>AI助手</span>
                                        <span style={{ color: '#B2B2B2', fontSize: '11px' }}>AI</span>
                                    </div>
                                    <span style={{ color: '#999', fontSize: '13px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>随时待命~ 角色卡、预设、世界书...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "contacts" && <ChatContactsList onCloseApp={onClose} onSelectSession={handleSelectContact} onSelectMascot={handleSelectMascot} />}
                {activeTab === "feeds" && <MomentsFeed onCloseApp={onClose} />}
                {activeTab === "me" && <UserProfilePanel onClose={() => setActiveTab("messages")} />}
            </div>

            {/* 4. 底部导航栏（浅灰背景、黑色图标，极简风格） */}
            {!activeSession && !activeMascot && (
                <nav style={{ backgroundColor: '#F7F7F7', borderTop: '1px solid #D9D9D9', flexShrink: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '58px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <button onClick={() => setActiveTab("messages")} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', width: '25%' }}>
                        <span style={{ fontSize: '22px', color: activeTab === "messages" ? '#07C160' : '#000000' }}>💬</span>
                        <span style={{ fontSize: '10px', fontWeight: '500', color: activeTab === "messages" ? '#07C160' : '#888888' }}>微信</span>
                    </button>
                    <button onClick={() => setActiveTab("contacts")} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', width: '25%' }}>
                        <span style={{ fontSize: '22px', color: activeTab === "contacts" ? '#07C160' : '#000000' }}>👥</span>
                        <span style={{ fontSize: '10px', fontWeight: '500', color: activeTab === "contacts" ? '#07C160' : '#888888' }}>通讯录</span>
                    </button>
                    <button onClick={() => setActiveTab("feeds")} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', width: '25%' }}>
                        <span style={{ fontSize: '22px', color: activeTab === "feeds" ? '#07C160' : '#000000' }}>🌐</span>
                        <span style={{ fontSize: '10px', fontWeight: '500', color: activeTab === "feeds" ? '#07C160' : '#888888' }}>发现</span>
                    </button>
                    <button onClick={() => setActiveTab("me")} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', width: '25%' }}>
                        <span style={{ fontSize: '22px', color: activeTab === "me" ? '#07C160' : '#000000' }}>👤</span>
                        <span style={{ fontSize: '10px', fontWeight: '500', color: activeTab === "me" ? '#07C160' : '#888888' }}>我</span>
                    </button>
                </nav>
            )}

            {/* 保持聊天室覆盖层 */}
            {activeSession && <div style={{ position: 'absolute', inset: 0, zIndex: 20, backgroundColor: '#fff' }}><ChatRoom session={activeSession} onBack={() => setActiveSession(null)} /></div>}
            {activeMascot && <div style={{ position: 'absolute', inset: 0, zIndex: 20, backgroundColor: '#fff' }}><MascotChatRoom onBack={() => setActiveMascot(false)} onDeleted={() => setActiveMascot(false)} /></div>}
        </div>
    );
});
