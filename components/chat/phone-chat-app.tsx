"use client";

import { memo, useState, useEffect, useRef } from "react";
import { ChatMessageList } from "./chat-message-list";
import { ChatContactsList } from "./chat-contacts-list";
import { MomentsFeed } from "./moments-feed";
import { ChatRoom } from "./chat-room";
import { MascotChatRoom } from "./mascot-chat-room";
import { UserProfilePanel } from "./user-profile-panel";
import { ChatSession, loadChatSessions, pushChatMessage, hydrateChatStorage } from "@/lib/chat-storage";
import { notifyMascotPageContext } from "@/lib/mascot-events";
import { loadCharacters } from "@/lib/character-storage";
import { scopeSessionCSS } from "@/lib/css-scoper";
import { kvGet } from "@/lib/kv-db";
import { formatXiaohongshuShareForPrompt, type ChatSharePayload } from "@/lib/chat-share";
import { CHAT_OPEN_SESSION_EVENT, CHAT_OPEN_ADD_CONTACT_EVENT } from "@/lib/chat-notification-events";
import { getMascotSettingsSnapshot } from "@/lib/mascot-settings";

type TabKey = "messages" | "contacts" | "feeds" | "me";

export type PhoneChatAppProps = {
    onClose: () => void;
    initialSessionId?: string | null;
    onSessionChange?: (session: ChatSession | null) => void;
    sharePayload?: ChatSharePayload | null;
    onShareDone?: () => void;
};

export const PhoneChatApp = memo(function PhoneChatApp({ onClose, initialSessionId, onSessionChange, sharePayload, onShareDone }: PhoneChatAppProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("messages");
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [activeMascot, setActiveMascot] = useState(false);
    const [chatAppCSS, setChatAppCSS] = useState(() => typeof window !== "undefined" ? kvGet("chat-app-custom-css") || "" : "");
    const [visitedSessions, setVisitedSessions] = useState<Map<string, ChatSession>>(new Map());
    const [dbReady, setDbReady] = useState(false);
    const [hideTabBar, setHideTabBar] = useState(false);

    useEffect(() => {
        hydrateChatStorage().then(() => {
            setDbReady(true);
            if (initialSessionId) {
                const s = loadChatSessions().find(s => s.id === initialSessionId);
                if (s) setActiveSession(s);
            }
        });
    }, []);

    const prevInitSessionId = useRef(initialSessionId);
    useEffect(() => {
        if (initialSessionId === prevInitSessionId.current) return;
        prevInitSessionId.current = initialSessionId;
        if (!dbReady) return;
        if (!initialSessionId) {
            setActiveSession(null);
            return;
        }
        const s = loadChatSessions().find(s => s.id === initialSessionId);
        if (s) setActiveSession(s);
    }, [initialSessionId, dbReady]);

    useEffect(() => {
        if (sharePayload) {
            setActiveSession(null);
            setActiveMascot(false);
            setActiveTab("contacts");
        }
    }, [sharePayload]);

    useEffect(() => {
        const handler = (e: Event) => {
            const sessionId = (e as CustomEvent<{ sessionId?: string }>).detail?.sessionId;
            if (!sessionId) return;
            const session = loadChatSessions().find(s => s.id === sessionId);
            if (!session) return;
            setActiveMascot(false);
            setActiveSession(session);
            setActiveTab("messages");
        };
        window.addEventListener(CHAT_OPEN_SESSION_EVENT, handler);
        return () => window.removeEventListener(CHAT_OPEN_SESSION_EVENT, handler);
    }, []);

    const [pendingAddContactId, setPendingAddContactId] = useState<string | null>(null);
    const addContactReturnSessionRef = useRef<string | null>(null);
    const activeSessionIdRef = useRef<string | null>(null);
    activeSessionIdRef.current = activeSession?.id ?? null;
    
    useEffect(() => {
        const handler = (e: Event) => {
            const characterId = (e as CustomEvent<{ characterId?: string }>).detail?.characterId;
            if (!characterId) return;
            addContactReturnSessionRef.current = activeSessionIdRef.current;
            setActiveSession(null);
            setActiveMascot(false);
            setActiveTab("contacts");
            setPendingAddContactId(characterId);
        };
        window.addEventListener(CHAT_OPEN_ADD_CONTACT_EVENT, handler);
        return () => window.removeEventListener(CHAT_OPEN_ADD_CONTACT_EVENT, handler);
    }, []);

    useEffect(() => {
        onSessionChange?.(activeSession);
        if (activeSession) {
            setActiveMascot(false);
            setVisitedSessions(prev => {
                if (prev.has(activeSession.id)) return prev;
                const next = new Map(prev);
                next.set(activeSession.id, activeSession);
                return next;
            });
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
        if (sharePayload && sess) {
            if (sharePayload.type === "music") {
                pushChatMessage({
                    sessionId: sess.id,
                    role: "user",
                    content: "",
                    mediaType: "music_share",
                    mediaData: {
                        musicTitle: sharePayload.title,
                        musicArtist: sharePayload.artist,
                        label: `${sharePayload.title} - ${sharePayload.artist}`,
                    },
                });
            } else {
                const content = formatXiaohongshuShareForPrompt({
                    author: sharePayload.authorName,
                    title: sharePayload.title,
                    body: sharePayload.body,
                    description: sharePayload.description,
                });
                pushChatMessage({
                    sessionId: sess.id,
                    role: "user",
                    content,
                    mediaType: "xiaohongshu_note_share",
                    mediaData: {
                        xiaohongshuAuthor: sharePayload.authorName,
                        xiaohongshuTitle: sharePayload.title,
                        xiaohongshuBody: sharePayload.body,
                        xiaohongshuDescription: sharePayload.description,
                        xiaohongshuNoteType: sharePayload.noteType,
                        xiaohongshuTags: sharePayload.tags,
                        xiaohongshuImageAssetId: sharePayload.imageAssetId,
                        xiaohongshuCoverIcon: sharePayload.coverIcon,
                        xiaohongshuTone: sharePayload.tone,
                    },
                });
            }
            window.dispatchEvent(new CustomEvent("chat-messages-updated", { detail: { sessionId: sess.id } }));
            onShareDone?.();
        }
        setActiveMascot(false);
        setActiveSession(sess);
        setActiveTab("messages");
    };

    const handleSelectMascot = () => {
        setActiveSession(null);
        setActiveMascot(true);
        setActiveTab("messages");
    };

    useEffect(() => {
        const onCSSUpdate = () => setChatAppCSS(kvGet("chat-app-custom-css") || "");
        window.addEventListener("chat-app-css-updated", onCSSUpdate);
        return () => window.removeEventListener("chat-app-css-updated", onCSSUpdate);
    }, []);

    useEffect(() => {
        const onHide = (e: Event) => setHideTabBar((e as CustomEvent).detail);
        window.addEventListener("chat-hide-tabbar", onHide);
        return () => window.removeEventListener("chat-hide-tabbar", onHide);
    }, []);

    if (!dbReady) return null;

    return (
        <div
            className="chat-app absolute inset-0 flex flex-col overflow-hidden z-10 bg-[#FFFFFF]"
            {...(activeSession || activeMascot ? { "data-room-active": "" } : {})}
            {...(hideTabBar ? { "data-tabbar-hidden": "" } : {})}
        >
            {chatAppCSS && <style dangerouslySetInnerHTML={{ __html: scopeSessionCSS(chatAppCSS, ".chat-app") }} />}
            
            {/* 主内容区域，由各子组件自行决定如何渲染顶部和内容 */}
            <div className="chat-main-content relative flex-1 flex flex-col overflow-hidden" {...(activeSession || activeMascot ? { "data-covered-by-room": "" } : {})}>
                {activeTab === "messages" && <ChatMessageList onCloseApp={onClose} activeSession={activeSession} onSelectSession={(session) => { setActiveMascot(false); setActiveSession(session); }} onSelectMascot={handleSelectMascot} />}
                {activeTab === "contacts" && (
                    <ChatContactsList
                        onCloseApp={onClose}
                        onSelectSession={handleSelectContact}
                        onSelectMascot={handleSelectMascot}
                        pendingAddContactId={pendingAddContactId}
                        onPendingAddContactConsumed={() => setPendingAddContactId(null)}
                        onPendingAddContactBack={() => {
                            const sessionId = addContactReturnSessionRef.current;
                            addContactReturnSessionRef.current = null;
                            if (!sessionId) return;
                            const session = loadChatSessions().find(s => s.id === sessionId);
                            if (!session) return;
                            setActiveSession(session);
                            setActiveTab("messages");
                        }}
                    />
                )}
                {activeTab === "feeds" && <MomentsFeed onCloseApp={onClose} />}
                {activeTab === "me" && <UserProfilePanel onClose={() => setActiveTab("messages")} />}
            </div>

            {/* 微信风格底部导航栏 */}
            {!activeSession && !activeMascot && !hideTabBar && (
                <nav className="bg-[#F7F7F7] border-t border-[#D9D9D9] shrink-0 flex justify-around items-center h-[58px]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2px)" }}>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("messages")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === "messages" ? "#07C160" : "#000000"} strokeWidth="1.8"><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M21 12c0 4.97-4.03 9-9 9-1.58 0-3.07-.41-4.37-1.13l-3.66 1.22 1.26-3.54A8.95 8.95 0 0 1 3 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" /></svg>
                        <span className={`text-[10px] font-medium ${activeTab === "messages" ? "text-[#07C160]" : "text-[#888]"}`}>微信</span>
                    </button>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("contacts")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === "contacts" ? "#07C160" : "#000000"} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 21v-2a4 4 0 0 0-3-3.87" /></svg>
                        <span className={`text-[10px] font-medium ${activeTab === "contacts" ? "text-[#07C160]" : "text-[#888]"}`}>通讯录</span>
                    </button>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("feeds")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === "feeds" ? "#07C160" : "#000000"} strokeWidth="1.8"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-8a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0zm0-4a1 1 0 1 1 2 0 1 1 0 1 1-2 0z" /></svg>
                        <span className={`text-[10px] font-medium ${activeTab === "feeds" ? "text-[#07C160]" : "text-[#888]"}`}>发现</span>
                    </button>
                    <button className="flex flex-col items-center gap-0.5 w-1/4" onClick={() => setActiveTab("me")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === "me" ? "#07C160" : "#000000"} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
                        <span className={`text-[10px] font-medium ${activeTab === "me" ? "text-[#07C160]" : "text-[#888]"}`}>我</span>
                    </button>
                </nav>
            )}

            {/* 聊天室弹窗 */}
            {[...visitedSessions.values()].map(sess => (
                <div key={sess.id} style={{ display: activeSession?.id === sess.id ? undefined : 'none' }} className="chat-room-layer absolute inset-0">
                    <ChatRoom session={sess} onBack={() => setActiveSession(null)} />
                </div>
            ))}
            {activeMascot && (
                <div className="chat-room-layer absolute inset-0">
                    <MascotChatRoom
                        onBack={() => setActiveMascot(false)}
                        onDeleted={() => setActiveMascot(false)}
                    />
                </div>
            )}
        </div>
    );
});
