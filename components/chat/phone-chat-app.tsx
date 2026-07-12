"use client";

import { memo, useState, useEffect, useRef } from "react";
import { ChatMessageList } from "./chat-message-list";
import { ChatContactsList } from "./chat-contacts-list";
import { MomentsFeed } from "./moments-feed";
import { ChatRoom } from "./chat-room";
import { MascotChatRoom } from "./mascot-chat-room";
import { UserProfilePanel } from "./user-profile-panel";
import { ChatSession, loadChatSessions, hydrateChatStorage } from "@/lib/chat-storage";
import { notifyMascotPageContext } from "@/lib/mascot-events";
import { loadCharacters } from "@/lib/character-storage";
import { CHAT_OPEN_SESSION_EVENT, CHAT_OPEN_ADD_CONTACT_EVENT } from "@/lib/chat-notification-events";
import { getMascotSettingsSnapshot } from "@/lib/mascot-settings";

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
    const [hideTabBar, setHideTabBar] = useState(false);
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

    const prevInitSessionId = useRef(initialSessionId);
    useEffect(() => {
        if (initialSessionId === prevInitSessionId.current) return;
        prevInitSessionId.current = initialSessionId;
        if (!dbReady) return;
        if (!initialSessionId) { setActiveSession(null); return; }
        const s = loadChatSessions().find(s => s.id === initialSessionId);
        if (s) setActiveSession(s);
    }, [initialSessionId, dbReady]);

    useEffect(() => {
        onSessionChange?.(activeSession);
        if (activeSession) {
            setActiveMascot(false);
            const chars = loadCharacters();
            const char = chars.find(c => c.id === activeSession.contactId);
            notifyMascotPageContext({
                page: "chat",
                mode: "chatting",
                label: `聊天 · ${(activeSession as Record<string, unknown>).alias as string || char?.name || "对话"}`,
                fields: { sessionId: activeSession.id, contactId: activeSession.contactId },
            });
        }
    }, [activeSession, onSessionChange]);

    useEffect(() => {
        if (!activeMascot) return;
        onSessionChange?.(null);
        notifyMascotPageContext({
            page: "chat",
            mode: "chatting",
            label: `聊天 · ${getMascotSettingsSnapshot().nickname || "AI助手"}`,
            fields: { sessionId: "mascot", contactId: "mascot" },
        });
    }, [activeMascot, onSessionChange]);

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

    // 加号按钮功能：回到联系人页面，并触发添加面板
    const handleAddAction = () => {
        setActiveTab("contacts");
        window.dispatchEvent(new CustomEvent(CHAT_OPEN_ADD_CONTACT_EVENT, { detail: { characterId: "" } }));
    };

    if (!dbReady) return null;

    // 微信风格的黑色细线条图标 (SVG)
    const TabIcon = ({ path, active }: { path: string, active: boolean }) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#07C160" : "#000000"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={path} />
        </svg>
    );

    return (
        <div className="chat-app absolute inset-0 flex flex-col overflow-hidden z-10 bg-[#FFFFFF] font-sans">
            
            <div className="chat-main-content relative flex-1 flex flex-col overflow-hidden">
                {activeTab === "messages" && (
                    <div className="flex flex-col h-full relative">
                        
                        {/* 1. 顶部导航栏：纯微信灰色、居中的“微信”、功能按钮 */}
                        <div className="bg-[#EDEDED] px-4 flex items-center justify-between shrink-0 border-b border-[#E5E5E5] h-[56px] pt-[env(safe-area-inset-top,8px)]">
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#181818]">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <div className="flex-1 text-center">
                                <span className="font-bold text-[17px] text-[#000000] tracking-wide">微信</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setIsSearchActive(!isSearchActive)} className="w-8 h-8 flex items-center justify-center text-[#181818]">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                </button>
                                <button onClick={handleAddAction} className="w-8 h-8 flex items-center justify-center text-[#181818]">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* 2. 搜索框：点击放大镜后弹出（完美还原微信点击搜索行为） */}
                        {isSearchActive && (
                           <div className="px-4 py-2 bg-[#FFFFFF] shrink-0 border-b border-[#EBEBEB] z-20 flex items-center gap-3">
                               <div className="flex-1 bg-[#F4F5F7] rounded-lg px-3 py-2 flex items-center gap-2">
                                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                   <input autoFocus placeholder="搜索" className="w-full bg-transparent outline-none text-[#000] placeholder-[#999] text-[15px]" />
                               </div>
                               <button onClick={() => setIsSearchActive(false)} className="text-[#000] text-[15px] font-medium">取消</button>
                           </div>
                        )}

                        {/* 3. 聊天列表：完美的微信白底、去绿点 */}
                        <div className="flex-1 overflow-y-auto bg-[#FFFFFF] mt-1">
                            <div className="px-4 py-3 flex justify-between items-center border-b border-[#F5F5F5]" onClick={handleSelectMascot}>
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-11 h-11 rounded-xl bg-[#F0F8FF] overflow-hidden flex items-center justify-center text-xl border border-[#EBEBEB]">
                                        🐱
                                    </div>
                                    <div className="flex flex-col flex-1 justify-center">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-[#111] text-[16px]">AI助手</span>
                                            <span className="text-[#B2B2B2] text-[11px]">AI</span>
                                        </div>
                                        <span className="text-[#999] text-[13px] truncate max-w-[180px] mt-0.5">随时待命~ 角色卡、预设、世界书、正则、CSS...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "contacts" && (
                    <ChatContactsList
                        onCloseApp={onClose}
                        onSelectSession={handleSelectContact}
                        onSelectMascot={handleSelectMascot}
                    />
                )}
                {activeTab === "feeds" && <MomentsFeed onCloseApp={onClose} />}
                {activeTab === "me" && <UserProfilePanel onClose={() => setActiveTab("messages")} />}
            </div>

            {/* 4. 底部导航栏：浅灰背景、黑色图标，文字居下 */}
            {!activeSession && !activeMascot && !hideTabBar && (
                <nav className="bg-[#F7F7F7] border-t border-[#D9D9D9] shrink-0 flex justify-around items-center h-[58px]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2px)" }}>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("messages")}>
                        <TabIcon active={activeTab === "messages"} path="M8.5 11h.01M12 11h.01M15.5 11h.01M21 12c0 4.97-4.03 9-9 9-1.58 0-3.07-.41-4.37-1.13l-3.66 1.22 1.26-3.54A8.95 8.95 0 0 1 3 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
                        <span className={`text-[10px] font-medium ${activeTab === "messages" ? "text-[#07C160]" : "text-[#888]"}`}>微信</span>
                    </button>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("contacts")}>
                        <TabIcon active={activeTab === "contacts"} path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 21v-2a4 4 0 0 0-3-3.87" />
                        <span className={`text-[10px] font-medium ${activeTab === "contacts" ? "text-[#07C160]" : "text-[#888]"}`}>通讯录</span>
                    </button>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("feeds")}>
                        <TabIcon active={activeTab === "feeds"} path="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-8a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0zm0-4a1 1 0 1 1 2 0 1 1 0 1 1-2 0z" />
                        <span className={`text-[10px] font-medium ${activeTab === "feeds" ? "text-[#07C160]" : "text-[#888]"}`}>发现</span>
                    </button>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("me")}>
                        <TabIcon active={activeTab === "me"} path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                        <span className={`text-[10px] font-medium ${activeTab === "me" ? "text-[#07C160]" : "text-[#888]"}`}>我</span>
                    </button>
                </nav>
            )}

            {/* 保留聊天的覆盖层（原样保留功能） */}
            {activeSession && (
                <div className="absolute inset-0 z-20 bg-white">
                    <ChatRoom session={activeSession} onBack={() => setActiveSession(null)} />
                </div>
            )}
            {activeMascot && (
                <div className="absolute inset-0 z-20 bg-white">
                    <MascotChatRoom onBack={() => setActiveMascot(false)} onDeleted={() => setActiveMascot(false)} />
                </div>
            )}
        </div>
    );
});
